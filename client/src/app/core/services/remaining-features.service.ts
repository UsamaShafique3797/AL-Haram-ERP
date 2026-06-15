import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DeliveryChallanDto, SaveDeliveryChallanRequest, QuotationDto, SaveQuotationRequest,
  SalesInvoiceDto, SaveSalesInvoiceRequest, JobWorkOrderDto, SaveJobWorkOrderRequest,
} from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class DeliveryChallanService {
  private readonly api = `${environment.apiUrl}/delivery-challans`;
  private http = inject(HttpClient);

  getAll(customerId?: string): Observable<DeliveryChallanDto[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customerId', customerId);
    return this.http.get<DeliveryChallanDto[]>(this.api, { params });
  }

  getById(id: string): Observable<DeliveryChallanDto> {
    return this.http.get<DeliveryChallanDto>(`${this.api}/${id}`);
  }

  create(req: SaveDeliveryChallanRequest): Observable<DeliveryChallanDto> {
    return this.http.post<DeliveryChallanDto>(this.api, req);
  }
}

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private readonly api = `${environment.apiUrl}/quotations`;
  private http = inject(HttpClient);

  getAll(customerId?: string): Observable<QuotationDto[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customerId', customerId);
    return this.http.get<QuotationDto[]>(this.api, { params });
  }

  getById(id: string): Observable<QuotationDto> {
    return this.http.get<QuotationDto>(`${this.api}/${id}`);
  }

  create(req: SaveQuotationRequest): Observable<QuotationDto> {
    return this.http.post<QuotationDto>(this.api, req);
  }

  convertToInvoice(id: string, req: SaveSalesInvoiceRequest): Observable<SalesInvoiceDto> {
    return this.http.post<SalesInvoiceDto>(`${this.api}/${id}/convert`, req);
  }
}

@Injectable({ providedIn: 'root' })
export class JobWorkOrderService {
  private readonly api = `${environment.apiUrl}/job-work-orders`;
  private http = inject(HttpClient);

  getAll(): Observable<JobWorkOrderDto[]> {
    return this.http.get<JobWorkOrderDto[]>(this.api);
  }

  getById(id: string): Observable<JobWorkOrderDto> {
    return this.http.get<JobWorkOrderDto>(`${this.api}/${id}`);
  }

  create(req: SaveJobWorkOrderRequest): Observable<JobWorkOrderDto> {
    return this.http.post<JobWorkOrderDto>(this.api, req);
  }

  update(id: string, req: SaveJobWorkOrderRequest): Observable<JobWorkOrderDto> {
    return this.http.put<JobWorkOrderDto>(`${this.api}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
