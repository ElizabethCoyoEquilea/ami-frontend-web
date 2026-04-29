import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import {
  FinancialReportResponse,
  ReportService,
} from '../../../../../../core/services/report.service';
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
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  readonly report = signal<FinancialReportResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly generalSummary = computed<FinancialReportItem[]>(() => {
    const summary = this.report()?.resumen_general;

    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Ingresos totales generados',
        value: this.formatCurrency(summary.ingresos_totales_generados),
      },
      {
        label: 'Total de pagos completados',
        value: this.formatInteger(summary.total_pagos_completados),
      },
      {
        label: 'Ingreso promedio por servicio',
        value: this.formatCurrency(summary.ingreso_promedio_por_servicio),
      },
      {
        label: 'Metodo de pago mas usado',
        value: summary.metodo_pago_mas_usado || 'Sin datos',
      },
    ];
  });

  readonly incomeByServiceType = computed<FinancialReportItem[]>(() =>
    (this.report()?.ingresos_por_tipo_servicio ?? []).map((service) => ({
      label: service.nombre,
      value: this.formatCurrency(service.monto),
    })),
  );

  readonly incomeByTechnician = computed<FinancialReportItem[]>(() =>
    (this.report()?.ingresos_por_tecnico ?? []).map((technician) => ({
      label: technician.nombre,
      value: this.formatCurrency(technician.monto),
    })),
  );

  readonly indicators = computed<FinancialReportItem[]>(() => {
    const indicators = this.report()?.indicadores;

    if (!indicators) {
      return [];
    }

    return [
      { label: 'Servicio mas rentable', value: indicators.servicio_mas_rentable || 'Sin datos' },
      { label: 'Tecnico con mayor ingreso', value: indicators.tecnico_con_mayor_ingreso || 'Sin datos' },
    ];
  });

  ngOnInit(): void {
    void this.loadFinancialReport();
  }

  exportFinancialPdf(): void {
    const report = this.report();

    if (!report) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=960,height=720');

    if (!printWindow) {
      this.errorMessage.set('No se pudo abrir la ventana de exportacion del reporte.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrintableReportHtml(report));
    printWindow.document.close();
    printWindow.focus();

    printWindow.setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  private async loadFinancialReport(): Promise<void> {
    const startDate = this.route.snapshot.queryParamMap.get('fecha_inicio') ?? '';
    const endDate = this.route.snapshot.queryParamMap.get('fecha_fin') ?? '';

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0 || !startDate || !endDate) {
      this.errorMessage.set('No se pudo generar el reporte con los datos seleccionados.');
      this.isLoading.set(false);
      return;
    }

    try {
      const report = await firstValueFrom(
        this.reportService.getFinancialReport(this.workshopId, startDate, endDate).pipe(timeout(10000)),
      );
      this.report.set(report);
      this.errorMessage.set('');
    } catch {
      this.report.set(null);
      this.errorMessage.set('No se pudo cargar el reporte financiero. Intenta nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private getWorkshopIdFromRoute(): number {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const workshopId = Number(currentRoute.snapshot.paramMap.get('id'));

      if (Number.isInteger(workshopId) && workshopId > 0) {
        return workshopId;
      }

      currentRoute = currentRoute.parent;
    }

    return 0;
  }

  private formatInteger(value: number): string {
    return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value);
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)} Bs`;
  }

  private buildPrintableReportHtml(report: FinancialReportResponse): string {
    const generatedAt = report.generado_en || 'Sin fecha de generacion';
    const summaryRows = this.generalSummary()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');
    const serviceRows = this.incomeByServiceType()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');
    const technicianRows = this.incomeByTechnician()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');
    const indicatorRows = this.indicators()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Reporte financiero</title>
          <style>
            @page {
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              color: #172554;
              font-family: Arial, sans-serif;
              margin: 0;
            }

            header {
              border-bottom: 2px solid #dbeafe;
              margin-bottom: 24px;
              padding-bottom: 16px;
            }

            .eyebrow {
              color: #2563eb;
              font-size: 12px;
              font-weight: 700;
              margin: 0 0 6px;
              text-transform: uppercase;
            }

            h1 {
              font-size: 28px;
              margin: 0 0 8px;
            }

            h2 {
              font-size: 18px;
              margin: 0 0 12px;
            }

            p {
              color: #475569;
              margin: 0;
            }

            section {
              break-inside: avoid;
              margin-bottom: 22px;
            }

            table {
              border-collapse: collapse;
              width: 100%;
            }

            td {
              border: 1px solid #dbeafe;
              padding: 10px 12px;
            }

            td:last-child {
              color: #0f172a;
              font-weight: 700;
              text-align: right;
              width: 35%;
            }
          </style>
        </head>
        <body>
          <header>
            <p class="eyebrow">Reporte financiero</p>
            <h1>Ingresos y rentabilidad del taller</h1>
            <p>Periodo ${this.escapeHtml(report.fecha_inicio)} al ${this.escapeHtml(report.fecha_fin)}.</p>
            <p>Generado en ${this.escapeHtml(generatedAt)}.</p>
          </header>

          ${this.buildPrintableSection('Resumen general', summaryRows)}
          ${this.buildPrintableSection('Ingresos por tipo de servicio', serviceRows)}
          ${this.buildPrintableSection('Ingresos por tecnico', technicianRows)}
          ${this.buildPrintableSection('Indicadores', indicatorRows)}
        </body>
      </html>
    `;
  }

  private buildPrintableSection(title: string, rows: string): string {
    return `
      <section>
        <h2>${this.escapeHtml(title)}</h2>
        <table>
          <tbody>
            ${rows || this.buildPrintableRow('Sin datos', '')}
          </tbody>
        </table>
      </section>
    `;
  }

  private buildPrintableRow(label: string, value: string): string {
    return `
      <tr>
        <td>${this.escapeHtml(label)}</td>
        <td>${this.escapeHtml(value)}</td>
      </tr>
    `;
  }

  private escapeHtml(value: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return value.replace(/[&<>"']/g, (character) => escapeMap[character]);
  }
}
