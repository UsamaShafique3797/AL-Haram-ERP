import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AgeingService } from '../../core/services/report.service';
import { PayableAgeingDto } from '../../core/models/domain.models';
import { CompanyPrintHeaderComponent } from '../../shared/company-print-header.component';

@Component({
  selector: 'app-payables-ageing',
  standalone: true,
  imports: [CommonModule, RouterLink, CompanyPrintHeaderComponent],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Payables ageing</h1>
        <p class="page-sub">Outstanding supplier balances by age bucket.</p>
      </div>
      <div class="spacer"></div>
      <a class="btn btn-ghost" routerLink="/reports">← Reports</a>
      <button class="btn btn-primary" (click)="print()">Print</button>
    </div>

    @if (error()) { <div class="alert alert-error no-print">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (rows().length) {
      <app-company-print-header title="Payables Ageing">
        <p>Total outstanding: {{ money(grandTotal()) }}</p>
      </app-company-print-header>

      <div class="row kpi-row no-print">
        <div class="kpi-card"><span class="kpi-label">Suppliers</span><span class="kpi-value">{{ rows().length }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Total outstanding</span><span class="kpi-value">{{ money(grandTotal()) }}</span></div>
      </div>

      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr>
              <th>Supplier</th><th>Phone</th>
              @for (label of bucketLabels(); track label) { <th class="num">{{ label }}</th> }
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.supplierId) {
              <tr>
                <td>{{ r.supplierName }}</td>
                <td>{{ r.phone || '—' }}</td>
                @for (b of r.buckets; track b.label) {
                  <td class="num">{{ money(b.amount) }}</td>
                }
                <td class="num"><strong>{{ money(r.totalOutstanding) }}</strong></td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Totals</strong></td>
              @for (t of bucketTotals(); track t.label) {
                <td class="num"><strong>{{ money(t.amount) }}</strong></td>
              }
              <td class="num"><strong>{{ money(grandTotal()) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    } @else if (!loading() && !error()) {
      <div class="card card-pad" style="text-align:center;color:var(--muted)">No outstanding payables.</div>
    }
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem;
      display: flex; flex-direction: column; gap: .25rem; }
    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; }
    .kpi-value { font-size: 1.2rem; font-weight: 700; }
    .num { text-align: right; }
    @media print { .no-print { display: none !important; } }
  `],
})
export class PayablesAgeingComponent implements OnInit {
  private service = inject(AgeingService);

  rows = signal<PayableAgeingDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  grandTotal = computed(() => this.rows().reduce((s, r) => s + r.totalOutstanding, 0));

  bucketLabels = computed(() => this.rows()[0]?.buckets.map((b) => b.label) ?? []);

  bucketTotals = computed(() => {
    const rows = this.rows();
    if (!rows.length) return [];
    return rows[0].buckets.map((_, i) => ({
      label: rows[0].buckets[i].label,
      amount: rows.reduce((s, r) => s + (r.buckets[i]?.amount ?? 0), 0),
    }));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getPayables().subscribe({
      next: (list) => { this.rows.set(list); this.loading.set(false); },
      error: () => { this.error.set('Could not load payables ageing.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }
}
