import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalesReturnDto, SaveSalesReturnRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SalesReturnService {
  private readonly api = `${environment.apiUrl}/sales-returns`;
  private http = inject(HttpClient);

  getAll(): Observable<SalesReturnDto[]> {
    return this.http.get<SalesReturnDto[]>(this.api);
  }

  create(request: SaveSalesReturnRequest): Observable<SalesReturnDto> {
    return this.http.post<SalesReturnDto>(this.api, request);
  }
}
