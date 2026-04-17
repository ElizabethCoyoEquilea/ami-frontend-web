import { Component, signal } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';
import { AssignStaffFormComponent, type AvailableStaff } from './assign-staff-form/assign-staff-form';
import { RequestQuoteFormComponent } from './request-quote-form/request-quote-form';

type OperationsTab = 'requests' | 'assignments' | 'services';

interface ServiceRequest {
  id: number;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  observaciones: string;
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada';
  fecha: string;
  direccion: string;
}

interface Assignment {
  id: number;
  fecha: string;
  estado: 'Pendiente de asignar personal' | 'Personal en camino' | 'Personal asignado' | 'Servicio cancelado';
  personalAsignado?: string;
}

interface CompletedService {
  id: number;
  montoTotal: number;
  calificacion: number;
}

@Component({
  selector: 'app-operations',
  imports: [AssignStaffFormComponent, NavbarComponent, RequestQuoteFormComponent, SidebarComponent],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class OperationsComponent {
  activeTab = signal<OperationsTab>('requests');
  selectedQuoteRequest = signal<ServiceRequest | null>(null);
  selectedStaffAssignment = signal<Assignment | null>(null);

  requests = signal<ServiceRequest[]>([
    {
      id: 1,
      descripcion: 'El vehiculo no enciende despues de varios intentos, suena raro cuando lo intento y ahora sale humo.',
      prioridad: 'Alta',
      observaciones: 'El cliente indica que la bateria fue cambiada hace dos meses.El cliente indica que la bateria fue cambiada hace dos meses.El cliente indica que la bateria fue cambiada hace dos meses.',
      estado: 'Pendiente',
      fecha: '2026-04-16',
      direccion: 'Av. Beni, 3er anillo',
    },
    {
      id: 2,
      descripcion: 'Ruido al frenar en la rueda delantera derecha.',
      prioridad: 'Media',
      observaciones: 'Puede trasladar el vehiculo al taller por la tarde.',
      estado: 'Pendiente',
      fecha: '2026-04-16',
      direccion: 'Barrio Hamacas, calle 5',
    },
  ]);

  assignments = signal<Assignment[]>([
    {
      id: 1,
      fecha: '2026-04-15',
      estado: 'Pendiente de asignar personal',
    },
    {
      id: 2,
      fecha: '2026-04-14',
      estado: 'Personal en camino',
    },
  ]);

  readonly availableStaff: AvailableStaff[] = [
    { name: 'Carlos Mendez', specialty: 'Mecanica general' },
    { name: 'Miguel Suarez', specialty: 'Frenos y suspension' },
    { name: 'Carlos Rojas', specialty: 'Mecanica general' },
  ];

  completedServices: CompletedService[] = [
    { id: 1, montoTotal: 280, calificacion: 4.8 },
    { id: 2, montoTotal: 150, calificacion: 4.5 },
    { id: 3, montoTotal: 520, calificacion: 5 },
  ];

  setActiveTab(tab: OperationsTab): void {
    this.activeTab.set(tab);
  }

  visibleRequests(): ServiceRequest[] {
    return this.requests().filter((request) => request.estado === 'Pendiente');
  }

  openQuoteForm(request: ServiceRequest): void {
    this.selectedQuoteRequest.set(request);
  }

  cancelQuote(): void {
    this.selectedQuoteRequest.set(null);
  }

  submitRequestQuote(amount: number): void {
    const request = this.selectedQuoteRequest();

    if (!request) {
      return;
    }

    this.assignments.update((assignments) => [
      ...assignments,
      {
        id: Math.max(0, ...assignments.map((assignment) => assignment.id)) + 1,
        fecha: request.fecha,
        estado: 'Pendiente de asignar personal',
        cotizacion: {
          monto: amount,
          descripcion: `Cotizacion enviada para: ${request.descripcion}`,
        },
      },
    ]);

    this.acceptRequest(request.id);
    this.cancelQuote();
  }

  private acceptRequest(requestId: number): void {
    this.requests.update((requests) =>
      requests.map((request) => (request.id === requestId ? { ...request, estado: 'Aceptada' } : request)),
    );
  }

  rejectRequest(requestId: number): void {
    this.requests.update((requests) =>
      requests.map((request) => (request.id === requestId ? { ...request, estado: 'Rechazada' } : request)),
    );
  }

  openStaffForm(assignment: Assignment): void {
    this.selectedStaffAssignment.set(assignment);
  }

  cancelStaffAssignment(): void {
    this.selectedStaffAssignment.set(null);
  }

  assignStaff(staffName: string): void {
    const assignment = this.selectedStaffAssignment();

    if (!assignment) {
      return;
    }

    this.assignments.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === assignment.id
          ? { ...assignment, estado: 'Personal asignado', personalAsignado: staffName }
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
}
