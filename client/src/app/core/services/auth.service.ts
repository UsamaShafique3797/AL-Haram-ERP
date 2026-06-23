import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResult, LoginRequest, UserDto } from '../models/auth.models';

const TOKEN_KEY = 'alharam.token';
const USER_KEY = 'alharam.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly _user = signal<UserDto | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.api}/login`, request).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this._user.set(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const user = this._user();
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
  }

  private readUser(): UserDto | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<UserDto> & Pick<UserDto, 'id' | 'userName' | 'fullName' | 'roles'>;
    return {
      ...u,
      roles: u.roles ?? [],
      canAccessAllBranches: u.canAccessAllBranches ?? !u.godownId,
    } as UserDto;
  }
}
