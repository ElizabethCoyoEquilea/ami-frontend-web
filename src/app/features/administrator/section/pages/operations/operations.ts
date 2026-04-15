import { Component } from '@angular/core';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-operations',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class OperationsComponent {}
