import { Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { WorkshopResponse, WorkshopService } from '../../../../../core/services/workshop.service';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

interface Workshop {
  id: number;
  name: string;
  description?: string;
  address: string;
  openingTime?: string;
  closingTime?: string;
  activeState: 'Activo' | 'Inactivo';
  operationState?: 'Abierto' | 'Cerrado';
}

@Component({
  selector: 'app-my-workshops',
  imports: [NavbarComponent, RouterLink],
  templateUrl: './my-workshops.html',
  styleUrl: './my-workshops.css',
})
export class MyWorkshopsComponent implements OnInit {
  private readonly workshopService = inject(WorkshopService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  workshops = signal<Workshop[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('created') === 'true') {
      this.successMessage.set('Taller registrado correctamente.');
      this.location.replaceState('/admin/my-workshops');
    }

    void this.loadWorkshops();
  }

  async loadWorkshops(): Promise<void> {
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(this.workshopService.getMyWorkshops().pipe(timeout(10000)));
      const workshops = this.normalizeWorkshopResponse(response);
      this.workshops.set(workshops.map((workshop) => this.mapWorkshop(workshop)));
    } catch (error) {
      this.workshops.set([]);
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  getSchedule(workshop: Workshop): string {
    if (!workshop.openingTime || !workshop.closingTime) {
      return '';
    }

    return `${workshop.openingTime} - ${workshop.closingTime}`;
  }

  private mapWorkshop(workshop: WorkshopResponse): Workshop {
    return {
      id: workshop.id_taller ?? workshop.id ?? 0,
      name: workshop.nombre,
      description: workshop.descripcion,
      address: workshop.direccion,
      openingTime: this.toDisplayTime(workshop.horario_inicio),
      closingTime: this.toDisplayTime(workshop.horario_fin),
      activeState: workshop.activo === false ? 'Inactivo' : 'Activo',
      operationState: this.mapOperationState(workshop.estado),
    };
  }

  private mapOperationState(state?: string): 'Abierto' | 'Cerrado' | undefined {
    if (!state) {
      return undefined;
    }

    return state.toLowerCase() === 'abierto' ? 'Abierto' : 'Cerrado';
  }

  private normalizeWorkshopResponse(response: WorkshopResponse[] | { value?: WorkshopResponse[] }): WorkshopResponse[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.value ?? [];
  }

  private toDisplayTime(time: string): string {
    return time?.length >= 5 ? time.slice(0, 5) : time;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? 'No se pudieron cargar tus talleres.';
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en responder al cargar los talleres.';
    }

    return 'No se pudieron cargar tus talleres.';
  }
}
