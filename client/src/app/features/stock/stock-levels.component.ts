import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService } from '../../core/services/stock.service';
import { ItemService } from '../../core/services/item.service';
import { GodownService } from '../../core/services/godown.service';
import { GodownDto, ItemDto, StockLevelDto } from '../../core/models/domain.models';

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
      <button class="btn btn-primary" (click)="openOpening()" [disabled]="!ready()">+ Opening stock</button>
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
          <tr><th>Item</th><th>Godown</th><th>Quantity</th><th>Avg cost</th><th>Stock value</th><th>Reorder</th></tr>
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
            </tr>
          } @empty {
            <tr><td colspan="6" style="text-align:center;color:var(--muted)">No stock yet. Add opening stock to begin.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showOpening()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>Opening stock</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="field">
                <label>Item</label>
                <select formControlName="itemId">
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
              <div class="row">
                <div class="field" style="flex:1"><label>Quantity (base unit)</label><input type="number" step="0.0001" formControlName="quantity" /></div>
                <div class="field" style="flex:1"><label>Unit cost</label><input type="number" step="0.01" formControlName="unitCost" /></div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
              </div>
              <div class="field"><label>Notes</label><input formControlName="notes" /></div>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Post opening stock' }}
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
  `],
})
export class StockLevelsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private itemService = inject(ItemService);
  private godownService = inject(GodownService);

  levels = signal<StockLevelDto[]>([]);
  items = signal<ItemDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  ready = signal(false);

  showOpening = signal(false);
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
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.form.reset({
      itemId: '', godownId: defaultGodown?.id ?? '', quantity: 0, unitCost: 0,
      date: new Date().toISOString().substring(0, 10), notes: '',
    });
    this.showOpening.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    this.stockService.postOpeningStock({
      itemId: v.itemId, godownId: v.godownId, quantity: Number(v.quantity),
      unitCost: Number(v.unitCost), date: v.date, notes: v.notes || null,
    }).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post opening stock.');
      },
    });
  }

  close(): void { this.showOpening.set(false); }
}
