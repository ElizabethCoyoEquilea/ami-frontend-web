import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-services',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class ServicesComponent {}
