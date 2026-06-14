import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryDto, SaveCategoryRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = `${environment.apiUrl}/categories`;
  private http = inject(HttpClient);

  getAll(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.api);
  }

  create(request: SaveCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(this.api, request);
  }

  update(id: string, request: SaveCategoryRequest): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
