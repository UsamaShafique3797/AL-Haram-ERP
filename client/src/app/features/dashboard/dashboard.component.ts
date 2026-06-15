import { Component, OnInit, inject, signal } from '@angular/core';

import { forkJoin } from 'rxjs';

import { ChartConfiguration } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';

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



@Component({

  selector: 'app-dashboard',

  standalone: true,

  imports: [ChartComponent],

  template: `

    <h1 class="page-title">Welcome back, {{ auth.user()?.fullName }}</h1>

    <p class="page-sub">Live business overview from inventory, sales and finance.</p>



    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }



    @if (loaded()) {

      <div class="kpi-row">

        <div class="kpi-card"><span class="kpi-label">Sales (month)</span><span class="kpi-value">{{ money(summary()?.salesMonth ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Purchases (month)</span><span class="kpi-value">{{ money(summary()?.purchasesMonth ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Expenses (month)</span><span class="kpi-value">{{ money(summary()?.expensesMonth ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Net profit (month)</span><span class="kpi-value" [style.color]="(summary()?.netProfitMonth ?? 0) >= 0 ? 'var(--success)' : 'var(--warn)'">{{ money(summary()?.netProfitMonth ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Cash on hand</span><span class="kpi-value">{{ money(summary()?.cashBalance ?? 0) }}</span></div>

      </div>

      <div class="kpi-row">

        <div class="kpi-card"><span class="kpi-label">Bank balance</span><span class="kpi-value">{{ money(summary()?.bankBalance ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Receivables</span><span class="kpi-value" [style.color]="(summary()?.receivables ?? 0) ? 'var(--warn)' : 'var(--ink)'">{{ money(summary()?.receivables ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Payables</span><span class="kpi-value">{{ money(summary()?.payables ?? 0) }}</span></div>

        <div class="kpi-card"><span class="kpi-label">Stock value</span><span class="kpi-value">{{ money(totalStockValue()) }}</span></div>

      </div>



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

    } @else if (!error()) {

      <div class="card card-pad">Loading dashboard…</div>

    }

  `,

  styles: [`

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem; }

    .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem;

      display: flex; flex-direction: column; gap: .25rem; box-shadow: var(--shadow); }

    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }

    .kpi-value { font-size: 1.35rem; font-weight: 700; }



    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }

    .card-pad { padding: .9rem 1rem; }

    .chart-card { display: flex; flex-direction: column; }

    .chart-card.wide { grid-column: span 3; }

    .chart-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .4rem; }

    .chart-head h3 { font-size: .9rem; }

    app-chart { display: block; height: 200px; }

    .empty { color: var(--muted); font-size: .8rem; height: 200px; display: grid; place-items: center; text-align: center; }

    @media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: repeat(2, 1fr); } .chart-card.wide { grid-column: span 2; } }

    @media (max-width: 700px) { .kpi-row { grid-template-columns: 1fr; } .grid { grid-template-columns: 1fr; } .chart-card.wide { grid-column: span 1; } }

  `],

})

export class DashboardComponent implements OnInit {

  auth = inject(AuthService);

  private itemService = inject(ItemService);

  private categoryService = inject(CategoryService);

  private customerService = inject(CustomerService);

  private supplierService = inject(SupplierService);

  private stockService = inject(StockService);

  private salesInvoiceService = inject(SalesInvoiceService);

  private ledgerService = inject(CustomerLedgerService);

  private dashboardService = inject(DashboardService);



  loaded = signal(false);

  error = signal<string | null>(null);

  summary = signal<DashboardSummaryDto | null>(null);



  totalStockValue = signal(0);

  invoicesCount = signal(0);



  salesTrend = signal<ChartConfiguration | null>(null);

  topReceivables = signal<ChartConfiguration | null>(null);

  topCustomers = signal<ChartConfiguration | null>(null);

  stockByCategory = signal<ChartConfiguration | null>(null);

  stockHealth = signal<ChartConfiguration | null>(null);

  overview = signal<ChartConfiguration | null>(null);



  ngOnInit(): void {

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



  private build(

    items: ItemDto[], categories: CategoryDto[], customers: CustomerDto[], suppliers: SupplierDto[],

    levels: StockLevelDto[], invoices: SalesInvoiceDto[], receivables: ReceivableDto[],

  ): void {

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

        data: { labels, datasets: [{ data: labels.map((l) => Math.round(valueByCat.get(l)!)), backgroundColor: PALETTE, borderWidth: 0 }] },

        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },

      });

    }



    const low = tracked.filter((i) => i.isLowStock && i.stockOnHand > 0).length;

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

      const d = new Date(start); d.setDate(start.getDate() + i);

      byDay.set(d.toISOString().substring(0, 10), 0);

    }

    for (const inv of invoices) {

      const key = inv.date.substring(0, 10);

      if (byDay.has(key)) byDay.set(key, byDay.get(key)! + inv.total);

    }



    if (invoices.length > 0) {

      const labels = [...byDay.keys()].map((d) => d.substring(5));

      this.salesTrend.set({

        type: 'line',

        data: {

          labels,

          datasets: [{

            label: 'Sales',

            data: [...byDay.values()].map((v) => Math.round(v)),

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



    const byCustomer = new Map<string, number>();

    for (const inv of invoices) {

      byCustomer.set(inv.customerName, (byCustomer.get(inv.customerName) ?? 0) + inv.total);

    }

    const topC = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (topC.length > 0) {

      this.topCustomers.set({

        type: 'bar',

        data: {

          labels: topC.map(([n]) => n),

          datasets: [{ label: 'Revenue', data: topC.map(([, v]) => Math.round(v)), backgroundColor: '#1f2933', borderRadius: 4 }],

        },

        options: {

          indexAxis: 'y', responsive: true, maintainAspectRatio: false,

          plugins: { legend: { display: false } },

          scales: { x: MONEY_AXIS },

        },

      });

    }



    const owed = receivables.filter((r) => r.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);

    const topR = owed.slice(0, 6);

    if (topR.length > 0) {

      this.topReceivables.set({

        type: 'bar',

        data: {

          labels: topR.map((r) => r.customerName),

          datasets: [{ label: 'Outstanding', data: topR.map((r) => Math.round(r.outstanding)), backgroundColor: '#e67700', borderRadius: 4 }],

        },

        options: {

          indexAxis: 'y', responsive: true, maintainAspectRatio: false,

          plugins: { legend: { display: false } },

          scales: { x: MONEY_AXIS },

        },

      });

    }

  }

}

