import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const access = authService.accessToken;

  // Add auth header if token exists
  if (access) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${access}` },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      // Auto refresh on 401/403 if we have refresh token
      if (
        (error.status === 401 || error.status === 403) &&
        authService.refreshToken &&
        !req.url.includes('/refresh/')
      ) {
        return authService.refresh().pipe(
          switchMap((tokens) => {
            // Retry with new token
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
            });
            return next(newReq);
          }),
          catchError(() => {
            authService.logout();
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
