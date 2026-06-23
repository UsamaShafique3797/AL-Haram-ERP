import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { SalesReportDto } from '../../core/models/domain.models';
import { CompanyPrintHeaderComponent } from '../../shared/company-print-header.component';
import { downloadCsv } from '../../core/utils/csv-export';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, CompanyPrintHeaderComponent],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Sales report</h1>
        <p class="page-sub">Invoices issued in the selected period.</p>
      </div>
      <div class="spacer"></div>
      <a class="btn btn-ghost" routerLink="/reports">← Reports</a>
      <button class="btn btn-ghost" (click)="exportCsv()" [disabled]="!report()">CSV</button>
      <button class="btn btn-primary" (click)="print()">Print</button>
    </div>

    <div class="card card-pad no-print" style="margin-bottom:1rem">
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1;margin-bottom:0"><label>From</label><input type="date" [(ngModel)]="from" /></div>
        <div class="field" style="flex:1;margin-bottom:0"><label>To</label><input type="date" [(ngModel)]="to" /></div>
        <button class="btn btn-ghost" (click)="load()">Run report</button>
      </div>
    </div>

    @if (error()) { <div class="alert alert-error no-print">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (report(); as r) {
      <app-company-print-header title="Sales Report">
        <p>{{ r.from | date:'mediumDate' }} — {{ r.to | date:'mediumDate' }}</p>
      </app-company-print-header>

      <div class="row kpi-row no-print">
        <div class="kpi-card"><span class="kpi-label">Invoices</span><span class="kpi-value">{{ r.invoiceCount }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Revenue</span><span class="kpi-value">{{ money(r.totalRevenue) }}</span></div>
        <div class="kpi-card"><span class="kpi-label">COGS</span><span class="kpi-value">{{ money(r.totalCost) }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Gross profit</span><span class="kpi-value">{{ money(r.totalGrossProfit) }}</span></div>
      </div>

      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr>
              <th>Number</th><th>Date</th><th>Customer</th>
              <th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th>
              <th class="num">COGS</th><th class="num">Profit</th>
            </tr>
          </thead>
          <tbody>
            @for (l of r.lines; track l.invoiceId) {
              <tr>
                <td>{{ l.number }}</td>
                <td>{{ l.date | date:'mediumDate' }}</td>
                <td>{{ l.customerName }}</td>
                <td class="num">{{ money(l.total) }}</td>
                <td class="num">{{ money(l.paidAmount) }}</td>
                <td class="num">{{ money(l.balance) }}</td>
                <td class="num">{{ money(l.costOfGoodsSold) }}</td>
                <td class="num">{{ money(l.grossProfit) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" style="text-align:center;color:var(--muted)">No sales in this period.</td></tr>
            }
          </tbody>
          @if (r.lines.length) {
            <tfoot>
              <tr>
                <td colspan="3"><strong>Totals</strong></td>
                <td class="num"><strong>{{ money(r.totalRevenue) }}</strong></td>
                <td colspan="2"></td>
                <td class="num"><strong>{{ money(r.totalCost) }}</strong></td>
                <td class="num"><strong>{{ money(r.totalGrossProfit) }}</strong></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    }
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem;
      display: flex; flex-direction: column; gap: .25rem; }
    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; }
    .kpi-value { font-size: 1.2rem; font-weight: 700; }
    .num { text-align: right; }
    @media print { .no-print { display: none !important; } }
  `],
})
export class SalesReportComponent implements OnInit {
  private service = inject(ReportService);

  report = signal<SalesReportDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  from = this.monthStart();
  to = new Date().toISOString().substring(0, 10);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getSalesReport(this.from, this.to).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set('Could not load sales report.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    downloadCsv('sales-report.csv', ['Number', 'Date', 'Customer', 'Total', 'Paid', 'Balance', 'COGS', 'Gross profit'],
      r.lines.map(l => [l.number, l.date.substring(0, 10), l.customerName, l.total, l.paidAmount, l.balance, l.costOfGoodsSold, l.grossProfit]));
  }

  private monthStart(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  }
}
