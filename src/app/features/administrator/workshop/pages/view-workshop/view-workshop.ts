import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { firstValueFrom, timeout } from 'rxjs';
import { WorkshopResponse, WorkshopService } from '../../../../../core/services/workshop.service';

interface Workshop {
  id: number;
  name: string;
  description: string;
  address: string;
  coverageRadius?: number;
  openingTime: string;
  closingTime: string;
  status: 'Activo' | 'Inactivo';
  operationState?: 'Abierto' | 'Cerrado';
  rating?: number;
  longitude: number | null;
  latitude: number | null;
}

@Component({
  selector: 'app-view-workshop',
  imports: [RouterLink],
  templateUrl: './view-workshop.html',
  styleUrl: './view-workshop.css',
})
export class ViewWorkshopComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly workshopService = inject(WorkshopService);
  private readonly ngZone = inject(NgZone);
  private readonly defaultMapZoom = 15;
  private readonly locationIcon = L.divIcon({
    className: 'workshop-map-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  private readonly workshopId = Number(this.route.snapshot.paramMap.get('id'));
  private map?: L.Map;
  private marker?: L.Marker;
  private mapElement?: ElementRef<HTMLElement>;

  @ViewChild('workshopMap')
  set workshopMap(element: ElementRef<HTMLElement> | undefined) {
    this.mapElement = element;

    if (element) {
      setTimeout(() => this.initializeMap());
    }
  }

  workshop = signal<Workshop | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');
  workshopNotFound = signal(false);

  ngOnInit(): void {
    if (Number.isNaN(this.workshopId)) {
      this.workshopNotFound.set(true);
      return;
    }

    void this.loadWorkshop();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  get displayRating(): number {
    return this.workshop()?.rating ?? 0;
  }

  get starIndexes(): number[] {
    return [1, 2, 3, 4, 5];
  }

  get schedule(): string {
    const workshop = this.workshop();

    if (!workshop) {
      return '';
    }

    return `${workshop.openingTime} - ${workshop.closingTime}`;
  }

  get coverageRadius(): string {
    const workshop = this.workshop();

    if (!workshop?.coverageRadius) {
      return 'No registrado';
    }

    return `${workshop.coverageRadius} km`;
  }

  get hasLocation(): boolean {
    const workshop = this.workshop();
    return workshop?.latitude !== null && workshop?.longitude !== null;
  }

  get calculatedState(): 'Abierto' | 'Cerrado' {
    const workshop = this.workshop();

    if (!workshop || workshop.status === 'Inactivo') {
      return 'Cerrado';
    }

    if (workshop.operationState) {
      return workshop.operationState;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openingMinutes = this.timeToMinutes(workshop.openingTime);
    const closingMinutes = this.timeToMinutes(workshop.closingTime);

    if (openingMinutes <= closingMinutes) {
      return currentMinutes >= openingMinutes && currentMinutes < closingMinutes ? 'Abierto' : 'Cerrado';
    }

    return currentMinutes >= openingMinutes || currentMinutes < closingMinutes ? 'Abierto' : 'Cerrado';
  }

  get stateClasses(): string {
    return this.calculatedState === 'Abierto'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-[var(--color-error-borde)] bg-[var(--color-error-fondo)] text-[var(--color-error)]';
  }

  async loadWorkshop(): Promise<void> {
    this.errorMessage.set('');
    this.workshopNotFound.set(false);
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.workshopService.getWorkshopById(this.workshopId).pipe(timeout(10000)));
      this.workshop.set(this.mapWorkshop(response));
      setTimeout(() => this.initializeMap());
    } catch (error) {
      this.workshop.set(null);
      this.workshopNotFound.set(this.isNotFoundError(error));
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  starIsFilled(star: number): boolean {
    return star <= Math.round(this.displayRating);
  }

  private mapWorkshop(workshop: WorkshopResponse): Workshop {
    return {
      id: workshop.id_taller ?? this.workshopId,
      name: workshop.nombre,
      description: workshop.descripcion,
      address: workshop.direccion,
      coverageRadius: workshop.radio_cobertura,
      openingTime: this.toDisplayTime(workshop.horario_inicio),
      closingTime: this.toDisplayTime(workshop.horario_fin),
      status: workshop.activo === false ? 'Inactivo' : 'Activo',
      operationState: this.mapOperationState(workshop.estado),
      rating: workshop.calificacion,
      longitude: workshop.longitud,
      latitude: workshop.latitud,
    };
  }

  private initializeMap(): void {
    const workshop = this.workshop();
    const mapElement = this.mapElement?.nativeElement;

    if (!workshop || !mapElement || workshop.latitude === null || workshop.longitude === null) {
      return;
    }

    const markerPosition: L.LatLngExpression = [workshop.latitude, workshop.longitude];

    if (this.map) {
      this.map.setView(markerPosition, this.defaultMapZoom);
      this.marker?.setLatLng(markerPosition);
      this.map.invalidateSize();
      return;
    }

    this.map = L.map(mapElement, {
      center: markerPosition,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoom: this.defaultMapZoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = L.marker(markerPosition, { icon: this.locationIcon }).addTo(this.map);

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.map?.invalidateSize());
    });
  }

  private mapOperationState(state?: string): 'Abierto' | 'Cerrado' | undefined {
    if (!state) {
      return undefined;
    }

    return state.toLowerCase() === 'abierto' ? 'Abierto' : 'Cerrado';
  }

  private toDisplayTime(time: string): string {
    return time?.length >= 5 ? time.slice(0, 5) : time;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? 'No se pudo cargar el taller seleccionado.';
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en responder.';
    }

    return 'No se pudo cargar el taller seleccionado.';
  }
}
