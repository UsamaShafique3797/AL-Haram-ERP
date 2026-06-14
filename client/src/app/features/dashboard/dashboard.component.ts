import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

interface Kpi {
  label: string;
  value: string;
  hint: string;
  accent: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1 class="page-title">Welcome back, {{ auth.user()?.fullName }}</h1>
    <p class="page-sub">Here is your business at a glance. Live figures arrive as each module is built.</p>

    <div class="kpis">
      @for (kpi of kpis; track kpi.label) {
        <div class="card card-pad kpi">
          <span class="kpi-label">{{ kpi.label }}</span>
          <span class="kpi-value" [style.color]="kpi.accent">{{ kpi.value }}</span>
          <span class="kpi-hint">{{ kpi.hint }}</span>
        </div>
      }
    </div>

    <div class="card card-pad roadmap">
      <h3>Build roadmap</h3>
      <p class="page-sub" style="margin:.25rem 0 1rem">Phase 0 (foundation) is complete. Coming next:</p>
      <ul class="phases">
        <li><span class="badge badge-success">Done</span> Phase 0 — Foundation, login, users, company &amp; godowns</li>
        <li><span class="badge badge-muted">Next</span> Phase 1 — Inventory &amp; item catalog (weight/piece units)</li>
        <li><span class="badge badge-muted">Soon</span> Phase 2 — Sales &amp; receivables</li>
        <li><span class="badge badge-muted">Soon</span> Phase 3 — Purchasing &amp; payables</li>
        <li><span class="badge badge-muted">Soon</span> Phase 4 — Expenses, cash/bank &amp; profit/loss</li>
      </ul>
    </div>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi { display: flex; flex-direction: column; gap: .35rem; }
    .kpi-label { font-size: .78rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .kpi-value { font-size: 1.6rem; font-weight: 700; }
    .kpi-hint { font-size: .75rem; color: var(--ink-soft); }
    .roadmap h3 { font-size: 1.05rem; }
    .phases { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .6rem; }
    .phases li { display: flex; align-items: center; gap: .6rem; font-size: .9rem; }
  `],
})
export class DashboardComponent {
  auth = inject(AuthService);

  kpis: Kpi[] = [
    { label: 'Sales (This Month)', value: '—', hint: 'Available in Phase 2', accent: 'var(--ink)' },
    { label: 'Purchases (This Month)', value: '—', hint: 'Available in Phase 3', accent: 'var(--ink)' },
    { label: 'Expenses (This Month)', value: '—', hint: 'Available in Phase 4', accent: 'var(--ink)' },
    { label: 'Net Profit', value: '—', hint: 'Available in Phase 4', accent: 'var(--success)' },
    { label: 'Receivables', value: '—', hint: 'Money customers owe', accent: 'var(--warn)' },
    { label: 'Payables', value: '—', hint: 'Money we owe suppliers', accent: 'var(--brand)' },
  ];
}
