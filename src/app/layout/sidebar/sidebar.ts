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
    { label: 'Panel', route: '/dashboard' },
    { label: 'Personal', route: '/staff' },
    { label: 'Servicios', route: '/services' },
    { label: 'Operaciones', route: '/operations' },
    { label: 'Reportes', route: '/reports' },
  ];
}
