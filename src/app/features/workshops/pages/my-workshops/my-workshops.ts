import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar';

interface Workshop {
  id: number;
  name: string;
  description?: string;
  address: string;
  openingTime?: string;
  closingTime?: string;
  status: 'Activo' | 'Inactivo';
}

@Component({
  selector: 'app-my-workshops',
  imports: [NavbarComponent, RouterLink],
  templateUrl: './my-workshops.html',
  styleUrl: './my-workshops.css',
})
export class MyWorkshopsComponent {
  workshops: Workshop[] = [];

  getSchedule(workshop: Workshop): string {
    if (!workshop.openingTime || !workshop.closingTime) {
      return '';
    }

    return `${workshop.openingTime} - ${workshop.closingTime}`;
  }
}
