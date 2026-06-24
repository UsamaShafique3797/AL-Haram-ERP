import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashBookService } from '../../core/services/cash-book.service';
import { CashBookDto } from '../../core/models/domain.models';
import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-cash-book',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Cash &amp; bank book</h1>
        <p class="page-sub">Running statement of money in and out per account.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="print()">Print</button>
    </div>

    <div class="card card-pad no-print" style="margin-bottom:1rem">
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1;margin-bottom:0"><label>From</label><input type="date" [(ngModel)]="from" /></div>
        <div class="field" style="flex:1;margin-bottom:0"><label>To</label><input type="date" [(ngModel)]="to" /></div>
        <button class="btn btn-ghost" (click)="load()">Apply</button>
      </div>
    </div>

    @if (error()) { <div class="alert alert-error no-print">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (books().length) {
      <div class="card card-pad no-print" style="margin-bottom:1rem">
        <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search cash book…" />
      </div>
    }

    @for (book of filteredBooks(); track book.paymentAccountId) {
      <div class="card card-pad book-block" style="margin-bottom:1rem">
        <div class="row" style="align-items:baseline;margin-bottom:.5rem">
          <h3>{{ book.paymentAccountName }} <span class="badge badge-muted">{{ book.accountType }}</span></h3>
          <div class="spacer"></div>
          <span class="kpi">Opening {{ money(book.openingBalance) }}</span>
          <span class="kpi in">In {{ money(book.totalIn) }}</span>
          <span class="kpi out">Out {{ money(book.totalOut) }}</span>
          <span class="kpi close">Balance {{ money(book.closingBalance) }}</span>
        </div>
        <div style="overflow:hidden">
          <table class="table">
            <thead>
              <tr><th>Date</th><th>Source</th><th>Reference</th><th>Notes</th><th class="num">In</th><th class="num">Out</th><th class="num">Balance</th></tr>
            </thead>
            <tbody>
              @for (e of book.entries; track $index) {
                <tr>
                  <td>{{ e.date | date:'mediumDate' }}</td>
                  <td>{{ e.source }}</td>
                  <td>{{ e.reference || '—' }}</td>
                  <td>{{ e.notes || '—' }}</td>
                  <td class="num">{{ e.moneyIn ? money(e.moneyIn) : '—' }}</td>
                  <td class="num">{{ e.moneyOut ? money(e.moneyOut) : '—' }}</td>
                  <td class="num">{{ money(e.balance) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" style="text-align:center;color:var(--muted)">{{ gridEmptyMessage(searchTerm(), 'No transactions in this period.') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .kpi { font-size: .8rem; color: var(--muted); margin-left: .75rem; }
    .kpi.close { font-weight: 700; color: var(--ink); }
    .num { text-align: right; }
    @media print {
      .no-print { display: none !important; }
      .book-block { break-inside: avoid; page-break-inside: avoid; }
    }
  `],
})
export class CashBookComponent implements OnInit {
  readonly gridEmptyMessage = gridEmptyMessage;

  private service = inject(CashBookService);

  books = signal<CashBookDto[]>([]);
  searchTerm = signal('');
  filteredBooks = computed(() => {
    const t = this.searchTerm();
    const books = this.books();
    if (!t.trim()) return books;
    return books
      .map((b) => ({ ...b, entries: filterByGridSearch(b.entries, t) }))
      .filter(
        (b) =>
          b.entries.length > 0 ||
          filterByGridSearch([{ paymentAccountName: b.paymentAccountName, accountType: b.accountType }], t).length,
      );
  });
  loading = signal(false);
  error = signal<string | null>(null);
  from = '';
  to = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getAll(this.from || undefined, this.to || undefined).subscribe({
      next: (list) => { this.books.set(list); this.loading.set(false); },
      error: () => { this.error.set('Could not load cash book.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }
}
