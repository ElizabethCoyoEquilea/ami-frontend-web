import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

interface KpiCard {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'orange' | 'red';
}

interface OperationSummary {
  label: string;
  value: number;
  detail: string;
}

interface MonthlyService {
  month: string;
  total: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  readonly userName = 'Mariana Rojas';

  readonly kpis: KpiCard[] = [
    { label: 'Proveedores activos', value: '18', detail: '4 disponibles ahora', tone: 'blue' },
    { label: 'Ingresos del mes', value: '24.850 Bs', detail: '+18% vs. mes anterior', tone: 'green' },
    { label: 'Servicios finalizados', value: '126', detail: '32 esta semana', tone: 'orange' },
    { label: 'Calificacion promedio', value: '4.8/5', detail: 'Basado en 91 reseñas', tone: 'red' },
  ];

  readonly operationSummaries: OperationSummary[] = [
    { label: 'Solicitudes', value: 14, detail: '6 de prioridad alta' },
    { label: 'Asignaciones', value: 9, detail: '3 pendientes de cotizacion' },
    { label: 'Servicios', value: 21, detail: 'Finalizados en los ultimos 7 dias' },
  ];

  readonly monthlyServices: MonthlyService[] = [
    { month: 'Ene', total: 38 },
    { month: 'Feb', total: 46 },
    { month: 'Mar', total: 52 },
    { month: 'Abr', total: 61 },
    { month: 'May', total: 58 },
    { month: 'Jun', total: 74 },
    { month: 'Jul', total: 69 },
    { month: 'Ago', total: 83 },
  ];

  readonly recentActivity = [
    'Cotizacion enviada para revision electrica',
    'Solicitud aceptada en Av. Beni',
    'Personal asignado a cambio de frenos',
    'Servicio finalizado con calificacion 5/5',
  ];

  getMaxServices(): number {
    return Math.max(...this.monthlyServices.map((service) => service.total));
  }

  getBarHeight(total: number): string {
    return `${Math.max(12, (total / this.getMaxServices()) * 100)}%`;
  }
}
