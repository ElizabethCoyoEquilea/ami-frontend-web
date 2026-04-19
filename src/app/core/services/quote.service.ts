import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PendingQuoteRequest {
  id_solicitud: number;
  id_vehiculo: number;
  descripcion: string;
  latitud: number | null;
  direccion: string;
  longitud: number | null;
  fecha: string;
  prioridad: string | null;
  observaciones: string | null;
  audio: string | null;
  imagenes: string | null;
  estado: string;
}

export interface PendingQuoteResponse {
  id_cotizacion: number;
  id_solicitud: number;
  id_taller: number;
  monto: number;
  estado: string;
  solicitud: PendingQuoteRequest;
}

export interface QuoteAmountResponse {
  id_cotizacion: number;
  id_solicitud: number;
  id_taller: number;
  monto: number;
  estado: string;
  websocket_enviado: boolean;
}

export interface RejectQuoteResponse {
  id_cotizacion: number;
  id_solicitud: number;
  id_taller: number;
  monto: number;
  estado: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private readonly apiService = inject(ApiService);

  getPendingQuotesByWorkshop(workshopId: number): Observable<PendingQuoteResponse[]> {
    return this.apiService.get<PendingQuoteResponse[]>(`/cotizaciones/taller/${workshopId}/pendientes`);
  }

  updateQuoteAmount(
    requestId: number,
    quoteId: number,
    vehicleId: number,
    amount: number,
  ): Observable<QuoteAmountResponse> {
    const encodedAmount = encodeURIComponent(String(amount));
    return this.apiService.patch<QuoteAmountResponse, null>(
      `/cotizaciones/solicitud/${requestId}/cotizacion/${quoteId}/vehiculo/${vehicleId}/monto?monto=${encodedAmount}`,
      null,
    );
  }

  rejectQuote(requestId: number, quoteId: number): Observable<RejectQuoteResponse> {
    return this.apiService.patch<RejectQuoteResponse, null>(
      `/cotizaciones/solicitud/${requestId}/cotizacion/${quoteId}/rechazar`,
      null,
    );
  }
}
