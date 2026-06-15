import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OpenInvoiceDto, SalesInvoiceDto, SaveSalesInvoiceRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SalesInvoiceService {
  private readonly api = `${environment.apiUrl}/sales-invoices`;
  private http = inject(HttpClient);

  getAll(customerId?: string): Observable<SalesInvoiceDto[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customerId', customerId);
    return this.http.get<SalesInvoiceDto[]>(this.api, { params });
  }

  getById(id: string): Observable<SalesInvoiceDto> {
    return this.http.get<SalesInvoiceDto>(`${this.api}/${id}`);
  }

  getOpenForCustomer(customerId: string): Observable<OpenInvoiceDto[]> {
    return this.http.get<OpenInvoiceDto[]>(`${this.api}/open/${customerId}`);
  }

  create(request: SaveSalesInvoiceRequest): Observable<SalesInvoiceDto> {
    return this.http.post<SalesInvoiceDto>(this.api, request);
  }
}
