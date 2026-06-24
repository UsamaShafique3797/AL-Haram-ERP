import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierService } from '../../core/services/supplier.service';
import { GodownService } from '../../core/services/godown.service';
import { ItemService } from '../../core/services/item.service';
import { PaymentAccountService } from '../../core/services/payment-account.service';
import { PurchaseInvoiceService } from '../../core/services/purchase-invoice.service';
import { AccessService } from '../../core/services/access.service';
import {
  GodownDto, ItemDto, PaymentAccountDto, PurchaseInvoiceDto, SupplierDto,
} from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-purchase-invoices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Purchase invoices</h1>
        <p class="page-sub">Record supplier bills (cash or credit), add stock at weighted-average cost, and track payables.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('purchasing/invoices')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New invoice</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Invoices</span><div class="kpi">{{ invoices().length }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Purchase total</span><div class="kpi">{{ money(totalPurchases()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Outstanding</span><div class="kpi" [style.color]="outstanding() ? 'var(--warn)' : 'var(--ink)'">{{ money(outstanding()) }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search purchase invoices…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Balance</th></tr>
        </thead>
        <tbody>
          @for (i of filteredRows(); track i.id) {
            <tr>
              <td>{{ i.number }}</td>
              <td>{{ i.date | date:'mediumDate' }}</td>
              <td>{{ i.supplierName }}</td>
              <td>{{ money(i.total) }}</td>
              <td>{{ money(i.amountAllocated) }}</td>
              <td [style.color]="i.balance > 0 ? 'var(--warn)' : 'var(--success)'">{{ money(i.balance) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No purchase invoices yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New purchase invoice</h3>
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
                <div class="field" style="flex:1"><label>Paid now</label><input type="number" step="0.01" formControlName="paidAmount" /></div>
                <div class="field" style="flex:1">
                  <label>Payment account</label>
                  <select formControlName="paymentAccountId">
                    <option value="">— none —</option>
                    @for (a of paymentAccounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
                  </select>
                </div>
              </div>

              <div class="field"><label>Notes</label><input formControlName="notes" /></div>

              <div class="totals card-pad" style="background:#f7f8fa;border-radius:8px;margin-top:.5rem">
                <div class="row"><span class="spacer">Subtotal</span><strong>{{ money(totals().subtotal) }}</strong></div>
                <div class="row"><span class="spacer">Discount</span><strong>{{ money(totals().discount) }}</strong></div>
                <div class="row"><span class="spacer">Tax ({{ totals().taxRate }}%)</span><strong>{{ money(totals().tax) }}</strong></div>
                <div class="row" style="font-size:1.1rem"><span class="spacer"><strong>Total</strong></span><strong style="color:var(--brand)">{{ money(totals().total) }}</strong></div>
                <div class="row"><span class="spacer">Paid now</span><strong>{{ money(totals().paid) }}</strong></div>
                <div class="row"><span class="spacer">Balance (credit)</span><strong [style.color]="totals().balance > 0 ? 'var(--warn)' : 'var(--success)'">{{ money(totals().balance) }}</strong></div>
              </div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || lines.length === 0 || loading()">
                  {{ loading() ? 'Posting…' : 'Post invoice' }}
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
export class PurchaseInvoicesComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private invoiceService = inject(PurchaseInvoiceService);
  private supplierService = inject(SupplierService);
  private godownService = inject(GodownService);
  private itemService = inject(ItemService);
  private paymentAccountService = inject(PaymentAccountService);

  invoices = signal<PurchaseInvoiceDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.invoices(), this.searchTerm()));
  suppliers = signal<SupplierDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  items = signal<ItemDto[]>([]);
  paymentAccounts = signal<PaymentAccountDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  private formTick = signal(0);

  totalPurchases = computed(() => this.invoices().reduce((s, i) => s + i.total, 0));
  outstanding = computed(() => this.invoices().reduce((s, i) => s + Math.max(0, i.balance), 0));

  form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    godownId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    discount: [0, [Validators.min(0)]],
    taxRate: [0, [Validators.min(0)]],
    paidAmount: [0, [Validators.min(0)]],
    paymentAccountId: [''],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  totals = computed(() => {
    this.formTick();
    const v = this.form.getRawValue();
    const subtotal = v.lines.reduce(
      (s: number, l: any) => s + (Number(l.quantity) * Number(l.rate) - Number(l.discount || 0)),
      0,
    );
    const discount = Number(v.discount || 0);
    const taxRate = Number(v.taxRate || 0);
    const tax = Math.max(0, subtotal - discount) * taxRate / 100;
    const total = subtotal - discount + tax;
    const paid = Number(v.paidAmount || 0);
    return { subtotal, discount, taxRate, tax, total, paid, balance: total - paid };
  });


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    this.load();
    forkJoin({
      suppliers: this.supplierService.getAll(),
      godowns: this.godownService.getAll(),
      items: this.itemService.getAll(),
      accounts: this.paymentAccountService.getAll(),
    }).subscribe(({ suppliers, godowns, items, accounts }) => {
      this.suppliers.set(suppliers.filter((s) => s.isActive));
      this.godowns.set(godowns);
      this.items.set(items.filter((i) => i.isActive));
      this.paymentAccounts.set(accounts.filter((a) => a.isActive));
      this.ready.set(true);
    });
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.invoiceService.getAll().subscribe({
      next: (list) => this.invoices.set(list),
      error: () => this.error.set('Could not load purchase invoices.'),
    });
  }

  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const defaultAccount = this.paymentAccounts().find((a) => a.isDefault) ?? this.paymentAccounts()[0];
    this.lines.clear();
    this.form.reset({
      supplierId: '',
      godownId: defaultGodown?.id ?? '',
      date: new Date().toISOString().substring(0, 10),
      discount: 0,
      taxRate: 0,
      paidAmount: 0,
      paymentAccountId: defaultAccount?.id ?? '',
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

    this.invoiceService.create({
      date: v.date,
      supplierId: v.supplierId,
      godownId: v.godownId,
      discount: Number(v.discount || 0),
      taxRate: Number(v.taxRate || 0),
      paidAmount: Number(v.paidAmount || 0),
      paymentAccountId: v.paidAmount > 0 ? (v.paymentAccountId || null) : null,
      notes: v.notes || null,
      lines: v.lines.map((l: any) => ({
        itemId: l.itemId,
        unitId: l.unitId,
        quantity: Number(l.quantity),
        rate: Number(l.rate),
        discount: Number(l.discount || 0),
      })),
    }).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post invoice.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
