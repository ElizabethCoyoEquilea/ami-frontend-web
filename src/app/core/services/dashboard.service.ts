import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WorkshopDashboardData {
  id_taller: number;
  fecha: string;
  generado_en: string;
  proveedores_disponibles: number;
  ingresos_hoy: number;
  servicios_finalizados_hoy: number;
  calificacion_promedio: number;
  tiempo_promedio_asignacion: number;
  solicitudes_pendientes: number;
  casos_no_atendidos_hoy: number;
  tiempo_promedio_llegada: number;
  zonas_mayor_demanda: Array<{
    id_zona: number;
    nombre: string;
    cantidad: number;
  }>;
  solicitudes_por_tipo_servicio: Array<{
    id_especialidad: number;
    codigo: string;
    nombre: string;
    cantidad: number;
  }>;
}

export interface WorkshopDashboardMessage {
  tipo: string;
  data: WorkshopDashboardData;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly apiService = inject(ApiService);

  getTodayDashboard(workshopId: number): Observable<WorkshopDashboardData> {
    return this.apiService.get<WorkshopDashboardData>(`/talleres/${workshopId}/dashboard/hoy`);
  }

  getDashboardWebSocketUrl(workshopId: number, token: string, intervalSeconds = 5): string {
    const encodedToken = encodeURIComponent(token);
    return `${this.apiService.getWebSocketBaseUrl()}/talleres/${workshopId}/dashboard/ws?token=${encodedToken}&intervalo_segundos=${intervalSeconds}`;
  }
}
