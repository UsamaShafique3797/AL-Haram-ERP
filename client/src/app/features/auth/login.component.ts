import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyContextService } from '../../core/services/company-context.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card card">
        <div class="brand">
          <img class="logo" [src]="companyCtx.logoSrc()" [alt]="companyCtx.name()" />
          <div>
            <h2>{{ companyCtx.name() }}</h2>
            <div class="muted">{{ companyCtx.tagline() }}</div>
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
      </div>
    </div>
  `,
  styles: [`
    .login-wrap { position: relative; min-height: 100vh; display: grid; place-items: center;
      padding: 1rem; isolation: isolate; }
    .login-wrap::before { content: ''; position: absolute; inset: 0; z-index: -2;
      background: url('/images/login-bg.png') center / cover no-repeat; }
    .login-wrap::after { content: ''; position: absolute; inset: 0; z-index: -1;
      background: linear-gradient(135deg, rgba(15,20,26,.82), rgba(31,41,51,.72) 45%, rgba(192,57,43,.55)); }
    .login-card { width: 100%; max-width: 380px; padding: 2rem;
      background: rgba(255,255,255,.96); backdrop-filter: blur(6px);
      box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    .brand { display: flex; align-items: center; gap: .85rem; margin-bottom: 1.5rem; }
    .logo { width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
      background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .muted { color: var(--ink-soft); font-size: .8rem; }
    .hint { margin-top: 1.25rem; text-align: center; font-size: .78rem; color: var(--muted); }
    @media (max-width: 480px) {
      .login-wrap { min-height: 100dvh; padding: .75rem; }
      .login-card { padding: 1.25rem; }
      .brand { flex-direction: column; text-align: center; gap: .65rem; }
      .brand h2 { font-size: 1.05rem; word-break: break-word; }
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  companyCtx = inject(CompanyContextService);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.companyCtx.refresh();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 0) {
          this.error.set('Cannot reach the API. Start it with: dotnet run --project src/AlHaram.Api --launch-profile http');
        } else {
          this.error.set(err?.error?.errors?.[0] ?? 'Invalid username or password.');
        }
      },
    });
  }
}
