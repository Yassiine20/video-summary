import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
  private document = inject(DOCUMENT);
  private cookieKeyAccess = 'vs_access_token';
  private cookieKeyRefresh = 'vs_refresh_token';
  private cookieKeyUser = 'vs_user';

  // Cookie helper methods
  private setCookie(
    name: string,
    value: string,
    days: number = 7,
    secure: boolean = true
  ): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    let cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;

    if (secure && this.document.location.protocol === 'https:') {
      cookieString += '; secure';
    }

    // Use Lax for development, Strict for production
    const sameSite =
      this.document.location.protocol === 'https:' ? 'Strict' : 'Lax';
    cookieString += `; SameSite=${sameSite}`;

    this.document.cookie = cookieString;
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = this.document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }

    return null;
  }

  private deleteCookie(name: string): void {
    this.document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

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
    const refreshToken = this.getCookie(this.cookieKeyRefresh);
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
          this.setCookie(this.cookieKeyAccess, tokens.access_token, 1); // 1 day for access token
          this.setCookie(this.cookieKeyRefresh, tokens.refresh_token, 30); // 30 days for refresh token
        })
      );
  }

  private store(res: AuthResponse) {
    this.setCookie(this.cookieKeyAccess, res.id_token, 1); // 1 day for access token
    this.setCookie(this.cookieKeyRefresh, res.refresh_token, 30); // 30 days for refresh token
    this.setCookie(
      this.cookieKeyUser,
      JSON.stringify({ id: res.id, username: res.username, email: res.email }),
      30 // 30 days for user info
    );
  }

  logout(): void {
    this.deleteCookie(this.cookieKeyAccess);
    this.deleteCookie(this.cookieKeyRefresh);
    this.deleteCookie(this.cookieKeyUser);
  }

  get accessToken(): string | null {
    return this.getCookie(this.cookieKeyAccess);
  }

  get refreshToken(): string | null {
    return this.getCookie(this.cookieKeyRefresh);
  }

  get user(): { id: number; username: string; email?: string } | null {
    const userCookie = this.getCookie(this.cookieKeyUser);
    if (!userCookie) return null;

    try {
      return JSON.parse(userCookie);
    } catch {
      return null;
    }
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
