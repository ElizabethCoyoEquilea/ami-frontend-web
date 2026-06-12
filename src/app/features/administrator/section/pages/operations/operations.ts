import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { firstValueFrom, timeout } from 'rxjs';
import {
  WorkshopAssignmentResponse,
  WorkshopProvider,
  WorkshopRequestAssignmentResponse,
  WorkshopRequestResponse,
  WorkshopService,
} from '../../../../../core/services/workshop.service';
import {
  WorkshopCompletedServiceResponse,
  WorkshopOperationService,
  WorkshopPaymentResponse,
  WorkshopServiceDetailResponse,
} from '../../../../../core/services/workshop-operation.service';
import { WorkshopWebSocketService, type WebSocketMessage } from '../../../../../core/services/workshop-websocket.service';

import { NotificationService } from '../../../../../shared/services/notification.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';
import { AssignStaffFormComponent, type AvailableStaff } from './assign-staff-form/assign-staff-form';

type OperationsTab = 'requests' | 'assignments' | 'services' | 'serviceDetail' | 'payment';

interface ServiceRequest {
  id: number;
  solicitudId: number;
  asignacionId: number | null;
  vehiculoId: number;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
  prioridad: string;
  observaciones: string;
  estado: string;
  fecha: string;
  direccion: string;
  audioUrl: string | null;
  imageUrls: string[];
  rondaActual: number;
  distancia: string;
  assignmentStatus: string | null;
}

interface Assignment {
  id: number;
  codigo: string;
  cotizacionId: number | null;
  solicitudId: number;
  tallerId: number;
  catalogoServicioId: number | null;
  fecha: string;
  estado: string;
  personalAsignado?: string;
}

interface CompletedService {
  id: number;
  paymentId: number | null;
  fechaInicio: string;
  fechaFin: string;
  montoTotal: number;
  estado: string;
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
  estado: string;
}

interface TrackingLocation {
  assignmentId: number;
  requestId: number;
  latitude: number;
  longitude: number;
  receivedAt: number;
}

