import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupplierService } from '../../core/services/supplier.service';
import { PaymentAccountService } from '../../core/services/payment-account.service';
import { SupplierPaymentService } from '../../core/services/supplier-payment.service';
import { PurchaseInvoiceService } from '../../core/services/purchase-invoice.service';
import { AccessService } from '../../core/services/access.service';
import {
  OpenPurchaseInvoiceDto, PaymentAccountDto, PaymentMode, PaymentModeLabels,
  SupplierDto, SupplierPaymentDto,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-supplier-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Supplier payments</h1>
        <p class="page-sub">Record money paid to suppliers and allocate against outstanding purchase invoices.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('purchasing/payments')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New payment</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Supplier</th><th>Mode</th><th>Amount</th><th>Allocated</th><th>On account</th></tr>
        </thead>
        <tbody>
          @for (p of payments(); track p.id) {
            <tr>
              <td>{{ p.number }}</td>
              <td>{{ p.date | date:'mediumDate' }}</td>
              <td>{{ p.supplierName }}</td>
              <td>{{ modeLabel(p.mode) }} <span class="badge badge-muted">{{ p.paymentAccountName }}</span></td>
              <td>{{ money(p.amount) }}</td>
              <td>{{ money(p.amountAllocated) }}</td>
              <td [style.color]="p.unallocated > 0 ? 'var(--warn)' : 'var(--muted)'">{{ money(p.unallocated) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No payments yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New supplier payment</h3>
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
                <div class="field" style="flex:1"><label>Amount paid</label><input type="number" step="0.01" formControlName="amount" (input)="autoAllocate()" /></div>
                <div class="field" style="flex:2"><label>Reference (cheque #, txn id)</label><input formControlName="reference" /></div>
              </div>

              <h4 style="margin:.4rem 0">Allocate to invoices</h4>
              @if (openInvoices().length === 0) {
                <p class="muted" style="font-size:.85rem">This supplier has no outstanding invoices. The payment will be held on-account.</p>
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
                  {{ loading() ? 'Saving…' : 'Save payment' }}
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
export class SupplierPaymentsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);
  private paymentAccountService = inject(PaymentAccountService);
  private paymentService = inject(SupplierPaymentService);
  private invoiceService = inject(PurchaseInvoiceService);

  payments = signal<SupplierPaymentDto[]>([]);
  suppliers = signal<SupplierDto[]>([]);
  paymentAccounts = signal<PaymentAccountDto[]>([]);
  openInvoices = signal<OpenPurchaseInvoiceDto[]>([]);
  ready = signal(false);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  private formTick = signal(0);

  form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
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

  ngOnInit(): void {
    this.load();
    forkJoin({
      suppliers: this.supplierService.getAll(),
      accounts: this.paymentAccountService.getAll(),
    }).subscribe(({ suppliers, accounts }) => {
      this.suppliers.set(suppliers.filter((s) => s.isActive));
      this.paymentAccounts.set(accounts.filter((a) => a.isActive));
      this.ready.set(true);
    });
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.paymentService.getAll().subscribe({
      next: (list) => this.payments.set(list),
      error: () => this.error.set('Could not load payments.'),
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
      supplierId: '',
      date: new Date().toISOString().substring(0, 10),
      mode: PaymentMode.Cash,
      paymentAccountId: defaultAccount?.id ?? '',
      amount: 0,
      reference: '',
      notes: '',
    });
    this.showForm.set(true);
  }

  onSupplierChange(): void {
    const supplierId = this.form.get('supplierId')?.value;
    this.allocations.clear();
    this.openInvoices.set([]);
    if (!supplierId) return;

    this.invoiceService.getOpenForSupplier(supplierId).subscribe((list) => {
      this.openInvoices.set(list);
      for (const _ of list) {
        this.allocations.push(this.fb.nonNullable.group({
          purchaseInvoiceId: ['', Validators.required],
          amount: [0, [Validators.min(0)]],
        }));
      }
      list.forEach((inv, idx) => this.allocations.at(idx).patchValue({ purchaseInvoiceId: inv.id }));
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
      .map((a: any) => ({ purchaseInvoiceId: a.purchaseInvoiceId, amount: Number(a.amount) }));

    this.paymentService.create({
      date: v.date,
      supplierId: v.supplierId,
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
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save payment.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
