import { Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthMeResponse, AuthService } from '../../../../../core/services/auth.service';
import {
  DashboardService,
  WorkshopDashboardData,
  WorkshopDashboardMessage,
} from '../../../../../core/services/dashboard.service';
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
  status: string;
}

interface ZoneIncident {
  zone: string;
  total: number;
}

interface ServiceRequest {
  service: string;
  total: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private get workshopId(): number {
    return this.getWorkshopIdFromRoute();
  }
  private dashboardWebSocket: WebSocket | null = null;

  userName = signal('Usuario');
  greeting = signal('Bienvenido');
  dashboardData = signal<WorkshopDashboardData | null>(null);

  readonly kpis = computed<KpiCard[]>(() => {
    const data = this.dashboardData();

    return [
      {
        label: 'Proveedores disponibles',
        value: this.formatInteger(data?.proveedores_disponibles ?? 0),
        detail: '',
        tone: 'blue',
      },
      {
        label: 'Ingresos de hoy',
        value: `${this.formatCurrency(data?.ingresos_hoy ?? 0)} Bs`,
        detail: '',
        tone: 'green',
      },
      {
        label: 'Calificacion promedio',
        value: `${this.formatDecimal(data?.calificacion_promedio ?? 0)}/5`,
        detail: '',
        tone: 'orange',
      },
      {
        label: 'Tiempo promedio de asignacion',
        value: `${this.formatDecimal(data?.tiempo_promedio_asignacion ?? 0)} min`,
        detail: '',
        tone: 'red',
      },
      {
        label: 'Solicitudes pendientes',
        value: this.formatInteger(data?.solicitudes_pendientes ?? 0),
        detail: '',
        tone: 'blue',
      },
      {
        label: 'Servicios finalizados hoy',
        value: this.formatInteger(data?.servicios_finalizados_hoy ?? 0),
        detail: '',
        tone: 'green',
      },
      {
        label: 'Casos no atendidos hoy',
        value: this.formatInteger(data?.casos_no_atendidos_hoy ?? 0),
        detail: '',
        tone: 'orange',
      },
      {
        label: 'Tiempo promedio de llegada',
        value: `${this.formatDecimal(data?.tiempo_promedio_llegada ?? 0)} min`,
        detail: '',
        tone: 'red',
      },
    ];
  });

  readonly topZones = computed<ZoneIncident[]>(() =>
    (this.dashboardData()?.zonas_mayor_demanda ?? []).map((zone) => ({
      zone: zone.nombre,
      total: zone.cantidad,
    })),
  );

  readonly serviceRequests = computed<ServiceRequest[]>(() =>
    (this.dashboardData()?.solicitudes_por_tipo_servicio ?? []).map((service) => ({
      service: service.nombre || service.codigo,
      total: service.cantidad,
    })),
  );

  getMaxServiceRequests(): number {
    return Math.max(1, ...this.serviceRequests().map((item) => item.total));
  }

  getBarWidth(total: number, maxValue: number): string {
    return `${Math.max(6, (total / maxValue) * 100)}%`;
  }

  ngOnInit(): void {
    void this.loadCurrentUser();
    void this.loadInitialDashboard();
    this.connectDashboardWebSocket();
  }

  ngOnDestroy(): void {
    this.dashboardWebSocket?.close();
    this.dashboardWebSocket = null;
  }

  getMaxServices(): number {
    return Math.max(1, ...this.topZones().map((zone) => zone.total));
  }

  getBarHeight(total: number): string {
    return `${Math.max(12, (total / this.getMaxServices()) * 100)}%`;
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.getCurrentUser().pipe(timeout(10000)));
      this.applyCurrentUser(user);
    } catch {
      this.userName.set('Usuario');
      this.greeting.set('Bienvenido');
    }
  }

  private async loadInitialDashboard(): Promise<void> {
    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      return;
    }

    try {
      const data = await firstValueFrom(
        this.dashboardService.getTodayDashboard(this.workshopId).pipe(timeout(10000)),
      );
      this.dashboardData.set(data);
    } catch {
      this.dashboardData.set(null);
    }
  }

  private connectDashboardWebSocket(): void {
    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    this.dashboardWebSocket?.close();
    this.dashboardWebSocket = new WebSocket(this.dashboardService.getDashboardWebSocketUrl(this.workshopId, token));

    this.dashboardWebSocket.onmessage = (event) => {
      this.ngZone.run(() => this.handleDashboardSocketMessage(event.data));
    };

    this.dashboardWebSocket.onclose = () => {
      this.dashboardWebSocket = null;
    };
  }

  private handleDashboardSocketMessage(rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as WorkshopDashboardMessage;

      if (message.tipo !== 'dashboard_taller_actualizado') {
        return;
      }

      if (message.data.id_taller !== this.workshopId) {
        return;
      }

      this.dashboardData.set(message.data);
    } catch {
      console.warn('Mensaje WebSocket invalido recibido en dashboard.');
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

    const match = window.location.pathname.match(/\/workshop\/(\d+)/i);
    if (match && match[1]) {
      const id = Number(match[1]);
      if (Number.isInteger(id) && id > 0) {
        return id;
      }
    }

    return 0;
  }

  private applyCurrentUser(user: AuthMeResponse): void {
    const name = user.persona?.nombre_completo?.trim() || user.email;
    const gender = user.persona?.genero?.trim().toUpperCase();

    this.userName.set(name);
    this.greeting.set(gender === 'F' ? 'Bienvenida' : 'Bienvenido');
  }

  private formatInteger(value: number): string {
    return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value);
  }

  private formatDecimal(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  private formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${this.formatDecimal(value)}%`;
  }
}
