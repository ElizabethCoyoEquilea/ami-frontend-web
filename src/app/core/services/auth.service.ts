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
          localStorage.setItem(this.tokenKey, response.access_token);
          console.log('Token almacenado:', response.access_token);
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
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }
}
