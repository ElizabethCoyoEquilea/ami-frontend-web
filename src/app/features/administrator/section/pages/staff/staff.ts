import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-staff',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './staff.html',
  styleUrl: './staff.css',
})
export class StaffComponent {}
