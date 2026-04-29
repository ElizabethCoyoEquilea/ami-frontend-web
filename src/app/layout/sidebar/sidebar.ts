import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarItem {
  label: string;
  section: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly items: SidebarItem[] = [
    { label: 'Panel', section: 'dashboard' },
    { label: 'Personal', section: 'staff' },
    { label: 'Servicios', section: 'services' },
    { label: 'Operaciones', section: 'operations' },
    { label: 'Reportes', section: 'reports' },
    { label: 'Mi Perfil', section: 'profile' },
  ];

  getRoute(section: string): string[] {
    const workshopId = this.getWorkshopId();

    if (!workshopId) {
      return ['/admin/my-workshops'];
    }

    return ['/admin/workshop', workshopId, section];
  }

  private getWorkshopId(): string | null {
    const urlWorkshopId = this.router.url.match(/\/admin\/workshop\/([^/?#]+)/)?.[1];

    if (urlWorkshopId) {
      return urlWorkshopId;
    }

    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const workshopId = currentRoute.snapshot.paramMap.get('id');

      if (workshopId) {
        return workshopId;
      }

      currentRoute = currentRoute.parent;
    }

    return null;
  }
}
