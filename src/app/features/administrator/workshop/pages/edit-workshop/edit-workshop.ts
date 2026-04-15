import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
}

@Component({
  selector: 'app-edit-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-workshop.html',
  styleUrl: './edit-workshop.css',
})
export class EditWorkshopComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workshopService = inject(WorkshopService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private workshopId = Number(this.route.snapshot.paramMap.get('id'));
  private currentWorkshop?: Workshop;

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  loadFailed = signal(false);
  workshopNotFound = signal(false);

  workshopForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    address: ['', [Validators.required]],
    coverageRadius: [1, [Validators.required, Validators.min(1)]],
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
      (item) => (item.id_taller ?? item.id) === this.workshopId,
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
  }

  fieldIsInvalid(fieldName: keyof typeof this.workshopForm.controls): boolean {
    const field = this.workshopForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
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
      longitud: this.currentWorkshop?.longitude ?? null,
      latitud: this.currentWorkshop?.latitude ?? null,
      horario_inicio: this.toBackendTime(formValue.openingTime),
      horario_fin: this.toBackendTime(formValue.closingTime),
      estado: this.currentWorkshop?.backendState,
      activo: formValue.isActive,
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
      id: workshop.id_taller ?? workshop.id ?? this.workshopId,
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
    };
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
