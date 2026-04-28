import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WorkshopCompletedServiceResponse {
  id_servicio: number;
  id_asignacion: number;
  id_pago: number | null;
  total: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
}

export interface WorkshopServiceDetailResponse {
  id_catalogo_servicio: number;
  cantidad: number;
  precio: number;
  nombre: string;
  observacion: string | null;
  id_detalle_servicio: number;
  id_servicio: number;
  sub_total: number;
  catalogo_servicio?: {
    id_catalogo_servicio: number;
    nombre: string;
    categoria: string;
    unidad_medida: string;
  };
}

export interface WorkshopPaymentResponse {
  id_pago: number;
  monto: number;
  estado: string;
  metodo: string | null;
  fecha: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class WorkshopOperationService {
  private readonly apiService = inject(ApiService);

  getServicesByWorkshop(workshopId: number): Observable<WorkshopCompletedServiceResponse[]> {
    return this.apiService.get<WorkshopCompletedServiceResponse[]>(`/servicios/taller/${workshopId}`);
  }

  getServiceDetails(serviceId: number): Observable<WorkshopServiceDetailResponse[]> {
    return this.apiService.get<WorkshopServiceDetailResponse[]>(`/servicios/${serviceId}/detalles`);
  }

  getPayment(paymentId: number): Observable<WorkshopPaymentResponse> {
    return this.apiService.get<WorkshopPaymentResponse>(`/pagos/${paymentId}`);
  }
}
