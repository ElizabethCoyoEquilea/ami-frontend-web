import { Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';
import { WorkshopService } from '../../../../../core/services/workshop.service';

@Component({
  selector: 'app-register-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-workshop.html',
  styleUrl: './register-workshop.css',
})
export class RegisterWorkshopComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workshopService = inject(WorkshopService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly defaultMapCenter: L.LatLngExpression = [-17.7833, -63.1821];
  private readonly locationIcon = L.divIcon({
    className: 'workshop-map-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  @ViewChild('workshopMap') private workshopMap?: ElementRef<HTMLElement>;

  private map?: L.Map;
  private marker?: L.Marker;

  isLoading = false;
  isMapVisible = false;
  errorMessage = '';
  successMessage = '';
  selectedLocation: { latitude: number; longitude: number } | null = null;

  workshopForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    address: ['', [Validators.required]],
    coverageRadius: [1, [Validators.required, Validators.min(1)]],
    openingTime: ['', [Validators.required]],
    closingTime: ['', [Validators.required]],
  });

  fieldIsInvalid(fieldName: keyof typeof this.workshopForm.controls): boolean {
    const field = this.workshopForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  showLocationPicker(): void {
    this.isMapVisible = true;
    setTimeout(() => this.initializeMap());
  }

  async submitWorkshop(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.workshopForm.invalid) {
      this.workshopForm.markAllAsTouched();
      return;
    }

    const formValue = this.workshopForm.getRawValue();

    if (formValue.openingTime >= formValue.closingTime) {
      this.errorMessage = 'La hora de apertura debe ser menor que la hora de cierre.';
      return;
    }

    if (!this.selectedLocation) {
      this.errorMessage = 'Selecciona la ubicacion del negocio en el mapa.';
      this.showLocationPicker();
      return;
    }

    this.isLoading = true;

    const workshop = {
      nombre: formValue.name,
      descripcion: formValue.description,
      radio_cobertura: Number(formValue.coverageRadius),
      calificacion: 0,
      direccion: formValue.address,
      longitud: this.selectedLocation.longitude,
      latitud: this.selectedLocation.latitude,
      horario_inicio: this.toBackendTime(formValue.openingTime),
      horario_fin: this.toBackendTime(formValue.closingTime),
    };

    try {
      await firstValueFrom(this.workshopService.createWorkshop(workshop));
      this.successMessage = 'Taller registrado correctamente. Volviendo a Mis talleres...';
      await new Promise((resolve) => setTimeout(resolve, 900));
      await this.router.navigate(['/admin/my-workshops'], { queryParams: { created: 'true' } });
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isLoading = false;
    }
  }

  private toBackendTime(time: string): string {
    if (time.length === 5) {
      return `${time}:00`;
    }

    return time;
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

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? 'No se pudo registrar el taller.';
    }

    return 'No se pudo registrar el taller. Intentalo nuevamente.';
  }
}
