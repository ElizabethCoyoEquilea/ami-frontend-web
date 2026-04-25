import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ApiService } from '../../../../../core/services/api.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { PendingQuoteResponse, QuoteService } from '../../../../../core/services/quote.service';
import {
  WorkshopAssignmentResponse,
  WorkshopProvider,
  WorkshopService,
} from '../../../../../core/services/workshop.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';
import { AssignStaffFormComponent, type AvailableStaff } from './assign-staff-form/assign-staff-form';
import { RequestQuoteFormComponent } from './request-quote-form/request-quote-form';

type OperationsTab = 'requests' | 'assignments' | 'services' | 'serviceDetail' | 'payment';

interface ServiceRequest {
  id: number;
  solicitudId: number;
  tallerId: number;
  vehiculoId: number;
  descripcion: string;
  prioridad: string;
  observaciones: string;
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada';
  fecha: string;
  direccion: string;
}

interface Assignment {
  id: number;
  solicitudId: number;
  tallerId: number;
  catalogoServicioId: number | null;
  fecha: string;
  estado: string;
  personalAsignado?: string;
}

interface ProviderSocketMessage {
  tipo: string;
  data: Record<string, unknown>;
}

interface CompletedService {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  montoTotal: number;
  calificacion: number;
  servicios: CompletedServiceDetail[];
  pago: ServicePayment;
}

