import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../../shared/components/navbar/navbar';

interface ReportItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-operational',
  imports: [NavbarComponent, SidebarComponent, RouterLink],
  templateUrl: './operational.html',
  styleUrl: './operational.css',
})
export class OperationalComponent {
  readonly generalSummary: ReportItem[] = [
    { label: 'Total de servicios completados', value: '115' },
    { label: 'Tiempo promedio de atencion', value: '42 min' },
    { label: 'Calificacion promedio de atencion', value: '4 estrellas' },
  ];

  readonly servicesByType: ReportItem[] = [
    { label: 'Cambio de bateria', value: '35' },
    { label: 'Llanta pinchada', value: '28' },
    { label: 'Falla mecanica', value: '22' },
    { label: 'Otros', value: '10' },
  ];

  readonly servicesByTechnician: ReportItem[] = [
    { label: 'Carlos Mendoza', value: '32' },
    { label: 'Luis Fernandez', value: '27' },
  ];

  readonly indicators: ReportItem[] = [
    { label: 'Tecnico mas activo', value: 'Carlos Mendoza' },
    { label: 'Servicio mas solicitado', value: 'Cambio de bateria' },
  ];
}
