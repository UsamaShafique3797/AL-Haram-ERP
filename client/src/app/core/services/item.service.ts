import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ItemDto, SaveItemRequest } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly api = `${environment.apiUrl}/items`;
  private http = inject(HttpClient);

  getAll(): Observable<ItemDto[]> {
    return this.http.get<ItemDto[]>(this.api);
  }

  getById(id: string): Observable<ItemDto> {
    return this.http.get<ItemDto>(`${this.api}/${id}`);
  }

  create(request: SaveItemRequest): Observable<ItemDto> {
    return this.http.post<ItemDto>(this.api, request);
  }

  update(id: string, request: SaveItemRequest): Observable<ItemDto> {
    return this.http.put<ItemDto>(`${this.api}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
