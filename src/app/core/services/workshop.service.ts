import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CreateWorkshopRequest {
  nombre: string;
  descripcion: string;
  radio_cobertura: number;
  calificacion: number;
  direccion: string;
  longitud: number | null;
  latitud: number | null;
  horario_inicio: string;
  horario_fin: string;
}

export interface CreateWorkshopTemporaryRequest extends CreateWorkshopRequest {
  id_usuario: number;
}

export interface UpdateWorkshopRequest extends CreateWorkshopRequest {
  estado?: string;
  activo: boolean;
}

export interface WorkshopResponse {
  id?: number;
  id_taller?: number;
  id_usuario: number;
  nombre: string;
  descripcion: string;
  radio_cobertura: number;
  calificacion: number;
  direccion: string;
  longitud: number | null;
  latitud: number | null;
  horario_inicio: string;
  horario_fin: string;
  estado?: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WorkshopService {
  private readonly apiService = inject(ApiService);
  private readonly myWorkshopsEndpoint = '/talleres/mis-talleres';

  getMyWorkshops(): Observable<WorkshopResponse[]> {
    return this.apiService.get<WorkshopResponse[]>(this.myWorkshopsEndpoint);
  }

  createWorkshop(workshop: CreateWorkshopRequest): Observable<unknown> {
    return this.apiService.post<unknown, CreateWorkshopRequest>('/talleres', workshop);
  }

  getWorkshopById(workshopId: number): Observable<WorkshopResponse> {
    return this.apiService.get<WorkshopResponse>(`/talleres/${workshopId}`);
  }

  updateWorkshop(workshopId: number, workshop: UpdateWorkshopRequest): Observable<unknown> {
    return this.apiService.put<unknown, UpdateWorkshopRequest>(`/talleres/${workshopId}`, workshop);
  }

  /**
   * Temporary adapter for the current backend contract.
   * Remove when backend lists workshops from the authenticated token.
   */
  getWorkshopsByUserTemporary(userId: number): Observable<WorkshopResponse[]> {
    return this.apiService.get<WorkshopResponse[]>(`/talleres/usuario/${userId}`);
  }

  /**
   * Temporary adapter for the current backend contract.
   * Remove when backend assigns id_usuario from the authenticated token.
   */
  createWorkshopTemporary(workshop: CreateWorkshopTemporaryRequest): Observable<unknown> {
    return this.apiService.post<unknown, CreateWorkshopTemporaryRequest>('/talleres', workshop);
  }
}
