import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-dashboard',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {}