interface CompletedServiceDetail {
  nombre: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface ServicePayment {
  fecha: string;
  monto: number;
  metodo: string;
}

@Component({
  selector: 'app-operations',
  imports: [AssignStaffFormComponent, NavbarComponent, RequestQuoteFormComponent, SidebarComponent],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class OperationsComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly quoteService = inject(QuoteService);
  private readonly workshopService = inject(WorkshopService);
  private readonly route = inject(ActivatedRoute);
  private readonly workshopId = Number(this.route.snapshot.paramMap.get('id'));
  private providerWebSocket: WebSocket | null = null;
  private pendingProviderMessage: ProviderSocketMessage | null = null;

  activeTab = signal<OperationsTab>('requests');
  selectedQuoteRequest = signal<ServiceRequest | null>(null);
  selectedStaffAssignment = signal<Assignment | null>(null);
  selectedCompletedService = signal<CompletedService | null>(null);
  isLoadingRequests = signal(false);
  isLoadingAssignments = signal(false);
  isLoadingProviders = signal(false);
  isSendingQuote = signal(false);
  rejectingQuoteId = signal<number | null>(null);
  requestsErrorMessage = signal('');
  assignmentsErrorMessage = signal('');
  providersErrorMessage = signal('');
  websocketErrorMessage = signal('');
  quoteErrorMessage = signal('');
  quoteMessage = signal('');
  submittedQuoteIds = signal<number[]>([]);

  requests = signal<ServiceRequest[]>([]);
  assignments = signal<Assignment[]>([]);
  availableStaff = signal<AvailableStaff[]>([]);

  completedServices: CompletedService[] = [
    {
      id: 1,
      fechaInicio: '2026-04-16',
      fechaFin: '2026-04-16',
      montoTotal: 280,
      calificacion: 4.8,
      servicios: [
        {
          nombre: 'Revision electrica',
          descripcion: 'Scanner y diagnostico del sistema de arranque.',
          precio: 180,
          cantidad: 1,
          subtotal: 180,
        },
        {
          nombre: 'Cambio de fusible',
          descripcion: 'Repuesto e instalacion.',
          precio: 50,
          cantidad: 2,
          subtotal: 100,
        },
      ],
      pago: {
        fecha: '2026-04-16',
        monto: 280,
        metodo: 'Tarjeta',
      },
    },
    {
      id: 2,
      fechaInicio: '2026-04-15',
      fechaFin: '2026-04-15',
      montoTotal: 150,
      calificacion: 4.5,
      servicios: [
        {
          nombre: 'Revision de frenos',
          descripcion: 'Inspeccion de pastillas y disco delantero.',
          precio: 150,
          cantidad: 1,
          subtotal: 150,
        },
      ],
      pago: {
        fecha: '2026-04-15',
        monto: 150,
        metodo: 'Efectivo',
      },
    },
    {
      id: 3,
      fechaInicio: '2026-04-14',
      fechaFin: '2026-04-14',
      montoTotal: 520,
      calificacion: 5,
      servicios: [
        {
          nombre: 'Mantenimiento preventivo',
          descripcion: 'Cambio de aceite, filtros y revision general.',
          precio: 260,
          cantidad: 2,
          subtotal: 520,
        },
      ],
      pago: {
        fecha: '2026-04-14',
        monto: 520,
        metodo: 'Transferencia',
      },
    },
  ];

  ngOnInit(): void {
    void this.loadPendingRequests();
    void this.loadAssignments();
  }

  ngOnDestroy(): void {
    this.providerWebSocket?.close();
    this.providerWebSocket = null;
  }

  setActiveTab(tab: OperationsTab): void {
    this.activeTab.set(tab);

    if (tab !== 'serviceDetail' && tab !== 'payment') {
      this.selectedCompletedService.set(null);
    }

    if (tab === 'assignments') {
      void this.loadAssignments();
    }
  }

  visibleRequests(): ServiceRequest[] {
    return this.requests().filter((request) => request.estado === 'Pendiente');
  }

  async loadPendingRequests(): Promise<void> {
    this.requestsErrorMessage.set('');

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.requests.set([]);
      this.requestsErrorMessage.set('No se encontro el taller seleccionado.');
      return;
    }

    this.isLoadingRequests.set(true);

    try {
      const response = await firstValueFrom(
        this.quoteService.getPendingQuotesByWorkshop(this.workshopId).pipe(timeout(10000)),
      );
      const quotes = this.normalizePendingQuotesResponse(response);
      this.requests.set(quotes.map((quote) => this.mapPendingQuote(quote)));
      this.selectedQuoteRequest.set(null);
      this.submittedQuoteIds.set([]);
    } catch (error) {
      this.requests.set([]);
      this.requestsErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar las solicitudes pendientes.'));
    } finally {
      this.isLoadingRequests.set(false);
    }
  }

  async loadAssignments(): Promise<void> {
    this.assignmentsErrorMessage.set('');

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.assignments.set([]);
      this.assignmentsErrorMessage.set('No se encontro el taller seleccionado.');
      return;
    }

    this.isLoadingAssignments.set(true);

    try {
      const response = await firstValueFrom(
        this.workshopService.getWorkshopAssignments(this.workshopId).pipe(timeout(10000)),
      );
      const assignments = this.normalizeAssignmentsResponse(response);
      this.assignments.set(assignments.map((assignment) => this.mapAssignment(assignment)));
      this.selectedStaffAssignment.set(null);
    } catch (error) {
      this.assignments.set([]);
      this.assignmentsErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar las asignaciones.'));
    } finally {
      this.isLoadingAssignments.set(false);
    }
  }

  openQuoteForm(request: ServiceRequest): void {
    this.quoteErrorMessage.set('');
    this.quoteMessage.set('');
    this.selectedQuoteRequest.set(request);
  }

  requestActionsAreDisabled(request: ServiceRequest): boolean {
    const selectedRequestId = this.selectedQuoteRequest()?.id;
    return (
      this.submittedQuoteIds().includes(request.id) ||
      selectedRequestId === request.id ||
      this.rejectingQuoteId() === request.id
    );
  }

  requestIsBeingRejected(request: ServiceRequest): boolean {
    return this.rejectingQuoteId() === request.id;
  }

  cancelQuote(): void {
    this.quoteErrorMessage.set('');
    this.selectedQuoteRequest.set(null);
  }

