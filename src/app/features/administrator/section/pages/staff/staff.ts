import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { WorkshopProvider, WorkshopService } from '../../../../../core/services/workshop.service';
import { CatalogServiceService, CatalogServiceSpecialty } from '../../../../../core/services/catalog-service.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

type StaffTab = 'invite' | 'list';
type ProviderStatus = 'Ocupado' | 'Disponible';

interface ServiceProvider {
  id: number;
  name: string;
  specialty: string;
  specialtyIds: number[];
  status: ProviderStatus;
}

@Component({
  selector: 'app-staff',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './staff.html',
  styleUrl: './staff.css',
})
export class StaffComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workshopService = inject(WorkshopService);
  private readonly catalogService = inject(CatalogServiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  activeTab = signal<StaffTab>('invite');
  invitationMessage = signal('');
  providerEditMessage = signal('');
  isSendingInvitation = signal(false);
  isLoadingProviders = signal(false);
  isLoadingSpecialties = signal(false);
  isSavingProvider = signal(false);
  providersErrorMessage = signal('');
  editingProvider = signal<ServiceProvider | null>(null);
  selectedSpecialtyIds = signal<Set<number>>(new Set());
  specialties = signal<CatalogServiceSpecialty[]>([]);

  invitationForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  serviceProviders = signal<ServiceProvider[]>([]);

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

  setActiveTab(tab: StaffTab): void {
    this.activeTab.set(tab);
    this.providerEditMessage.set('');

    if (tab === 'list') {
      void this.loadServiceProviders();
    } else {
      this.cancelProviderEdit();
    }
  }

  emailIsInvalid(): boolean {
    const email = this.invitationForm.controls.email;
    return email.invalid && (email.dirty || email.touched);
  }

  async sendInvitation(): Promise<void> {
    this.invitationMessage.set('');

    if (this.invitationForm.invalid) {
      this.invitationForm.markAllAsTouched();
      return;
    }

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.invitationMessage.set('No se encontro el taller seleccionado.');
      return;
    }

    const { email } = this.invitationForm.getRawValue();
    this.isSendingInvitation.set(true);

    try {
      const response = await firstValueFrom(
        this.workshopService
          .sendWorkshopInvitation({ email, id_taller: this.workshopId })
          .pipe(timeout(10000)),
      );

      this.invitationMessage.set(response.message || 'Invitacion enviada correctamente.');
    } catch (error) {
      this.invitationMessage.set(this.getErrorMessage(error));
    } finally {
      this.isSendingInvitation.set(false);
      this.invitationForm.controls.email.reset('');
      this.invitationForm.controls.email.markAsPristine();
      this.invitationForm.controls.email.markAsUntouched();
    }
  }

  async editProvider(provider: ServiceProvider): Promise<void> {
    this.providerEditMessage.set('');
    this.providersErrorMessage.set('');
    this.editingProvider.set(provider);
    this.selectedSpecialtyIds.set(new Set(provider.specialtyIds));

    if (this.specialties().length === 0) {
      await this.loadSpecialties();
    }
  }

  cancelProviderEdit(): void {
    this.editingProvider.set(null);
    this.selectedSpecialtyIds.set(new Set());
  }

  specialtyIsSelected(specialtyId: number): boolean {
    return this.selectedSpecialtyIds().has(specialtyId);
  }

  toggleSpecialty(specialtyId: number, isChecked: boolean): void {
    this.selectedSpecialtyIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isChecked) {
        nextIds.add(specialtyId);
      } else {
        nextIds.delete(specialtyId);
      }

      return nextIds;
    });
  }

  async saveProviderSpecialties(): Promise<void> {
    this.providerEditMessage.set('');
    this.providersErrorMessage.set('');

    const provider = this.editingProvider();
    const specialtyIds = [...this.selectedSpecialtyIds()];

    if (!provider) {
      this.providersErrorMessage.set('Selecciona un proveedor para editar.');
      return;
    }

    if (specialtyIds.length === 0) {
      this.providersErrorMessage.set('Selecciona al menos una especialidad.');
      return;
    }

    this.isSavingProvider.set(true);

    try {
      await firstValueFrom(
        this.workshopService
          .updateWorkshopProviderService(this.workshopId, {
            id_proveedor_servicio: provider.id,
            ids_especialidades: specialtyIds,
          })
          .pipe(timeout(10000)),
      );

      this.providerEditMessage.set('Proveedor actualizado correctamente.');
      this.cancelProviderEdit();
      await this.loadServiceProviders();
    } catch (error) {
      this.providersErrorMessage.set(this.getProvidersErrorMessage(error));
    } finally {
      this.isSavingProvider.set(false);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string') {
        return error.error;
      }

      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        const backendMessage = error.error.message;

        if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
          return backendMessage;
        }
      }
    }

    return 'No se pudo enviar la invitacion. Intentalo nuevamente.';
  }

  private async loadServiceProviders(): Promise<void> {
    this.providersErrorMessage.set('');

    if (!Number.isInteger(this.workshopId) || this.workshopId <= 0) {
      this.providersErrorMessage.set('No se encontro el taller seleccionado.');
      this.serviceProviders.set([]);
      return;
    }

    this.isLoadingProviders.set(true);

    try {
      const response = await firstValueFrom(
        this.workshopService.getWorkshopProviders(this.workshopId).pipe(timeout(10000)),
      );

      this.serviceProviders.set(response.proveedores.map((provider) => this.mapProvider(provider)));
    } catch (error) {
      this.serviceProviders.set([]);
      this.providersErrorMessage.set(this.getProvidersErrorMessage(error));
    } finally {
      this.isLoadingProviders.set(false);
    }
  }

  private async loadSpecialties(): Promise<void> {
    this.isLoadingSpecialties.set(true);

    try {
      const specialties = await firstValueFrom(this.catalogService.getSpecialties().pipe(timeout(10000)));
      this.specialties.set(specialties);
    } catch (error) {
      this.specialties.set([]);
      this.providersErrorMessage.set(this.getProvidersErrorMessage(error));
    } finally {
      this.isLoadingSpecialties.set(false);
    }
  }

  private mapProvider(provider: WorkshopProvider): ServiceProvider {
    const normalizedStatus = provider.estado?.trim().toLowerCase();
    const status: ProviderStatus = normalizedStatus === 'ocupado' ? 'Ocupado' : 'Disponible';

    return {
      id: provider.id_proveedor,
      name: provider.usuario.persona?.nombre_completo?.trim() || provider.usuario.email,
      specialty: this.getProviderSpecialtyLabel(provider),
      specialtyIds: this.getProviderSpecialtyIds(provider),
      status,
    };
  }

  private getProviderSpecialtyIds(provider: WorkshopProvider): number[] {
    if (Array.isArray(provider.proveedor_especialidades)) {
      return provider.proveedor_especialidades
        .filter((providerSpecialty) => providerSpecialty.activo)
        .map((providerSpecialty) => providerSpecialty.id_especialidad)
        .filter((id) => Number.isInteger(id) && id > 0);
    }

    if (Array.isArray(provider.ids_especialidades)) {
      return provider.ids_especialidades.filter((id) => Number.isInteger(id) && id > 0);
    }

    if (Array.isArray(provider.especialidades)) {
      return provider.especialidades
        .map((specialty) => specialty.id_especialidad)
        .filter((id) => Number.isInteger(id) && id > 0);
    }

    if (Number.isInteger(provider.id_especialidad) && Number(provider.id_especialidad) > 0) {
      return [Number(provider.id_especialidad)];
    }

    return [];
  }

  private getProviderSpecialtyLabel(provider: WorkshopProvider): string {
    if (Array.isArray(provider.proveedor_especialidades)) {
      const specialtyNames = provider.proveedor_especialidades
        .filter((providerSpecialty) => providerSpecialty.activo)
        .map((providerSpecialty) => providerSpecialty.especialidad?.nombre?.trim())
        .filter((specialtyName): specialtyName is string => Boolean(specialtyName));

      return specialtyNames.length > 0 ? specialtyNames.join(', ') : 'Sin especialidad';
    }

    if (Array.isArray(provider.especialidades)) {
      const specialtyNames = provider.especialidades
        .map((specialty) => specialty.nombre?.trim())
        .filter((specialtyName): specialtyName is string => Boolean(specialtyName));

      return specialtyNames.length > 0 ? specialtyNames.join(', ') : 'Sin especialidad';
    }

    return provider.especialidad?.trim() || 'Sin especialidad';
  }

  private getProvidersErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string') {
        return error.error;
      }

      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        const backendMessage = error.error.message;

        if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
          return backendMessage;
        }
      }
    }

    return 'No se pudo cargar la lista de proveedores.';
  }
}
