import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

export interface WebSocketMessage {
  tipo: string;
  data: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class WorkshopWebSocketService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);

  private providerWebSocket: WebSocket | null = null;
  private clientWebSocket: WebSocket | null = null;
  private providerMessageListeners: Array<(message: WebSocketMessage) => void> = [];
  private clientMessageListeners: Array<(message: WebSocketMessage) => void> = [];
  private tokenWatchHandle: number | null = null;
  private static readonly tokenWatchIntervalMs = 1000;

  isProviderConnected = signal(false);
  isClientConnected = signal(false);

  ngOnDestroy(): void {
    this.disconnect();
  }

  connect(): void {
    this.connectProviderWebSocket();
    this.connectClientWebSocket();
    this.startTokenWatch();
  }

  disconnect(): void {
    this.stopTokenWatch();
    this.closeWebSockets();
  }

  sendProviderMessage(message: WebSocketMessage): boolean {
    if (!this.providerWebSocket || this.providerWebSocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.providerWebSocket.send(JSON.stringify(message));
    return true;
  }

  sendClientMessage(message: WebSocketMessage): boolean {
    if (!this.clientWebSocket || this.clientWebSocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.clientWebSocket.send(JSON.stringify(message));
    return true;
  }

  onProviderMessage(callback: (message: WebSocketMessage) => void): () => void {
    this.providerMessageListeners.push(callback);

    if (!this.providerWebSocket) {
      this.connectProviderWebSocket();
    }

    return () => {
      this.providerMessageListeners = this.providerMessageListeners.filter((listener) => listener !== callback);
    };
  }

  onClientMessage(callback: (message: WebSocketMessage) => void): () => void {
    this.clientMessageListeners.push(callback);

    if (!this.clientWebSocket) {
      this.connectClientWebSocket();
    }

    return () => {
      this.clientMessageListeners = this.clientMessageListeners.filter((listener) => listener !== callback);
    };
  }

  private connectProviderWebSocket(): void {
    if (
      this.providerWebSocket &&
      (this.providerWebSocket.readyState === WebSocket.OPEN || this.providerWebSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    const websocketUrl = `${this.apiService.getWebSocketBaseUrl()}/ws/proveedor?token=${encodeURIComponent(token)}`;
    this.providerWebSocket = new WebSocket(websocketUrl);

    this.providerWebSocket.onopen = () => {
      this.isProviderConnected.set(true);
      console.info('WebSocket proveedor conectado');
    };

    this.providerWebSocket.onmessage = (event) => {
      this.notifyProviderListeners(event.data);
    };

    this.providerWebSocket.onerror = () => {
      console.warn('Error en WebSocket proveedor');
      this.isProviderConnected.set(false);
    };

    this.providerWebSocket.onclose = () => {
      this.providerWebSocket = null;
      this.isProviderConnected.set(false);
    };
  }

  private connectClientWebSocket(): void {
    if (
      this.clientWebSocket &&
      (this.clientWebSocket.readyState === WebSocket.OPEN || this.clientWebSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    const websocketUrl = `${this.apiService.getWebSocketBaseUrl()}/ws/clients?token=${encodeURIComponent(token)}`;
    this.clientWebSocket = new WebSocket(websocketUrl);

    this.clientWebSocket.onopen = () => {
      this.isClientConnected.set(true);
      console.info('WebSocket clientes conectado');
    };

    this.clientWebSocket.onmessage = (event) => {
      this.notifyClientListeners(event.data);
    };

    this.clientWebSocket.onerror = () => {
      console.warn('Error en WebSocket clientes');
      this.isClientConnected.set(false);
    };

    this.clientWebSocket.onclose = () => {
      this.clientWebSocket = null;
      this.isClientConnected.set(false);
    };
  }

  private startTokenWatch(): void {
    this.stopTokenWatch();

    this.tokenWatchHandle = window.setInterval(() => {
      if (this.authService.getToken()) {
        return;
      }

      this.closeWebSockets();
    }, WorkshopWebSocketService.tokenWatchIntervalMs);
  }

  private stopTokenWatch(): void {
    if (this.tokenWatchHandle === null) {
      return;
    }

    window.clearInterval(this.tokenWatchHandle);
    this.tokenWatchHandle = null;
  }

  private notifyProviderListeners(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      this.providerMessageListeners.forEach((listener) => listener(message));
    } catch {
      console.warn('Mensaje WebSocket invalido recibido en proveedor.');
    }
  }

  private notifyClientListeners(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      this.clientMessageListeners.forEach((listener) => listener(message));
    } catch {
      console.warn('Mensaje WebSocket invalido recibido en clientes.');
    }
  }

  private closeWebSockets(): void {
    this.providerWebSocket?.close();
    this.providerWebSocket = null;
    this.clientWebSocket?.close();
    this.clientWebSocket = null;
    this.isProviderConnected.set(false);
    this.isClientConnected.set(false);
  }
}
