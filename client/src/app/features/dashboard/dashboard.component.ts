import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin } from 'rxjs';
import { ChartConfiguration } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { CompanyContextService } from '../../core/services/company-context.service';

import { ItemService } from '../../core/services/item.service';

import { CategoryService } from '../../core/services/category.service';

import { CustomerService } from '../../core/services/customer.service';

import { SupplierService } from '../../core/services/supplier.service';

import { StockService } from '../../core/services/stock.service';

import { SalesInvoiceService } from '../../core/services/sales-invoice.service';

import { CustomerLedgerService } from '../../core/services/customer-ledger.service';

import { DashboardService } from '../../core/services/report.service';

import {

  CategoryDto, CustomerDto, DashboardSummaryDto, ItemDto, ReceivableDto,

  SalesInvoiceDto, StockLevelDto, SupplierDto,

} from '../../core/models/domain.models';

import { ChartComponent } from '../../shared/chart.component';



const PALETTE = ['#c0392b', '#1f2933', '#e67700', '#2f9e44', '#3b6ea5', '#7b8794', '#8e44ad', '#16a085', '#d4a017', '#52606d'];

const MONEY_AXIS = { ticks: { callback: (v: any) => 'Rs ' + Number(v).toLocaleString() } };

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}



@Component({

  selector: 'app-dashboard',

  standalone: true,

  imports: [ChartComponent],

  template: `

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="dash-panel">
      <div class="dash-panel-bg" aria-hidden="true"></div>
      <div class="dash-panel-inner">
        <div class="dash-hero-content">
          <p class="dash-hero-tag">{{ companyCtx.name() }}</p>
          <h1 class="dash-hero-title">Welcome back, {{ auth.user()?.fullName }}</h1>
          <p class="dash-hero-sub">{{ companyCtx.tagline() }}</p>
          @if (scopeLabel()) {
            <p class="dash-hero-scope">Showing data for: <strong>{{ scopeLabel() }}</strong></p>
          }
        </div>

        @if (loaded()) {
          <div class="stats-featured">
            <div class="stat-featured stat-featured-sales">
              <div class="stat-featured-head">
                <span class="stat-icon stat-icon-sales" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/></svg>
                </span>
                <div>
                  <span class="stat-label">Sales this month</span>
                  <span class="stat-hint">{{ invoicesCount() }} invoice{{ invoicesCount() === 1 ? '' : 's' }} · 30-day trend</span>
                </div>
              </div>
              <div class="stat-sales-body">
                <div class="stat-value">{{ money(summary()?.salesMonth ?? 0) }}</div>
                @if (salesSparkline(); as cfg) {
                  <div class="stat-sparkline"><app-chart [config]="cfg" /></div>
                }
              </div>
            </div>

            <div class="stat-featured stat-featured-profit">
              <div class="stat-featured-head">
                <span class="stat-icon stat-icon-profit" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-6"/></svg>
                </span>
                <span class="stat-label">Net profit</span>
              </div>
              <div class="stat-value" [class.positive]="(summary()?.netProfitMonth ?? 0) >= 0" [class.negative]="(summary()?.netProfitMonth ?? 0) < 0">
                {{ money(summary()?.netProfitMonth ?? 0) }}
              </div>
              <span class="stat-hint">{{ (summary()?.netProfitMonth ?? 0) >= 0 ? 'Profitable month' : 'Loss this month' }}</span>
            </div>

            <div class="stat-featured stat-featured-cash">
              <div class="stat-featured-head">
                <span class="stat-icon stat-icon-cash" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
                </span>
                <span class="stat-label">Cash on hand</span>
              </div>
              <div class="stat-value">{{ money(summary()?.cashBalance ?? 0) }}</div>
              <span class="stat-hint">Available in cash accounts</span>
            </div>

            <div class="stat-featured stat-featured-receivables">
              <div class="stat-featured-head">
                <span class="stat-icon stat-icon-receivables" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span class="stat-label">Receivables</span>
              </div>
              <div class="stat-value" [class.highlight-warn]="(summary()?.receivables ?? 0) > 0">{{ money(summary()?.receivables ?? 0) }}</div>
              <span class="stat-hint">{{ receivableAccounts() }} customer{{ receivableAccounts() === 1 ? '' : 's' }} owing</span>
            </div>

            <div class="stat-featured stat-featured-stock">
              <div class="stat-featured-head">
                <span class="stat-icon stat-icon-stock" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M12 22V12.5"/></svg>
                </span>
                <span class="stat-label">Stock value</span>
              </div>
              <div class="stat-value">{{ money(totalStockValue()) }}</div>
              <span class="stat-hint" [class.hint-warn]="lowStockCount() > 0">
                {{ lowStockCount() > 0 ? lowStockCount() + ' low-stock item' + (lowStockCount() === 1 ? '' : 's') : 'Inventory on hand' }}
              </span>
            </div>
          </div>

          <button type="button" class="stats-more-toggle" (click)="toggleMoreStats()">
            <span>{{ showMoreStats() ? 'Hide additional metrics' : 'Show additional metrics' }}</span>
            <svg class="stats-chevron" [class.open]="showMoreStats()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          @if (showMoreStats()) {
            <div class="stats-more-panel">
              <div class="stat-row">
                <span class="stat-icon stat-icon-purchases" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </span>
                <div class="stat-row-body">
                  <span class="stat-row-label">Purchases</span>
                  <span class="stat-row-hint">Supplier bills this month</span>
                </div>
                <span class="stat-row-value">{{ money(summary()?.purchasesMonth ?? 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon stat-icon-expenses" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                </span>
                <div class="stat-row-body">
                  <span class="stat-row-label">Expenses</span>
                  <span class="stat-row-hint">Operating costs this month</span>
                </div>
                <span class="stat-row-value">{{ money(summary()?.expensesMonth ?? 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon stat-icon-bank" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/></svg>
                </span>
                <div class="stat-row-body">
                  <span class="stat-row-label">Bank balance</span>
                  <span class="stat-row-hint">All bank accounts combined</span>
                </div>
                <span class="stat-row-value">{{ money(summary()?.bankBalance ?? 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-icon stat-icon-payables" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
                <div class="stat-row-body">
                  <span class="stat-row-label">Payables</span>
                  <span class="stat-row-hint">Outstanding supplier dues</span>
                </div>
                <span class="stat-row-value">{{ money(summary()?.payables ?? 0) }}</span>
              </div>
            </div>
          }
        } @else if (!error()) {
          <p class="dash-panel-loading">Loading summary…</p>
        }
      </div>
    </div>

    @if (loaded()) {

      <div class="grid">

        <div class="card card-pad chart-card wide">

          <div class="chart-head"><h3>Sales — last 30 days</h3></div>

          @if (salesTrend(); as cfg) { <app-chart [config]="cfg" /> }

          @else { <p class="empty">No sales yet. Create an invoice to populate this chart.</p> }

        </div>



        <div class="card card-pad chart-card">

          <div class="chart-head"><h3>Top receivables</h3></div>

          @if (topReceivables(); as cfg) { <app-chart [config]="cfg" /> }

          @else { <p class="empty">No outstanding udhaar.</p> }

        </div>



        <div class="card card-pad chart-card">

          <div class="chart-head"><h3>Top customers (revenue)</h3></div>

          @if (topCustomers(); as cfg) { <app-chart [config]="cfg" /> }

          @else { <p class="empty">No invoices yet.</p> }

        </div>



        <div class="card card-pad chart-card">

          <div class="chart-head"><h3>Stock value by category</h3></div>

          @if (stockByCategory(); as cfg) { <app-chart [config]="cfg" /> }

          @else { <p class="empty">No stock value yet.</p> }

        </div>



        <div class="card card-pad chart-card">

          <div class="chart-head"><h3>Stock health</h3></div>

          @if (stockHealth(); as cfg) { <app-chart [config]="cfg" /> }

          @else { <p class="empty">No tracked items yet.</p> }

        </div>



        <div class="card card-pad chart-card">

          <div class="chart-head"><h3>Master data overview</h3></div>

          @if (overview(); as cfg) { <app-chart [config]="cfg" /> }

        </div>

      </div>

    }

  `,

  styles: [`

    .dash-panel {
      position: relative;
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid rgba(255,255,255,.08);
    }

    .dash-panel-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(18,22,28,.9) 0%, rgba(18,22,28,.78) 38%, rgba(18,22,28,.85) 100%),
        url('/images/dashboard-hero-steel.png') center 45% / cover no-repeat;
    }

    .dash-panel-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 55%, rgba(192,57,43,.18) 100%);
      pointer-events: none;
    }

    .dash-panel-inner {
      position: relative;
      z-index: 1;
      padding: 1.35rem 1.5rem 1.5rem;
    }

    .dash-hero-content {
      padding: 0 0 .95rem;
      margin-bottom: .15rem;
      border-bottom: 1px solid rgba(255,255,255,.12);
      color: #fff;
      max-width: 720px;
    }

    .dash-hero-tag {
      display: inline-block;
      margin: 0 0 .45rem;
      padding: .3rem .65rem;
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #fff;
      background: var(--brand);
      border-radius: 6px;
    }

    .dash-hero-title {
      margin: 0 0 .35rem;
      font-size: 1.55rem;
      font-weight: 700;
      line-height: 1.25;
      color: #fff;
    }

    .dash-hero-sub {
      margin: 0;
      font-size: .92rem;
      color: rgba(255,255,255,.82);
      line-height: 1.45;
    }

    .dash-hero-scope {
      margin: .7rem 0 0;
      font-size: .82rem;
      color: rgba(255,255,255,.75);
    }

    .dash-hero-scope strong { color: #fff; }

    .dash-panel-loading {
      margin: .5rem 0 0;
      padding: 1rem 0 .25rem;
      color: rgba(255,255,255,.75);
      font-size: .9rem;
    }

    .stats-featured {
      display: grid;
      grid-template-columns: 1.35fr repeat(4, 1fr);
      gap: .6rem;
      margin-top: .95rem;
      position: relative;
      z-index: 1;
    }

    .stat-featured {
      background: rgba(255,255,255,.94);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,.65);
      border-radius: 10px;
      padding: .65rem .8rem .7rem;
      display: flex;
      flex-direction: column;
      gap: .15rem;
      box-shadow: 0 4px 18px rgba(0,0,0,.12);
      overflow: hidden;
    }

    .stat-featured-head {
      display: flex;
      align-items: center;
      gap: .45rem;
    }

    .stat-icon {
      width: 1.55rem;
      height: 1.55rem;
      border-radius: 7px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .stat-icon svg { width: .85rem; height: .85rem; }

    .stat-icon-sales { background: #fdecea; color: var(--brand); }
    .stat-icon-profit { background: #e6f4ea; color: var(--success); }
    .stat-icon-cash { background: #eef2f5; color: var(--ink-soft); }
    .stat-icon-receivables { background: #fff4e6; color: var(--warn); }
    .stat-icon-stock { background: #eef2f5; color: var(--ink-soft); }
    .stat-icon-purchases { background: #e8eef5; color: #3b6ea5; }
    .stat-icon-expenses { background: #fff4e6; color: var(--warn); }
    .stat-icon-bank { background: #e8eef5; color: #3b6ea5; }
    .stat-icon-payables { background: #f3e8ff; color: #7b4397; }

    .stat-label {
      display: block;
      font-size: .7rem;
      font-weight: 700;
      color: var(--ink-soft);
      text-transform: uppercase;
      letter-spacing: .04em;
      line-height: 1.2;
    }

    .stat-hint {
      display: block;
      font-size: .68rem;
      color: var(--muted);
      line-height: 1.25;
      margin-top: .05rem;
    }

    .stat-hint.hint-warn { color: var(--warn); font-weight: 600; }

    .stat-value {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.15;
      letter-spacing: -.01em;
    }

    .stat-value.positive { color: var(--success); }
    .stat-value.negative { color: var(--warn); }
    .stat-value.highlight-warn { color: var(--warn); }

    .stat-sales-body {
      display: flex;
      align-items: center;
      gap: .65rem;
      margin-top: .1rem;
    }

    .stat-featured-sales .stat-value { flex-shrink: 0; }

    .stat-sparkline {
      height: 38px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .stat-sparkline app-chart {
      display: block;
      height: 100%;
      width: 100%;
    }

    .stats-more-toggle {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      margin-top: .85rem;
      padding: .45rem .15rem;
      border: none;
      background: transparent;
      color: rgba(255,255,255,.88);
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      transition: color .15s;
      position: relative;
      z-index: 2;
    }

    .stats-more-toggle:hover { color: #fff; }

    .stats-chevron {
      width: 1rem;
      height: 1rem;
      transition: transform .2s;
    }

    .stats-chevron.open { transform: rotate(180deg); }

    .stats-more-panel {
      margin-top: .65rem;
      background: rgba(255,255,255,.92);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,.55);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,.1);
      position: relative;
      z-index: 2;
    }

    .stat-row {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .6rem .85rem;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }

    .stat-row:last-child { border-bottom: none; }

    .stat-row-body { flex: 1; min-width: 0; }

    .stat-row-label {
      display: block;
      font-size: .84rem;
      font-weight: 600;
      color: var(--ink);
    }

    .stat-row-hint {
      display: block;
      font-size: .72rem;
      color: var(--muted);
      margin-top: .1rem;
    }

    .stat-row-value {
      font-size: .95rem;
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
    }



    .kpi-section { margin-bottom: 1.25rem; }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: .5rem; }

    .card-pad { padding: .9rem 1rem; }

    .chart-card { display: flex; flex-direction: column; }

    .chart-card.wide { grid-column: span 3; }

    .chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .65rem;
      padding-bottom: .5rem;
      border-bottom: 1px solid var(--line);
    }

    .chart-head h3 {
      font-size: .95rem;
      font-weight: 700;
      color: var(--ink);
      margin: 0;
    }

    .chart-card app-chart { display: block; height: 200px; }

    .empty { color: var(--muted); font-size: .8rem; height: 200px; display: grid; place-items: center; text-align: center; }



    @media (max-width: 1200px) {
      .stats-featured { grid-template-columns: repeat(2, 1fr); }
      .stat-featured-sales { grid-column: span 2; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .chart-card.wide { grid-column: span 2; }
    }

    @media (max-width: 700px) {
      .stats-featured { grid-template-columns: 1fr; }
      .stat-featured-sales { grid-column: span 1; }
      .stat-sales-body { flex-direction: column; align-items: stretch; gap: .35rem; }
      .stat-sparkline { height: 32px; }
      .grid { grid-template-columns: 1fr; }
      .chart-card.wide { grid-column: span 1; }
      .dash-panel-inner { padding: 1.1rem 1.15rem 1.25rem; }
      .dash-hero-title { font-size: 1.25rem; }
      .dash-panel-bg {
        background:
          linear-gradient(180deg, rgba(18,22,28,.92) 0%, rgba(18,22,28,.82) 100%),
          url('/images/dashboard-hero-steel.png') center 50% / cover no-repeat;
      }
    }

  `],

})

