import { HttpInterceptorFn, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { BranchContextService } from '../services/branch-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const branch = inject(BranchContextService);
  const router = inject(Router);
  const token = auth.token;
  const user = auth.user();

  let params = req.params;
  if (user) {
    const godownId = branch.apiGodownId(user.canAccessAllBranches, user.godownId);
    if (godownId && !params.has('godownId')) {
      params = params.set('godownId', godownId);
    }
  }

  const request = req.clone({
    params,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
