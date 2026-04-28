import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { WorkshopProvider, WorkshopService } from '../../../../../core/services/workshop.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

type StaffTab = 'invite' | 'list';
type ProviderStatus = 'Ocupado' | 'Disponible';

interface ServiceProvider {
  id: number;
  name: string;
  specialty: string;
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
  private readonly route = inject(ActivatedRoute);
  private readonly workshopId = this.getWorkshopIdFromRoute();

  activeTab = signal<StaffTab>('invite');
  invitationMessage = signal('');
  isSendingInvitation = signal(false);
  isLoadingProviders = signal(false);
  providersErrorMessage = signal('');

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

    if (tab === 'list') {
      void this.loadServiceProviders();
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

  private mapProvider(provider: WorkshopProvider): ServiceProvider {
    const normalizedStatus = provider.estado?.trim().toLowerCase();
    const status: ProviderStatus = normalizedStatus === 'ocupado' ? 'Ocupado' : 'Disponible';

    return {
      id: provider.id_proveedor,
      name: provider.usuario.persona?.nombre_completo?.trim() || provider.usuario.email,
      specialty: provider.especialidad?.trim() || 'Sin especialidad',
      status,
    };
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
