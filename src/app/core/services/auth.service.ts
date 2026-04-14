import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly tokenKey = 'access_token';

  login(credentials: { email: string; contrasena: string }): Observable<{ access_token: string; token_type?: string }> {
    return this.apiService
      .post<{ access_token: string; token_type?: string }, { email: string; contrasena: string }>('/auth/login', credentials)
      .pipe(
        tap((response) => {
          sessionStorage.setItem(this.tokenKey, response.access_token);
          localStorage.removeItem(this.tokenKey);
        }),
      );
  }

  register(userData: {
    email: string;
    contrasena: string;
    persona: {
      nombre_completo: string;
      fecha_nacimiento: string;
      genero: string;
      telefono: string;
      documento: string;
    };
  }): Observable<{ registered: boolean } | boolean> {
    return this.apiService.post<{ registered: boolean } | boolean, typeof userData>('/usuarios/register/admin', userData);
  }

  verifyCode(email: string, codigo: string): Observable<{ message: string }> {
    return this.apiService
      .post<{ message: string }, { email: string; codigo: string }>('/usuarios/verify', {
        email,
        codigo,
      });
  }

  resetPassword(email: string): Observable<{ result: boolean; message: string }> {
    return this.apiService.post<{ result: boolean; message: string }, { email: string }>('/auth/reset-password', { email });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    const token = sessionStorage.getItem(this.tokenKey);

    if (!token) {
      localStorage.removeItem(this.tokenKey);
      return null;
    }

    if (!this.isValidToken(token)) {
      this.logout();
      return null;
    }

    return token;
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  private isValidToken(token: string): boolean {
    const payload = this.decodeTokenPayload(token);

    if (!payload?.exp) {
      return false;
    }

    return payload.exp * 1000 > Date.now();
  }

  private decodeTokenPayload(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];

      if (!payload) {
        return null;
      }

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = atob(base64);

      return JSON.parse(decodedPayload) as { exp?: number };
    } catch {
      return null;
    }
  }
}
