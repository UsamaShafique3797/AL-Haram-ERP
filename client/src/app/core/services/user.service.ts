import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserRequest, UserDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.api);
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/roles`);
  }

  create(request: CreateUserRequest): Observable<UserDto> {
    return this.http.post<UserDto>(this.api, request);
  }
}
