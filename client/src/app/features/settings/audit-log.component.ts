import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuditLogService } from '../../core/services/report.service';
import { AuditLogDto } from '../../core/models/domain.models';
import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, DatePipe, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Audit log</h1>
        <p class="page-sub">Recent system activity and data changes.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost" (click)="load()">Refresh</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (loading()) { <div class="card card-pad">Loading…</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search audit log…" />
      <table class="table">
        <thead>
          <tr>
            <th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          @for (e of filteredRows(); track e.id) {
            <tr>
              <td>{{ e.createdAt | date:'medium' }}</td>
              <td>{{ e.userName || '—' }}</td>
              <td>{{ e.action }}</td>
              <td>{{ e.entityType }}</td>
              <td>{{ e.entityNumber || e.entityId || '—' }}</td>
              <td>{{ e.details || '—' }}</td>
            </tr>
          } @empty {
            @if (!loading()) {
              <tr><td colspan="6" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No audit entries yet.') }}</td></tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  private service = inject(AuditLogService);

  entries = signal<AuditLogDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.entries(), this.searchTerm()));
  loading = signal(false);
  error = signal<string | null>(null);

  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getRecent(200).subscribe({
      next: (list) => { this.entries.set(list); this.loading.set(false); },
      error: () => { this.error.set('Could not load audit log.'); this.loading.set(false); },
    });
  }
}
