import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CatalogServiceRequest {
  id_taller: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  unidad_medida: string;
  precio_estandar: number;
}

export interface CatalogServiceUpdateRequest extends CatalogServiceRequest {
  estado?: string;
}

export interface CatalogServiceResponse extends CatalogServiceUpdateRequest {
  id_catalogo_servicio?: number;
  id?: number;
  fecha_creacion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CatalogServiceService {
  private readonly apiService = inject(ApiService);
  private readonly endpoint = '/catalogo-servicios';

  getServices(): Observable<CatalogServiceResponse[]> {
    return this.apiService.get<CatalogServiceResponse[]>(this.endpoint);
  }

  getServicesByWorkshop(workshopId: number): Observable<CatalogServiceResponse[]> {
    return this.apiService.get<CatalogServiceResponse[]>(`${this.endpoint}/taller/${workshopId}`);
  }

  createService(service: CatalogServiceRequest): Observable<CatalogServiceResponse> {
    return this.apiService.post<CatalogServiceResponse, CatalogServiceRequest>(this.endpoint, service);
  }

  updateService(serviceId: number, service: CatalogServiceUpdateRequest): Observable<CatalogServiceResponse> {
    return this.apiService.put<CatalogServiceResponse, CatalogServiceUpdateRequest>(`${this.endpoint}/${serviceId}`, service);
  }
}
