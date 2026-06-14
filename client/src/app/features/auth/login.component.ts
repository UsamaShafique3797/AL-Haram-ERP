import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card card">
        <div class="brand">
          <div class="logo">AH</div>
          <div>
            <h2>Al-Haram ERP</h2>
            <div class="muted">Steel &amp; Construction Management</div>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Username</label>
            <input type="text" formControlName="userName" autocomplete="username" placeholder="admin" />
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary" style="width:100%; justify-content:center"
                  [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="hint">Default admin: <strong>admin</strong> / <strong>Admin&#64;123</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap { min-height: 100vh; display: grid; place-items: center;
      background: linear-gradient(135deg, #1f2933, #c0392b); padding: 1rem; }
    .login-card { width: 100%; max-width: 380px; padding: 2rem; }
    .brand { display: flex; align-items: center; gap: .85rem; margin-bottom: 1.5rem; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: var(--brand); color: #fff;
      display: grid; place-items: center; font-weight: 800; font-size: 1.1rem; }
    .muted { color: var(--ink-soft); font-size: .8rem; }
    .hint { margin-top: 1.25rem; text-align: center; font-size: .78rem; color: var(--muted); }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    userName: ['admin', Validators.required],
    password: ['Admin@123', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.errors?.[0] ?? 'Invalid username or password.');
      },
    });
  }
}
