import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService } from '../../core/services/stock.service';
import { ItemService } from '../../core/services/item.service';
import { GodownService } from '../../core/services/godown.service';
import { AdjustmentDirection, GodownDto, ItemDto, StockAdjustmentDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-adjustments',
  standalone: true,
  imports: [ReactiveFormsModule, SlicePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Stock adjustments</h1>
        <p class="page-sub">Record wastage, damage, rust loss, or counting corrections.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New adjustment</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead><tr><th>Number</th><th>Date</th><th>Godown</th><th>Lines</th><th>Reason</th></tr></thead>
        <tbody>
          @for (a of adjustments(); track a.id) {
            <tr>
              <td>{{ a.number }}</td>
              <td>{{ a.date | slice:0:10 }}</td>
              <td>{{ a.godownName }}</td>
              <td>{{ a.lines.length }}</td>
              <td>{{ a.reason || '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="text-align:center;color:var(--muted)">No adjustments yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New stock adjustment</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1">
                  <label>Godown</label>
                  <select formControlName="godownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:2"><label>Reason</label><input formControlName="reason" placeholder="Wastage, damage, count correction…" /></div>
              </div>

              <h4 style="margin:.25rem 0">Lines</h4>
              <div formArrayName="lines">
                @for (row of lines.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Item</label>
                      <select formControlName="itemId">
                        <option value="">— select —</option>
                        @for (i of items(); track i.id) { <option [value]="i.id">{{ i.name }} ({{ i.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1">
                      <label>Direction</label>
                      <select formControlName="direction">
                        <option [value]="1">Increase</option>
                        <option [value]="2">Decrease</option>
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Qty (base)</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                    <div class="field" style="flex:1"><label>Unit cost</label><input type="number" step="0.01" formControlName="unitCost" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeLine(idx)">×</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addLine()">+ Add line</button>

              <div class="field" style="margin-top:.75rem"><label>Notes</label><input formControlName="notes" /></div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || lines.length === 0 || loading()">
                  {{ loading() ? 'Saving…' : 'Post adjustment' }}
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
  `],
})
export class AdjustmentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private itemService = inject(ItemService);
  private godownService = inject(GodownService);

  adjustments = signal<StockAdjustmentDto[]>([]);
  items = signal<ItemDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    reason: [''],
    notes: [''],
    lines: this.fb.array<ReturnType<AdjustmentsComponent['lineGroup']>>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  ngOnInit(): void {
    this.load();
    this.itemService.getAll().subscribe((i) => this.items.set(i.filter((x) => x.trackInventory)));
    this.godownService.getAll().subscribe((g) => { this.godowns.set(g); this.ready.set(true); });
  }

  load(): void {
    this.stockService.getAdjustments().subscribe({
      next: (list) => this.adjustments.set(list),
      error: () => this.error.set('Could not load adjustments.'),
    });
  }

  private lineGroup() {
    return this.fb.nonNullable.group({
      itemId: ['', Validators.required],
      direction: [AdjustmentDirection.Decrease, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.0001)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
    });
  }

  addLine(): void { this.lines.push(this.lineGroup()); }
  removeLine(i: number): void { this.lines.removeAt(i); }

  openNew(): void {
    this.formError.set(null);
    this.lines.clear();
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.form.reset({
      godownId: defaultGodown?.id ?? '', date: new Date().toISOString().substring(0, 10), reason: '', notes: '',
    });
    this.addLine();
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    this.stockService.createAdjustment({
      godownId: v.godownId,
      date: v.date,
      reason: v.reason || null,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        direction: Number(l.direction) as AdjustmentDirection,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
        notes: l.notes || null,
      })),
    }).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post adjustment.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
