import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { JobWorkOrderService } from '../../core/services/remaining-features.service';
import { AccessService } from '../../core/services/access.service';
import {
  CustomerDto, JobWorkOrderDto, JobWorkOrderStatus, JobWorkOrderStatusLabels,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-job-work',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Job work orders</h1>
        <p class="page-sub">Track outsourced fabrication work for customers.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('production/job-work')) {
        <button class="btn btn-primary" (click)="openNew()" [disabled]="!ready()">+ New order</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Number</th><th>Date</th><th>Customer</th><th>Description</th><th>Status</th><th>Labor</th><th></th></tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr>
              <td>{{ o.number }}</td>
              <td>{{ o.date | date:'mediumDate' }}</td>
              <td>{{ o.customerName }}</td>
              <td>{{ o.description }}</td>
              <td>{{ statusLabel(o.status) }}</td>
              <td>{{ money(o.laborCharge) }}</td>
              <td style="text-align:right">
                @if (access.canWrite('production/job-work')) {
                  <button class="btn btn-ghost btn-sm" (click)="edit(o)">Edit</button>
                }
                @if (access.canDelete('production/job-work')) {
                  <button class="btn btn-danger btn-sm" (click)="remove(o)">Delete</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" style="text-align:center;color:var(--muted)">No job work orders yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit job work order' : 'New job work order' }}</h3>
            @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }

            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2">
                  <label>Customer</label>
                  <select formControlName="customerId">
                    <option value="">— select —</option>
                    @for (c of customers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
                <div class="field" style="flex:1"><label>Date</label><input type="date" formControlName="date" /></div>
                <div class="field" style="flex:1">
                  <label>Status</label>
                  <select formControlName="status">
                    @for (s of statuses; track s.value) {
                      <option [value]="s.value">{{ s.label }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="field"><label>Description</label><input formControlName="description" /></div>
              <div class="field"><label>Labor charge</label><input type="number" step="0.01" formControlName="laborCharge" /></div>
              <div class="field"><label>Notes</label><input formControlName="notes" /></div>

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
  `],
})
export class JobWorkComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private jobWorkService = inject(JobWorkOrderService);
  private customerService = inject(CustomerService);

  orders = signal<JobWorkOrderDto[]>([]);
  customers = signal<CustomerDto[]>([]);
  ready = signal(false);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  editingId: string | null = null;

  readonly statuses = [
    { value: JobWorkOrderStatus.Open, label: JobWorkOrderStatusLabels[JobWorkOrderStatus.Open] },
    { value: JobWorkOrderStatus.InProgress, label: JobWorkOrderStatusLabels[JobWorkOrderStatus.InProgress] },
    { value: JobWorkOrderStatus.Completed, label: JobWorkOrderStatusLabels[JobWorkOrderStatus.Completed] },
    { value: JobWorkOrderStatus.Cancelled, label: JobWorkOrderStatusLabels[JobWorkOrderStatus.Cancelled] },
  ];

  form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    description: ['', Validators.required],
    laborCharge: [0, [Validators.required, Validators.min(0)]],
    status: [JobWorkOrderStatus.Open, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.load();
    forkJoin({ customers: this.customerService.getAll() }).subscribe(({ customers }) => {
      this.customers.set(customers.filter((c) => c.isActive));
      this.ready.set(true);
    });
  }

  load(): void {
    this.jobWorkService.getAll().subscribe({
      next: (list) => this.orders.set(list),
      error: () => this.error.set('Could not load job work orders.'),
    });
  }

  money(v: number): string {
    return 'Rs ' + Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusLabel(status: number): string {
    return JobWorkOrderStatusLabels[status] ?? String(status);
  }

  openNew(): void {
    this.editingId = null;
    this.formError.set(null);
    this.form.reset({
      customerId: '',
      date: new Date().toISOString().substring(0, 10),
      description: '',
      laborCharge: 0,
      status: JobWorkOrderStatus.Open,
      notes: '',
    });
    this.showForm.set(true);
  }

  edit(o: JobWorkOrderDto): void {
    this.editingId = o.id;
    this.formError.set(null);
    this.form.reset({
      customerId: o.customerId,
      date: o.date.substring(0, 10),
      description: o.description,
      laborCharge: o.laborCharge,
      status: o.status,
      notes: o.notes ?? '',
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      date: v.date,
      customerId: v.customerId,
      description: v.description,
      laborCharge: Number(v.laborCharge),
      status: Number(v.status) as JobWorkOrderStatus,
      notes: v.notes || null,
    };

    const req = this.editingId
      ? this.jobWorkService.update(this.editingId, payload)
      : this.jobWorkService.create(payload);

    req.subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.formError.set(err?.error?.errors?.[0] ?? 'Could not save job work order.');
      },
    });
  }

  remove(o: JobWorkOrderDto): void {
    if (!confirm(`Delete job work order ${o.number}?`)) return;
    this.jobWorkService.delete(o.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete job work order.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
