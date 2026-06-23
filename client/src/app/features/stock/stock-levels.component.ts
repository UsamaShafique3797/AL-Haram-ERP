import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService } from '../../core/services/stock.service';
import { ItemService } from '../../core/services/item.service';
import { GodownService } from '../../core/services/godown.service';
import { AccessService } from '../../core/services/access.service';
import { GodownDto, ItemDto, StockLevelDto } from '../../core/models/domain.models';

type FormMode = 'opening' | 'edit';

@Component({
  selector: 'app-stock-levels',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Stock on hand</h1>
        <p class="page-sub">Live quantity and weighted-average value per item, per godown.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('stock/levels')) {
        <button class="btn btn-primary" (click)="openOpening()" [disabled]="!ready()">+ Opening stock</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total stock value</span><div class="kpi">{{ money(totalValue()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Stock rows</span><div class="kpi">{{ levels().length }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Low-stock items</span><div class="kpi" [style.color]="lowCount() ? 'var(--warn)' : 'var(--ink)'">{{ lowCount() }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Item</th><th>Godown</th><th>Quantity</th><th>Avg cost</th><th>Stock value</th><th>Reorder</th><th style="text-align:right">Actions</th></tr>
        </thead>
        <tbody>
          @for (s of levels(); track s.itemId + s.godownId) {
            <tr>
              <td>{{ s.itemName }} <span class="badge badge-muted" style="margin-left:.3rem">{{ s.itemCode }}</span>
                @if (s.isLowStock) { <span class="badge badge-low" style="margin-left:.3rem">Low</span> }
              </td>
              <td>{{ s.godownName }}</td>
              <td>{{ num(s.quantity) }} {{ s.baseUnitCode }}</td>
              <td>{{ money(s.averageCost) }}</td>
              <td>{{ money(s.stockValue) }}</td>
              <td>{{ s.reorderLevel > 0 ? num(s.reorderLevel) : '—' }}</td>
              <td style="text-align:right;white-space:nowrap">
                @if (access.canWrite('stock/levels')) {
                  <button class="btn btn-ghost btn-sm" (click)="openEdit(s)">Edit</button>
                }
                @if (access.canDelete('stock/levels')) {
                  <button class="btn btn-danger btn-sm" (click)="remove(s)" [disabled]="deletingKey() === s.itemId + s.godownId">
                    {{ deletingKey() === s.itemId + s.godownId ? 'Deleting…' : 'Delete' }}
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No stock yet. Add opening stock to begin.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ formMode() === 'edit' ? 'Edit stock on hand' : 'Opening stock' }}</h3>
            @if (formMode() === 'edit') {
              <p class="page-sub" style="margin-top:0">{{ editingLabel() }}</p>
            }
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              @if (formMode() === 'edit') {
                <div class="field">
                  <label>Item</label>
                  <div class="readonly">{{ editingItemLabel() }}</div>
                </div>
                <div class="field">
                  <label>Godown</label>
                  <div class="readonly">{{ editingGodownLabel() }}</div>
                </div>
              } @else {
                <div class="field">
                  <label>Item</label>
                  <select formControlName="itemId" (change)="onItemChange()">
                    <option value="">— select —</option>
                    @for (i of items(); track i.id) { <option [value]="i.id">{{ i.name }} ({{ i.code }})</option> }
                  </select>
                </div>
                <div class="field">
                  <label>Godown</label>
                  <select formControlName="godownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
              }
              <div class="row">
                <div class="field" style="flex:1"><label>Quantity (base unit)</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                <div class="field" style="flex:1">
                  <label>Unit cost</label>
                  <input type="number" step="0.01" formControlName="unitCost" />
                  @if (formMode() === 'opening') {
                    <span class="hint">Pre-filled from item purchase rate — change if actual cost differs.</span>
                  }
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
              </div>
              <div class="field"><label>Notes</label><input formControlName="notes" /></div>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : (formMode() === 'edit' ? 'Save changes' : 'Post opening stock') }}
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
    .modal { width: 100%; max-width: 560px; margin: auto; }
    .badge-low { background: #fff4e6; color: var(--warn); }
    .kpi-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .kpi { font-size: 1.4rem; font-weight: 700; margin-top: .25rem; }
    .hint { display: block; font-size: .72rem; color: var(--muted); margin-top: .25rem; }
    .readonly { padding: .55rem .65rem; background: var(--surface, #f8f9fb); border: 1px solid var(--line); border-radius: 6px; font-size: .9rem; }
  `],
})
export class StockLevelsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private itemService = inject(ItemService);
  private godownService = inject(GodownService);

  levels = signal<StockLevelDto[]>([]);
  items = signal<ItemDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  formMode = signal<FormMode>('opening');
  editingLabel = signal('');
  editingItemLabel = signal('');
  editingGodownLabel = signal('');
  deletingKey = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  totalValue = computed(() => this.levels().reduce((sum, s) => sum + s.stockValue, 0));
  lowCount = computed(() => this.levels().filter((s) => s.isLowStock).length);

  form = this.fb.nonNullable.group({
    itemId: ['', Validators.required],
    godownId: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.load();
    this.itemService.getAll().subscribe((i) => this.items.set(i.filter((x) => x.trackInventory)));
    this.godownService.getAll().subscribe((g) => { this.godowns.set(g); this.ready.set(true); });
  }

  num(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  money(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  load(): void {
    this.stockService.getLevels().subscribe({
      next: (list) => this.levels.set(list),
      error: () => this.error.set('Could not load stock levels.'),
    });
  }

  openOpening(): void {
    this.formMode.set('opening');
    this.editingLabel.set('');
    this.editingItemLabel.set('');
    this.editingGodownLabel.set('');
    this.formError.set(null);
    this.form.get('quantity')?.setValidators([Validators.required, Validators.min(0.0001)]);
    this.form.get('quantity')?.updateValueAndValidity();
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.form.reset({
      itemId: '', godownId: defaultGodown?.id ?? '', quantity: 0, unitCost: 0,
      date: new Date().toISOString().substring(0, 10), notes: '',
    });
    this.showForm.set(true);
  }

  openEdit(level: StockLevelDto): void {
    this.formMode.set('edit');
    this.editingLabel.set(`${level.itemName} · ${level.godownName}`);
    this.editingItemLabel.set(`${level.itemName} (${level.itemCode})`);
    this.editingGodownLabel.set(level.godownName);
    this.formError.set(null);
    this.form.get('quantity')?.setValidators([Validators.required, Validators.min(0)]);
    this.form.get('quantity')?.updateValueAndValidity();
    this.form.reset({
      itemId: level.itemId,
      godownId: level.godownId,
      quantity: level.quantity,
      unitCost: level.averageCost,
      date: new Date().toISOString().substring(0, 10),
      notes: '',
    });
    this.showForm.set(true);
  }

  onItemChange(): void {
    if (this.formMode() !== 'opening') return;
    const itemId = this.form.get('itemId')?.value;
    const item = this.items().find((i) => i.id === itemId);
    if (item && item.defaultPurchaseRate > 0) {
      this.form.patchValue({ unitCost: item.defaultPurchaseRate });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      itemId: v.itemId,
      godownId: v.godownId,
      quantity: Number(v.quantity),
      unitCost: Number(v.unitCost),
      date: v.date,
      notes: v.notes.trim() || null,
    };

    const onSuccess = () => { this.loading.set(false); this.close(); this.load(); };
    const onError = (err: { error?: { errors?: string[] | Record<string, string[]>; title?: string } }) => {
      this.loading.set(false);
      this.formError.set(this.apiError(err, this.formMode() === 'edit' ? 'Could not update stock.' : 'Could not post opening stock.'));
    };

    if (this.formMode() === 'edit') {
      this.stockService.updateStockLevel(payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.stockService.postOpeningStock(payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  remove(level: StockLevelDto): void {
    if (!confirm(`Remove all stock for "${level.itemName}" in ${level.godownName}? This cannot be undone.`)) return;
    const key = level.itemId + level.godownId;
    this.deletingKey.set(key);
    this.error.set(null);
    this.stockService.deleteStockLevel(level.itemId, level.godownId).subscribe({
      next: () => { this.deletingKey.set(null); this.load(); },
      error: (err) => { this.deletingKey.set(null); this.error.set(this.apiError(err, 'Could not delete stock.')); },
    });
  }

  close(): void {
    this.showForm.set(false);
  }

  private apiError(err: { error?: { errors?: string[] | Record<string, string[]>; title?: string } }, fallback: string): string {
    const body = err?.error;
    if (!body) return fallback;
    if (Array.isArray(body.errors) && body.errors.length) return body.errors[0];
    if (body.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
    return body.title ?? fallback;
  }
}
