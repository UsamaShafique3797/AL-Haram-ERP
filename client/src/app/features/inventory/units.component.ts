import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnitService } from '../../core/services/unit.service';
import { AccessService } from '../../core/services/access.service';
import { UnitDto } from '../../core/models/domain.models';

import { GridSearchBarComponent } from '../../shared/grid-search-bar.component';
import { filterByGridSearch, gridEmptyMessage } from '../../shared/grid-search.util';

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [ReactiveFormsModule, GridSearchBarComponent],
  template: `
    <div class="row" style="align-items:center">
      <div>
        <h1 class="page-title">Units</h1>
        <p class="page-sub">Units of measure (kg, ton, piece, bag…). Per-item conversions live on the item.</p>
      </div>
      <div class="spacer"></div>
      @if (access.canWrite('inventory/units')) {
        <button class="btn btn-primary" (click)="openNew()">+ New unit</button>
      }
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card" style="overflow:hidden">
      <app-grid-search-bar [value]="searchTerm()" (valueChange)="searchTerm.set($event)" placeholder="Search units…" />
      <table class="table">
        <thead><tr><th>Name</th><th>Code</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (u of filteredRows(); track u.id) {
            <tr>
              <td>{{ u.name }}</td>
              <td>{{ u.code }}</td>
              <td>
                @if (u.isActive) { <span class="badge badge-success">Active</span> }
                @else { <span class="badge badge-muted">Inactive</span> }
              </td>
              <td style="text-align:right">
                @if (access.canWrite('inventory/units')) {
                  <button class="btn btn-ghost btn-sm" (click)="edit(u)">Edit</button>
                }
                @if (access.canDelete('inventory/units')) {
                  <button class="btn btn-danger btn-sm" (click)="remove(u)">Delete</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" style="text-align:center;color:var(--muted)">{{ emptyGridMessage('No units yet.') }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal card" (click)="$event.stopPropagation()">
          <div class="card-pad">
            <h3>{{ editingId ? 'Edit unit' : 'New unit' }}</h3>
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="row">
                <div class="field" style="flex:2"><label>Name</label><input formControlName="name" /></div>
                <div class="field" style="flex:1"><label>Code</label><input formControlName="code" /></div>
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
      display: grid; place-items: center; padding: 1rem; z-index: 50; }
    .modal { width: 100%; max-width: 420px; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--ink-soft); }
  `],
})
export class UnitsComponent implements OnInit {
  access = inject(AccessService);
  private fb = inject(FormBuilder);
  private service = inject(UnitService);

  units = signal<UnitDto[]>([]);
  searchTerm = signal('');
  filteredRows = computed(() => filterByGridSearch(this.units(), this.searchTerm()));
  showForm = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  editingId: string | null = null;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    isActive: [true],
  });


  emptyGridMessage = (defaultMessage: string) => gridEmptyMessage(this.searchTerm(), defaultMessage);
  ngOnInit(): void { this.load(); }

  load(): void {
    this.service.getAll().subscribe({
      next: (list) => this.units.set(list),
      error: () => this.error.set('Could not load units.'),
    });
  }

  openNew(): void {
    this.editingId = null;
    this.form.reset({ name: '', code: '', isActive: true });
    this.showForm.set(true);
  }

  edit(u: UnitDto): void {
    this.editingId = u.id;
    this.form.reset({ name: u.name, code: u.code, isActive: u.isActive });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const value = this.form.getRawValue();
    const req = this.editingId ? this.service.update(this.editingId, value) : this.service.create(value);
    req.subscribe({
      next: () => { this.loading.set(false); this.close(); this.load(); },
      error: () => { this.loading.set(false); this.error.set('Could not save unit.'); },
    });
  }

  remove(u: UnitDto): void {
    if (!confirm(`Delete unit "${u.name}"?`)) return;
    this.service.delete(u.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Could not delete unit. It may be in use by items.'),
    });
  }

  close(): void { this.showForm.set(false); }
}