export class DashboardComponent implements OnInit {

  auth = inject(AuthService);
  companyCtx = inject(CompanyContextService);
  private branchCtx = inject(BranchContextService);

  private itemService = inject(ItemService);

  private categoryService = inject(CategoryService);

  private customerService = inject(CustomerService);

  private supplierService = inject(SupplierService);

  private stockService = inject(StockService);

  private salesInvoiceService = inject(SalesInvoiceService);

  private ledgerService = inject(CustomerLedgerService);

  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loaded = signal(false);

  error = signal<string | null>(null);

  summary = signal<DashboardSummaryDto | null>(null);



  totalStockValue = signal(0);

  invoicesCount = signal(0);



  salesTrend = signal<ChartConfiguration | null>(null);

  salesSparkline = signal<ChartConfiguration | null>(null);

  topReceivables = signal<ChartConfiguration | null>(null);

  topCustomers = signal<ChartConfiguration | null>(null);

  stockByCategory = signal<ChartConfiguration | null>(null);

  stockHealth = signal<ChartConfiguration | null>(null);

  overview = signal<ChartConfiguration | null>(null);

  showMoreStats = signal(false);

  lowStockCount = signal(0);

  receivableAccounts = signal(0);

  scopeLabel(): string | null {
    const user = this.auth.user();
    if (!user) return null;
    if (!user.canAccessAllBranches) return user.godownName ?? 'Your branch';
    const id = this.branchCtx.selectedGodownId();
    if (!id) return 'All branches';
    return this.branchCtx.selectedGodownName() ?? 'Selected branch';
  }



