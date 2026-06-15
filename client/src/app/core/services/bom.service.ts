import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillOfMaterialsDto, SaveBillOfMaterialsRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class BomService {
  private readonly api = `${environment.apiUrl}/boms`;
  private http = inject(HttpClient);

  getAll(): Observable<BillOfMaterialsDto[]> {
    return this.http.get<BillOfMaterialsDto[]>(this.api);
  }

  getById(id: string): Observable<BillOfMaterialsDto> {
    return this.http.get<BillOfMaterialsDto>(`${this.api}/${id}`);
  }

  getByFinishedItem(finishedItemId: string): Observable<BillOfMaterialsDto> {
    return this.http.get<BillOfMaterialsDto>(`${this.api}/by-finished-item/${finishedItemId}`);
  }

  create(request: SaveBillOfMaterialsRequest): Observable<BillOfMaterialsDto> {
    return this.http.post<BillOfMaterialsDto>(this.api, request);
  }

  update(id: string, request: SaveBillOfMaterialsRequest): Observable<BillOfMaterialsDto> {
    return this.http.put<BillOfMaterialsDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
