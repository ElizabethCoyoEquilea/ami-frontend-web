import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-reports',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {}
