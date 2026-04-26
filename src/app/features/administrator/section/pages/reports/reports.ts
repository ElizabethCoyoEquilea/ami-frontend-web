import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

interface ReportMetric {
  label: string;
  value: string;
  detail: string;
}

interface ProviderPerformance {
  name: string;
  services: number;
  rating: number;
  income: number;
}

@Component({
  selector: 'app-reports',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {
  private readonly formBuilder = inject(FormBuilder);

  exportMessage = signal('');

  dateFilterForm = this.formBuilder.nonNullable.group({
    startDate: ['2026-04-01'],
    endDate: ['2026-04-16'],
  });

  readonly serviceMetrics: ReportMetric[] = [
    { label: 'Servicios realizados', value: '126', detail: '32 servicios esta semana' },
    { label: 'Tiempo promedio', value: '2.4 h', detail: '18% mas rapido que marzo' },
    { label: 'Servicios con garantia', value: '11', detail: '8.7% del total' },
  ];

  readonly incomeMetrics: ReportMetric[] = [
    { label: 'Ingresos totales', value: '24.850 Bs', detail: '+18% vs. periodo anterior' },
    { label: 'Ticket promedio', value: '197 Bs', detail: 'Por servicio finalizado' },
    { label: 'Cotizaciones ganadas', value: '74%', detail: '42 de 57 cotizaciones' },
  ];

  readonly providerPerformance: ProviderPerformance[] = [
    { name: 'Carlos Mendez', services: 38, rating: 4.9, income: 7800 },
    { name: 'Andrea Vargas', services: 31, rating: 4.8, income: 6400 },
    { name: 'Miguel Suarez', services: 27, rating: 4.7, income: 5150 },
    { name: 'Lucia Ortega', services: 18, rating: 4.6, income: 3500 },
  ];

  exportReport(): void {
    const { startDate, endDate } = this.dateFilterForm.getRawValue();
    this.exportMessage.set(`Reporte exportado del ${startDate} al ${endDate}.`);
  }
}
