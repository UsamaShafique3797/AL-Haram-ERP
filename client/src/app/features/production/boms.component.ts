import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BomService } from '../../core/services/bom.service';
import { ItemService } from '../../core/services/item.service';
import { AccessService } from '../../core/services/access.service';
import { BillOfMaterialsDto, ItemDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-boms',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Bill of materials</h1>
        <p class="page-sub">Define raw steel consumed per finished unit (rings, pillars, stirrups…).</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('production/boms')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New BOM</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead><tr><th>Finished item</th><th>Name</th><th>Components</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (b of boms(); track b.id) {
            <tr>
              <td>{{ b.finishedItemName }} <span class="muted">({{ b.finishedItemCode }})</span></td>
              <td>{{ b.name || '—' }}</td>
              <td>{{ b.components.length }}</td>
              <td>
                @if (b.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                @if (access.canWrite('production/boms')) {
                  <button class="btn btn-ghost btn-sm" (click)="edit(b)">Edit</button>
                }
                @if (access.canDelete('production/boms')) {
                  <button class="btn btn-danger btn-sm" (click)="remove(b)">Delete</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="text-align:center;color:var(--muted)">No BOMs yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit BOM' : 'New BOM' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Finished item</label>
                  <select formControlName="finishedItemId">
                    <option value="">— select —</option>
                    @for (i of items(); track i.id) { <option [value]="i.id">{{ i.name }} ({{ i.code }})</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Recipe name</label><input formControlName="name" placeholder="Optional label" /></div>
              </div>
              <label class="check"><input type="checkbox" formControlName="isActive" /> Active</label>

              <h4 style="margin:.75rem 0 .25rem">Raw components (per 1 finished unit)</h4>
              <div formArrayName="components">
                @for (row of components.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Raw item</label>
                      <select formControlName="rawItemId">
                        <option value="">— select —</option>
                        @for (i of rawItems(); track i.id) { <option [value]="i.id">{{ i.name }} ({{ i.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Qty / unit</label><input type="number" step="0.0001" formControlName="quantityPerUnit" /></div>
                    <div class="field" style="flex:1"><label>Notes</label><input formControlName="notes" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeComponent(idx)">×</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addComponent()">+ Add component</button>

              <div class="field" style="margin-top:.75rem"><label>Notes</label><input formControlName="notes" /></div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || components.length === 0 || loading()">
                  {{ loading() ? 'Saving…' : 'Save BOM' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(16,24,40,.45);
      display: grid; place-items: center; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 820px; margin: auto; }
    h4 { font-size: .9rem; }
    .muted { color: var(--muted); font-size: .85rem; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); margin-top: .5rem; }
  `],
})
export class BomsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private bomService = inject(BomService);
  private itemService = inject(ItemService);

  boms = signal<BillOfMaterialsDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    finishedItemId: ['', Validators.required],
    name: [''],
    notes: [''],
    isActive: [true],
    components: this.fb.array<ReturnType<BomsComponent['componentGroup']>>([]),
  });

  get components(): FormArray { return this.form.get('components') as FormArray; }

  rawItems = signal<ItemDto[]>([]);

  ngOnInit(): void {
    this.load();
    this.itemService.getAll().subscribe((list) => {
      this.items.set(list);
      this.rawItems.set(list.filter((i) => i.trackInventory));
      this.ready.set(true);
    });
  }

  load(): void {
    this.bomService.getAll().subscribe({
      next: (list) => this.boms.set(list),
      error: () => this.error.set('Could not load BOMs.'),
    });
  }

  private componentGroup() {
    return this.fb.nonNullable.group({
      rawItemId: ['', Validators.required],
      quantityPerUnit: [0, [Validators.required, Validators.min(0.0001)]],
      notes: [''],
    });
  }

  addComponent(): void { this.components.push(this.componentGroup()); }
  removeComponent(i: number): void { this.components.removeAt(i); }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    this.components.clear();
    this.form.reset({ finishedItemId: '', name: '', notes: '', isActive: true });
    this.addComponent();
    this.showForm.set(true);
  }

  edit(b: BillOfMaterialsDto): void {
    this.editingId = b.id;
    this.formError.set(null);
    this.components.clear();
    this.form.reset({
      finishedItemId: b.finishedItemId,
      name: b.name ?? '',
      notes: b.notes ?? '',
      isActive: b.isActive,
    });
    for (const c of b.components) {
      this.components.push(this.fb.nonNullable.group({
        rawItemId: [c.rawItemId, Validators.required],
        quantityPerUnit: [c.quantityPerUnit, [Validators.required, Validators.min(0.0001)]],
        notes: [c.notes ?? ''],
      }));
    }
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.components.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      finishedItemId: v.finishedItemId,
      name: v.name || null,
      notes: v.notes || null,
      isActive: v.isActive,
      components: v.components.map((c: any) => ({
        rawItemId: c.rawItemId,
        quantityPerUnit: Number(c.quantityPerUnit),
        notes: c.notes || null,
      })),
    };
    const req = this.editingId
      ? this.bomService.update(this.editingId, payload)
      : this.bomService.create(payload);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save BOM.');
      },
    });
  }

  remove(b: BillOfMaterialsDto): void {
    if (!confirm(`Delete BOM for "${b.finishedItemName}"?`)) return;
    this.bomService.delete(b.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete BOM (it may be in use).'),
    });
  }

  close(): void { this.showForm.set(false); }
}
