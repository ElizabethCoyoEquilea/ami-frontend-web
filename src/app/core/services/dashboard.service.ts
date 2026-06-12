import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WorkshopDashboardData {
  id_taller: number;
  fecha: string;
  generado_en: string;
  total_proveedores: number;
  proveedores_disponibles: number;
  ingresos_hoy: number;
  ingresos_mes_anterior_mismo_dia: number;
  variacion_ingresos_vs_mes_anterior: number | null;
  servicios_finalizados_semana: number;
  calificacion_promedio: number;
  promedio_asignacion: number;
  solicitudes_pendientes: number;
  servicios_finalizados: number;
  casos_no_atendidos: number;
  promedio_llegada: number;
  total_resenas: number;
  operaciones?: {
    solicitudes_pendientes_cotizar: number;
    asignaciones_pendientes_designar: number;
    servicios_en_curso: number;
  };
  servicios_por_mes?: {
    anio: number;
    total: number;
    meses: Array<{
      mes: number;
      etiqueta: string;
      cantidad: number;
    }>;
  };
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
