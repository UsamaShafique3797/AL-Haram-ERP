import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grid-search-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="grid-search-bar">
      <svg class="grid-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
      </svg>
      <input
        type="search"
        class="grid-search-input"
        [placeholder]="placeholder()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
        autocomplete="off"
        spellcheck="false"
      />
      @if (value()) {
        <button type="button" class="grid-search-clear" (click)="valueChange.emit('')" aria-label="Clear search">×</button>
      }
    </div>
  `,
})
export class GridSearchBarComponent {
  placeholder = input('Search…');
  value = input('');
  valueChange = output<string>();
}
