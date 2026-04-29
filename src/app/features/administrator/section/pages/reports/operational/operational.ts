import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import {
  OperationalReportResponse,
  ReportService,
} from '../../../../../../core/services/report.service';
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
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  readonly report = signal<OperationalReportResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly generalSummary = computed<ReportItem[]>(() => {
    const summary = this.report()?.resumen_general;

    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Total de servicios completados',
        value: this.formatInteger(summary.total_servicios_completados),
      },
      {
        label: 'Total de servicios cancelados',
        value: this.formatInteger(summary.total_servicios_cancelados),
      },
      {
        label: 'Tiempo promedio de atencion',
        value: `${this.formatInteger(summary.tiempo_promedio_atencion_minutos)} min`,
      },
      {
        label: 'Calificacion promedio de atencion',
        value: `${this.formatDecimal(summary.calificacion_promedio_atencion)}/5`,
      },
    ];
  });

  readonly servicesByType = computed<ReportItem[]>(() =>
    (this.report()?.servicios_por_tipo ?? []).map((service) => ({
      label: service.nombre,
      value: this.formatInteger(service.cantidad),
    })),
  );

  readonly servicesByTechnician = computed<ReportItem[]>(() =>
    (this.report()?.servicios_por_tecnico ?? []).map((technician) => ({
      label: technician.nombre,
      value: this.formatInteger(technician.cantidad),
    })),
  );

  readonly indicators = computed<ReportItem[]>(() => {
    const indicators = this.report()?.indicadores;

    if (!indicators) {
      return [];
    }

    return [
      { label: 'Tecnico mas activo', value: indicators.tecnico_mas_activo || 'Sin datos' },
      { label: 'Servicio mas solicitado', value: indicators.servicio_mas_solicitado || 'Sin datos' },
    ];
  });

  ngOnInit(): void {
    void this.loadOperationalReport();
  }

  exportOperationalPdf(): void {
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

  private async loadOperationalReport(): Promise<void> {
    const startDate = this.route.snapshot.queryParamMap.get('fecha_inicio') ?? '';
    const endDate = this.route.snapshot.queryParamMap.get('fecha_fin') ?? '';

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0 || !startDate || !endDate) {
      this.errorMessage.set('No se pudo generar el reporte con los datos seleccionados.');
      this.isLoading.set(false);
      return;
    }

    try {
      const report = await firstValueFrom(
        this.reportService.getOperationalReport(this.workshopId, startDate, endDate).pipe(timeout(10000)),
      );
      this.report.set(report);
      this.errorMessage.set('');
    } catch {
      this.report.set(null);
      this.errorMessage.set('No se pudo cargar el reporte operativo. Intenta nuevamente.');
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

  private formatDecimal(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  private buildPrintableReportHtml(report: OperationalReportResponse): string {
    const generatedAt = report.generado_en || 'Sin fecha de generacion';
    const summaryRows = this.generalSummary()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');
    const serviceRows = this.servicesByType()
      .map((item) => this.buildPrintableRow(item.label, item.value))
      .join('');
    const technicianRows = this.servicesByTechnician()
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
          <title>Reporte operativo</title>
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
            <p class="eyebrow">Reporte operativo</p>
            <h1>Servicios y rendimiento del taller</h1>
            <p>Periodo ${this.escapeHtml(report.fecha_inicio)} al ${this.escapeHtml(report.fecha_fin)}.</p>
            <p>Generado en ${this.escapeHtml(generatedAt)}.</p>
          </header>

          ${this.buildPrintableSection('Resumen general', summaryRows)}
          ${this.buildPrintableSection('Servicios por tipo', serviceRows)}
          ${this.buildPrintableSection('Servicios por tecnico', technicianRows)}
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
