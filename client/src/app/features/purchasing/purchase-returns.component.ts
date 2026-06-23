import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PurchaseInvoiceService } from '../../core/services/purchase-invoice.service';
import { PurchaseReturnService } from '../../core/services/purchase-return.service';
import { AccessService } from '../../core/services/access.service';
import {
  PurchaseInvoiceDto, PurchaseInvoiceLineDto, PurchaseReturnDto,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Purchase returns</h1>
        <p class="page-sub">Debit notes against purchase invoices — removes stock and reduces what we owe the supplier.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('purchasing/returns')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!invoices().length">+ New return</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Invoice</th><th>Supplier</th><th>Lines</th><th class="num">Total</th><th>Reason</th></tr>
        </thead>
        <tbody>
          @for (r of returns(); track r.id) {
            <tr>
              <td>{{ r.number }}</td>
              <td>{{ r.date | date:'mediumDate' }}</td>
              <td>{{ r.purchaseInvoiceNumber }}</td>
              <td>{{ r.supplierName }}</td>
              <td>{{ r.lines.length }}</td>
              <td class="num">{{ money(r.total) }}</td>
              <td>{{ r.reason || '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No returns yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New purchase return</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Invoice</label>
                  <select formControlName="purchaseInvoiceId" (change)="onInvoiceChange()">
                    <option value="">— select —</option>
                    @for (inv of invoices(); track inv.id) {
                      <option [value]="inv.id">{{ inv.number }} · {{ inv.supplierName }} · {{ money(inv.total) }}</option>
                    }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:2"><label>Reason</label><input formControlName="reason" placeholder="Damaged, wrong item, surplus…" /></div>
              </div>

              @if (selectedInvoice(); as inv) {
                <h4 style="margin:.4rem 0">Items on invoice {{ inv.number }}</h4>
                <table class="table" style="margin-bottom:1rem">
                  <thead><tr><th>Item</th><th class="num">Purchased</th><th>Unit</th><th class="num">Rate</th><th class="num">Return qty</th></tr></thead>
                  <tbody formArrayName="lines">
                    @for (l of inv.lines; track l.id; let idx = $index) {
                      <tr [formGroupName]="idx">
                        <td>{{ l.itemName }} <span class="muted">({{ l.itemCode }})</span></td>
                        <td class="num">{{ num(l.quantity) }}</td>
                        <td>{{ l.unitCode }}</td>
                        <td class="num">{{ money(l.rate) }}</td>
                        <td class="num"><input type="number" step="0.0001" min="0" [max]="l.quantity" formControlName="quantity" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              }

              <div class="field"><label>Notes</label><input formControlName="notes" /></div>

              <div class="totals card-pad" style="background:#f7f8fa;border-radius:8px;margin-top:.5rem">
                <div class="row"><span class="spacer">Subtotal</span><strong>{{ money(totals().subtotal) }}</strong></div>
                <div class="row"><span class="spacer">Tax (prorated)</span><strong>{{ money(totals().tax) }}</strong></div>
                <div class="row" style="font-size:1.1rem"><span class="spacer"><strong>Total</strong></span><strong style="color:var(--brand)">{{ money(totals().total) }}</strong></div>
              </div>

              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || totals().total <= 0 || loading()">
                  {{ loading() ? 'Posting…' : 'Post return' }}
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
    .modal { width: 100%; max-width: 920px; margin: auto; }
    .num { text-align: right; }
    .muted { color: var(--muted); }
    h4 { font-size: .9rem; }
    .totals .row { margin: 0; padding: .15rem 0; }
  `],
})
export class PurchaseReturnsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private invoiceService = inject(PurchaseInvoiceService);
  private returnService = inject(PurchaseReturnService);

  returns = signal<PurchaseReturnDto[]>([]);
  invoices = signal<PurchaseInvoiceDto[]>([]);
  selectedInvoice = signal<PurchaseInvoiceDto | null>(null);

  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  private formTick = signal(0);

  form = this.fb.nonNullable.group({
    purchaseInvoiceId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    reason: [''],
    notes: [''],
    lines: this.fb.array<FormGroup>([]),
  });

  get lines(): FormArray { return this.form.get('lines') as FormArray; }

  totals = computed(() => {
    this.formTick();
    const inv = this.selectedInvoice();
    if (!inv) return { subtotal: 0, tax: 0, total: 0 };
    const v = this.form.getRawValue();
    let subtotal = 0;
    inv.lines.forEach((l: PurchaseInvoiceLineDto, idx: number) => {
      const qty = Number(v.lines[idx]?.['quantity'] ?? 0);
      subtotal += qty * l.rate;
    });
    const tax = inv.subtotal > 0 ? (subtotal / inv.subtotal) * inv.taxAmount : 0;
    return { subtotal, tax, total: subtotal + tax };
  });

  ngOnInit(): void {
    this.load();
    this.invoiceService.getAll().subscribe((list) => this.invoices.set(list));
    this.form.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
  }

  load(): void {
    this.returnService.getAll().subscribe({
      next: (list) => this.returns.set(list),
      error: () => this.error.set('Could not load returns.'),
    });
  }

  num(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  openNew(): void {
    this.formError.set(null);
    this.lines.clear();
    this.selectedInvoice.set(null);
    this.form.reset({
      purchaseInvoiceId: '',
      date: new Date().toISOString().substring(0, 10),
      reason: '',
      notes: '',
    });
    this.showForm.set(true);
  }

  onInvoiceChange(): void {
    const id = this.form.get('purchaseInvoiceId')?.value;
    this.lines.clear();
    this.selectedInvoice.set(null);
    if (!id) return;

    this.invoiceService.getById(id).subscribe((inv) => {
      this.selectedInvoice.set(inv);
      inv.lines.forEach((l) => {
        this.lines.push(this.fb.nonNullable.group({
          purchaseInvoiceLineId: [l.id],
          quantity: [0, [Validators.min(0), Validators.max(l.quantity)]],
        }));
      });
    });
  }

  save(): void {
    const inv = this.selectedInvoice();
    if (!inv) return;
    const v = this.form.getRawValue();
    const lines = v.lines
      .filter((l: any) => Number(l.quantity) > 0)
      .map((l: any) => ({
        purchaseInvoiceLineId: l.purchaseInvoiceLineId,
        quantity: Number(l.quantity),
      }));
    if (lines.length === 0) { this.formError.set('Enter a return quantity on at least one line.'); return; }

    this.loading.set(true);
    this.formError.set(null);

    this.returnService.create({
      date: v.date,
      purchaseInvoiceId: v.purchaseInvoiceId,
      reason: v.reason || null,
      notes: v.notes || null,
      lines,
    }).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not post return.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
