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

export interface WorkshopProviderSpecialty {
  id_proveedor_especialidad: number;
  id_proveedor: number;
  id_especialidad: number;
  activo: boolean;
  especialidad: {
    id_especialidad: number;
    codigo: string;
    nombre: string;
    descripcion: string;
  };
}

export interface WorkshopProvider {
  id_proveedor: number;
  id_usuario: number;
  id_taller: number;
  estado: string | null;
  especialidad?: string | null;
  id_especialidad?: number | null;
  ids_especialidades?: number[];
  proveedor_especialidades?: WorkshopProviderSpecialty[];
  especialidades?: {
    id_especialidad: number;
    codigo?: string;
    nombre?: string;
    descripcion?: string;
  }[];
  usuario: WorkshopProviderUser;
}

export interface WorkshopProvidersResponse {
  id_taller: number;
  total_proveedores: number;
  proveedores: WorkshopProvider[];
}

export interface UpdateWorkshopProviderServiceRequest {
  id_proveedor_servicio: number;
  ids_especialidades: number[];
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

export interface WorkshopRequestAssignmentResponse {
  id_asignacion: number;
  id_solicitud: number;
  id_taller: number;
  id_proveedor: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  tiempo_llegada: number | null;
  estado: string;
}

export interface WorkshopRequestResponse {
  id_solicitud: number;
  id_vehiculo: number;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
  direccion: string;
  fecha: string;
  prioridad: string | null;
  observaciones: string | null;
  audio: string | null;
  imagenes: string[] | null;
  ronda_actual: number;
  estado: string;
  recomendacion: string | null;
  distancia_desde_taller: number | null;
  invitacion: WorkshopRequestInvitationResponse | null;
  asignacion: WorkshopRequestAssignmentResponse | null;
}

export interface WorkshopRequestInvitationResponse {
  id_invitacion: number;
  id_solicitud: number;
  id_taller: number;
  numero_ronda: number;
  estado: string;
  fecha_hora_envio: string;
  fecha_hora_expiracion: string;
  fecha_hora_respuesta: string | null;
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

  updateWorkshopProviderService(
    workshopId: number,
    payload: UpdateWorkshopProviderServiceRequest,
  ): Observable<WorkshopProvider> {
    return this.apiService.put<WorkshopProvider, UpdateWorkshopProviderServiceRequest>(
      `/talleres/${workshopId}/proveedor-servicio`,
      payload,
    );
  }

  getWorkshopAssignments(workshopId: number): Observable<WorkshopAssignmentResponse[]> {
    return this.apiService.get<WorkshopAssignmentResponse[]>(`/talleres/${workshopId}/asignaciones`);
  }

  getWorkshopRequests(workshopId: number): Observable<WorkshopRequestResponse[]> {
    return this.apiService.get<WorkshopRequestResponse[]>(`/talleres/${workshopId}/solicitudes`);
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
