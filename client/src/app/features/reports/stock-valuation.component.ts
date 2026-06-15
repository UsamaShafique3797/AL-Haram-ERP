import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { StockValuationReportDto } from '../../core/models/domain.models';
import { downloadCsv } from '../../core/utils/csv-export';

@Component({
  selector: 'app-stock-valuation',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Stock valuation</h1>
        <p class="page-sub">Current inventory value at weighted-average cost.</p>
      </div>
      <div class="spacer"></div>
      <a class="btn btn-ghost" routerLink="/reports">← Reports</a>
      <button class="btn btn-ghost" (click)="exportCsv()" [disabled]="!report()">CSV</button>
      <button class="btn btn-primary" (click)="print()">Print</button>
    </div>

    @if (error()) { <div class="alert alert-error no-print">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (report(); as r) {
      <div class="print-header">
        <h2>Stock Valuation</h2>
        <p>As of {{ r.asOf | date:'mediumDate' }}</p>
      </div>

      <div class="row kpi-row no-print">
        <div class="kpi-card"><span class="kpi-label">Items</span><span class="kpi-value">{{ r.itemCount }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Total value</span><span class="kpi-value">{{ money(r.totalValue) }}</span></div>
      </div>

      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr>
              <th>Code</th><th>Item</th><th>Category</th>
              <th class="num">Qty</th><th>Unit</th><th class="num">Avg cost</th><th class="num">Value</th>
            </tr>
          </thead>
          <tbody>
            @for (l of r.lines; track l.itemId) {
              <tr>
                <td>{{ l.itemCode }}</td>
                <td>{{ l.itemName }}</td>
                <td>{{ l.categoryName }}</td>
                <td class="num">{{ num(l.quantity) }}</td>
                <td>{{ l.unitCode }}</td>
                <td class="num">{{ money(l.averageCost) }}</td>
                <td class="num">{{ money(l.stockValue) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" style="text-align:center;color:var(--muted)">No stock on hand.</td></tr>
            }
          </tbody>
          @if (r.lines.length) {
            <tfoot>
              <tr>
                <td colspan="6"><strong>Total</strong></td>
                <td class="num"><strong>{{ money(r.totalValue) }}</strong></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    }
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem;
      display: flex; flex-direction: column; gap: .25rem; }
    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; }
    .kpi-value { font-size: 1.2rem; font-weight: 700; }
    .num { text-align: right; }
    .print-header { display: none; }
    @media print { .no-print { display: none !important; } .print-header { display: block; margin-bottom: 1rem; } }
  `],
})
export class StockValuationComponent implements OnInit {
  private service = inject(ReportService);

  report = signal<StockValuationReportDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getStockValuation().subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set('Could not load stock valuation.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  num(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  print(): void { window.print(); }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    downloadCsv(
      `stock-valuation-${r.asOf.substring(0, 10)}.csv`,
      ['Code', 'Item', 'Category', 'Quantity', 'Unit', 'Average cost', 'Stock value'],
      r.lines.map((l) => [
        l.itemCode,
        l.itemName,
        l.categoryName,
        l.quantity,
        l.unitCode,
        l.averageCost,
        l.stockValue,
      ]),
    );
  }
}
