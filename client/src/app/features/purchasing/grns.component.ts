import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierService } from '../../core/services/supplier.service';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { GrnService, PurchaseOrderService } from '../../core/services/purchasing-extra.service';
import { AccessService } from '../../core/services/access.service';
import {
  GodownDto, GrnDto, ItemDto, PurchaseOrderDto, SupplierDto,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-grns',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Goods received (GRN)</h1>
        <p class="page-sub">Record incoming stock from suppliers, optionally linked to a PO.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('purchasing/grns')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New GRN</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Supplier</th><th>Godown</th><th>PO</th><th>Lines</th></tr>
        </thead>
        <tbody>
          @for (g of grns(); track g.id) {
            <tr>
              <td>{{ g.number }}</td>
              <td>{{ g.date | date:'mediumDate' }}</td>
              <td>{{ g.supplierName }}</td>
              <td>{{ g.godownName }}</td>
              <td>{{ g.purchaseOrderNumber || '—' }}</td>
              <td>{{ g.lines.length }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" style="text-align:center;color:var(--muted)">No GRNs yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New GRN</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Supplier</label>
                  <select formControlName="supplierId" (change)="onSupplierChange()">
                    <option value="">— select —</option>
                    @for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1">
                  <label>Godown</label>
                  <select formControlName="godownId">
                    <option value="">— select —</option>
                    @for (g of godowns(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
              </div>

              <div class="field">
                <label>Purchase order (optional)</label>
                <select formControlName="purchaseOrderId" (change)="onPoChange()">
                  <option value="">— none —</option>
                  @for (po of filteredPos(); track po.id) {
                    <option [value]="po.id">{{ po.number }} — {{ po.supplierName }}</option>
                  }
                </select>
              </div>

              <h4 style="margin:.25rem 0">Lines</h4>
              <div formArrayName="lines">
                @for (row of lines.controls; track $index; let idx = $index) {
                  <div class="row" [formGroupName]="idx" style="align-items:flex-end">
                    <div class="field" style="flex:2">
                      <label>Item</label>
                      <select formControlName="itemId" (change)="onItemChange(idx)">
                        <option value="">— select —</option>
                        @for (it of items(); track it.id) { <option [value]="it.id">{{ it.name }} ({{ it.code }})</option> }
                      </select>
                    </div>
                    <div class="field" style="flex:1">
                      <label>Unit</label>
                      <select formControlName="unitId">
                        @for (u of unitsFor(idx); track u.unitId) {
                          <option [value]="u.unitId">{{ u.unitCode }}</option>
                        }
                      </select>
                    </div>
                    <div class="field" style="flex:1"><label>Qty</label><input type="number" step="0.0001" formControlName="quantity" /></div>
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
                  {{ loading() ? 'Posting…' : 'Post GRN' }}
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
      display: grid; place-items: flex-start; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 820px; margin: auto; }
    h4 { font-size: .9rem; }
  `],
})
export class GrnsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private grnService = inject(GrnService);
  private poService = inject(PurchaseOrderService);
  private supplierService = inject(SupplierService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);

  grns = signal<GrnDto[]>([]);
  purchaseOrders = signal<PurchaseOrderDto[]>([]);
  suppliers = signal<SupplierDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    purchaseOrderId: [''],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  filteredPos = signal<PurchaseOrderDto[]>([]);

  ngOnInit(): void {
    this.load();
    forkJoin({
      suppliers: this.supplierService.getAll(),
      godowns: this.godownService.getAll(),
      items: this.itemService.getAll(),
      pos: this.poService.getAll(),
    }).subscribe(({ suppliers, godowns, items, pos }) => {
      this.suppliers.set(suppliers.filter((s) => s.isActive));
      this.godowns.set(godowns);
      this.items.set(items.filter((i) => i.isActive));
      this.purchaseOrders.set(pos);
      this.ready.set(true);
    });
  }

  load(): void {
    this.grnService.getAll().subscribe({
      next: (list) => this.grns.set(list),
      error: () => this.error.set('Could not load GRNs.'),
    });
  }

  private lineGroup(): FormGroup {
    return this.fb.nonNullable.group({
      itemId: ['', Validators.required],
      unitId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      purchaseOrderLineId: [''],
    });
  }

  addLine(): void { this.lines.push(this.lineGroup()); }
  removeLine(i: number): void { this.lines.removeAt(i); }

  unitsFor(idx: number): { unitId: string; unitCode: string }[] {
    const itemId = this.lines.at(idx).get('itemId')?.value;
    if (!itemId) return [];
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return [];
    const base = { unitId: item.baseUnitId, unitCode: item.baseUnitCode };
    const extras = (item.units ?? [])
      .filter((u) => !u.isBaseUnit)
      .map((u) => ({ unitId: u.unitId, unitCode: u.unitCode }));
    return [base, ...extras];
  }

  onItemChange(idx: number): void {
    const row = this.lines.at(idx);
    const itemId = row.get('itemId')?.value;
    const item = this.items().find((i) => i.id === itemId);
    if (!item) return;
    row.patchValue({ unitId: item.baseUnitId, unitCost: item.defaultPurchaseRate });
  }

  onSupplierChange(): void {
    const supplierId = this.form.get('supplierId')?.value;
    this.filteredPos.set(
      supplierId ? this.purchaseOrders().filter((po) => po.supplierId === supplierId) : this.purchaseOrders(),
    );
    this.form.patchValue({ purchaseOrderId: '' });
  }

  onPoChange(): void {
    const poId = this.form.get('purchaseOrderId')?.value;
    if (!poId) return;
    const po = this.purchaseOrders().find((p) => p.id === poId);
    if (!po) return;

    this.form.patchValue({
      supplierId: po.supplierId,
      godownId: po.godownId,
    });
    this.lines.clear();
    for (const pl of po.lines) {
      this.lines.push(this.fb.nonNullable.group({
        itemId: [pl.itemId, Validators.required],
        unitId: [pl.unitId, Validators.required],
        quantity: [pl.pendingQuantity > 0 ? pl.pendingQuantity : pl.quantity, [Validators.required, Validators.min(0.0001)]],
        unitCost: [pl.rate, [Validators.required, Validators.min(0)]],
        purchaseOrderLineId: [pl.id],
      }));
    }
    if (this.lines.length === 0) this.addLine();
  }

  openNew(): void {
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.lines.clear();
    this.form.reset({
      supplierId: '',
      godownId: defaultGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      purchaseOrderId: '',
      notes: '',
    });
    this.filteredPos.set(this.purchaseOrders());
    this.addLine();
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.grnService.create({
      date: v.date,
      supplierId: v.supplierId,
      godownId: v.godownId,
      purchaseOrderId: v.purchaseOrderId || null,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        unitId: l.unitId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
        purchaseOrderLineId: l.purchaseOrderLineId || null,
      })),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post GRN.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
