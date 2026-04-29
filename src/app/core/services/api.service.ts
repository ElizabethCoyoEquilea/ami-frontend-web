import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://34.66.0.227';

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getWebSocketBaseUrl(): string {
    const apiUrl = new URL(this.baseUrl);
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${apiUrl.host}`;
  }

  get<TResponse>(endpoint: string): Observable<TResponse> {
    return this.http.get<TResponse>(this.buildUrl(endpoint));
  }

  post<TResponse, TBody>(endpoint: string, body: TBody): Observable<TResponse> {
    return this.http.post<TResponse>(this.buildUrl(endpoint), body);
  }

  put<TResponse, TBody>(endpoint: string, body: TBody): Observable<TResponse> {
    return this.http.put<TResponse>(this.buildUrl(endpoint), body);
  }

  patch<TResponse, TBody>(endpoint: string, body: TBody): Observable<TResponse> {
    return this.http.patch<TResponse>(this.buildUrl(endpoint), body);
  }

  delete<TResponse>(endpoint: string): Observable<TResponse> {
    return this.http.delete<TResponse>(this.buildUrl(endpoint));
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }
}
