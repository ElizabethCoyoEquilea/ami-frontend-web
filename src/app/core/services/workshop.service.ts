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

export interface UpdateWorkshopRequest extends CreateWorkshopRequest {
  estado?: string;
  activo: boolean;
}

export interface WorkshopResponse {
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
    return this.apiService.get<WorkshopResponse>(`/talleres/${workshopId}/detalle`);
  }

  updateWorkshop(workshopId: number, workshop: UpdateWorkshopRequest): Observable<unknown> {
    return this.apiService.put<unknown, UpdateWorkshopRequest>(`/talleres/${workshopId}`, workshop);
  }

  deleteWorkshop(workshopId: number): Observable<unknown> {
    return this.apiService.delete<unknown>(`/talleres/${workshopId}`);
  }
}
