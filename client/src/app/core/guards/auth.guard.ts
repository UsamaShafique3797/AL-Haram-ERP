import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canAccessRoute, normalizeRouteKey } from '../auth/role-access';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};

/** Guard a route by key from ROUTE_ROLES (e.g. `sales/invoices`). */
export const routeAccessGuard = (routeKey: string): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const roles = auth.user()?.roles ?? [];

    if (auth.isLoggedIn() && canAccessRoute(roles, routeKey)) {
      return true;
    }
    router.navigate(['/dashboard']);
    return false;
  };
};

/** Guard using the activated route path segment (for parameterized routes). */
export const pathAccessGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.user()?.roles ?? [];
  const fullPath = route.routeConfig?.path ?? '';
  const key = normalizeRouteKey(fullPath);

  if (auth.isLoggedIn() && canAccessRoute(roles, key)) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};

/** @deprecated Use routeAccessGuard with explicit route key */
export const roleGuard = (...roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn() && auth.hasRole(...roles)) {
      return true;
    }
    router.navigate(['/dashboard']);
    return false;
  };
};