  ngOnInit(): void {
    this.load(true);

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      const path = this.router.url.split('?')[0];
      if (path === '/dashboard' || path === '/') this.load(false);
    });
  }

  private load(showLoading: boolean): void {
    if (showLoading) this.loaded.set(false);

    forkJoin({
      items: this.itemService.getAll(),
      categories: this.categoryService.getAll(),
      customers: this.customerService.getAll(),
      suppliers: this.supplierService.getAll(),
      levels: this.stockService.getLevels(),
      invoices: this.salesInvoiceService.getAll(),
      receivables: this.ledgerService.getReceivables(),
      summary: this.dashboardService.getSummary(),
    }).subscribe({
      next: (d) => {
        this.summary.set(d.summary);
        this.build(d.items, d.categories, d.customers, d.suppliers, d.levels, d.invoices, d.receivables);
        this.loaded.set(true);
      },
      error: () => this.error.set('Could not load dashboard data.'),
    });
  }



  money(v: number): string {

    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  }

  toggleMoreStats(): void {
    this.showMoreStats.update((v) => !v);
  }



  private build(

    items: ItemDto[], categories: CategoryDto[], customers: CustomerDto[], suppliers: SupplierDto[],

    levels: StockLevelDto[], invoices: SalesInvoiceDto[], receivables: ReceivableDto[],

  ): void {
    this.salesTrend.set(null);
    this.salesSparkline.set(null);
    this.topReceivables.set(null);
    this.topCustomers.set(null);
    this.stockByCategory.set(null);
    this.stockHealth.set(null);

    const tracked = items.filter((i) => i.trackInventory);

    this.totalStockValue.set(items.reduce((s, i) => s + (i.stockValue || 0), 0));



    const valueByCat = new Map<string, number>();

    for (const i of items) {

      if (!i.stockValue) continue;

      valueByCat.set(i.categoryName, (valueByCat.get(i.categoryName) ?? 0) + i.stockValue);

    }

    if (valueByCat.size > 0) {

      const labels = [...valueByCat.keys()];

      this.stockByCategory.set({

        type: 'doughnut',

        data: {

          labels,

          datasets: [{

            data: labels.map((l) => Math.round(valueByCat.get(l)!)),

            backgroundColor: PALETTE,

            borderWidth: 2,

            borderColor: '#fff',

            hoverOffset: 6,

          }],

        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          plugins: {

            legend: { position: 'right' },

            tooltip: {

              callbacks: {

                label: (ctx) => {

                  const v = Number(ctx.parsed ?? 0);

                  const total = (ctx.dataset.data as number[]).reduce((s, n) => s + n, 0);

                  const pct = total ? Math.round((v / total) * 100) : 0;

                  return ` ${ctx.label}: Rs ${v.toLocaleString()} (${pct}%)`;

                },

              },

            },

          },

          ...({ cutout: '62%' } as object),

        },

      });

    }



    const low = tracked.filter((i) => i.isLowStock && i.stockOnHand > 0).length;
    this.lowStockCount.set(low);

    const out = tracked.filter((i) => i.stockOnHand <= 0).length;

    const healthy = tracked.length - low - out;

    if (tracked.length > 0) {

      this.stockHealth.set({

        type: 'doughnut',

        data: {

          labels: ['Healthy', 'Low stock', 'Out of stock'],

          datasets: [{ data: [healthy, low, out], backgroundColor: ['#2f9e44', '#e67700', '#c0392b'], borderWidth: 0 }],

        },

        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },

      });

    }



    this.invoicesCount.set(invoices.length);

    this.overview.set({

      type: 'bar',

      data: {

        labels: ['Items', 'Categories', 'Customers', 'Suppliers', 'Invoices'],

        datasets: [{

          label: 'Count',

          data: [items.length, categories.length, customers.length, suppliers.length, invoices.length],

          backgroundColor: ['#c0392b', '#e67700', '#3b6ea5', '#2f9e44', '#1f2933'], borderRadius: 4,

        }],

      },

      options: {

        responsive: true, maintainAspectRatio: false,

        plugins: { legend: { display: false } },

        scales: { y: { ticks: { precision: 0 } } },

      },

    });



    const today = new Date(); today.setHours(0, 0, 0, 0);

    const start = new Date(today); start.setDate(start.getDate() - 29);



    const byDay = new Map<string, number>();

    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      byDay.set(localDateKey(d), 0);
    }

    let salesTotal = 0;
    for (const inv of invoices) {
      const key = inv.date.substring(0, 10);
      if (byDay.has(key)) {
        byDay.set(key, byDay.get(key)! + inv.total);
        salesTotal += inv.total;
      }
    }

    if (salesTotal > 0) {
      const labels = [...byDay.keys()].map((d) => d.substring(5));
      const dailyData = [...byDay.values()].map((v) => Math.round(v));

      this.salesTrend.set({

        type: 'line',

        data: {

          labels,

          datasets: [{

            label: 'Sales',

            data: dailyData,

            borderColor: '#c0392b',

            backgroundColor: 'rgba(192,57,43,.12)',

            fill: true, tension: .3, pointRadius: 2, borderWidth: 2,

          }],

        },

        options: {

          responsive: true, maintainAspectRatio: false,

          plugins: { legend: { display: false } },

          scales: { y: MONEY_AXIS },

        },

      });
    }

    {
      const dailyData = [...byDay.values()].map((v) => Math.round(v));
      const peak = Math.max(...dailyData, 0);

      this.salesSparkline.set({
        type: 'line',
        data: {
          labels: dailyData.map((_, i) => String(i)),
          datasets: [{
            data: dailyData,
            borderColor: '#c0392b',
            backgroundColor: 'rgba(192,57,43,.2)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHitRadius: 0,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 2, bottom: 0, left: 0, right: 0 } },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false, grid: { display: false }, border: { display: false } },
            y: {
              display: false,
              grid: { display: false },
              border: { display: false },
              min: 0,
              suggestedMax: peak > 0 ? peak * 1.15 : 1,
            },
          },
          animation: { duration: 350 },
        },
      });
    }

    this.receivableAccounts.set(receivables.filter((r) => r.outstanding > 0).length);



    const byCustomer = new Map<string, number>();

    for (const inv of invoices) {

      byCustomer.set(inv.customerName, (byCustomer.get(inv.customerName) ?? 0) + inv.total);

    }

    const topC = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (topC.length > 0) {

      this.topCustomers.set({

        type: 'line',

        data: {

          labels: topC.map(([n]) => n),

          datasets: [{

            label: 'Revenue',

            data: topC.map(([, v]) => Math.round(v)),

            borderColor: '#1f2933',

            backgroundColor: 'rgba(31,41,51,.12)',

            fill: true, tension: .3, pointRadius: 3, borderWidth: 2,

          }],

        },

        options: {

          responsive: true, maintainAspectRatio: false,

          plugins: { legend: { display: false } },

          scales: { y: MONEY_AXIS },

        },

      });

    }



    const owed = receivables.filter((r) => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

    const topR = owed.slice(0, 6);

    if (topR.length > 0) {

      this.topReceivables.set({

        type: 'line',

        data: {

          labels: topR.map((r) => r.customerName),

          datasets: [{

            label: 'Outstanding',

            data: topR.map((r) => Math.round(r.outstanding)),

            borderColor: '#e67700',

            backgroundColor: 'rgba(230,119,0,.12)',

            fill: true, tension: .3, pointRadius: 3, borderWidth: 2,

          }],

        },

        options: {

          responsive: true, maintainAspectRatio: false,

          plugins: { legend: { display: false } },

          scales: { y: MONEY_AXIS },

        },

      });

    }

  }

}

