import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GodownService } from '../../core/services/godown.service';
import { GodownDto } from '../../core/models/domain.models';

@Component({
  selector: 'app-godowns',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Godowns</h1>
        <p class="page-sub">Your storage locations.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" (click)="openNew()">+ New godown</button>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <table class="table">
        <thead>
          <tr><th>Name</th><th>Code</th><th>Phone</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (g of godowns(); track g.id) {
            <tr>
              <td>
                {{ g.name }}
                @if (g.isDefault) { <span class="badge badge-success" style="margin-left:.4rem">Default</span> }
              </td>
              <td>{{ g.code || '—' }}</td>
              <td>{{ g.phone || '—' }}</td>
              <td>
                @if (g.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                <button class="btn btn-ghost btn-sm" (click)="edit(g)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="remove(g)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="text-align:center;color:var(--muted)">No godowns yet.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit godown' : 'New godown' }}</h3>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="field"><label>Name</label><input formControlName="name" /></div>
              <div class="row">
                <div class="field" style="flex:1"><label>Code</label><input formControlName="code" /></div>
                <div class="field" style="flex:1"><label>Phone</label><input formControlName="phone" /></div>
              </div>
              <div class="field"><label>Address</label><input formControlName="address" /></div>
              <div class="row" style="gap:1.5rem">
                <label class="check"><input type="checkbox" formControlName="isActive" /> Active</label>
                <label class="check"><input type="checkbox" formControlName="isDefault" /> Default godown</label>
              </div>
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
      display: grid; place-items: center; padding: 1rem; z-index: 50; }
    .modal { width: 100%; max-width: 480px; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
  `],
})
export class GodownsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(GodownService);

  godowns = signal<GodownDto[]>([]);
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
    address: [''],
    phone: [''],
    isActive: [true],
    isDefault: [false],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.godowns.set(list),
      error: () => this.error.set('Could not load godowns.'),
    });
  }

  openNew(): void {
    this.editingId = null;
    this.form.reset({ name: '', code: '', address: '', phone: '', isActive: true, isDefault: false });
    this.showForm.set(true);
  }

  edit(g: GodownDto): void {
    this.editingId = g.id;
    this.form.reset({
      name: g.name, code: g.code ?? '', address: g.address ?? '',
      phone: g.phone ?? '', isActive: g.isActive, isDefault: g.isDefault,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const value = this.form.getRawValue();
    const req = this.editingId
      ? this.service.update(this.editingId, value)
      : this.service.create(value);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: () => { this.loading.set(false); this.error.set('Could not save godown.'); },
    });
  }

  remove(g: GodownDto): void {
    if (!confirm(`Delete godown "${g.name}"?`)) return;
    this.service.delete(g.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete godown.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
