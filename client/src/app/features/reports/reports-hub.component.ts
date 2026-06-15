import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Reports</h1>
    <p class="page-sub">Financial and operational reports with print and CSV export.</p>

    <div class="grid">
      <a class="card card-pad link-card" routerLink="/reports/profit-loss">
        <h3>Profit &amp; loss</h3>
        <p>Revenue, COGS, expenses and net profit for any period.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/sales">
        <h3>Sales report</h3>
        <p>Invoice listing with totals, paid amounts and gross profit.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/purchases">
        <h3>Purchase report</h3>
        <p>Supplier bills with totals and balances.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/expenses">
        <h3>Expense report</h3>
        <p>Expenses by date and category with totals.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/stock-valuation">
        <h3>Stock valuation</h3>
        <p>On-hand quantity and value per item.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/receivables-ageing">
        <h3>Receivables ageing</h3>
        <p>Customer outstanding by age bucket.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/reports/payables-ageing">
        <h3>Payables ageing</h3>
        <p>Supplier dues by age bucket.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/finance/cash-book">
        <h3>Cash &amp; bank book</h3>
        <p>Running statement per payment account.</p>
      </a>
      <a class="card card-pad link-card" routerLink="/finance/day-book">
        <h3>Day book</h3>
        <p>All money movements for a single day.</p>
      </a>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .link-card { text-decoration: none; color: inherit; transition: box-shadow .15s; }
    .link-card:hover { box-shadow: var(--shadow-lg, 0 4px 12px rgba(0,0,0,.12)); }
    .link-card h3 { font-size: 1rem; margin-bottom: .35rem; }
    .link-card p { font-size: .8rem; color: var(--muted); margin: 0; }
  `],
})
export class ReportsHubComponent {}