  async submitRequestQuote(amount: number): Promise<void> {
    const request = this.selectedQuoteRequest();

    if (!request) {
      return;
    }

    this.quoteErrorMessage.set('');
    this.quoteMessage.set('');
    this.isSendingQuote.set(true);

    try {
      const response = await firstValueFrom(
        this.quoteService
          .updateQuoteAmount(request.solicitudId, request.id, request.vehiculoId, amount)
          .pipe(timeout(10000)),
      );

      this.selectedQuoteRequest.set(null);
      this.submittedQuoteIds.update((quoteIds) =>
        quoteIds.includes(request.id) ? quoteIds : [...quoteIds, request.id],
      );

      this.quoteMessage.set(
        response.websocket_enviado
          ? 'Cotizacion enviada correctamente.'
          : 'Cotizacion actualizada. El cliente no estaba conectado al WebSocket.',
      );
    } catch (error) {
      this.quoteErrorMessage.set(this.getErrorMessage(error, 'No se pudo enviar la cotizacion.'));
    } finally {
      this.isSendingQuote.set(false);
    }
  }

  async rejectRequest(request: ServiceRequest): Promise<void> {
    this.quoteErrorMessage.set('');
    this.quoteMessage.set('');
    this.rejectingQuoteId.set(request.id);

    try {
      await firstValueFrom(this.quoteService.rejectQuote(request.solicitudId, request.id).pipe(timeout(10000)));
      this.submittedQuoteIds.update((quoteIds) =>
        quoteIds.includes(request.id) ? quoteIds : [...quoteIds, request.id],
      );
      this.quoteMessage.set('Cotizacion rechazada correctamente.');
    } catch (error) {
      this.quoteErrorMessage.set(this.getErrorMessage(error, 'No se pudo rechazar la cotizacion.'));
    } finally {
      this.rejectingQuoteId.set(null);
    }
  }

  openStaffForm(assignment: Assignment): void {
    this.selectedStaffAssignment.set(assignment);
    this.websocketErrorMessage.set('');
    this.connectProviderWebSocket();
    void this.loadAvailableStaff();
  }

  cancelStaffAssignment(): void {
    this.providersErrorMessage.set('');
    this.websocketErrorMessage.set('');
    this.selectedStaffAssignment.set(null);
  }

