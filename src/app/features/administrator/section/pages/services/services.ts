import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import {
  CatalogServiceCreateRequest,
  CatalogServiceResponse,
  CatalogServiceService,
  CatalogServiceSpecialty,
  CatalogServiceUpdateRequest,
} from '../../../../../core/services/catalog-service.service';
import { WorkshopResponse, WorkshopService } from '../../../../../core/services/workshop.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';
type ServicesTab = 'register' | 'catalog' | 'edit';

interface WorkshopServiceItem {
  id: number;
  id_taller: number;
  id_especialidad?: number;
  nombre: string;
  descripcion: string | null;
  categoria?: string;
  precio_estandar: number;
  unidad_medida?: string;
  estado: string;
  especialidad?: CatalogServiceSpecialty;
}

@Component({
  selector: 'app-services',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class ServicesComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalogService = inject(CatalogServiceService);
  private readonly workshopService = inject(WorkshopService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  activeTab = signal<ServicesTab>('register');
  registerMessage = signal('');
  editMessage = signal('');
  errorMessage = signal('');
  catalogMessage = signal('');
  isAuthorizing = signal(true);
  isLoading = signal(false);
  isSaving = signal(false);
  editingServiceId = signal<number | null>(null);
  services = signal<WorkshopServiceItem[]>([]);
  specialties = signal<CatalogServiceSpecialty[]>([]);

  registerForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    id_especialidad: [0, [Validators.min(1)]],
    precio_estandar: [0, [Validators.required, Validators.min(0.01)]],
  });

  editForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    id_especialidad: [0, [Validators.min(1)]],
    precio_estandar: [0, [Validators.required, Validators.min(0.01)]],
    isActive: [true],
  });

  ngOnInit(): void {
    void this.initializeServicesView();
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

  private async initializeServicesView(): Promise<void> {
    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      await this.rejectAccess('No se encontro el taller seleccionado.');
      return;
    }

    try {
      const userWorkshopsResponse = await firstValueFrom(this.workshopService.getMyWorkshops().pipe(timeout(10000)));
      const userWorkshops = this.normalizeWorkshopResponse(userWorkshopsResponse);
      const userOwnsWorkshop = userWorkshops.some((workshop) => workshop.id_taller === this.workshopId);

      if (!userOwnsWorkshop) {
        await this.rejectAccess('No tienes acceso a los servicios de este taller.');
        return;
      }

      this.isAuthorizing.set(false);
      await this.loadServices();
      await this.loadSpecialties();
    } catch (error) {
      if (this.isForbiddenOrNotFound(error)) {
        await this.rejectAccess('No tienes acceso a los servicios de este taller.');
        return;
      }

      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo validar el acceso al taller.'));
      this.isAuthorizing.set(false);
    }
  }

  setActiveTab(tab: ServicesTab): void {
    this.activeTab.set(tab);
    this.registerMessage.set('');
    this.editMessage.set('');
    this.catalogMessage.set('');

    if (tab !== 'edit') {
      this.resetEditForm();
    }
  }

  registerFieldIsInvalid(fieldName: keyof typeof this.registerForm.controls): boolean {
    const field = this.registerForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  editFieldIsInvalid(fieldName: keyof typeof this.editForm.controls): boolean {
    const field = this.editForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  async registerService(): Promise<void> {
    this.registerMessage.set('');
    this.errorMessage.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const payload = this.buildCreatePayload();
      const createdService = await firstValueFrom(this.catalogService.createService(payload).pipe(timeout(10000)));
      this.services.update((services) => [...services, this.mapService(createdService)]);

      this.resetRegisterForm();
      await this.loadServices(false);
      this.registerMessage.set('Servicio registrado correctamente.');
      this.activeTab.set('catalog');
    } catch (error) {
      if (this.isForbiddenOrNotFound(error)) {
        await this.rejectAccess('No tienes acceso para guardar servicios en este taller.');
        return;
      }

      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo guardar el servicio.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  async updateService(): Promise<void> {
    this.editMessage.set('');
    this.errorMessage.set('');

    const editingId = this.editingServiceId();

    if (!editingId) {
      this.errorMessage.set('Selecciona un servicio para editar.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      const updatedService = await firstValueFrom(
        this.catalogService.updateService(editingId, this.buildUpdatePayload()).pipe(timeout(10000)),
      );

      this.services.update((services) =>
        services.map((service) => (service.id === editingId ? this.mapService(updatedService, editingId) : service)),
      );

      this.resetEditForm();
      await this.loadServices(false);
      this.catalogMessage.set('Servicio actualizado correctamente.');
      this.activeTab.set('catalog');
    } catch (error) {
      if (this.isForbiddenOrNotFound(error)) {
        await this.rejectAccess('No tienes acceso para guardar servicios en este taller.');
        return;
      }

      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo actualizar el servicio.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  editService(service: WorkshopServiceItem): void {
    this.editingServiceId.set(service.id);
    this.registerMessage.set('');
    this.editMessage.set('');
    this.errorMessage.set('');
    this.editForm.reset({
      nombre: service.nombre,
      descripcion: service.descripcion ?? '',
      id_especialidad: service.id_especialidad ?? service.especialidad?.id_especialidad ?? 0,
      precio_estandar: service.precio_estandar,
      isActive: !this.serviceIsInactive(service),
    });
    this.activeTab.set('edit');
  }

  cancelEdit(): void {
    this.resetEditForm();
    this.editMessage.set('');
    this.activeTab.set('catalog');
  }

  serviceIsInactive(service: WorkshopServiceItem): boolean {
    return service.estado.toLowerCase() !== 'activo';
  }

  private async loadServices(showLoading = true): Promise<void> {
    this.errorMessage.set('');

    if (showLoading) {
      this.isLoading.set(true);
    }

    try {
      const response = await firstValueFrom(this.catalogService.getServicesByWorkshop(this.workshopId).pipe(timeout(10000)));
      const services = this.normalizeServicesResponse(response);
      this.services.set(services.map((service) => this.mapService(service)));
    } catch (error) {
      this.services.set([]);

      if (this.isForbiddenOrNotFound(error)) {
        await this.rejectAccess('No tienes acceso a los servicios de este taller.');
        return;
      }

      this.errorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar los servicios del taller.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSpecialties(): Promise<void> {
    try {
      const specialties = await firstValueFrom(this.catalogService.getSpecialties().pipe(timeout(10000)));
      this.specialties.set(specialties);
    } catch {
      this.specialties.set([]);
    }
  }

  private buildCreatePayload(): CatalogServiceCreateRequest {
    const formValue = this.registerForm.getRawValue();
    const descripcion = formValue.descripcion.trim();

    return {
      id_taller: this.workshopId,
      id_especialidad: Number(formValue.id_especialidad),
      nombre: formValue.nombre.trim(),
      descripcion: descripcion ? descripcion : null,
      precio_estandar: Number(formValue.precio_estandar),
    };
  }

  private buildUpdatePayload(): CatalogServiceUpdateRequest {
    const formValue = this.editForm.getRawValue();
    const descripcion = formValue.descripcion.trim();

    return {
      id_taller: this.workshopId,
      id_especialidad: Number(formValue.id_especialidad),
      nombre: formValue.nombre.trim(),
      descripcion: descripcion ? descripcion : null,
      precio_estandar: Number(formValue.precio_estandar),
      estado: formValue.isActive ? 'activo' : 'inactivo',
    };
  }

  private resetRegisterForm(): void {
    this.registerForm.reset({
      nombre: '',
      descripcion: '',
      id_especialidad: 0,
      precio_estandar: 0,
    });
  }

  private resetEditForm(): void {
    this.editingServiceId.set(null);
    this.editForm.reset({
      nombre: '',
      descripcion: '',
      id_especialidad: 0,
      precio_estandar: 0,
      isActive: true,
    });
  }

  private mapService(service: CatalogServiceResponse, fallbackId = 0): WorkshopServiceItem {
    return {
      id: service.id_catalogo_servicio ?? service.id ?? fallbackId,
      id_taller: service.id_taller,
      id_especialidad: service.id_especialidad,
      nombre: service.nombre,
      descripcion: service.descripcion,
      categoria: service.categoria,
      precio_estandar: Number(service.precio_estandar),
      unidad_medida: service.unidad_medida,
      estado: service.estado ?? 'activo',
      especialidad: service.especialidad,
    };
  }

  private normalizeServicesResponse(
    response: CatalogServiceResponse[] | { value?: CatalogServiceResponse[] },
  ): CatalogServiceResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private normalizeWorkshopResponse(response: WorkshopResponse[] | { value?: WorkshopResponse[] }): WorkshopResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private async rejectAccess(message: string): Promise<void> {
    this.services.set([]);
    this.resetRegisterForm();
    this.resetEditForm();
    this.isAuthorizing.set(false);
    this.isLoading.set(false);
    this.isSaving.set(false);
    this.errorMessage.set(message);
    await this.router.navigateByUrl('/admin/my-workshops');
  }

  private isForbiddenOrNotFound(error: unknown): boolean {
    const status = this.getHttpStatus(error);
    return status === 403 || status === 404;
  }

  private getHttpStatus(error: unknown): number | null {
    if (typeof error === 'object' && error && 'status' in error) {
      const status = Number((error as { status?: unknown }).status);
      return Number.isInteger(status) ? status : null;
    }

    return null;
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
