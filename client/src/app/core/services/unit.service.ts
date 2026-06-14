import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SaveUnitRequest, UnitDto } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private readonly api = `${environment.apiUrl}/units`;
  private http = inject(HttpClient);

  getAll(): Observable<UnitDto[]> {
    return this.http.get<UnitDto[]>(this.api);
  }

  create(request: SaveUnitRequest): Observable<UnitDto> {
    return this.http.post<UnitDto>(this.api, request);
  }

  update(id: string, request: SaveUnitRequest): Observable<UnitDto> {
    return this.http.put<UnitDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
