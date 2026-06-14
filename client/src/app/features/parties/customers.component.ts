import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { CustomerDto, CustomerType, CustomerTypeLabels } from '../../core/models/domain.models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Customers</h1>
        <p class="page-sub">Retail, wholesale, and contractor accounts.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()">+ New customer</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Phone</th><th>Credit limit</th><th>Opening bal.</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (c of customers(); track c.id) {
            <tr>
              <td>{{ c.name }}@if (c.code) { <span class="badge badge-muted" style="margin-left:.4rem">{{ c.code }}</span> }</td>
              <td>{{ typeLabel(c.type) }}</td>
              <td>{{ c.phone || '—' }}</td>
              <td>{{ money(c.creditLimit) }}</td>
              <td>{{ money(c.openingBalance) }}</td>
              <td>
                @if (c.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="edit(c)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="remove(c)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No customers yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit customer' : 'New customer' }}</h3>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2"><label>Name</label><input formControlName="name" /></div>
                <div class="field" style="flex:1"><label>Code</label><input formControlName="code" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1">
                  <label>Type</label>
                  <select formControlName="type">
                    @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Contact person</label><input formControlName="contactPerson" /></div>
              </div>
              <div class="row">
                <div class="field" style="flex:1"><label>Phone</label><input formControlName="phone" /></div>
                <div class="field" style="flex:1"><label>Email</label><input formControlName="email" /></div>
              </div>
              <div class="field"><label>Address</label><input formControlName="address" /></div>
              <div class="row">
                <div class="field" style="flex:1"><label>Tax number</label><input formControlName="taxNumber" /></div>
                <div class="field" style="flex:1"><label>Credit limit</label><input type="number" step="0.01" formControlName="creditLimit" /></div>
                <div class="field" style="flex:1"><label>Terms (days)</label><input type="number" formControlName="paymentTermsDays" /></div>
              </div>
              <div class="row">
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
export class CustomersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CustomerService);

  customers = signal<CustomerDto[]>([]);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  editingId: string | null = null;

  types = [
    { value: CustomerType.Retail, label: 'Retail' },
    { value: CustomerType.Wholesale, label: 'Wholesale' },
    { value: CustomerType.Contractor, label: 'Contractor' },
  ];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
    type: [CustomerType.Retail],
    contactPerson: [''],
    phone: [''],
    email: [''],
    address: [''],
    taxNumber: [''],
    creditLimit: [0],
    paymentTermsDays: [0],
    openingBalance: [0],
    openingBalanceAsOf: [''],
    isActive: [true],
  });

  ngOnInit(): void { this.load(); }

  typeLabel(t: CustomerType): string { return CustomerTypeLabels[t] ?? '—'; }
  money(v: number): string { return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.customers.set(list),
      error: () => this.error.set('Could not load customers.'),
    });
  }

  openNew(): void {
    this.editingId = null;
    this.form.reset({
      name: '', code: '', type: CustomerType.Retail, contactPerson: '', phone: '', email: '',
      address: '', taxNumber: '', creditLimit: 0, paymentTermsDays: 0, openingBalance: 0,
      openingBalanceAsOf: '', isActive: true,
    });
    this.showForm.set(true);
  }

  edit(c: CustomerDto): void {
    this.editingId = c.id;
    this.form.reset({
      name: c.name, code: c.code ?? '', type: c.type, contactPerson: c.contactPerson ?? '',
      phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', taxNumber: c.taxNumber ?? '',
      creditLimit: c.creditLimit, paymentTermsDays: c.paymentTermsDays, openingBalance: c.openingBalance,
      openingBalanceAsOf: c.openingBalanceAsOf ? c.openingBalanceAsOf.substring(0, 10) : '', isActive: c.isActive,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      type: Number(v.type) as CustomerType,
      openingBalanceAsOf: v.openingBalanceAsOf || null,
    };
    const req = this.editingId ? this.service.update(this.editingId, payload) : this.service.create(payload);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: () => { this.loading.set(false); this.error.set('Could not save customer.'); },
    });
  }

  remove(c: CustomerDto): void {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    this.service.delete(c.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete customer.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
