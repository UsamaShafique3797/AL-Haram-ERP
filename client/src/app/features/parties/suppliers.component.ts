import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Suppliers</h1>
        <p class="page-sub">Vendors you buy material from.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()">+ New supplier</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Contact</th><th>Phone</th><th>Terms</th><th>Opening bal.</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (s of suppliers(); track s.id) {
            <tr>
              <td>{{ s.name }}@if (s.code) { <span class="badge badge-muted" style="margin-left:.4rem">{{ s.code }}</span> }</td>
              <td>{{ s.contactPerson || '—' }}</td>
              <td>{{ s.phone || '—' }}</td>
              <td>{{ s.paymentTermsDays }} d</td>
              <td>{{ money(s.openingBalance) }}</td>
              <td>
                @if (s.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="edit(s)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="remove(s)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No suppliers yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit supplier' : 'New supplier' }}</h3>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2"><label>Name</label><input formControlName="name" /></div>
                <div class="field" style="flex:1"><label>Code</label><input formControlName="code" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1"><label>Contact person</label><input formControlName="contactPerson" /></div>
                <div class="field" style="flex:1"><label>Phone</label><input formControlName="phone" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1"><label>Email</label><input formControlName="email" /></div>
                <div class="field" style="flex:1"><label>Tax number</label><input formControlName="taxNumber" /></div>
              </div>
              <div class="field"><label>Address</label><input formControlName="address" /></div>
              <div class="row">
                <div class="field" style="flex:1"><label>Terms (days)</label><input type="number" formControlName="paymentTermsDays" /></div>
                <div class="field" style="flex:1"><label>Opening balance</label><input type="number" step="0.01" formControlName="openingBalance" /></div>
                <div class="field" style="flex:1"><label>As of</label><input type="date" formControlName="openingBalanceAsOf" /></div>
              </div>
              <label class="check"><input type="checkbox" formControlName="isActive" /> Active</label>
              <div class="row" style="justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
                <button class="btn btn-primary" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Saving…' : 'Save' }}
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
      display: grid; place-items: center; padding: 1rem; z-index: 50; overflow:auto; }
    .modal { width: 100%; max-width: 620px; margin: auto; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
  `],
})
export class SuppliersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SupplierService);

  suppliers = signal<SupplierDto[]>([]);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
    contactPerson: [''],
    phone: [''],
    email: [''],
    address: [''],
    taxNumber: [''],
    paymentTermsDays: [0],
    openingBalance: [0],
    openingBalanceAsOf: [''],
    isActive: [true],
  });

  ngOnInit(): void { this.load(); }

  money(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.suppliers.set(list),
      error: () => this.error.set('Could not load suppliers.'),
    });
  }

  openNew(): void {
    this.editingId = null;
    this.form.reset({
      name: '', code: '', contactPerson: '', phone: '', email: '', address: '', taxNumber: '',
      paymentTermsDays: 0, openingBalance: 0, openingBalanceAsOf: '', isActive: true,
    });
    this.showForm.set(true);
  }

  edit(s: SupplierDto): void {
    this.editingId = s.id;
    this.form.reset({
      name: s.name, code: s.code ?? '', contactPerson: s.contactPerson ?? '', phone: s.phone ?? '',
      email: s.email ?? '', address: s.address ?? '', taxNumber: s.taxNumber ?? '',
      paymentTermsDays: s.paymentTermsDays, openingBalance: s.openingBalance,
      openingBalanceAsOf: s.openingBalanceAsOf ? s.openingBalanceAsOf.substring(0, 10) : '', isActive: s.isActive,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    const payload = { ...v, openingBalanceAsOf: v.openingBalanceAsOf || null };
    const req = this.editingId ? this.service.update(this.editingId, payload) : this.service.create(payload);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: () => { this.loading.set(false); this.error.set('Could not save supplier.'); },
    });
  }

  remove(s: SupplierDto): void {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    this.service.delete(s.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete supplier.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
