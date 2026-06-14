import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="page-title">Company Settings</h1>
    <p class="page-sub">These details appear on invoices and reports.</p>

    @if (saved()) { <div class="alert" style="background:#e6f4ea;color:var(--success)">Company details saved.</div> }
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card card-pad" style="max-width:720px">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="row">
          <div class="field" style="flex:1; min-width:240px">
            <label>Company name</label>
            <input formControlName="name" />
          </div>
          <div class="field" style="flex:1; min-width:240px">
            <label>Legal name</label>
            <input formControlName="legalName" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1; min-width:240px">
            <label>Phone</label>
            <input formControlName="phone" />
          </div>
          <div class="field" style="flex:1; min-width:240px">
            <label>Email</label>
            <input formControlName="email" />
          </div>
        </div>
        <div class="field">
          <label>Address</label>
          <input formControlName="address" />
        </div>
        <div class="row">
          <div class="field" style="flex:1; min-width:160px">
            <label>Tax number</label>
            <input formControlName="taxNumber" />
          </div>
          <div class="field" style="width:120px">
            <label>Currency</label>
            <input formControlName="currency" />
          </div>
          <div class="field" style="width:160px">
            <label>Default tax rate (%)</label>
            <input type="number" step="0.01" formControlName="defaultTaxRate" />
          </div>
        </div>

        @if (canEdit) {
          <button class="btn btn-primary" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Saving…' : 'Save changes' }}
          </button>
        } @else {
          <p class="page-sub">You do not have permission to edit company settings.</p>
        }
      </form>
    </div>
  `,
})
export class CompanyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CompanyService);
  private auth = inject(AuthService);

  loading = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);
  canEdit = this.auth.hasRole('Owner', 'Manager');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    legalName: [''],
    address: [''],
    phone: [''],
    email: [''],
    taxNumber: [''],
    logoUrl: [''],
    currency: ['PKR', Validators.required],
    defaultTaxRate: [0, Validators.required],
  });

  ngOnInit(): void {
    this.service.get().subscribe((c) => this.form.patchValue(c as any));
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service.update(this.form.getRawValue()).subscribe({
      next: () => { this.loading.set(false); this.saved.set(true); },
      error: () => { this.loading.set(false); this.error.set('Could not save company details.'); },
    });
  }
}
