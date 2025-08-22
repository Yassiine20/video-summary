import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const access = authService.accessToken;

  console.log('[Interceptor] Token exists:', !!access, 'URL:', req.url);

  // Add auth header if token exists
  if (access) {
    console.log('[Interceptor] Adding Authorization header');
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${access}` },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      // Auto refresh on 401 if we have refresh token
      if (error.status === 401 && authService.refreshToken && !req.url.includes('/refresh/')) {
        console.log('[Interceptor] 401 detected, refreshing token...');
        
        return authService.refresh().pipe(
          switchMap((tokens) => {
            // Retry with new token
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
            });
            console.log('[Interceptor] Retrying request with new token');
            return next(newReq);
          }),
          catchError(() => {
            console.log('[Interceptor] Refresh failed, logging out');
            authService.logout();
            return throwError(() => error);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
};
