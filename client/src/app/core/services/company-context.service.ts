import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { catchError, forkJoin, of, tap } from 'rxjs';
import { CompanyBrandingDto, CompanyDto } from '../models/domain.models';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';
import { FileService } from './file.service';

const DEFAULT_NAME = 'Al-Haram Steel';
const DEFAULT_TAGLINE = 'Steel & Construction';
const DEFAULT_LOGO = '/images/logo.png';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private companyService = inject(CompanyService);
  private fileService = inject(FileService);
  private auth = inject(AuthService);
  private title = inject(Title);
  private document = inject(DOCUMENT);

  readonly company = signal<CompanyDto | null>(null);
  readonly loaded = signal(false);

  readonly name = computed(() => this.company()?.name?.trim() || DEFAULT_NAME);
  readonly tagline = computed(() => this.company()?.tagline?.trim() || DEFAULT_TAGLINE);
  readonly legalName = computed(() => this.company()?.legalName?.trim() || null);
  readonly appTitle = computed(() => `${this.name()} — ${this.tagline()}`);
  readonly sidebarTitle = computed(() => this.name());
  readonly logoSrc = computed(() => this.resolveLogoUrl(this.company()?.logoUrl));

  init(): Promise<void> {
    const branding$ = this.companyService.getBranding().pipe(catchError(() => of(null)));
    const full$ = this.auth.token
      ? this.companyService.get().pipe(catchError(() => of(null)))
      : of(null);

    return new Promise((resolve) => {
      forkJoin({ branding: branding$, full: full$ }).subscribe({
        next: ({ branding, full }) => {
          if (full) {
            this.setCompany(this.normalizeCompany(full));
          } else if (branding) {
            this.setFromBranding(branding);
          } else {
            this.applyDefaults();
          }
          this.loaded.set(true);
          resolve();
        },
        error: () => {
          this.applyDefaults();
          this.loaded.set(true);
          resolve();
        },
      });
    });
  }

  refresh(): void {
    if (!this.auth.token) {
      this.companyService.getBranding().pipe(
        catchError(() => of(null)),
        tap((b) => (b ? this.setFromBranding(b) : this.applyDefaults())),
      ).subscribe();
      return;
    }

    this.companyService.get().pipe(
      catchError(() => of(null)),
      tap((c) => (c ? this.setCompany(this.normalizeCompany(c)) : undefined)),
    ).subscribe();
  }

  setCompany(company: CompanyDto): void {
    this.company.set(this.normalizeCompany(company));
    this.applyBrowserBranding();
  }

  normalizeCompany(raw: CompanyDto | Record<string, unknown>): CompanyDto {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      name: String(r['name'] ?? r['Name'] ?? ''),
      tagline: (r['tagline'] ?? r['Tagline'] ?? null) as string | null,
      legalName: (r['legalName'] ?? r['LegalName'] ?? null) as string | null,
      address: (r['address'] ?? r['Address'] ?? null) as string | null,
      phone: (r['phone'] ?? r['Phone'] ?? null) as string | null,
      email: (r['email'] ?? r['Email'] ?? null) as string | null,
      taxNumber: (r['taxNumber'] ?? r['TaxNumber'] ?? null) as string | null,
      logoUrl: (r['logoUrl'] ?? r['LogoUrl'] ?? null) as string | null,
      currency: String(r['currency'] ?? r['Currency'] ?? 'PKR'),
      defaultTaxRate: Number(r['defaultTaxRate'] ?? r['DefaultTaxRate'] ?? 0),
    };
  }

  resolveLogoUrl(logoUrl?: string | null): string {
    const path = logoUrl?.trim();
    if (!path) return DEFAULT_LOGO;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return path;
    }
    return this.fileService.fileUrl(path);
  }

  private setFromBranding(branding: CompanyBrandingDto): void {
    const b = branding as unknown as Record<string, unknown>;
    this.company.set({
      id: '',
      name: String(b['name'] ?? b['Name'] ?? DEFAULT_NAME),
      tagline: (b['tagline'] ?? b['Tagline'] ?? null) as string | null,
      logoUrl: (b['logoUrl'] ?? b['LogoUrl'] ?? null) as string | null,
      currency: 'PKR',
      defaultTaxRate: 0,
    });
    this.applyBrowserBranding();
  }

  private applyDefaults(): void {
    this.company.set({
      id: '',
      name: DEFAULT_NAME,
      tagline: DEFAULT_TAGLINE,
      logoUrl: null,
      currency: 'PKR',
      defaultTaxRate: 0,
    });
    this.applyBrowserBranding();
  }

  private applyBrowserBranding(): void {
    this.title.setTitle(this.appTitle());
    this.updateFavicon(this.logoSrc());
  }

  private updateFavicon(href: string): void {
    let link = this.document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'icon';
      this.document.head.appendChild(link);
    }
    link.type = href.endsWith('.png') ? 'image/png' : 'image/x-icon';
    link.href = href;
  }
}