@Component({
  selector: 'app-operations',
  imports: [NavbarComponent, SidebarComponent, AssignStaffFormComponent],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class OperationsComponent implements OnInit, OnDestroy {
  private readonly workshopService = inject(WorkshopService);
  private readonly operationService = inject(WorkshopOperationService);
  private readonly notificationService = inject(NotificationService);
  private readonly wsService = inject(WorkshopWebSocketService);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly workshopId = this.getWorkshopIdFromRoute();
  private removeProviderMessageListener: (() => void) | null = null;
  private removeClientMessageListener: (() => void) | null = null;
  private readonly requestLocationIcon = L.divIcon({
    className: 'tracking-request-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  private readonly providerLocationIcon = L.divIcon({
    className: 'tracking-provider-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  @ViewChild('trackingMap') private trackingMapElement?: ElementRef<HTMLElement>;

  private trackingMap?: L.Map;
  private requestTrackingMarker?: L.Marker;
  private providerTrackingMarker?: L.Marker;

  public activeTab = signal<OperationsTab>('requests');
  public selectedRequestDetail = signal<ServiceRequest | null>(null);
  public selectedTrackingRequest = signal<ServiceRequest | null>(null);
  public selectedStaffAssignment = signal<Assignment | null>(null);
  public selectedCompletedService = signal<CompletedService | null>(null);
  public isLoadingRequests = signal(false);
  public isLoadingAssignments = signal(false);
  public isLoadingProviders = signal(false);
  public isLoadingServices = signal(false);
  public isLoadingServiceDetails = signal(false);
  public isLoadingPayment = signal(false);
  public requestsErrorMessage = signal('');
  public assignmentsErrorMessage = signal('');
  public providersErrorMessage = signal('');
  public websocketErrorMessage = signal('');
  public servicesErrorMessage = signal('');
  public serviceDetailsErrorMessage = signal('');
  public paymentErrorMessage = signal('');

  public requests = signal<ServiceRequest[]>([]);
  public assignments = signal<Assignment[]>([]);
  public availableStaff = signal<AvailableStaff[]>([]);
  public completedServices = signal<CompletedService[]>([]);
  public selectedServiceDetails = signal<CompletedServiceDetail[]>([]);
  public selectedPayment = signal<ServicePayment | null>(null);

  ngOnInit(): void {
    void this.loadPendingRequests();
    void this.loadAssignments();
    void this.loadCompletedServices();
    this.setupProviderMessageListener();
    this.setupClientMessageListener();
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

  ngOnDestroy(): void {
    this.removeProviderMessageListener?.();
    this.removeClientMessageListener?.();
    this.destroyTrackingMap();
  }

  setActiveTab(tab: OperationsTab): void {
    this.activeTab.set(tab);

    if (tab !== 'serviceDetail' && tab !== 'payment') {
      this.selectedCompletedService.set(null);
    }

    if (tab === 'assignments') {
      void this.loadAssignments();
    }

    if (tab === 'services') {
      void this.loadCompletedServices();
    }
  }

  public visibleRequests(): ServiceRequest[] {
    return this.requests();
  }

  public openRequestDetail(request: ServiceRequest): void {
    this.selectedRequestDetail.set(request);
  }

  public closeRequestDetail(): void {
    this.selectedRequestDetail.set(null);
  }

  public canViewTracking(request: ServiceRequest): boolean {
    return (
      this.normalizeStatus(request.estado) === 'asignada' &&
      this.normalizeStatus(request.assignmentStatus) === 'en camino'
    );
  }

  public viewTracking(request: ServiceRequest): void {
    if (request.latitud === null || request.longitud === null) {
      this.notificationService.warning('La solicitud no tiene ubicacion registrada.');
      return;
    }

    this.selectedTrackingRequest.set(request);
    setTimeout(() => this.initializeTrackingMap());
  }

  public closeTracking(): void {
    this.selectedTrackingRequest.set(null);
    this.destroyTrackingMap();
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
        this.workshopService.getWorkshopRequests(this.workshopId).pipe(timeout(10000)),
      );
      const requests = this.normalizeWorkshopRequestsResponse(response);
      this.requests.set(
        requests
          .filter((request) => this.requestInvitationShouldBeShown(request))
          .map((request) => this.mapWorkshopRequest(request)),
      );
    } catch (error) {
      this.requests.set([]);
      this.requestsErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar las solicitudes del taller.'));
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
      const [assignmentsResponse, requestsResponse] = await Promise.allSettled([
        firstValueFrom(this.workshopService.getWorkshopAssignments(this.workshopId).pipe(timeout(10000))),
        firstValueFrom(this.workshopService.getWorkshopRequests(this.workshopId).pipe(timeout(10000))),
      ]);

      if (assignmentsResponse.status === 'rejected' && requestsResponse.status === 'rejected') {
        throw assignmentsResponse.reason;
      }

      const responseAssignments =
        assignmentsResponse.status === 'fulfilled' ? this.normalizeAssignmentsResponse(assignmentsResponse.value) : [];
      const embeddedAssignments = (requestsResponse.status === 'fulfilled'
        ? this.normalizeWorkshopRequestsResponse(requestsResponse.value)
        : [])
        .map((request) => request.asignacion)
        .filter((assignment): assignment is WorkshopRequestAssignmentResponse => Boolean(assignment));
      const assignments = this.mergeAssignments(
        responseAssignments.map((assignment) => this.mapAssignment(assignment)),
        embeddedAssignments.map((assignment) => this.mapRequestAssignment(assignment)),
      );
      this.assignments.set(
        assignments
          .filter((assignment) => this.assignmentShouldBeShown(assignment.estado)),
      );
      this.selectedStaffAssignment.set(null);
    } catch (error) {
      this.assignments.set([]);
      this.assignmentsErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar las asignaciones.'));
    } finally {
      this.isLoadingAssignments.set(false);
    }
  }

  openStaffForm(assignment: Assignment): void {
    this.selectedStaffAssignment.set(assignment);
    this.websocketErrorMessage.set('');
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

  cancelService(assignment: Assignment): void {
    if (!assignment.cotizacionId) {
      this.websocketErrorMessage.set('No se encontro la cotizacion asociada a esta asignacion.');
      return;
    }

    const messageSent = this.sendClientSocketMessage({
      tipo: 'admin_cancelo_servicio',
      data: {
        id_asignacion: assignment.id,
        id_cotizacion: assignment.cotizacionId,
        id_solicitud: assignment.solicitudId,
      },
    });

    if (!messageSent) {
      this.websocketErrorMessage.set('No se pudo notificar la cancelacion por WebSocket de clientes.');
      return;
    }

    this.assignments.update((assignments) =>
      assignments.map((currentAssignment) =>
        currentAssignment.id === assignment.id
          ? { ...currentAssignment, estado: 'Servicio cancelado' }
          : currentAssignment,
      ),
    );
  }

  async viewServiceDetail(service: CompletedService): Promise<void> {
    this.selectedCompletedService.set(service);
    this.selectedServiceDetails.set([]);
    this.serviceDetailsErrorMessage.set('');
    this.activeTab.set('serviceDetail');

    this.isLoadingServiceDetails.set(true);
    try {
      const response = await firstValueFrom(
        this.operationService.getServiceDetails(service.id).pipe(timeout(10000)),
      );
      this.selectedServiceDetails.set(
        this.normalizeServiceDetailsResponse(response).map((detail) => this.mapServiceDetail(detail)),
      );
    } catch (error) {
      this.serviceDetailsErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar los detalles del servicio.'));
    } finally {
      this.isLoadingServiceDetails.set(false);
    }
  }

  async viewPayment(service: CompletedService): Promise<void> {
    if (!service.paymentId) {
      this.paymentErrorMessage.set('No se encontro el pago asociado a este servicio.');
      return;
    }

    this.selectedCompletedService.set(service);
    this.selectedPayment.set(null);
    this.paymentErrorMessage.set('');
    this.activeTab.set('payment');

    this.isLoadingPayment.set(true);
    try {
      const response = await firstValueFrom(
        this.operationService.getPayment(service.paymentId).pipe(timeout(10000)),
      );
      this.selectedPayment.set(this.mapPayment(response));
    } catch (error) {
      this.paymentErrorMessage.set(this.getErrorMessage(error, 'No se pudo cargar el pago del servicio.'));
    } finally {
      this.isLoadingPayment.set(false);
    }
  }

  closeServiceInfo(): void {
    this.selectedCompletedService.set(null);
    this.selectedServiceDetails.set([]);
    this.selectedPayment.set(null);
    this.serviceDetailsErrorMessage.set('');
    this.paymentErrorMessage.set('');
    this.activeTab.set('services');
  }

  private mapWorkshopRequest(request: WorkshopRequestResponse): ServiceRequest {
    return {
      id: request.id_solicitud,
      solicitudId: request.id_solicitud,
      asignacionId: request.asignacion?.id_asignacion ?? null,
      vehiculoId: request.id_vehiculo,
      descripcion: request.descripcion,
      latitud: request.latitud,
      longitud: request.longitud,
      prioridad: this.formatPriority(request.prioridad),
      observaciones: request.observaciones?.trim() || 'Sin observaciones',
      estado: this.formatStatus(request.estado),
      fecha: this.formatDateTime(request.fecha),
      direccion: request.direccion?.trim() || 'Sin direccion',
      audioUrl: this.buildMediaUrl(request.audio),
      imageUrls: this.normalizeMediaPaths(request.imagenes)
        .map((image) => this.buildMediaUrl(image))
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
      rondaActual: request.ronda_actual,
      distancia: this.formatDistance(request.distancia_desde_taller),
      assignmentStatus: request.asignacion?.estado ?? null,
    };
  }

  private requestInvitationShouldBeShown(request: WorkshopRequestResponse): boolean {
    const invitationStatus = this.normalizeStatus(request.invitacion?.estado);

    return invitationStatus === 'aceptada' || invitationStatus === 'enviada' || invitationStatus === 'enviado';
  }

  private formatStatus(status: string): string {
    const normalizedStatus = this.normalizeStatus(status);

    if (!normalizedStatus) {
      return 'Sin estado';
    }

    return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
  }

  private normalizeStatus(status: string | null | undefined): string {
    return status?.trim().toLowerCase().replaceAll('_', ' ') ?? '';
  }

  private assignmentShouldBeShown(status: string): boolean {
    const normalizedStatus = this.normalizeStatus(status);

    return (
      normalizedStatus === 'pendiente de asignar personal' ||
      normalizedStatus === 'enviada' ||
      normalizedStatus === 'enviado'
    );
  }

  async loadCompletedServices(): Promise<void> {
    this.servicesErrorMessage.set('');

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.completedServices.set([]);
      this.servicesErrorMessage.set('No se encontro el taller seleccionado.');
      return;
    }

    this.isLoadingServices.set(true);

    try {
      const response = await firstValueFrom(
        this.operationService.getServicesByWorkshop(this.workshopId).pipe(timeout(10000)),
      );
      const services = this.normalizeCompletedServicesResponse(response);
      this.completedServices.set(
        services
          .filter((service) => this.normalizeStatus(service.estado) === 'pagado')
          .sort((firstService, secondService) => this.compareDatesDescending(firstService.fecha_inicio, secondService.fecha_inicio))
          .map((service) => this.mapCompletedService(service)),
      );
    } catch (error) {
      this.completedServices.set([]);
      this.servicesErrorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar los servicios realizados.'));
    } finally {
      this.isLoadingServices.set(false);
    }
  }

  private mapAssignment(assignment: WorkshopAssignmentResponse): Assignment {
    return {
      id: assignment.id_asignacion,
      codigo: `AS${assignment.id_asignacion}`,
      cotizacionId: assignment.id_cotizacion ?? null,
      solicitudId: assignment.id_solicitud,
      tallerId: assignment.id_taller,
      catalogoServicioId: assignment.id_catalogo_servicio,
      fecha: this.formatDate(assignment.fecha),
      estado: assignment.estado,
    };
  }

  private mapRequestAssignment(assignment: WorkshopRequestAssignmentResponse): Assignment {
    return {
      id: assignment.id_asignacion,
      codigo: `AS${assignment.id_asignacion}`,
      cotizacionId: null,
      solicitudId: assignment.id_solicitud,
      tallerId: assignment.id_taller,
      catalogoServicioId: null,
      fecha: this.formatDateTime(assignment.fecha_inicio),
      estado: assignment.estado,
    };
  }

  private mergeAssignments(assignments: Assignment[], embeddedAssignments: Assignment[]): Assignment[] {
    const assignmentsById = new Map<number, Assignment>();

    [...assignments, ...embeddedAssignments].forEach((assignment) => {
      assignmentsById.set(assignment.id, {
        ...assignmentsById.get(assignment.id),
        ...assignment,
      });
    });

    return [...assignmentsById.values()];
  }

  private mapCompletedService(service: WorkshopCompletedServiceResponse): CompletedService {
    return {
      id: service.id_servicio,
      paymentId: service.id_pago,
      fechaInicio: this.formatDateTime(service.fecha_inicio),
      fechaFin: service.fecha_fin ? this.formatDateTime(service.fecha_fin) : 'Sin registrar',
      montoTotal: Number(service.total),
      estado: service.estado,
    };
  }

  private compareDatesDescending(firstDate: string, secondDate: string): number {
    const firstTime = new Date(firstDate).getTime();
    const secondTime = new Date(secondDate).getTime();

    if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) {
      return 0;
    }

    if (Number.isNaN(firstTime)) {
      return 1;
    }

    if (Number.isNaN(secondTime)) {
      return -1;
    }

    return secondTime - firstTime;
  }

  private mapServiceDetail(detail: WorkshopServiceDetailResponse): CompletedServiceDetail {
    return {
      nombre: detail.nombre || detail.catalogo_servicio?.nombre || 'Servicio',
      descripcion: detail.observacion?.trim() || detail.catalogo_servicio?.categoria || 'Sin observacion',
      precio: Number(detail.precio),
      cantidad: Number(detail.cantidad),
      subtotal: Number(detail.sub_total),
    };
  }

  private mapPayment(payment: WorkshopPaymentResponse): ServicePayment {
    return {
      fecha: payment.fecha ? this.formatDateTime(payment.fecha) : 'Sin registrar',
      monto: Number(payment.monto),
      metodo: payment.metodo?.trim() || 'Sin registrar',
      estado: payment.estado,
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
          .filter((provider) => provider.estado?.trim().toLowerCase() === 'disponible')
          .map((provider) => this.mapAvailableStaff(provider)),
      );
    } catch (error) {
      this.providersErrorMessage.set(this.getErrorMessage(error, 'No se pudo cargar el personal disponible.'));
    } finally {
      this.isLoadingProviders.set(false);
    }
  }

  private normalizeWorkshopRequestsResponse(
    response: WorkshopRequestResponse[] | { value?: WorkshopRequestResponse[] },
  ): WorkshopRequestResponse[] {
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

  private normalizeCompletedServicesResponse(
    response: WorkshopCompletedServiceResponse[] | { value?: WorkshopCompletedServiceResponse[] },
  ): WorkshopCompletedServiceResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private normalizeServiceDetailsResponse(
    response: WorkshopServiceDetailResponse[] | { value?: WorkshopServiceDetailResponse[] },
  ): WorkshopServiceDetailResponse[] {
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

  private setupProviderMessageListener(): void {
    this.removeProviderMessageListener = this.wsService.onProviderMessage((message: WebSocketMessage) => {
      if (this.isNewRequestMessage(message)) {
        this.handleNewRequestMessage();
        return;
      }

      if (this.isExpiredInvitationMessage(message)) {
        this.handleExpiredInvitationMessage();
        return;
      }

      if (this.isTrackingStartedMessage(message)) {
        this.handleTrackingStartedMessage();
        return;
      }

      if (this.isProviderRouteMessage(message)) {
        this.handleProviderRouteMessage(message);
        return;
      }

      if (message.tipo === 'conexion_proveedor_ok') {
        console.info('WebSocket proveedor conectado', message.data);
        this.websocketErrorMessage.set('');
        return;
      }

      if (message.tipo === 'provider_acepto_resultado' || message.tipo === 'proveedor_acepto_resultado') {
        const assignmentId = Number(message.data['id_asignacion']);

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
          return;
        }

        this.notificationService.info(`La asignacion AS${assignmentId} ha sido aceptada`);
        void this.loadAssignments();
        return;
      }

      if (message.tipo === 'asignacion_rechazada') {
        this.notificationService.error('Asignacion Rechazada');
        void this.loadAssignments();
      }
    });
  }

  private setupClientMessageListener(): void {
    this.removeClientMessageListener = this.wsService.onClientMessage((message: WebSocketMessage) => {
      if (this.isNewRequestMessage(message)) {
        this.handleNewRequestMessage();
        return;
      }

      if (message.tipo === 'nueva_cotizacion') {
        this.handleNewQuoteMessage(message);
      }

      if (message.tipo === 'respuesta_cotizacion_cliente') {
        this.handleClientQuoteResponseMessage(message);
      }
    });
  }

  private isNewRequestMessage(message: WebSocketMessage): boolean {
    const messageType = this.normalizeMessageType(message.tipo);

    return messageType === 'solicitud nueva' || messageType === 'nueva solicitud';
  }

  private isExpiredInvitationMessage(message: WebSocketMessage): boolean {
    return this.normalizeMessageType(message.tipo) === 'invitacion_expirada';
  }

  private isTrackingStartedMessage(message: WebSocketMessage): boolean {
    return this.normalizeMessageType(message.tipo) === 'seguimiento iniciado';
  }

  private isProviderRouteMessage(message: WebSocketMessage): boolean {
    return this.normalizeMessageType(message.tipo) === 'proveedor recorrido';
  }

  private handleNewRequestMessage(): void {
    if (this.activeTab() === 'requests') {
      void this.loadPendingRequests();
    }
  }

  private handleExpiredInvitationMessage(): void {
    if (this.activeTab() === 'requests') {
      void this.loadPendingRequests();
    }
  }

  private handleTrackingStartedMessage(): void {
    if (this.activeTab() === 'requests') {
      void this.loadPendingRequests();
    }
  }

  private handleProviderRouteMessage(message: WebSocketMessage): void {
    const assignmentId = Number(message.data['id_asignacion']);
    const requestId = Number(message.data['id_solicitud']);
    const latitude = Number(message.data['latitud']);
    const longitude = Number(message.data['longitud']);

    if (
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0 ||
      !Number.isInteger(requestId) ||
      requestId <= 0 ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return;
    }

    const location = {
      assignmentId,
      requestId,
      latitude,
      longitude,
      receivedAt: Date.now(),
    };

    console.info('proveedor_recorrido recibido', {
      id_asignacion: assignmentId,
      id_solicitud: requestId,
      latitud: latitude,
      longitud: longitude,
    });

    const selectedRequest = this.selectedTrackingRequest();
    if (selectedRequest?.asignacionId === assignmentId && selectedRequest.solicitudId === requestId) {
      this.ngZone.run(() => this.updateProviderTrackingMarker(location));
    }
  }

  private handleNewQuoteMessage(message: WebSocketMessage): void {
    const quoteWorkshopId = Number(message.data['id_taller']);

    if (quoteWorkshopId !== this.workshopId) {
      return;
    }

    this.notificationService.info('Tienes una nueva solicitud pendiente');
    void this.loadPendingRequests();
  }

  private handleClientQuoteResponseMessage(message: WebSocketMessage): void {
    const quoteWorkshopId = Number(message.data['id_taller']);

    if (quoteWorkshopId !== this.workshopId) {
      return;
    }

    const clientName = this.getMessageText(message.data['nombre_usuario'], 'El cliente');
    const action = this.getMessageText(message.data['accion']).toLowerCase();
    const actionText = action === 'acepto' || action === 'aceptó' ? 'acepto' : 'cancelo';

    this.notificationService.info(`${clientName} ${actionText} la cotizacion`);
    void this.loadPendingRequests();
  }

  private getMessageText(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private normalizeMessageType(type: string | null | undefined): string {
    return type?.trim().toLowerCase().replaceAll('_', ' ') ?? '';
  }

  private initializeTrackingMap(): void {
    const request = this.selectedTrackingRequest();
    const mapElement = this.trackingMapElement?.nativeElement;

    if (!request || !mapElement || request.latitud === null || request.longitud === null) {
      return;
    }

    this.destroyTrackingMap();

    const requestPosition: L.LatLngExpression = [request.latitud, request.longitud];

    this.trackingMap = L.map(mapElement, {
      center: requestPosition,
      zoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.trackingMap);

    this.requestTrackingMarker = L.marker(requestPosition, { icon: this.requestLocationIcon })
      .addTo(this.trackingMap)
      .bindPopup('Ubicacion de la solicitud');

    setTimeout(() => {
      this.trackingMap?.invalidateSize();
      this.trackingMap?.setView(requestPosition, 16);
    });
  }

  private updateProviderTrackingMarker(location: TrackingLocation): void {
    if (!this.trackingMap) {
      return;
    }

    const providerPosition: L.LatLngExpression = [location.latitude, location.longitude];

    if (this.providerTrackingMarker) {
      this.providerTrackingMarker.setLatLng(providerPosition);
      this.providerTrackingMarker.setPopupContent(`Proveedor: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    } else {
      this.providerTrackingMarker = L.marker(providerPosition, { icon: this.providerLocationIcon })
        .addTo(this.trackingMap)
        .bindPopup(`Proveedor: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    }

    this.fitTrackingBounds(providerPosition);
  }

  private fitTrackingBounds(providerPosition: L.LatLngExpression): void {
    const request = this.selectedTrackingRequest();

    if (request && request.latitud !== null && request.longitud !== null) {
      const bounds = L.latLngBounds([[request.latitud, request.longitud], providerPosition]);
      this.trackingMap?.fitBounds(bounds, { padding: [120, 120], maxZoom: 16 });
      return;
    }

    this.trackingMap?.setView(providerPosition, 16);
  }

  private destroyTrackingMap(): void {
    this.trackingMap?.remove();
    this.trackingMap = undefined;
    this.requestTrackingMarker = undefined;
    this.providerTrackingMarker = undefined;
  }

  private sendProviderSocketMessage(message: WebSocketMessage): boolean {
    return this.wsService.sendProviderMessage(message);
  }

  private sendClientSocketMessage(message: WebSocketMessage): boolean {
    return this.wsService.sendClientMessage(message);
  }

  private formatPriority(priority: string | null): string {
    if (!priority?.trim()) {
      return 'Sin prioridad';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  }

  private formatDistance(distance: number | null): string {
    if (distance === null || Number.isNaN(Number(distance))) {
      return 'Sin distancia';
    }

    return `${Number(distance).toFixed(2)} km`;
  }

  private normalizeMediaPaths(paths: string[] | string | null | undefined): string[] {
    if (Array.isArray(paths)) {
      return paths;
    }

    if (typeof paths === 'string' && paths.trim()) {
      return [paths];
    }

    return [];
  }

  private buildMediaUrl(path: string | null | undefined): string | null {
    if (!path?.trim()) {
      return null;
    }

    const trimmedPath = path.trim();

    if (/^https?:\/\//i.test(trimmedPath)) {
      return trimmedPath;
    }

    return `${this.workshopService.getBaseUrl()}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`;
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

  private formatDateTime(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
