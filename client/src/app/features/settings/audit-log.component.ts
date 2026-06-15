import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuditLogService } from '../../core/services/report.service';
import { AuditLogDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, DatePipe],
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
      <table class="table">
        <thead>
          <tr>
            <th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          @for (e of entries(); track e.id) {
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
              <tr><td colspan="6" style="text-align:center;color:var(--muted)">No audit entries yet.</td></tr>
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
  loading = signal(false);
  error = signal<string | null>(null);

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
