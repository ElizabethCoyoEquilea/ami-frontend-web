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

export interface SendWorkshopInvitationRequest {
  email: string;
  id_taller: number;
}

export interface SendWorkshopInvitationResponse {
  result: boolean;
  message: string;
  invitation_link: string;
}

export interface WorkshopProviderPerson {
  id_persona: number;
  nombre_completo: string;
  telefono: string;
  documento: string;
}

export interface WorkshopProviderUser {
  id_usuario: number;
  email: string;
  persona: WorkshopProviderPerson | null;
}

export interface WorkshopProvider {
  id_proveedor: number;
  id_usuario: number;
  id_taller: number;
  estado: string | null;
  especialidad: string | null;
  usuario: WorkshopProviderUser;
}

export interface WorkshopProvidersResponse {
  id_taller: number;
  total_proveedores: number;
  proveedores: WorkshopProvider[];
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

  sendWorkshopInvitation(
    payload: SendWorkshopInvitationRequest,
  ): Observable<SendWorkshopInvitationResponse> {
    return this.apiService.post<SendWorkshopInvitationResponse, SendWorkshopInvitationRequest>(
      '/auth/talleres/invitaciones',
      payload,
    );
  }

  getWorkshopProviders(workshopId: number): Observable<WorkshopProvidersResponse> {
    return this.apiService.get<WorkshopProvidersResponse>(`/talleres/${workshopId}/proveedores`);
  }
}
