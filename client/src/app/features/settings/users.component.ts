import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { GodownService } from '../../core/services/godown.service';
import { AccessService } from '../../core/services/access.service';
import { UserDto } from '../../core/models/auth.models';
import { GodownDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Users</h1>
        <p class="page-sub">People who can access the system.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('settings/users')) {
        <button class="btn btn-primary" (click)="openNew()">+ New user</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Branch</th><th>Roles</th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td>{{ u.fullName }}</td>
              <td>{{ u.userName }}</td>
              <td>{{ u.email || '—' }}</td>
              <td>{{ u.canAccessAllBranches ? 'All branches' : (u.godownName || '—') }}</td>
              <td>
                @for (r of u.roles; track r) { <span class="badge badge-muted" style="margin-right:.3rem">{{ r }}</span> }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="text-align:center;color:var(--muted)">No users yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>New user</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:1"><label>Full name</label><input formControlName="fullName" /></div>
                <div class="field" style="flex:1"><label>Username</label><input formControlName="userName" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1"><label>Email</label><input formControlName="email" /></div>
                <div class="field" style="flex:1"><label>Password</label><input type="password" formControlName="password" /></div>
              </div>
              <div class="field">
                <label>Branch</label>
                <select formControlName="godownId">
                  <option value="">All branches (admin)</option>
                  @for (g of godowns(); track g.id) {
                    <option [value]="g.id">{{ g.name }}</option>
                  }
                </select>
                <span class="hint">Leave as “All branches” for company admin. Pick one branch for a branch owner/manager.</span>
              </div>
              <div class="field">
                <label>Roles</label>
                <div class="roles">
                  @for (r of roles(); track r) {
                    <label class="check">
                      <input type="checkbox" [value]="r" (change)="toggleRole(r, $event)" /> {{ r }}
                    </label>
                  }
                </div>
              </div>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Create user' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(16,24,40,.45);
      display: grid; place-items: center; padding: 1rem; z-index: 50; }
    .modal { width: 100%; max-width: 520px; }
    .roles { display: flex; flex-wrap: wrap; gap: .75rem; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
    .hint { font-size: .75rem; color: var(--muted); margin-top: .25rem; }
  `],
})
export class UsersComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private service = inject(UserService);
  private godownService = inject(GodownService);

  users = signal<UserDto[]>([]);
  godowns = signal<GodownDto[]>([]);
  roles = signal<string[]>([]);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  selectedRoles = new Set<string>();

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    userName: ['', Validators.required],
    email: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    godownId: [''],
  });

  ngOnInit(): void {
    this.load();
    this.service.getRoles().subscribe((r) => this.roles.set(r));
    this.godownService.getAll().subscribe((g) => this.godowns.set(g));
  }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.users.set(list),
      error: () => this.error.set('Could not load users.'),
    });
  }

  openNew(): void {
    this.selectedRoles.clear();
    this.formError.set(null);
    this.form.reset({ fullName: '', userName: '', email: '', password: '', godownId: '' });
    this.showForm.set(true);
  }

  toggleRole(role: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.selectedRoles.add(role); else this.selectedRoles.delete(role);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const raw = this.form.getRawValue();
    const payload = {
      ...raw,
      godownId: raw.godownId || null,
      roles: [...this.selectedRoles],
    };
    this.service.create(payload).subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not create user.');
      },
    });
  }

  close(): void { this.showForm.set(false); }
}
