import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { firstValueFrom, timeout } from 'rxjs';
import { WorkshopResponse, WorkshopService } from '../../../../../core/services/workshop.service';

interface Workshop {
  id: number;
  name: string;
  description: string;
  address: string;
  coverageRadius: number;
  rating: number;
  longitude: number | null;
  latitude: number | null;
  openingTime: string;
  closingTime: string;
  backendState?: string;
  activeState: 'Activo' | 'Inactivo';
  qr: string | null;
}

@Component({
  selector: 'app-edit-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-workshop.html',
  styleUrl: './edit-workshop.css',
})
export class EditWorkshopComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workshopService = inject(WorkshopService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly defaultMapCenter: L.LatLngExpression = [-17.7833, -63.1821];
  private readonly locationIcon = L.divIcon({
    className: 'workshop-map-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  private workshopId = Number(this.route.snapshot.paramMap.get('id'));
  private currentWorkshop?: Workshop;
  private map?: L.Map;
  private marker?: L.Marker;

  @ViewChild('workshopMap') private workshopMap?: ElementRef<HTMLElement>;

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  loadFailed = signal(false);
  workshopNotFound = signal(false);
  isMapVisible = false;
  selectedLocation: { latitude: number; longitude: number } | null = null;
  selectedQrFile: File | null = null;

  workshopForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    address: ['', [Validators.required]],
    coverageRadius: [3, [Validators.required, Validators.min(3), Validators.max(30)]],
    openingTime: ['', [Validators.required]],
    closingTime: ['', [Validators.required]],
    isActive: [true],
  });

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

  async loadWorkshop(): Promise<void> {
    this.errorMessage.set('');
    this.loadFailed.set(false);
    this.workshopNotFound.set(false);
    this.isLoading.set(true);

    try {
      const response = await this.fetchWorkshop();
      const workshop = this.mapWorkshop(response);
      this.currentWorkshop = workshop;
      this.patchForm(workshop);
    } catch (error) {
      this.workshopNotFound.set(this.workshopNotFound() || this.isNotFoundError(error));
      this.loadFailed.set(!this.workshopNotFound());
      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo cargar el taller seleccionado.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchWorkshop(): Promise<WorkshopResponse> {
    const response = await firstValueFrom(this.workshopService.getMyWorkshops().pipe(timeout(10000)));
    const workshop = this.normalizeWorkshopResponse(response).find(
      (item) => item.id_taller === this.workshopId,
    );

    if (!workshop) {
      this.workshopNotFound.set(true);
      throw new Error('No se encontro el taller seleccionado.');
    }

    return workshop;
  }

  private patchForm(workshop: Workshop): void {
    this.workshopForm.patchValue({
      name: workshop.name,
      description: workshop.description,
      address: workshop.address,
      coverageRadius: workshop.coverageRadius ?? 1,
      openingTime: workshop.openingTime,
      closingTime: workshop.closingTime,
      isActive: workshop.activeState === 'Activo',
    });

    if (workshop.latitude !== null && workshop.longitude !== null) {
      this.selectedLocation = {
        latitude: this.roundCoordinate(workshop.latitude),
        longitude: this.roundCoordinate(workshop.longitude),
      };
    }
  }

  fieldIsInvalid(fieldName: keyof typeof this.workshopForm.controls): boolean {
    const field = this.workshopForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  showLocationPicker(): void {
    this.isMapVisible = true;
    setTimeout(() => this.initializeMap());
  }

  get currentQrUrl(): string {
    return this.getAssetUrl(this.currentWorkshop?.qr ?? null);
  }

  onQrFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedQrFile = input.files?.[0] ?? null;
  }

  async submitWorkshop(): Promise<void> {
    this.errorMessage.set('');

    if (this.workshopNotFound()) {
      return;
    }

    if (this.workshopForm.invalid) {
      this.workshopForm.markAllAsTouched();
      return;
    }

    const formValue = this.workshopForm.getRawValue();

    if (formValue.openingTime >= formValue.closingTime) {
      this.errorMessage.set('La hora de apertura debe ser menor que la hora de cierre.');
      return;
    }

    this.isSaving.set(true);

    const workshop = {
      nombre: formValue.name,
      descripcion: formValue.description,
      radio_cobertura: Number(formValue.coverageRadius),
      calificacion: this.currentWorkshop?.rating ?? 0,
      direccion: formValue.address,
      longitud: this.selectedLocation?.longitude ?? this.currentWorkshop?.longitude ?? null,
      latitud: this.selectedLocation?.latitude ?? this.currentWorkshop?.latitude ?? null,
      horario_inicio: this.toBackendTime(formValue.openingTime),
      horario_fin: this.toBackendTime(formValue.closingTime),
      estado: this.currentWorkshop?.backendState,
      activo: formValue.isActive,
      qr: this.selectedQrFile,
    };

    try {
      await firstValueFrom(this.workshopService.updateWorkshop(this.workshopId, workshop).pipe(timeout(10000)));
      await this.router.navigateByUrl('/admin/my-workshops');
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo actualizar el taller.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private mapWorkshop(workshop: WorkshopResponse): Workshop {
    return {
      id: workshop.id_taller ?? this.workshopId,
      name: workshop.nombre,
      description: workshop.descripcion,
      address: workshop.direccion,
      coverageRadius: workshop.radio_cobertura,
      rating: workshop.calificacion,
      longitude: workshop.longitud,
      latitude: workshop.latitud,
      openingTime: this.toDisplayTime(workshop.horario_inicio),
      closingTime: this.toDisplayTime(workshop.horario_fin),
      backendState: workshop.estado,
      activeState: workshop.activo === false ? 'Inactivo' : 'Activo',
      qr: workshop.qr ?? null,
    };
  }

  private getAssetUrl(path: string | null): string {
    if (!path) {
      return '';
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.workshopService.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private toBackendTime(time: string): string {
    if (time.length === 5) {
      return `${time}:00`;
    }

    return time;
  }

  private toDisplayTime(time: string): string {
    return time?.length >= 5 ? time.slice(0, 5) : time;
  }

  private initializeMap(): void {
    const mapElement = this.workshopMap?.nativeElement;

    if (!mapElement) {
      return;
    }

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    const center: L.LatLngExpression = this.selectedLocation
      ? [this.selectedLocation.latitude, this.selectedLocation.longitude]
      : this.defaultMapCenter;

    this.map = L.map(mapElement, {
      center,
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.ngZone.run(() => this.setSelectedLocation(event.latlng.lat, event.latlng.lng));
    });

    if (this.selectedLocation) {
      this.setSelectedLocation(this.selectedLocation.latitude, this.selectedLocation.longitude);
    }

    setTimeout(() => this.map?.invalidateSize());
  }

  private setSelectedLocation(latitude: number, longitude: number): void {
    const roundedLatitude = this.roundCoordinate(latitude);
    const roundedLongitude = this.roundCoordinate(longitude);
    const markerPosition: L.LatLngExpression = [roundedLatitude, roundedLongitude];

    this.selectedLocation = {
      latitude: roundedLatitude,
      longitude: roundedLongitude,
    };

    if (this.marker) {
      this.marker.setLatLng(markerPosition);
      return;
    }

    if (this.map) {
      this.marker = L.marker(markerPosition, { icon: this.locationIcon }).addTo(this.map);
    }
  }

  private roundCoordinate(coordinate: number): number {
    return Number(coordinate.toFixed(6));
  }

  private normalizeWorkshopResponse(response: WorkshopResponse[] | { value?: WorkshopResponse[] }): WorkshopResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? fallbackMessage;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en responder.';
    }

    return fallbackMessage;
  }
}
