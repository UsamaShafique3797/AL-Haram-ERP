import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupplierLedgerService } from '../../core/services/supplier-ledger.service';
import { PayableDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-payables',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Payables</h1>
        <p class="page-sub">Outstanding amounts owed to suppliers. Tap a row to see their ledger.</p>
      </div>
    </div>

    <div class="row" style="margin-bottom:1rem">
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Suppliers with balance</span><div class="kpi">{{ withBalance() }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total outstanding</span><div class="kpi" [style.color]="totalOutstanding() ? 'var(--warn)' : 'var(--ink)'">{{ money(totalOutstanding()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total invoiced</span><div class="kpi">{{ money(totalInvoiced()) }}</div></div>
      <div class="card card-pad" style="flex:1"><span class="kpi-label">Total paid</span><div class="kpi">{{ money(totalPaid()) }}</div></div>
    </div>

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Supplier</th><th>Phone</th><th class="num">Opening</th><th class="num">Invoiced</th><th class="num">Returned</th><th class="num">Paid</th><th class="num">Outstanding</th><th></th></tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.supplierId) {
            <tr>
              <td>{{ r.supplierName }}</td>
              <td>{{ r.phone || '—' }}</td>
              <td class="num">{{ money(r.openingBalance) }}</td>
              <td class="num">{{ money(r.invoiced) }}</td>
              <td class="num">{{ money(r.returned) }}</td>
              <td class="num">{{ money(r.paid) }}</td>
              <td class="num" [style.color]="r.outstanding > 0 ? 'var(--warn)' : 'var(--success)'">
                <strong>{{ money(r.outstanding) }}</strong>
              </td>
              <td style="text-align:right">
                <a class="btn btn-ghost btn-sm" [routerLink]="['/purchasing/ledger']" [queryParams]="{ supplierId: r.supplierId }">Ledger</a>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" style="text-align:center;color:var(--muted)">No suppliers yet.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .kpi-label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .kpi { font-size: 1.4rem; font-weight: 700; margin-top: .25rem; }
    .num { text-align: right; }
  `],
})
export class PayablesComponent implements OnInit {
  private ledgerService = inject(SupplierLedgerService);

  rows = signal<PayableDto[]>([]);

  withBalance = computed(() => this.rows().filter((r) => r.outstanding > 0).length);
  totalOutstanding = computed(() => this.rows().reduce((s, r) => s + Math.max(0, r.outstanding), 0));
  totalInvoiced = computed(() => this.rows().reduce((s, r) => s + r.invoiced, 0));
  totalPaid = computed(() => this.rows().reduce((s, r) => s + r.paid, 0));

  ngOnInit(): void {
    this.ledgerService.getPayables().subscribe((r) => this.rows.set(r));
  }

  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
