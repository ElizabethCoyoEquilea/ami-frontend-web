import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { DynamicReportResponse, ReportService } from '../../../../../core/services/report.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-reports',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  isLoadingDynamicReport = false;
  dynamicReportErrorMessage = '';
  dynamicReport: DynamicReportResponse | null = null;

  operationalFilterForm = this.formBuilder.nonNullable.group({
    startDate: ['2026-04-01'],
    endDate: ['2026-04-29'],
  });

  financialFilterForm = this.formBuilder.nonNullable.group({
    startDate: ['2026-04-01'],
    endDate: ['2026-04-29'],
  });

  dynamicReportForm = this.formBuilder.nonNullable.group({
    prompt: ['', [Validators.required, Validators.minLength(4)]],
  });

  goToOperationalReport(): void {
    const { startDate, endDate } = this.operationalFilterForm.getRawValue();

    void this.router.navigate(['../operational'], {
      relativeTo: this.route,
      queryParams: {
        fecha_inicio: startDate,
        fecha_fin: endDate,
      },
    });
  }

  goToFinancialReport(): void {
    const { startDate, endDate } = this.financialFilterForm.getRawValue();

    void this.router.navigate(['../financial'], {
      relativeTo: this.route,
      queryParams: {
        fecha_inicio: startDate,
        fecha_fin: endDate,
      },
    });
  }

  async generateDynamicReport(): Promise<void> {
    this.dynamicReportErrorMessage = '';
    this.dynamicReport = null;

    if (this.dynamicReportForm.invalid) {
      this.dynamicReportForm.markAllAsTouched();
      this.dynamicReportErrorMessage = 'Escribe una consulta para generar el reporte.';
      return;
    }

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.dynamicReportErrorMessage = 'No se encontro el taller seleccionado.';
      return;
    }

    this.isLoadingDynamicReport = true;
    this.changeDetectorRef.detectChanges();

    try {
      const { prompt } = this.dynamicReportForm.getRawValue();
      const response = await firstValueFrom(
        this.reportService.generateDynamicReport({
          prompt: prompt.trim(),
          id_taller: this.workshopId,
        }).pipe(timeout(20000)),
      );
      this.dynamicReport = this.normalizeDynamicReportResponse(response);
    } catch (error) {
      this.dynamicReportErrorMessage = this.getErrorMessage(error, 'No se pudo generar el reporte dinamico.');
    } finally {
      this.isLoadingDynamicReport = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  filterEntries(filters: Record<string, unknown> | null | undefined): Array<{ key: string; label: string; value: unknown }> {
    if (!filters) {
      return [];
    }

    return [
      { key: 'date_from', label: 'Desde', value: filters['date_from'] },
      { key: 'date_to', label: 'Hasta', value: filters['date_to'] },
      { key: 'status', label: 'Estado', value: filters['status'] },
    ];
  }

  formatColumnName(column: string): string {
    return column.replaceAll('_', ' ');
  }

  formatCellValue(column: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (this.columnShouldBeCurrency(column) && this.valueIsNumeric(value)) {
      return this.formatCurrency(Number(value));
    }

    if (typeof value === 'string' && this.valueLooksLikeIsoDate(value)) {
      return this.formatDateTime(value);
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
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

  private normalizeDynamicReportResponse(response: unknown): DynamicReportResponse {
    const report = this.unwrapDynamicReportResponse(response);
    const rows = Array.isArray(report['rows']) ? report['rows'] : [];
    const columns = Array.isArray(report['columns'])
      ? report['columns'].map((column) => String(column))
      : this.inferColumnsFromRows(rows);

    return {
      title: this.getStringValue(report['title'], 'Reporte dinamico'),
      report_type: this.getStringValue(report['report_type'], 'dynamic'),
      filters: this.isRecord(report['filters']) ? report['filters'] : {},
      columns,
      rows: rows.filter((row): row is Record<string, unknown> => this.isRecord(row)),
      row_count: this.getNumberValue(report['row_count'], rows.length),
    };
  }

  private unwrapDynamicReportResponse(response: unknown): Record<string, unknown> {
    if (!this.isRecord(response)) {
      return {};
    }

    const possibleKeys = ['data', 'value', 'report', 'reporte', 'result'];

    for (const key of possibleKeys) {
      if (this.isRecord(response[key])) {
        return response[key];
      }
    }

    return response;
  }

  private inferColumnsFromRows(rows: unknown[]): string[] {
    const firstRow = rows.find((row): row is Record<string, unknown> => this.isRecord(row));

    return firstRow ? Object.keys(firstRow) : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getStringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private getNumberValue(value: unknown, fallback: number): number {
    const numericValue = Number(value);

    return Number.isNaN(numericValue) ? fallback : numericValue;
  }

  private columnShouldBeCurrency(column: string): boolean {
    const normalizedColumn = column.trim().toLowerCase();

    return (
      normalizedColumn.includes('total') ||
      normalizedColumn.includes('ingreso') ||
      normalizedColumn.includes('gastado') ||
      normalizedColumn.includes('generado') ||
      normalizedColumn.includes('promedio')
    );
  }

  private valueIsNumeric(value: unknown): boolean {
    return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)));
  }

  private valueLooksLikeIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?/.test(value) && !Number.isNaN(new Date(value).getTime());
  }

  private formatDateTime(value: string): string {
    return new Date(value).toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
    }).format(value);
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? fallbackMessage;
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en generar el reporte.';
    }

    return fallbackMessage;
  }
}
