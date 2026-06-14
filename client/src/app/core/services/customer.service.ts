import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerDto, SaveCustomerRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly api = `${environment.apiUrl}/customers`;
  private http = inject(HttpClient);

  getAll(): Observable<CustomerDto[]> {
    return this.http.get<CustomerDto[]>(this.api);
  }

  create(request: SaveCustomerRequest): Observable<CustomerDto> {
    return this.http.post<CustomerDto>(this.api, request);
  }

  update(id: string, request: SaveCustomerRequest): Observable<CustomerDto> {
    return this.http.put<CustomerDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
