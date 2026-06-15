import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierLedgerService } from '../../core/services/supplier-ledger.service';
import { SupplierDto, SupplierLedgerDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-supplier-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Supplier ledger</h1>
        <p class="page-sub">Running balance: opening + purchase invoices − payments − returns.</p>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:1rem">
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1; margin-bottom:0">
          <label>Supplier</label>
          <select [(ngModel)]="supplierId" (change)="load()">
            <option value="">— select —</option>
            @for (s of suppliers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
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
export class SupplierLedgerComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private ledgerService = inject(SupplierLedgerService);
  private route = inject(ActivatedRoute);

  suppliers = signal<SupplierDto[]>([]);
  ledger = signal<SupplierLedgerDto | null>(null);
  loading = signal(false);
  supplierId = '';

  ngOnInit(): void {
    const preselect = this.route.snapshot.queryParamMap.get('supplierId');
    if (preselect) this.supplierId = preselect;

    this.supplierService.getAll().subscribe((s) => {
      this.suppliers.set(s.filter((x) => x.isActive));
      if (this.supplierId) this.load();
    });
  }

  load(): void {
    if (!this.supplierId) { this.ledger.set(null); return; }
    this.loading.set(true);
    this.ledgerService.getLedger(this.supplierId).subscribe({
      next: (l) => { this.ledger.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  money(v: number): string {
    return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
