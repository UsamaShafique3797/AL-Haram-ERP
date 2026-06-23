import {
  ALL_APP_ROLES,
  AppRoleName,
  ROUTE_DELETE_ROLES,
  ROUTE_ROLES,
  ROUTE_WRITE_ROLES,
} from './app-roles';

export function normalizeRouteKey(path: string): string {
  const p = path.replace(/^\//, '');
  if (ROUTE_ROLES[p]) return p;
  const segments = p.split('/');
  if (segments.length >= 3 && segments[0] === 'sales' && segments[1] === 'invoices' && segments[2] !== undefined) {
    return 'sales/invoices/:id/print';
  }
  if (segments.length >= 3 && segments[0] === 'sales' && segments[1] === 'challans') {
    return 'sales/challans/:id/print';
  }
  return p;
}

export function rolesForRoute(routeKey: string): readonly AppRoleName[] {
  return ROUTE_ROLES[normalizeRouteKey(routeKey)] ?? ALL_APP_ROLES;
}

export function canAccessRoute(userRoles: string[], routeKey: string): boolean {
  const allowed = rolesForRoute(routeKey);
  return userRoles.some((r) => allowed.includes(r as AppRoleName));
}

export function canWriteRoute(userRoles: string[], routeKey: string): boolean {
  const allowed = ROUTE_WRITE_ROLES[routeKey];
  if (!allowed) return false;
  return userRoles.some((r) => allowed.includes(r as AppRoleName));
}

export function canDeleteRoute(userRoles: string[], routeKey: string): boolean {
  const allowed = ROUTE_DELETE_ROLES[routeKey];
  if (!allowed) return false;
  return userRoles.some((r) => allowed.includes(r as AppRoleName));
}
