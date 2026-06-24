import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { ProfitLossDto } from '../../core/models/domain.models';
import { CompanyPrintHeaderComponent } from '../../shared/company-print-header.component';
import { downloadCsv } from '../../core/utils/csv-export';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, CompanyPrintHeaderComponent, GridSearchBarComponent],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Profit &amp; loss</h1>
        <p class="page-sub">Revenue, COGS, expenses and net profit for a period.</p>
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
      <app-company-print-header title="Profit &amp; Loss">
        <p>{{ r.from | date:'mediumDate' }} — {{ r.to | date:'mediumDate' }}</p>
      </app-company-print-header>

      <div class="card card-pad summary">
        <table class="pl-table">
          <tr><td>Revenue (sales)</td><td class="num">{{ money(r.revenue) }}</td></tr>
          <tr><td>Sales returns</td><td class="num">({{ money(r.salesReturns) }})</td></tr>
          <tr class="sub"><td>Net revenue</td><td class="num">{{ money(r.netRevenue) }}</td></tr>
          <tr><td>Cost of goods sold</td><td class="num">({{ money(r.costOfGoodsSold) }})</td></tr>
          <tr class="sub"><td>Gross profit</td><td class="num">{{ money(r.grossProfit) }}</td></tr>
          <tr><td>Expenses</td><td class="num">({{ money(r.expenses) }})</td></tr>
          <tr class="total"><td>Net profit</td><td class="num">{{ money(r.netProfit) }}</td></tr>
        </table>
      </div>

      @if (r.expenseByCategory.length) {
        <div class="card card-pad" style="margin-top:1rem">
          <h3>Expenses by category</h3>
          <app-grid-search-bar class="no-print" [value]="expenseSearchTerm()" (valueChange)="expenseSearchTerm.set($event)" placeholder="Search expense categories…" />
          <table class="table">
            <thead><tr><th>Category</th><th class="num">Amount</th></tr></thead>
            <tbody>
              @for (c of filteredExpenseByCategory(); track c.name) {
                <tr><td>{{ c.name }}</td><td class="num">{{ money(c.amount) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (r.itemBreakdown.length) {
        <div class="card card-pad" style="margin-top:1rem">
          <h3>Item breakdown</h3>
          <app-grid-search-bar class="no-print" [value]="itemSearchTerm()" (valueChange)="itemSearchTerm.set($event)" placeholder="Search items…" />
          <table class="table">
            <thead><tr><th>Item</th><th class="num">Revenue</th><th class="num">Cost</th><th class="num">Gross profit</th></tr></thead>
            <tbody>
              @for (i of filteredItemBreakdown(); track i.itemId) {
                <tr>
                  <td>{{ i.itemCode }} — {{ i.itemName }}</td>
                  <td class="num">{{ money(i.revenue) }}</td>
                  <td class="num">{{ money(i.cost) }}</td>
                  <td class="num">{{ money(i.grossProfit) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    .pl-table { width: 100%; border-collapse: collapse; }
    .pl-table td { padding: .45rem 0; border-bottom: 1px solid var(--line); }
    .pl-table tr.sub td { font-weight: 600; }
    .pl-table tr.total td { font-weight: 700; font-size: 1.1rem; border-top: 2px solid var(--ink); }
    .num { text-align: right; }
    @media print { .no-print { display: none !important; } }
  `],
})
export class ProfitLossComponent implements OnInit {
  private service = inject(ReportService);

  report = signal<ProfitLossDto | null>(null);
  expenseSearchTerm = signal('');
  itemSearchTerm = signal('');
  filteredExpenseByCategory = computed(() => {
    const r = this.report();
    if (!r) return [];
    return filterByGridSearch(r.expenseByCategory, this.expenseSearchTerm());
  });
  filteredItemBreakdown = computed(() => {
    const r = this.report();
    if (!r) return [];
    return filterByGridSearch(r.itemBreakdown, this.itemSearchTerm());
  });
  loading = signal(false);
  error = signal<string | null>(null);

  from = this.monthStart();
  to = new Date().toISOString().substring(0, 10);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getProfitLoss(this.from, this.to).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set('Could not load P&L report.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    downloadCsv('profit-loss.csv',
      ['Metric', 'Amount'],
      [
        ['Revenue', r.revenue], ['Sales returns', r.salesReturns], ['Net revenue', r.netRevenue],
        ['COGS', r.costOfGoodsSold], ['Gross profit', r.grossProfit],
        ['Expenses', r.expenses], ['Net profit', r.netProfit],
      ]);
  }

  private monthStart(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  }
}
