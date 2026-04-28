import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CreateWorkshopRequest {
  nombre: string;
  descripcion: string | null;
  radio_cobertura: number;
  calificacion: number;
  direccion: string;
  longitud: number | null;
  latitud: number | null;
  horario_inicio: string;
  horario_fin: string;
  estado?: string | null;
  activo?: boolean;
  qr?: File | null;
}

export interface UpdateWorkshopRequest extends Partial<CreateWorkshopRequest> {}

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
  qr?: string | null;
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

export interface WorkshopAssignmentRequest {
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

export interface WorkshopAssignmentResponse {
  id_asignacion: number;
  id_cotizacion?: number | null;
  id_solicitud: number;
  id_taller: number;
  id_catalogo_servicio: number | null;
  fecha: string;
  estado: string;
  solicitud: WorkshopAssignmentRequest;
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

  getBaseUrl(): string {
    return this.apiService.getBaseUrl();
  }

  createWorkshop(workshop: CreateWorkshopRequest): Observable<WorkshopResponse> {
    return this.apiService.post<WorkshopResponse, FormData>('/talleres', this.toWorkshopFormData(workshop));
  }

  getWorkshopById(workshopId: number): Observable<WorkshopResponse> {
    return this.apiService.get<WorkshopResponse>(`/talleres/${workshopId}/detalle`);
  }

  updateWorkshop(workshopId: number, workshop: UpdateWorkshopRequest): Observable<WorkshopResponse> {
    return this.apiService.put<WorkshopResponse, FormData>(`/talleres/${workshopId}`, this.toWorkshopFormData(workshop));
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

  getWorkshopAssignments(workshopId: number): Observable<WorkshopAssignmentResponse[]> {
    return this.apiService.get<WorkshopAssignmentResponse[]>(`/talleres/${workshopId}/asignaciones`);
  }

  private toWorkshopFormData(workshop: CreateWorkshopRequest | UpdateWorkshopRequest): FormData {
    const formData = new FormData();

    Object.entries(workshop).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (value instanceof File) {
        formData.append(key, value);
        return;
      }

      formData.append(key, String(value));
    });

    return formData;
  }
}
