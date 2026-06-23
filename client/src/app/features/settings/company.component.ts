import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { FileService } from '../../core/services/file.service';
import { AccessService } from '../../core/services/access.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="page-title">Company Settings</h1>
    <p class="page-sub">Logo, name, and contact details appear across the app, invoices, and reports.</p>

    @if (saved()) { <div class="alert" style="background:#e6f4ea;color:var(--success)">Company details saved.</div> }
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card card-pad" style="max-width:720px">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="logo-row">
          <img class="logo-preview" [src]="logoPreview()" [alt]="form.getRawValue().name || 'Company logo'" />
          <div class="logo-actions">
            <div class="field">
              <label>Company logo</label>
              <input type="file" accept="image/*" (change)="onLogo($event)" [disabled]="uploading() || !access.canWrite('settings/company')" />
              <p class="hint">PNG or JPG recommended. Saved automatically after upload.</p>
            </div>
            @if (form.getRawValue().logoUrl && access.canWrite('settings/company')) {
              <button type="button" class="btn btn-ghost btn-sm" (click)="clearLogo()">Remove logo</button>
            }
            @if (uploading()) { <p class="hint">Uploading…</p> }
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1; min-width:240px">
            <label>Company name</label>
            <input formControlName="name" />
          </div>
          <div class="field" style="flex:1; min-width:240px">
            <label>Tagline / slogan</label>
            <input formControlName="tagline" placeholder="e.g. Steel & Construction" />
          </div>
        </div>
        <div class="row">
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

        @if (access.canWrite('settings/company')) {
          <button class="btn btn-primary" [disabled]="form.invalid || loading() || uploading()">
            {{ loading() ? 'Saving…' : 'Save changes' }}
          </button>
        } @else {
          <p class="page-sub">You do not have permission to edit company settings.</p>
        }
      </form>
    </div>
  `,
  styles: [`
    .logo-row { display: flex; gap: 1.25rem; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .logo-preview {
      width: 88px; height: 88px; object-fit: contain; border-radius: 12px;
      border: 1px solid var(--border); background: #fff; padding: .5rem; flex-shrink: 0;
    }
    .logo-actions { flex: 1; min-width: 220px; }
    .hint { font-size: .8rem; color: var(--muted); margin: .35rem 0 0; }
  `],
})
export class CompanyComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private service = inject(CompanyService);
  private companyCtx = inject(CompanyContextService);
  private fileService = inject(FileService);

  loading = signal(false);
  uploading = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);
  logoPreview = signal('/images/logo.png');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    tagline: [''],
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
    this.service.get().subscribe((c) => {
      const company = this.companyCtx.normalizeCompany(c);
      this.form.patchValue({
        ...company,
        tagline: company.tagline ?? '',
        legalName: company.legalName ?? '',
        address: company.address ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        taxNumber: company.taxNumber ?? '',
        logoUrl: company.logoUrl ?? '',
      });
      this.updateLogoPreview(company.logoUrl);
    });
  }

  onLogo(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.fileService.upload(file).subscribe({
      next: (res) => {
        this.form.patchValue({ logoUrl: res.path });
        this.updateLogoPreview(res.path);
        this.uploading.set(false);
        this.persistLogo(res.path);
      },
      error: () => {
        this.uploading.set(false);
        this.error.set('Logo upload failed.');
      },
    });
  }

  clearLogo(): void {
    this.form.patchValue({ logoUrl: '' });
    this.updateLogoPreview(null);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service.update(this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.loading.set(false);
        this.saved.set(true);
        const company = this.companyCtx.normalizeCompany(updated);
        this.companyCtx.setCompany(company);
        this.updateLogoPreview(company.logoUrl);
      },
      error: () => { this.loading.set(false); this.error.set('Could not save company details.'); },
    });
  }

  private updateLogoPreview(logoUrl?: string | null): void {
    this.logoPreview.set(this.companyCtx.resolveLogoUrl(logoUrl));
  }

  private persistLogo(logoUrl: string): void {
    if (!this.access.canWrite('settings/company') || this.form.invalid) return;
    this.service.update({ ...this.form.getRawValue(), logoUrl }).subscribe({
      next: (updated) => {
        const company = this.companyCtx.normalizeCompany(updated);
        this.companyCtx.setCompany(company);
        this.updateLogoPreview(company.logoUrl);
      },
      error: () => this.error.set('Logo uploaded but could not save. Click Save changes to retry.'),
    });
  }
}
