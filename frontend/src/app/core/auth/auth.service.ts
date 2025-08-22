import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  id: number;
  username: string;
  id_token: string;
  refresh_token: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private storageKeyAccess = 'vs_access_token';
  private storageKeyRefresh = 'vs_refresh_token';
  private storageKeyUser = 'vs_user';

  authenticate(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/authenticate/`, {
        username,
        password,
      })
      .pipe(tap((res) => this.store(res)));
  }

  signup(data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/signup/`, data)
      .pipe(tap((res) => this.store(res)));
  }

  refresh(): Observable<{ access_token: string; refresh_token: string }> {
    const refreshToken = localStorage.getItem(this.storageKeyRefresh);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.http
      .post<{ access_token: string; refresh_token: string }>(
        `${environment.apiBaseUrl}/refresh/`,
        { refresh_token: refreshToken }
      )
      .pipe(
        tap((tokens) => {
          console.log('[Auth] Token refreshed successfully');
          localStorage.setItem(this.storageKeyAccess, tokens.access_token);
          localStorage.setItem(this.storageKeyRefresh, tokens.refresh_token);
        })
      );
  }

  private store(res: AuthResponse) {
    localStorage.setItem(this.storageKeyAccess, res.id_token);
    localStorage.setItem(this.storageKeyRefresh, res.refresh_token);
    localStorage.setItem(
      this.storageKeyUser,
      JSON.stringify({ id: res.id, username: res.username })
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKeyAccess);
    localStorage.removeItem(this.storageKeyRefresh);
    localStorage.removeItem(this.storageKeyUser);
  }

  get accessToken(): string | null {
    return localStorage.getItem(this.storageKeyAccess);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(this.storageKeyRefresh);
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
