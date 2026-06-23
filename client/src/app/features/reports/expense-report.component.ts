import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { ExpenseReportDto } from '../../core/models/domain.models';
import { CompanyPrintHeaderComponent } from '../../shared/company-print-header.component';

@Component({
  selector: 'app-expense-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, CompanyPrintHeaderComponent],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Expense report</h1>
        <p class="page-sub">All expenses recorded in the selected period.</p>
      </div>
      <div class="spacer"></div>
      <a class="btn btn-ghost" routerLink="/reports">← Reports</a>
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
      <app-company-print-header title="Expense Report">
        <p>{{ r.from | date:'mediumDate' }} — {{ r.to | date:'mediumDate' }}</p>
      </app-company-print-header>

      <div class="row kpi-row no-print">
        <div class="kpi-card"><span class="kpi-label">Expenses</span><span class="kpi-value">{{ r.expenseCount }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Total amount</span><span class="kpi-value">{{ money(r.totalAmount) }}</span></div>
      </div>

      @if (r.byCategory.length) {
        <div class="card card-pad" style="margin-bottom:1rem">
          <h3>By category</h3>
          <table class="table">
            <thead><tr><th>Category</th><th class="num">Amount</th></tr></thead>
            <tbody>
              @for (c of r.byCategory; track c.name) {
                <tr><td>{{ c.name }}</td><td class="num">{{ money(c.amount) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr><th>Number</th><th>Date</th><th>Category</th><th>Account</th><th class="num">Amount</th><th>Notes</th></tr>
          </thead>
          <tbody>
            @for (l of r.lines; track l.expenseId) {
              <tr>
                <td>{{ l.number }}</td>
                <td>{{ l.date | date:'mediumDate' }}</td>
                <td>{{ l.categoryName }}</td>
                <td>{{ l.paymentAccountName }}</td>
                <td class="num">{{ money(l.amount) }}</td>
                <td>{{ l.notes || '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" style="text-align:center;color:var(--muted)">No expenses in this period.</td></tr>
            }
          </tbody>
          @if (r.lines.length) {
            <tfoot>
              <tr><td colspan="4"><strong>Total</strong></td><td class="num"><strong>{{ money(r.totalAmount) }}</strong></td><td></td></tr>
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
    @media print { .no-print { display: none !important; } }
  `],
})
export class ExpenseReportComponent implements OnInit {
  private service = inject(ReportService);

  report = signal<ExpenseReportDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  from = this.monthStart();
  to = new Date().toISOString().substring(0, 10);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getExpenseReport(this.from, this.to).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.error.set('Could not load expense report.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }

  private monthStart(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  }
}
