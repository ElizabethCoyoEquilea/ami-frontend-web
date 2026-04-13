import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar';

interface Workshop {
  id: number;
  name: string;
  address: string;
  phone: string;
  status: 'Activo' | 'Inactivo';
  servicesCount: number;
  lastService: string;
}

@Component({
  selector: 'app-my-workshops',
  imports: [NavbarComponent, RouterLink],
  templateUrl: './my-workshops.html',
  styleUrl: './my-workshops.css',
})
export class MyWorkshopsComponent {
  workshops: Workshop[] = [
    {
      id: 1,
      name: 'Taller Central AMI',
      address: 'Av. Santos Dumont #1245',
      phone: '61524977',
      status: 'Activo',
      servicesCount: 18,
      lastService: 'Cambio de aceite',
    },
    {
      id: 2,
      name: 'Servicio Norte',
      address: 'Zona Norte, calle 8',
      phone: '72145890',
      status: 'Inactivo',
      servicesCount: 7,
      lastService: 'Revision de frenos',
    },
  ];

}
