import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerLedgerService } from '../../core/services/customer-ledger.service';
import { CompanyService } from '../../core/services/company.service';
import { SalesInvoiceService } from '../../core/services/sales-invoice.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { AccessService } from '../../core/services/access.service';
import { ReceivableDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-receivables',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Receivables</h1>
        <p class="page-sub">Outstanding udhaar — remind customers on WhatsApp (free via WhatsApp Web).</p>
      </div>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Customers with balance</span><div class="kpi">{{ withBalance() }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total outstanding</span><div class="kpi" [style.color]="totalOutstanding() ? 'var(--warn)' : 'var(--ink)'">{{ money(totalOutstanding()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total invoiced</span><div class="kpi">{{ money(totalInvoiced()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total received</span><div class="kpi">{{ money(totalReceived()) }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Customer</th><th>Phone</th><th class="num">Opening</th><th class="num">Invoiced</th><th class="num">Returned</th><th class="num">Received</th><th class="num">Outstanding</th><th style="text-align:right">Actions</th></tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.customerId) {
            <tr>
              <td>{{ r.customerName }}</td>
              <td>{{ r.phone || '—' }}</td>
              <td class="num">{{ money(r.openingBalance) }}</td>
              <td class="num">{{ money(r.invoiced) }}</td>
              <td class="num">{{ money(r.returned) }}</td>
              <td class="num">{{ money(r.received) }}</td>
              <td class="num" [style.color]="r.outstanding > 0 ? 'var(--warn)' : 'var(--success)'">
                <strong>{{ money(r.outstanding) }}</strong>
              </td>
              <td style="text-align:right;white-space:nowrap" class="actions">
                <a class="btn btn-sm btn-ledger" [routerLink]="['/sales/ledger']" [queryParams]="{ customerId: r.customerId }">
                  <svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M8 7h8M8 11h8"/>
                  </svg>
                  Ledger
                </a>
                @if (r.outstanding > 0) {
                  @if (access.canWrite('sales/invoices')) {
                    <button class="btn btn-sm btn-remind" (click)="remindText(r)" [disabled]="remindingId() === r.customerId">
                      <svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                      Remind
                    </button>
                    <button class="btn btn-sm btn-bill" (click)="remindPdf(r)" [disabled]="remindingId() === r.customerId">
                      <svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                      </svg>
                      Bill PDF
                    </button>
                  }
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" style="text-align:center;color:var(--muted)">No customers yet.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .kpi-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .kpi { font-size: 1.4rem; font-weight: 700; margin-top: .25rem; }
    .num { text-align: right; }
    .actions { display: flex; justify-content: flex-end; align-items: center; gap: .4rem; flex-wrap: wrap; }
    .btn-ico { width: .9rem; height: .9rem; flex-shrink: 0; }
    .btn-ledger { background: #1d4ed8; color: #fff; border-color: #1e40af; text-decoration: none; }
    .btn-ledger:hover { background: #1e40af; border-color: #1e3a8a; color: #fff; }
    .btn-remind { background: #b91c1c; color: #fff; border-color: #991b1b; }
    .btn-remind:hover:not(:disabled) { background: #991b1b; border-color: #7f1d1d; color: #fff; }
    .btn-bill { background: #047857; color: #fff; border-color: #065f46; }
    .btn-bill:hover:not(:disabled) { background: #065f46; border-color: #064e3b; color: #fff; }
    .btn-remind:disabled, .btn-bill:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class ReceivablesComponent implements OnInit {
  access = inject(AccessService);
  private ledgerService = inject(CustomerLedgerService);
  private invoiceService = inject(SalesInvoiceService);
  private whatsAppService = inject(WhatsAppService);
  private companyService = inject(CompanyService);

  rows = signal<ReceivableDto[]>([]);
  error = signal<string | null>(null);
  remindingId = signal<string | null>(null);
  companyName = signal('Al-Haram Steel');

  withBalance = computed(() => this.rows().filter((r) => r.outstanding > 0).length);
  totalOutstanding = computed(() => this.rows().reduce((s, r) => s + Math.max(0, r.outstanding), 0));
  totalInvoiced = computed(() => this.rows().reduce((s, r) => s + r.invoiced, 0));
  totalReceived = computed(() => this.rows().reduce((s, r) => s + r.received, 0));

  ngOnInit(): void {
    this.ledgerService.getReceivables().subscribe((r) => this.rows.set(r));
    this.companyService.get().subscribe((c) => this.companyName.set(c.name));
  }

  remindText(row: ReceivableDto): void {
    this.remindingId.set(row.customerId);
    this.error.set(null);
    this.invoiceService.getOpenForCustomer(row.customerId).subscribe({
      next: (open) => {
        const err = this.whatsAppService.sharePaymentReminderText(
          row.phone, row.customerName, row.outstanding, open, this.companyName(),
        );
        this.remindingId.set(null);
        if (err) this.error.set(err);
      },
      error: () => {
        this.remindingId.set(null);
        this.error.set('Could not load open invoices.');
      },
    });
  }

  async remindPdf(row: ReceivableDto): Promise<void> {
    this.remindingId.set(row.customerId);
    this.error.set(null);
    try {
      const err = await this.whatsAppService.shareStatementPdf(
        row.customerId, row.phone, row.customerName, row.outstanding, this.companyName(),
      );
      if (err) this.error.set(err);
    } catch {
      this.error.set('Could not download statement PDF.');
    } finally {
      this.remindingId.set(null);
    }
  }

  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
