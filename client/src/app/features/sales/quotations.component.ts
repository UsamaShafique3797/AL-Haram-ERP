import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { ItemService } from '../../core/services/item.service';
import { QuotationService } from '../../core/services/remaining-features.service';
import { AccessService } from '../../core/services/access.service';
import {
  CustomerDto, ItemDto, QuotationDto, QuotationStatus, QuotationStatusLabels,
} from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-quotations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, RouterLink, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Quotations</h1>
        <p class="page-sub">Prepare price quotes for customers before invoicing.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('sales/quotations')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New quotation</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Quotations</span><div class="kpi">{{ quotations().length }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total value</span><div class="kpi">{{ money(totalValue()) }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search quotations…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Customer</th><th>Valid until</th><th>Status</th><th>Total</th><th></th></tr>
        </thead>
        <tbody>
          @for (q of filteredRows(); track q.id) {
            <tr>
              <td><a [routerLink]="['/sales/quotations', q.id, 'print']">{{ q.number }}</a></td>
              <td>{{ q.date | date:'mediumDate' }}</td>
              <td>{{ q.customerName }}</td>
              <td>{{ q.validUntil ? (q.validUntil | date:'mediumDate') : '—' }}</td>
              <td>{{ statusLabel(q.status) }}</td>
              <td>{{ money(q.total) }}</td>
              <td style="text-align:right; white-space:nowrap">
                <a class="btn btn-ghost btn-sm" [routerLink]="['/sales/quotations', q.id, 'print']">PDF</a>
                @if (q.status !== convertedStatus) {
                  @if (access.canWrite('sales/quotations')) {
                    <button class="btn btn-ghost btn-sm" (click)="edit(q)">Edit</button>
                  }
                  @if (access.canDelete('sales/quotations')) {
                    <button class="btn btn-danger btn-sm" (click)="remove(q)">Delete</button>
                  }
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No quotations yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit quotation' : 'New quotation' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Customer</label>
                  <input type="text" formControlName="customerName" list="quote-customer-list"
                         placeholder="Type customer name…" autocomplete="off" />
                  <datalist id="quote-customer-list">
                    @for (c of customers(); track c.id) { <option [value]="c.name"></option> }
                  </datalist>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:1"><label>Valid until</label><input type="date" formControlName="validUntil" /></div>
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
                  {{ loading() ? 'Saving…' : (editingId ? 'Save changes' : 'Save quotation') }}
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
export class QuotationsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private quotationService = inject(QuotationService);
  private customerService = inject(CustomerService);
  private itemService = inject(ItemService);
  private router = inject(Router);

  quotations = signal<QuotationDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.quotations(), this.searchTerm()));
  customers = signal<CustomerDto[]>([]);
  items = signal<ItemDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  private formTick = signal(0);
  editingId: string | null = null;
  readonly convertedStatus = QuotationStatus.Converted;

  totalValue = computed(() => this.quotations().reduce((s, q) => s + q.total, 0));

  form = this.fb.nonNullable.group({
    customerName: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    validUntil: [''],
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


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    this.load();
    forkJoin({
      customers: this.customerService.getAll(),
      items: this.itemService.getAll(),
    }).subscribe(({ customers, items }) => {
      this.customers.set(customers.filter((c) => c.isActive));
      this.items.set(items.filter((i) => i.isActive));
      this.ready.set(true);
    });
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.quotationService.getAll().subscribe({
      next: (list) => this.quotations.set(list),
      error: () => this.error.set('Could not load quotations.'),
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusLabel(status: number): string {
    return QuotationStatusLabels[status] ?? String(status);
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
    row.patchValue({ unitId: item.baseUnitId, rate: item.defaultSaleRate });
  }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    this.lines.clear();
    this.form.reset({
      customerName: '',
      date: new Date().toISOString().substring(0, 10),
      validUntil: '',
      discount: 0,
      taxRate: 0,
      notes: '',
    });
    this.addLine();
    this.showForm.set(true);
  }

  edit(q: QuotationDto): void {
    this.editingId = q.id;
    this.formError.set(null);
    this.lines.clear();
    this.form.reset({
      customerName: q.customerName,
      date: q.date.substring(0, 10),
      validUntil: q.validUntil ? q.validUntil.substring(0, 10) : '',
      discount: q.discount,
      taxRate: q.taxRate,
      notes: q.notes ?? '',
    });
    for (const l of q.lines) {
      this.lines.push(this.fb.nonNullable.group({
        itemId: [l.itemId, Validators.required],
        unitId: [l.unitId, Validators.required],
        quantity: [l.quantity, [Validators.required, Validators.min(0.0001)]],
        rate: [l.rate, [Validators.required, Validators.min(0)]],
        discount: [l.discount, [Validators.min(0)]],
      }));
    }
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid || this.lines.length === 0) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      date: v.date,
      validUntil: v.validUntil || null,
      customerName: (v.customerName || '').trim(),
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
    };
    const editing = !!this.editingId;
    const req = this.editingId
      ? this.quotationService.update(this.editingId, payload)
      : this.quotationService.create(payload);
    req.subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.close();
        this.load();
        if (!editing && saved?.id) {
          this.router.navigate(['/sales/quotations', saved.id, 'print']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save quotation.');
      },
    });
  }

  remove(q: QuotationDto): void {
    if (!confirm(`Delete quotation ${q.number}?`)) return;
    this.quotationService.delete(q.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete quotation.'),
    });
  }

  close(): void { this.showForm.set(false); this.editingId = null; }
}
