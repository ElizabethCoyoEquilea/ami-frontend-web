import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CatalogServiceSpecialty {
  id_especialidad: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface CatalogServiceCreateRequest {
  id_taller: number;
  id_especialidad: number;
  nombre: string;
  descripcion: string | null;
  precio_estandar: number;
}

export interface CatalogServiceRequest extends CatalogServiceCreateRequest {}

export interface CatalogServiceUpdateRequest {
  id_taller: number;
  id_especialidad?: number;
  nombre: string;
  descripcion: string | null;
  precio_estandar: number;
  categoria?: string;
  unidad_medida?: string;
  estado?: string;
}

export interface CatalogServiceResponse extends CatalogServiceUpdateRequest {
  id_catalogo_servicio?: number;
  id?: number;
  fecha_creacion?: string;
  especialidad?: CatalogServiceSpecialty;
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

  getSpecialties(): Observable<CatalogServiceSpecialty[]> {
    return this.apiService.get<CatalogServiceSpecialty[]>(`${this.endpoint}/especialidades`);
  }

  createService(service: CatalogServiceCreateRequest): Observable<CatalogServiceResponse> {
    return this.apiService.post<CatalogServiceResponse, CatalogServiceCreateRequest>(this.endpoint, service);
  }

  updateService(serviceId: number, service: CatalogServiceUpdateRequest): Observable<CatalogServiceResponse> {
    return this.apiService.put<CatalogServiceResponse, CatalogServiceUpdateRequest>(`${this.endpoint}/${serviceId}`, service);
  }
}
