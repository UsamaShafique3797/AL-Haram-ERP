import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DayBookService } from '../../core/services/day-book.service';
import { DayBookDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-day-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="row no-print" style="align-items:center">
      <div>
        <h1 class="page-title">Day book</h1>
        <p class="page-sub">All cash and bank movements for a single day.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="print()">Print</button>
    </div>

    <div class="card card-pad no-print" style="margin-bottom:1rem">
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1;margin-bottom:0"><label>Date</label><input type="date" [(ngModel)]="date" (change)="load()" /></div>
      </div>
    </div>

    @if (error()) { <div class="alert alert-error no-print">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    @if (dayBook(); as d) {
      <div class="row kpi-row no-print">
        <div class="kpi-card"><span class="kpi-label">Money in</span><span class="kpi-value">{{ money(d.totalIn) }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Money out</span><span class="kpi-value">{{ money(d.totalOut) }}</span></div>
        <div class="kpi-card"><span class="kpi-label">Net movement</span><span class="kpi-value">{{ money(d.netMovement) }}</span></div>
      </div>

      <div class="card" style="overflow:hidden">
        <table class="table">
          <thead>
            <tr><th>Account</th><th>Type</th><th>Source</th><th>Reference</th><th>Notes</th><th class="num">In</th><th class="num">Out</th></tr>
          </thead>
          <tbody>
            @for (e of d.entries; track $index) {
              <tr>
                <td>{{ e.paymentAccountName }}</td>
                <td>{{ e.accountType }}</td>
                <td>{{ e.source }}</td>
                <td>{{ e.reference || '—' }}</td>
                <td>{{ e.notes || '—' }}</td>
                <td class="num">{{ e.moneyIn ? money(e.moneyIn) : '—' }}</td>
                <td class="num">{{ e.moneyOut ? money(e.moneyOut) : '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" style="text-align:center;color:var(--muted)">No movements on this date.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: .85rem 1rem;
      display: flex; flex-direction: column; gap: .25rem; }
    .kpi-label { font-size: .7rem; color: var(--muted); text-transform: uppercase; }
    .kpi-value { font-size: 1.2rem; font-weight: 700; }
    .num { text-align: right; }
    @media print { .no-print { display: none !important; } }
  `],
})
export class DayBookComponent implements OnInit {
  private service = inject(DayBookService);

  dayBook = signal<DayBookDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  date = new Date().toISOString().substring(0, 10);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getForDate(this.date).subscribe({
      next: (d) => { this.dayBook.set(d); this.loading.set(false); },
      error: () => { this.error.set('Could not load day book.'); this.loading.set(false); },
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  print(): void { window.print(); }
}
