import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpenseCategoryDto, SaveExpenseCategoryRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ExpenseCategoryService {
  private readonly api = `${environment.apiUrl}/expense-categories`;
  private http = inject(HttpClient);

  getAll(): Observable<ExpenseCategoryDto[]> {
    return this.http.get<ExpenseCategoryDto[]>(this.api);
  }

  create(request: SaveExpenseCategoryRequest): Observable<ExpenseCategoryDto> {
    return this.http.post<ExpenseCategoryDto>(this.api, request);
  }

  update(id: string, request: SaveExpenseCategoryRequest): Observable<ExpenseCategoryDto> {
    return this.http.put<ExpenseCategoryDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
