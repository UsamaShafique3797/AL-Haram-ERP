import { Injectable, inject } from '@angular/core';
import { canAccessRoute, canDeleteRoute, canWriteRoute, normalizeRouteKey } from '../auth/role-access';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AccessService {
  private auth = inject(AuthService);

  private roles(): string[] {
    return this.auth.user()?.roles ?? [];
  }

  canView(routeKeyOrPath: string): boolean {
    return canAccessRoute(this.roles(), normalizeRouteKey(routeKeyOrPath));
  }

  canWrite(routeKeyOrPath: string): boolean {
    const key = normalizeRouteKey(routeKeyOrPath);
    if (!canAccessRoute(this.roles(), key)) return false;
    return canWriteRoute(this.roles(), key);
  }

  canDelete(routeKeyOrPath: string): boolean {
    const key = normalizeRouteKey(routeKeyOrPath);
    if (!canAccessRoute(this.roles(), key)) return false;
    return canDeleteRoute(this.roles(), key);
  }
}
