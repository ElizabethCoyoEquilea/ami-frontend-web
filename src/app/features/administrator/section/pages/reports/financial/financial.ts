import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../../shared/components/navbar/navbar';

interface FinancialReportItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-financial',
  imports: [NavbarComponent, SidebarComponent, RouterLink],
  templateUrl: './financial.html',
  styleUrl: './financial.css',
})
export class FinancialComponent {
  readonly generalSummary: FinancialReportItem[] = [
    { label: 'Ingresos totales generados', value: 'Bs. 18,500' },
    { label: 'Total de pagos completados', value: '115' },
    { label: 'Ingreso promedio por servicio', value: 'Bs. 160' },
    { label: 'Metodo de pago mas usado', value: 'QR' },
  ];

  readonly incomeByServiceType: FinancialReportItem[] = [
    { label: 'Cambio de bateria', value: 'Bs. 5,200' },
    { label: 'Llanta pinchada', value: 'Bs. 4,100' },
    { label: 'Falla mecanica', value: 'Bs. 3,800' },
  ];

  readonly incomeByTechnician: FinancialReportItem[] = [
    { label: 'Carlos Mendoza', value: 'Bs. 4,800' },
    { label: 'Luis Fernandez', value: 'Bs. 4,100' },
  ];

  readonly indicators: FinancialReportItem[] = [
    { label: 'Servicio mas rentable', value: 'Cambio de bateria' },
    { label: 'Tecnico con mayor ingreso', value: 'Carlos Mendoza' },
  ];
}
