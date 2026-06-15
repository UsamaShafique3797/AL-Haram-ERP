import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchaseReturnDto, SavePurchaseReturnRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PurchaseReturnService {
  private readonly api = `${environment.apiUrl}/purchase-returns`;
  private http = inject(HttpClient);

  getAll(): Observable<PurchaseReturnDto[]> {
    return this.http.get<PurchaseReturnDto[]>(this.api);
  }

  getById(id: string): Observable<PurchaseReturnDto> {
    return this.http.get<PurchaseReturnDto>(`${this.api}/${id}`);
  }

  create(request: SavePurchaseReturnRequest): Observable<PurchaseReturnDto> {
    return this.http.post<PurchaseReturnDto>(this.api, request);
  }
}
