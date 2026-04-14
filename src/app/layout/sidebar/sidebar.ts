import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  readonly items: SidebarItem[] = [
    { label: 'Panel', route: '/admin/dashboard' },
    { label: 'Personal', route: '/admin/staff' },
    { label: 'Servicios', route: '/admin/services' },
    { label: 'Operaciones', route: '/admin/operations' },
    { label: 'Reportes', route: '/admin/reports' },
  ];
}
