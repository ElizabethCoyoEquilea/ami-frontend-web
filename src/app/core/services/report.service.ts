import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OperationalReportResponse {
  id_taller: number;
  fecha_inicio: string;
  fecha_fin: string;
  generado_en: string;
  resumen_general: {
    total_servicios_completados: number;
    tiempo_promedio_atencion_minutos: number;
    calificacion_promedio_atencion: number;
  };
  servicios_por_tipo: {
    nombre: string;
    cantidad: number;
  }[];
  servicios_por_tecnico: {
    id_proveedor: number;
    nombre: string;
    cantidad: number;
  }[];
  indicadores: {
    tecnico_mas_activo: string;
    servicio_mas_solicitado: string;
  };
}

export interface FinancialReportResponse {
  id_taller: number;
  fecha_inicio: string;
  fecha_fin: string;
  generado_en: string;
  resumen_general: {
    ingresos_totales_generados: number;
    total_pagos_completados: number;
    ingreso_promedio_por_servicio: number;
    metodo_pago_mas_usado: string;
  };
  ingresos_por_tipo_servicio: {
    nombre: string;
    monto: number;
  }[];
  ingresos_por_tecnico: {
    id_proveedor: number;
    nombre: string;
    monto: number;
  }[];
  indicadores: {
    servicio_mas_rentable: string;
    tecnico_con_mayor_ingreso: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly apiService = inject(ApiService);

  getOperationalReport(
    workshopId: number,
    startDate: string,
    endDate: string,
  ): Observable<OperationalReportResponse> {
    const params = new URLSearchParams({
      fecha_inicio: startDate,
      fecha_fin: endDate,
    });

    return this.apiService.get<OperationalReportResponse>(
      `/talleres/${workshopId}/reportes/operativo?${params.toString()}`,
    );
  }

  getFinancialReport(
    workshopId: number,
    startDate: string,
    endDate: string,
  ): Observable<FinancialReportResponse> {
    const params = new URLSearchParams({
      fecha_inicio: startDate,
      fecha_fin: endDate,
    });

    return this.apiService.get<FinancialReportResponse>(
      `/talleres/${workshopId}/reportes/financiero?${params.toString()}`,
    );
  }
}
