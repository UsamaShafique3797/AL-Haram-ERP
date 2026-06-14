import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GodownDto, SaveGodownRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class GodownService {
  private readonly api = `${environment.apiUrl}/godowns`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<GodownDto[]> {
    return this.http.get<GodownDto[]>(this.api);
  }

  create(request: SaveGodownRequest): Observable<GodownDto> {
    return this.http.post<GodownDto>(this.api, request);
  }

  update(id: string, request: SaveGodownRequest): Observable<GodownDto> {
    return this.http.put<GodownDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