  assignStaff(staff: AvailableStaff): void {
    const selectedAssignment = this.selectedStaffAssignment();

    if (!selectedAssignment) {
      return;
    }

    const messageSent = this.sendProviderSocketMessage({
      tipo: 'aceptar_asignacion',
      data: {
        id_asignacion: selectedAssignment.id,
        id_personal: staff.id,
        id_taller: selectedAssignment.tallerId,
      },
    });

    if (!messageSent) {
      this.websocketErrorMessage.set('No se pudo enviar la asignacion por WebSocket. Verifica la conexion.');
      return;
    }

    this.assignments.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === selectedAssignment.id
          ? { ...assignment, estado: 'Personal asignado', personalAsignado: staff.name }
          : assignment,
      ),
    );

    this.cancelStaffAssignment();
  }

  cancelService(assignmentId: number): void {
    this.assignments.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, estado: 'Servicio cancelado' } : assignment,
      ),
    );
  }

  viewServiceDetail(service: CompletedService): void {
    this.selectedCompletedService.set(service);
    this.activeTab.set('serviceDetail');
  }

  viewPayment(service: CompletedService): void {
    this.selectedCompletedService.set(service);
    this.activeTab.set('payment');
  }

  closeServiceInfo(): void {
    this.selectedCompletedService.set(null);
    this.activeTab.set('services');
  }

  private mapPendingQuote(quote: PendingQuoteResponse): ServiceRequest {
    const request = quote.solicitud;

    return {
      id: quote.id_cotizacion,
      solicitudId: quote.id_solicitud,
      tallerId: quote.id_taller,
      vehiculoId: request.id_vehiculo,
      descripcion: request.descripcion,
      prioridad: this.formatPriority(request.prioridad),
      observaciones: request.observaciones?.trim() || 'Sin observaciones',
      estado: 'Pendiente',
      fecha: this.formatDate(request.fecha),
      direccion: request.direccion,
    };
  }

  private mapAssignment(assignment: WorkshopAssignmentResponse): Assignment {
    return {
      id: assignment.id_asignacion,
      solicitudId: assignment.id_solicitud,
      tallerId: assignment.id_taller,
      catalogoServicioId: assignment.id_catalogo_servicio,
      fecha: this.formatDate(assignment.fecha),
      estado: assignment.estado,
    };
  }

  private async loadAvailableStaff(): Promise<void> {
    this.providersErrorMessage.set('');
    this.availableStaff.set([]);

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.providersErrorMessage.set('No se encontro el taller seleccionado.');
      return;
    }

    this.isLoadingProviders.set(true);

    try {
      const response = await firstValueFrom(
        this.workshopService.getWorkshopProviders(this.workshopId).pipe(timeout(10000)),
      );
      const providers = this.normalizeProvidersResponse(response);
      this.availableStaff.set(
        providers
          .filter((provider) => provider.estado?.trim().toLowerCase() !== 'inactivo')
          .map((provider) => this.mapAvailableStaff(provider)),
      );
    } catch (error) {
      this.providersErrorMessage.set(this.getErrorMessage(error, 'No se pudo cargar el personal disponible.'));
    } finally {
      this.isLoadingProviders.set(false);
    }
  }

  private normalizePendingQuotesResponse(
    response: PendingQuoteResponse[] | { value?: PendingQuoteResponse[] },
  ): PendingQuoteResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private normalizeAssignmentsResponse(
    response: WorkshopAssignmentResponse[] | { value?: WorkshopAssignmentResponse[] },
  ): WorkshopAssignmentResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private normalizeProvidersResponse(
    response:
      | { proveedores?: WorkshopProvider[] }
      | WorkshopProvider[]
      | { value?: WorkshopProvider[] },
  ): WorkshopProvider[] {
    if (Array.isArray(response)) {
      return response;
    }

    if ('proveedores' in response) {
      return response.proveedores ?? [];
    }

    if ('value' in response) {
      return response.value ?? [];
    }

    return [];
  }

  private mapAvailableStaff(provider: WorkshopProvider): AvailableStaff {
    return {
      id: provider.usuario.persona?.id_persona ?? provider.id_usuario,
      name: provider.usuario.persona?.nombre_completo?.trim() || provider.usuario.email,
      specialty: provider.especialidad?.trim() || 'Sin especialidad',
    };
  }

  private connectProviderWebSocket(): void {
    if (
      this.providerWebSocket &&
      (this.providerWebSocket.readyState === WebSocket.OPEN ||
        this.providerWebSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = this.authService.getToken();

    if (!token) {
      this.websocketErrorMessage.set('No hay token de sesion para conectar al WebSocket.');
      return;
    }

    const websocketUrl = `${this.apiService.getWebSocketBaseUrl()}/ws/proveedor?token=${encodeURIComponent(token)}`;

    this.providerWebSocket = new WebSocket(websocketUrl);

    this.providerWebSocket.onopen = () => {
      this.websocketErrorMessage.set('');

      if (this.pendingProviderMessage) {
        this.providerWebSocket?.send(JSON.stringify(this.pendingProviderMessage));
        this.pendingProviderMessage = null;
      }
    };

    this.providerWebSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ProviderSocketMessage;
        if (message.tipo === 'conexion_proveedor_ok') {
          console.info('WebSocket proveedor conectado', message.data);
        }
      } catch {
        console.warn('Mensaje WebSocket invalido recibido en proveedor.');
      }
    };

    this.providerWebSocket.onerror = () => {
      this.websocketErrorMessage.set('No se pudo establecer la conexion WebSocket con el servidor.');
    };

    this.providerWebSocket.onclose = () => {
      this.providerWebSocket = null;
    };
  }

  private sendProviderSocketMessage(message: ProviderSocketMessage): boolean {
    if (!this.providerWebSocket || this.providerWebSocket.readyState !== WebSocket.OPEN) {
      this.pendingProviderMessage = message;
      this.connectProviderWebSocket();

      if (!this.providerWebSocket) {
        return false;
      }

      return true;
    }

    this.providerWebSocket.send(JSON.stringify(message));
    return true;
  }

  private formatPriority(priority: string | null): string {
    if (!priority?.trim()) {
      return 'Sin prioridad';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  }

  private formatDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? fallbackMessage;
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en responder.';
    }

    return fallbackMessage;
  }
}
