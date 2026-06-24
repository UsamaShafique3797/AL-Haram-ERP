import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { PaymentAccountService } from '../../core/services/payment-account.service';
import { CustomerReceiptService } from '../../core/services/customer-receipt.service';
import { SalesInvoiceService } from '../../core/services/sales-invoice.service';
import { AccessService } from '../../core/services/access.service';
import {
  CustomerDto, CustomerReceiptDto, OpenInvoiceDto, PaymentAccountDto,
  PaymentMode, PaymentModeLabels,
} from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Customer receipts</h1>
        <p class="page-sub">Record money received and allocate it against outstanding invoices.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('sales/receipts')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New receipt</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search receipts…" />
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Customer</th><th>Mode</th><th>Amount</th><th>Allocated</th><th>On account</th></tr>
        </thead>
        <tbody>
          @for (r of filteredRows(); track r.id) {
            <tr>
              <td>{{ r.number }}</td>
              <td>{{ r.date | date:'mediumDate' }}</td>
              <td>{{ r.customerName }}</td>
              <td>{{ modeLabel(r.mode) }} <span class="badge badge-muted">{{ r.paymentAccountName }}</span></td>
              <td>{{ money(r.amount) }}</td>
              <td>{{ money(r.amountAllocated) }}</td>
              <td [style.color]="r.unallocated > 0 ? 'var(--warn)' : 'var(--muted)'">{{ money(r.unallocated) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No receipts yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New customer receipt</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Customer</label>
                  <select formControlName="customerId" (change)="onCustomerChange()">
                    <option value="">— select —</option>
                    @for (c of customers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:1">
                  <label>Mode</label>
                  <select formControlName="mode">
                    <option [value]="1">Cash</option>
                    <option [value]="2">Bank</option>
                    <option [value]="3">Cheque</option>
                  </select>
                </div>
                <div class="field" style="flex:1">
                  <label>Account</label>
                  <select formControlName="paymentAccountId">
                    <option value="">— select —</option>
                    @for (a of paymentAccounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
                  </select>
                </div>
              </div>

              <div class="row">
                <div class="field" style="flex:1"><label>Amount received</label><input type="number" step="0.01" formControlName="amount" (input)="autoAllocate()" /></div>
                <div class="field" style="flex:2"><label>Reference (cheque #, txn id)</label><input formControlName="reference" /></div>
              </div>

              <h4 style="margin:.4rem 0">Allocate to invoices</h4>
              @if (openInvoices().length === 0) {
                <p class="muted" style="font-size:.85rem">This customer has no outstanding invoices. The receipt amount will be held on-account.</p>
              } @else {
                <div formArrayName="allocations">
                  @for (row of allocations.controls; track $index; let idx = $index) {
                    <div class="row alloc-row" [formGroupName]="idx" style="align-items:flex-end">
                      <div class="field" style="flex:3">
                        <label>Invoice</label>
                        <div class="alloc-meta">
                          {{ openInvoices()[idx].number }} · {{ openInvoices()[idx].date | date:'mediumDate' }} · Balance {{ money(openInvoices()[idx].balance) }}
                        </div>
                      </div>
                      <div class="field" style="flex:1"><label>Allocate</label><input type="number" step="0.01" formControlName="amount" /></div>
                      <div class="field" style="flex:0">
                        <label>&nbsp;</label>
                        <button type="button" class="btn btn-ghost btn-sm" (click)="setMax(idx)">Max</button>
                      </div>
                    </div>
                  }
                </div>
              }

              <div class="field"><label>Notes</label><input formControlName="notes" /></div>

              <div class="totals card-pad" style="background:#f7f8fa;border-radius:8px;margin-top:.5rem">
                <div class="row"><span class="spacer">Amount</span><strong>{{ money(totals().amount) }}</strong></div>
                <div class="row"><span class="spacer">Allocated</span><strong>{{ money(totals().allocated) }}</strong></div>
                <div class="row"><span class="spacer">On account</span><strong [style.color]="totals().unallocated > 0 ? 'var(--warn)' : 'var(--ink)'">{{ money(totals().unallocated) }}</strong></div>
              </div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Save receipt' }}
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
    .modal { width: 100%; max-width: 880px; margin: auto; }
    .alloc-row { padding: .35rem .5rem; background: #fafbfc; border: 1px solid var(--line); border-radius: 8px; margin-bottom: .5rem; }
    .alloc-meta { padding: .55rem .75rem; border: 1px solid var(--line); border-radius: 8px; background: #fff; font-size: .85rem; }
    .totals .row { margin: 0; padding: .15rem 0; }
    .muted { color: var(--muted); }
    h4 { font-size: .9rem; }
  `],
})
export class ReceiptsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private paymentAccountService = inject(PaymentAccountService);
  private receiptService = inject(CustomerReceiptService);
  private invoiceService = inject(SalesInvoiceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private openNewOnLoad = false;

  receipts = signal<CustomerReceiptDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.receipts(), this.searchTerm()));
  customers = signal<CustomerDto[]>([]);
  paymentAccounts = signal<PaymentAccountDto[]>([]);
  openInvoices = signal<OpenInvoiceDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);

  private formTick = signal(0);

  form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    mode: [PaymentMode.Cash, Validators.required],
    paymentAccountId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reference: [''],
    notes: [''],
    allocations: this.fb.array<FormGroup>([]),
  });

  get allocations(): FormArray { return this.form.get('allocations') as FormArray; }

  totals = computed(() => {
    this.formTick();
    const v = this.form.getRawValue();
    const amount = Number(v.amount || 0);
    const allocated = v.allocations.reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
    return { amount, allocated, unallocated: amount - allocated };
  });


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void {
    this.openNewOnLoad = this.route.snapshot.queryParamMap.get('new') === '1';
    this.load();
    forkJoin({
      customers: this.customerService.getAll(),
      accounts: this.paymentAccountService.getAll(),
    }).subscribe(({ customers, accounts }) => {
      this.customers.set(customers.filter((c) => c.isActive));
      this.paymentAccounts.set(accounts.filter((a) => a.isActive));
      this.ready.set(true);
      if (this.openNewOnLoad && this.access.canWrite('sales/receipts')) {
        this.openNewOnLoad = false;
        this.openNew();
        void this.router.navigate([], { relativeTo: this.route, queryParams: { new: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.receiptService.getAll().subscribe({
      next: (list) => this.receipts.set(list),
      error: () => this.error.set('Could not load receipts.'),
    });
  }

  modeLabel(m: PaymentMode): string { return PaymentModeLabels[m] ?? '—'; }
  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  openNew(): void {
    this.formError.set(null);
    const defaultAccount = this.paymentAccounts().find((a) => a.isDefault) ?? this.paymentAccounts()[0];
    this.allocations.clear();
    this.openInvoices.set([]);
    this.form.reset({
      customerId: '',
      date: new Date().toISOString().substring(0, 10),
      mode: PaymentMode.Cash,
      paymentAccountId: defaultAccount?.id ?? '',
      amount: 0,
      reference: '',
      notes: '',
    });
    this.showForm.set(true);
  }

  onCustomerChange(): void {
    const customerId = this.form.get('customerId')?.value;
    this.allocations.clear();
    this.openInvoices.set([]);
    if (!customerId) return;

    this.invoiceService.getOpenForCustomer(customerId).subscribe((list) => {
      this.openInvoices.set(list);
      for (const _ of list) {
        this.allocations.push(this.fb.nonNullable.group({
          salesInvoiceId: ['', Validators.required],
          amount: [0, [Validators.min(0)]],
        }));
      }
      // pre-fill invoice ids (they're locked-in display per row)
      list.forEach((inv, idx) => this.allocations.at(idx).patchValue({ salesInvoiceId: inv.id }));
    });
  }

  setMax(idx: number): void {
    const balance = this.openInvoices()[idx]?.balance ?? 0;
    const amount = Number(this.form.get('amount')?.value ?? 0);
    const already = this.allocations.controls
      .reduce((s, c, i) => i === idx ? s : s + Number(c.get('amount')?.value ?? 0), 0);
    const remaining = Math.max(0, amount - already);
    this.allocations.at(idx).patchValue({ amount: Math.min(balance, remaining) });
  }

  /** Try to spread the receipt across invoices oldest-first when amount changes. */
  autoAllocate(): void {
    let remaining = Number(this.form.get('amount')?.value ?? 0);
    this.openInvoices().forEach((inv, idx) => {
      const take = Math.min(remaining, inv.balance);
      this.allocations.at(idx).patchValue({ amount: Number(take.toFixed(2)) });
      remaining -= take;
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    const allocs = v.allocations
      .filter((a: any) => Number(a.amount) > 0)
      .map((a: any) => ({ salesInvoiceId: a.salesInvoiceId, amount: Number(a.amount) }));

    this.receiptService.create({
      date: v.date,
      customerId: v.customerId,
      paymentAccountId: v.paymentAccountId,
      mode: Number(v.mode) as PaymentMode,
      amount: Number(v.amount),
      reference: v.reference || null,
      notes: v.notes || null,
      allocations: allocs,
    }).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save receipt.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
