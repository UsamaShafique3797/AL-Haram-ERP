import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierService } from '../../core/services/supplier.service';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { PurchaseOrderService } from '../../core/services/purchasing-extra.service';
import { AccessService } from '../../core/services/access.service';
import {
  GodownDto, ItemDto, PurchaseOrderDto, PurchaseOrderStatus,
  PurchaseOrderStatusLabels, SupplierDto,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Purchase orders</h1>
        <p class="page-sub">Send orders to suppliers before goods are received.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('purchasing/orders')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New PO</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Orders</span><div class="kpi">{{ orders().length }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total value</span><div class="kpi">{{ money(totalValue()) }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Supplier</th><th>Godown</th><th>Status</th><th>Total</th><th></th></tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr>
              <td>{{ o.number }}</td>
              <td>{{ o.date | date:'mediumDate' }}</td>
              <td>{{ o.supplierName }}</td>
              <td>{{ o.godownName }}</td>
              <td>{{ statusLabel(o.status) }}</td>
              <td>{{ money(o.total) }}</td>
              <td style="text-align:right">
                @if (o.status === draftStatus) {
                  <button class="btn btn-ghost btn-sm" (click)="markSent(o)" [disabled]="actionId() === o.id">
                    {{ actionId() === o.id ? 'Sending…' : 'Mark sent' }}
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No purchase orders yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New purchase order</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Supplier</label>
                  <select formControlName="supplierId">
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
                <div class="field" style="flex:1"><label>Expected</label><input type="date" formControlName="expectedDate" /></div>
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
                    <div class="field" style="flex:1"><label>Rate</label><input type="number" step="0.01" formControlName="rate" /></div>
                    <div class="field" style="flex:1"><label>Discount</label><input type="number" step="0.01" formControlName="discount" /></div>
                    <button type="button" class="btn btn-danger btn-sm" style="margin-bottom:1rem" (click)="removeLine(idx)">×</button>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-sm" (click)="addLine()">+ Add line</button>

              <div class="row" style="margin-top:1rem">
                <div class="field" style="flex:1"><label>Header discount</label><input type="number" step="0.01" formControlName="discount" /></div>
                <div class="field" style="flex:1"><label>Tax %</label><input type="number" step="0.01" formControlName="taxRate" /></div>
              </div>

              <div class="field"><label>Notes</label><input formControlName="notes" /></div>

              <div class="totals card-pad" style="background:#f7f8fa;border-radius:8px;margin-top:.5rem">
                <div class="row"><span class="spacer">Subtotal</span><strong>{{ money(totals().subtotal) }}</strong></div>
                <div class="row"><span class="spacer">Discount</span><strong>{{ money(totals().discount) }}</strong></div>
                <div class="row"><span class="spacer">Tax ({{ totals().taxRate }}%)</span><strong>{{ money(totals().tax) }}</strong></div>
                <div class="row" style="font-size:1.1rem"><span class="spacer"><strong>Total</strong></span><strong style="color:var(--brand)">{{ money(totals().total) }}</strong></div>
              </div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || lines.length === 0 || loading()">
                  {{ loading() ? 'Saving…' : 'Save PO' }}
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
    .modal { width: 100%; max-width: 980px; margin: auto; }
    h4 { font-size: .9rem; }
    .kpi-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .kpi { font-size: 1.4rem; font-weight: 700; margin-top: .25rem; }
    .totals .row { margin: 0; padding: .15rem 0; }
  `],
})
export class PurchaseOrdersComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private poService = inject(PurchaseOrderService);
  private supplierService = inject(SupplierService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);

  orders = signal<PurchaseOrderDto[]>([]);
  suppliers = signal<SupplierDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  actionId = signal<string | null>(null);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  private formTick = signal(0);

  readonly draftStatus = PurchaseOrderStatus.Draft;

  totalValue = computed(() => this.orders().reduce((s, o) => s + o.total, 0));

  form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    expectedDate: [''],
    discount: [0, [Validators.min(0)]],
    taxRate: [0, [Validators.min(0)]],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  totals = computed(() => {
    this.formTick();
    const v = this.form.getRawValue();
    const subtotal = v.lines.reduce(
      (s: number, l: any) =>
        s + (Number(l.quantity) * Number(l.rate) - Number(l.discount || 0)),
      0,
    );
    const discount = Number(v.discount || 0);
    const taxRate = Number(v.taxRate || 0);
    const tax = Math.max(0, subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + tax;
    return { subtotal, discount, taxRate, tax, total };
  });

  ngOnInit(): void {
    this.load();
    forkJoin({
      suppliers: this.supplierService.getAll(),
      godowns: this.godownService.getAll(),
      items: this.itemService.getAll(),
    }).subscribe(({ suppliers, godowns, items }) => {
      this.suppliers.set(suppliers.filter((s) => s.isActive));
      this.godowns.set(godowns);
      this.items.set(items.filter((i) => i.isActive));
      this.ready.set(true);
    });
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.poService.getAll().subscribe({
      next: (list) => this.orders.set(list),
      error: () => this.error.set('Could not load purchase orders.'),
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusLabel(status: number): string {
    return PurchaseOrderStatusLabels[status] ?? String(status);
  }

  markSent(o: PurchaseOrderDto): void {
    this.actionId.set(o.id);
    this.poService.updateStatus(o.id, PurchaseOrderStatus.Sent).subscribe({
      next: () => { this.actionId.set(null); this.load(); },
      error: () => { this.actionId.set(null); this.error.set('Could not mark PO as sent.'); },
    });
  }

  private lineGroup(): FormGroup {
    return this.fb.nonNullable.group({
      itemId: ['', Validators.required],
      unitId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
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
    row.patchValue({ unitId: item.baseUnitId, rate: item.defaultPurchaseRate });
  }

  openNew(): void {
    this.formError.set(null);
    const defaultGodown = this.godowns().find((g) => g.isDefault) ?? this.godowns()[0];
    this.lines.clear();
    this.form.reset({
      supplierId: '',
      godownId: defaultGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      expectedDate: '',
      discount: 0,
      taxRate: 0,
      notes: '',
    });
    this.addLine();
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.poService.create({
      date: v.date,
      expectedDate: v.expectedDate || null,
      supplierId: v.supplierId,
      godownId: v.godownId,
      discount: Number(v.discount || 0),
      taxRate: Number(v.taxRate || 0),
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        unitId: l.unitId,
        quantity: Number(l.quantity),
        rate: Number(l.rate),
        discount: Number(l.discount || 0),
      })),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save purchase order.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
