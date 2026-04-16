import { Component, signal } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

type OperationsTab = 'requests' | 'assignments' | 'services';

interface ServiceRequest {
  id: number;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  observaciones: string;
  estado: 'Pendiente' | 'Aceptada';
  fecha: string;
  direccion: string;
}

interface Assignment {
  id: number;
  fecha: string;
  estado: 'Pendiente de cotizacion' | 'Cotizada' | 'Personal asignado';
  cotizacion: {
    monto: number;
    descripcion: string;
  };
}

interface CompletedService {
  id: number;
  montoTotal: number;
  calificacion: number;
}

@Component({
  selector: 'app-operations',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class OperationsComponent {
  activeTab = signal<OperationsTab>('requests');

  requests = signal<ServiceRequest[]>([
    {
      id: 1,
      descripcion: 'El vehiculo no enciende despues de varios intentos.',
      prioridad: 'Alta',
      observaciones: 'El cliente indica que la bateria fue cambiada hace dos meses.',
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
      estado: 'Pendiente de cotizacion',
      cotizacion: {
        monto: 0,
        descripcion: 'Cotizacion pendiente de envio.',
      },
    },
    {
      id: 2,
      fecha: '2026-04-14',
      estado: 'Cotizada',
      cotizacion: {
        monto: 350,
        descripcion: 'Revision electrica, scanner y cambio de sensor.',
      },
    },
  ]);

  completedServices: CompletedService[] = [
    { id: 1, montoTotal: 280, calificacion: 4.8 },
    { id: 2, montoTotal: 150, calificacion: 4.5 },
    { id: 3, montoTotal: 520, calificacion: 5 },
  ];

  setActiveTab(tab: OperationsTab): void {
    this.activeTab.set(tab);
  }

  acceptRequest(requestId: number): void {
    this.requests.update((requests) =>
      requests.map((request) => (request.id === requestId ? { ...request, estado: 'Aceptada' } : request)),
    );
  }

  sendQuote(assignmentId: number): void {
    this.assignments.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              estado: 'Cotizada',
              cotizacion: {
                monto: assignment.cotizacion.monto || 250,
                descripcion:
                  assignment.cotizacion.monto > 0
                    ? assignment.cotizacion.descripcion
                    : 'Diagnostico, mano de obra y repuestos estimados.',
              },
            }
          : assignment,
      ),
    );
  }

  assignStaff(assignmentId: number): void {
    this.assignments.update((assignments) =>
      assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, estado: 'Personal asignado' } : assignment,
      ),
    );
  }
}
