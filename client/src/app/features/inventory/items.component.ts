import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';
import { CategoryService } from '../../core/services/category.service';
import { UnitService } from '../../core/services/unit.service';
import { StockService } from '../../core/services/stock.service';
import { CategoryDto, ItemDto, StockMovementDto, UnitDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [ReactiveFormsModule, SlicePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Items</h1>
        <p class="page-sub">Your product catalog with steel attributes and dual units.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New item</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (ready() && categories().length === 0) {
      <div class="alert alert-error">Add at least one category and unit before creating items.</div>
    }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Code</th><th>Name</th><th>Category</th><th>On hand</th><th>Stock value</th><th>Sale rate</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (i of items(); track i.id) {
            <tr>
              <td>{{ i.code }}</td>
              <td>
                {{ i.name }}
                @if (i.isLowStock) { <span class="badge badge-low" style="margin-left:.4rem">Low</span> }
              </td>
              <td>{{ i.categoryName }}</td>
              <td>{{ num(i.stockOnHand) }} {{ i.baseUnitCode }}</td>
              <td>{{ money(i.stockValue) }}</td>
              <td>{{ money(i.defaultSaleRate) }}</td>
              <td>
                @if (i.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn btn-ghost btn-sm" (click)="viewMovements(i)">Movements</button>
                <button class="btn btn-ghost btn-sm" (click)="edit(i)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="remove(i)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" style="text-align:center;color:var(--muted)">No items yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit item' : 'New item' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1"><label>Code / SKU</label><input formControlName="code" /></div>
                <div class="field" style="flex:2"><label>Name</label><input formControlName="name" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1">
                  <label>Category</label>
                  <select formControlName="categoryId">
                    <option value="">— select —</option>
                    @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1">
                  <label>Base unit</label>
                  <select formControlName="baseUnitId">
                    <option value="">— select —</option>
                    @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }} ({{ u.code }})</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Brand</label><input formControlName="brand" /></div>
              </div>

              <h4 style="margin:.5rem 0 .25rem">Steel attributes <span style="color:var(--muted);font-weight:400">(optional)</span></h4>
              <div class="row">
                <div class="field" style="flex:1"><label>Diameter (mm)</label><input type="number" step="0.01" formControlName="diameter" /></div>
                <div class="field" style="flex:1"><label>Grade</label><input formControlName="grade" /></div>
                <div class="field" style="flex:1"><label>Length (ft)</label><input type="number" step="0.01" formControlName="length" /></div>
                <div class="field" style="flex:1"><label>Weight/piece (kg)</label><input type="number" step="0.0001" formControlName="weightPerPiece" /></div>
              </div>

              <h4 style="margin:.5rem 0 .25rem">Pricing & stock</h4>
              <div class="row">
                <div class="field" style="flex:1"><label>Purchase rate</label><input type="number" step="0.01" formControlName="defaultPurchaseRate" /></div>
                <div class="field" style="flex:1"><label>Sale rate</label><input type="number" step="0.01" formControlName="defaultSaleRate" /></div>
                <div class="field" style="flex:1"><label>Reorder level</label><input type="number" step="0.01" formControlName="reorderLevel" /></div>
                <div class="field" style="flex:1"><label>HS / tax code</label><input formControlName="hsCode" /></div>
              </div>

              <h4 style="margin:.5rem 0 .25rem">Secondary units</h4>
              <p style="color:var(--muted);font-size:.78rem;margin:0 0 .5rem">
                How many base units equal one of this unit (e.g. kg per piece). The base unit is added automatically.
              </p>
              <div formArrayName="additionalUnits">
                @for (row of additionalUnits.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Unit</label>
                      <select formControlName="unitId">
                        <option value="">— select —</option>
                        @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }} ({{ u.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Base units / 1</label><input type="number" step="0.0001" formControlName="conversionFactor" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeUnit(idx)">Remove</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addUnit()">+ Add secondary unit</button>

              <div class="row" style="gap:1.5rem;margin-top:.75rem">
                <label class="check"><input type="checkbox" formControlName="trackInventory" /> Track inventory</label>
                <label class="check"><input type="checkbox" formControlName="isActive" /> Active</label>
              </div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Save item' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    @if (showMovements()) {
      <div class="modal-backdrop" (click)="closeMovements()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>Movements — {{ movementsItem()?.name }}</h3>
            <table class="table">
              <thead><tr><th>Date</th><th>Type</th><th>Godown</th><th>Qty</th><th>Unit cost</th><th>Balance</th></tr></thead>
              <tbody>
                @for (m of movements(); track m.id) {
                  <tr>
                    <td>{{ m.date | slice:0:10 }}</td>
                    <td>{{ m.type }}</td>
                    <td>{{ m.godownName }}</td>
                    <td [style.color]="m.quantity < 0 ? 'var(--brand)' : 'var(--success)'">{{ num(m.quantity) }}</td>
                    <td>{{ money(m.unitCost) }}</td>
                    <td>{{ num(m.quantityAfter) }} &#64; {{ money(m.averageCostAfter) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" style="text-align:center;color:var(--muted)">No movements yet.</td></tr>
                }
              </tbody>
            </table>
            <div class="row" style="justify-content:flex-end;margin-top:1rem">
              <button type="button" class="btn btn-ghost" (click)="closeMovements()">Close</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(16,24,40,.45);
      display: grid; place-items: center; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 780px; margin: auto; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
    .badge-low { background: #fff4e6; color: var(--warn); }
    h4 { font-size: .9rem; }
  `],
})
export class ItemsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ItemService);
  private categoryService = inject(CategoryService);
  private unitService = inject(UnitService);
  private stockService = inject(StockService);

  items = signal<ItemDto[]>([]);
  categories = signal<CategoryDto[]>([]);
  units = signal<UnitDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editingId: string | null = null;

  showMovements = signal(false);
  movements = signal<StockMovementDto[]>([]);
  movementsItem = signal<ItemDto | null>(null);

  form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    categoryId: ['', Validators.required],
    baseUnitId: ['', Validators.required],
    brand: [''],
    hsCode: [''],
    diameter: [null as number | null],
    grade: [''],
    length: [null as number | null],
    weightPerPiece: [null as number | null],
    defaultPurchaseRate: [0],
    defaultSaleRate: [0],
    reorderLevel: [0],
    trackInventory: [true],
    isActive: [true],
    additionalUnits: this.fb.array<ReturnType<ItemsComponent['unitGroup']>>([]),
  });

  get additionalUnits(): FormArray { return this.form.get('additionalUnits') as FormArray; }

  ngOnInit(): void {
    this.load();
    this.categoryService.getAll().subscribe((c) => this.categories.set(c));
    this.unitService.getAll().subscribe((u) => { this.units.set(u); this.ready.set(true); });
  }

  num(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  money(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.items.set(list),
      error: () => this.error.set('Could not load items.'),
    });
  }

  private unitGroup(unitId = '', factor = 1) {
    return this.fb.nonNullable.group({
      unitId: [unitId, Validators.required],
      conversionFactor: [factor, [Validators.required, Validators.min(0.0001)]],
    });
  }

  addUnit(): void { this.additionalUnits.push(this.unitGroup()); }
  removeUnit(i: number): void { this.additionalUnits.removeAt(i); }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    this.additionalUnits.clear();
    this.form.reset({
      code: '', name: '', categoryId: '', baseUnitId: '', brand: '', hsCode: '',
      diameter: null, grade: '', length: null, weightPerPiece: null,
      defaultPurchaseRate: 0, defaultSaleRate: 0, reorderLevel: 0, trackInventory: true, isActive: true,
    });
    this.showForm.set(true);
  }

  edit(i: ItemDto): void {
    this.editingId = i.id;
    this.formError.set(null);
    this.additionalUnits.clear();
    i.units.filter((u) => !u.isBaseUnit).forEach((u) => this.additionalUnits.push(this.unitGroup(u.unitId, u.conversionFactor)));
    this.form.reset({
      code: i.code, name: i.name, categoryId: i.categoryId, baseUnitId: i.baseUnitId,
      brand: i.brand ?? '', hsCode: i.hsCode ?? '',
      diameter: i.diameter ?? null, grade: i.grade ?? '', length: i.length ?? null, weightPerPiece: i.weightPerPiece ?? null,
      defaultPurchaseRate: i.defaultPurchaseRate, defaultSaleRate: i.defaultSaleRate, reorderLevel: i.reorderLevel,
      trackInventory: i.trackInventory, isActive: i.isActive,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      diameter: v.diameter === null || (v.diameter as any) === '' ? null : Number(v.diameter),
      length: v.length === null || (v.length as any) === '' ? null : Number(v.length),
      weightPerPiece: v.weightPerPiece === null || (v.weightPerPiece as any) === '' ? null : Number(v.weightPerPiece),
      additionalUnits: v.additionalUnits.map((u: any) => ({ unitId: u.unitId, conversionFactor: Number(u.conversionFactor) })),
    };
    const req = this.editingId ? this.service.update(this.editingId, payload) : this.service.create(payload);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save item.');
      },
    });
  }

  remove(i: ItemDto): void {
    if (!confirm(`Delete item "${i.name}"?`)) return;
    this.service.delete(i.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete item.'),
    });
  }

  viewMovements(i: ItemDto): void {
    this.movementsItem.set(i);
    this.movements.set([]);
    this.showMovements.set(true);
    this.stockService.getMovements(i.id).subscribe((m) => this.movements.set(m));
  }

  closeMovements(): void { this.showMovements.set(false); }
  close(): void { this.showForm.set(false); }
}
