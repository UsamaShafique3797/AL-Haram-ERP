import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { CustomerLedgerService } from '../../core/services/customer-ledger.service';
import { CustomerDto, CustomerLedgerDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Customer ledger</h1>
        <p class="page-sub">Running balance: opening + invoices − receipts − returns.</p>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:1rem">
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1; margin-bottom:0">
          <label>Customer</label>
          <select [(ngModel)]="customerId" (change)="load()">
            <option value="">— select —</option>
            @for (c of customers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        @if (ledger(); as l) {
          <div class="kpi-pill">
            <span class="kpi-label">Opening</span>
            <strong>{{ money(l.openingBalance) }}</strong>
          </div>
          <div class="kpi-pill">
            <span class="kpi-label">Debit total</span>
            <strong>{{ money(l.totalDebit) }}</strong>
          </div>
          <div class="kpi-pill">
            <span class="kpi-label">Credit total</span>
            <strong>{{ money(l.totalCredit) }}</strong>
          </div>
          <div class="kpi-pill" [style.background]="l.closingBalance > 0 ? '#fff4e6' : '#e6f4ea'">
            <span class="kpi-label">Closing balance</span>
            <strong [style.color]="l.closingBalance > 0 ? 'var(--warn)' : 'var(--success)'">{{ money(l.closingBalance) }}</strong>
          </div>
        }
      </div>
    </div>

    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (ledger(); as l) {
      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Document</th><th>Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr>
          </thead>
          <tbody>
            @for (e of l.entries; track $index) {
              <tr>
                <td>{{ e.date | date:'mediumDate' }}</td>
                <td>{{ e.documentType }}</td>
                <td>{{ e.documentNumber }}</td>
                <td>{{ e.reference || '—' }}</td>
                <td class="num">{{ e.debit ? money(e.debit) : '—' }}</td>
                <td class="num">{{ e.credit ? money(e.credit) : '—' }}</td>
                <td class="num" [style.color]="e.balance > 0 ? 'var(--warn)' : (e.balance < 0 ? 'var(--success)' : 'var(--ink)')">
                  {{ money(e.balance) }}
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" style="text-align:center;color:var(--muted)">No movement yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .num { text-align: right; }
    .kpi-pill { padding: .55rem .9rem; border-radius: 8px; background: #f7f8fa;
      display: flex; flex-direction: column; min-width: 130px; }
    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .kpi-pill strong { font-size: 1.05rem; }
  `],
})
export class LedgerComponent implements OnInit {
  private customerService = inject(CustomerService);
  private ledgerService = inject(CustomerLedgerService);
  private route = inject(ActivatedRoute);

  customers = signal<CustomerDto[]>([]);
  ledger = signal<CustomerLedgerDto | null>(null);
  loading = signal(false);
  customerId = '';

  ngOnInit(): void {
    const preselect = this.route.snapshot.queryParamMap.get('customerId');
    if (preselect) this.customerId = preselect;

    this.customerService.getAll().subscribe((c) => {
      this.customers.set(c.filter((x) => x.isActive));
      if (this.customerId) this.load();
    });
  }

  load(): void {
    if (!this.customerId) { this.ledger.set(null); return; }
    this.loading.set(true);
    this.ledgerService.getLedger(this.customerId).subscribe({
      next: (l) => { this.ledger.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
