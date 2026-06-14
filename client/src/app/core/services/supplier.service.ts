import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SaveSupplierRequest, SupplierDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly api = `${environment.apiUrl}/suppliers`;
  private http = inject(HttpClient);

  getAll(): Observable<SupplierDto[]> {
    return this.http.get<SupplierDto[]>(this.api);
  }

  create(request: SaveSupplierRequest): Observable<SupplierDto> {
    return this.http.post<SupplierDto>(this.api, request);
  }

  update(id: string, request: SaveSupplierRequest): Observable<SupplierDto> {
    return this.http.put<SupplierDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
