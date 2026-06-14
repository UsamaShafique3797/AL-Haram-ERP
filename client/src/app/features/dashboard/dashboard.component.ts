import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { ItemService } from '../../core/services/item.service';
import { CategoryService } from '../../core/services/category.service';
import { CustomerService } from '../../core/services/customer.service';
import { SupplierService } from '../../core/services/supplier.service';
import { StockService } from '../../core/services/stock.service';
import { CategoryDto, CustomerDto, ItemDto, StockLevelDto, SupplierDto } from '../../core/models/domain.models';
import { ChartComponent } from '../../shared/chart.component';

const PALETTE = ['#c0392b', '#1f2933', '#e67700', '#2f9e44', '#3b6ea5', '#7b8794', '#8e44ad', '#16a085', '#d4a017', '#52606d'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ChartComponent],
  template: `
    <h1 class="page-title">Welcome back, {{ auth.user()?.fullName }}</h1>
    <p class="page-sub">Your inventory at a glance. Sales, purchases &amp; profit charts arrive with later phases.</p>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    @if (loaded()) {
      <div class="grid">
        <div class="card card-pad chart-card wide">
          <div class="chart-head"><h3>Top items by stock value</h3></div>
          @if (topItems(); as cfg) { <app-chart [config]="cfg" /> }
          @else { <p class="empty">No stock yet.</p> }
        </div>

        <div class="card card-pad chart-card">
          <div class="chart-head">
            <h3>Stock value by category</h3>
            <span class="chart-total">{{ money(totalStockValue()) }}</span>
          </div>
          @if (stockByCategory(); as cfg) { <app-chart [config]="cfg" /> }
          @else { <p class="empty">No stock value yet.</p> }
        </div>

        <div class="card card-pad chart-card">
          <div class="chart-head"><h3>Stock health</h3></div>
          @if (stockHealth(); as cfg) { <app-chart [config]="cfg" /> }
          @else { <p class="empty">No tracked items yet.</p> }
        </div>

        <div class="card card-pad chart-card">
          <div class="chart-head"><h3>Items per category</h3></div>
          @if (itemsPerCategory(); as cfg) { <app-chart [config]="cfg" /> }
          @else { <p class="empty">No categories yet.</p> }
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
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .card-pad { padding: .9rem 1rem; }
    .chart-card { display: flex; flex-direction: column; }
    .chart-card.wide { grid-column: span 2; }
    .chart-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .4rem; }
    .chart-head h3 { font-size: .9rem; }
    .chart-total { font-weight: 700; color: var(--brand); font-size: .9rem; }
    app-chart { display: block; height: 200px; }
    .empty { color: var(--muted); font-size: .8rem; height: 200px; display: grid; place-items: center; text-align: center; }
    @media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, 1fr); } .chart-card.wide { grid-column: span 2; } }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .chart-card.wide { grid-column: span 1; } }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private itemService = inject(ItemService);
  private categoryService = inject(CategoryService);
  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private stockService = inject(StockService);

  loaded = signal(false);
  error = signal<string | null>(null);
  totalStockValue = signal(0);

  stockByCategory = signal<ChartConfiguration | null>(null);
  stockHealth = signal<ChartConfiguration | null>(null);
  topItems = signal<ChartConfiguration | null>(null);
  itemsPerCategory = signal<ChartConfiguration | null>(null);
  overview = signal<ChartConfiguration | null>(null);

  ngOnInit(): void {
    forkJoin({
      items: this.itemService.getAll(),
      categories: this.categoryService.getAll(),
      customers: this.customerService.getAll(),
      suppliers: this.supplierService.getAll(),
      levels: this.stockService.getLevels(),
    }).subscribe({
      next: (data) => {
        this.build(data.items, data.categories, data.customers, data.suppliers, data.levels);
        this.loaded.set(true);
      },
      error: () => this.error.set('Could not load dashboard data.'),
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  private build(items: ItemDto[], categories: CategoryDto[], customers: CustomerDto[], suppliers: SupplierDto[], levels: StockLevelDto[]): void {
    const tracked = items.filter((i) => i.trackInventory);
    this.totalStockValue.set(items.reduce((s, i) => s + (i.stockValue || 0), 0));

    // Stock value by category (doughnut)
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
          datasets: [{ data: labels.map((l) => Math.round(valueByCat.get(l)!)), backgroundColor: PALETTE, borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },
      });
    }

    // Stock health (doughnut)
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

    // Top items by stock value (horizontal bar)
    const top = [...items].filter((i) => i.stockValue > 0).sort((a, b) => b.stockValue - a.stockValue).slice(0, 8);
    if (top.length > 0) {
      this.topItems.set({
        type: 'bar',
        data: {
          labels: top.map((i) => i.name),
          datasets: [{ label: 'Stock value', data: top.map((i) => Math.round(i.stockValue)), backgroundColor: '#c0392b', borderRadius: 4 }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { ticks: { callback: (v) => 'Rs ' + Number(v).toLocaleString() } } },
        },
      });
    }

    // Items per category (bar)
    if (categories.length > 0) {
      const sorted = [...categories].sort((a, b) => b.itemCount - a.itemCount);
      this.itemsPerCategory.set({
        type: 'bar',
        data: {
          labels: sorted.map((c) => c.name),
          datasets: [{ label: 'Items', data: sorted.map((c) => c.itemCount), backgroundColor: '#1f2933', borderRadius: 4 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { ticks: { precision: 0 } } },
        },
      });
    }

    // Master data overview (bar)
    this.overview.set({
      type: 'bar',
      data: {
        labels: ['Items', 'Categories', 'Customers', 'Suppliers'],
        datasets: [{
          label: 'Count',
          data: [items.length, categories.length, customers.length, suppliers.length],
          backgroundColor: ['#c0392b', '#e67700', '#3b6ea5', '#2f9e44'], borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { precision: 0 } } },
      },
    });
  }
}
