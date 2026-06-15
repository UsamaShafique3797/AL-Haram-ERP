import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SaveSupplierPaymentRequest, SupplierPaymentDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SupplierPaymentService {
  private readonly api = `${environment.apiUrl}/supplier-payments`;
  private http = inject(HttpClient);

  getAll(supplierId?: string): Observable<SupplierPaymentDto[]> {
    let params = new HttpParams();
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<SupplierPaymentDto[]>(this.api, { params });
  }

  getById(id: string): Observable<SupplierPaymentDto> {
    return this.http.get<SupplierPaymentDto>(`${this.api}/${id}`);
  }

  create(request: SaveSupplierPaymentRequest): Observable<SupplierPaymentDto> {
    return this.http.post<SupplierPaymentDto>(this.api, request);
  }
}
