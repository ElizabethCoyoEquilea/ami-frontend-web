import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthMeResponse, AuthService } from '../../../../../core/services/auth.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

interface KpiCard {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'orange' | 'red';
}

interface OperationSummary {
  label: string;
  value: number;
  status: string;
}

interface MonthlyService {
  month: string;
  total: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [NavbarComponent, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);

  userName = signal('Usuario');
  greeting = signal('Bienvenido');

  readonly kpis: KpiCard[] = [
    { label: 'Proveedores disponibles', value: '18', detail: '4 disponibles ahora', tone: 'blue' },
    { label: 'Ingresos de hoy', value: '24.850 Bs', detail: '+18% vs. mes anterior', tone: 'green' },
    { label: 'Servicios finalizados hoy', value: '126', detail: '32 esta semana', tone: 'orange' },
    { label: 'Calificacion promedio', value: '4.8/5', detail: 'Basado en 91 resenas', tone: 'red' },
  ];

  readonly operationSummaries: OperationSummary[] = [
    { label: 'Solicitudes', value: 14, status: 'Pendientes a cotizar' },
    { label: 'Asignaciones', value: 9, status: 'Pendientes a designar' },
    { label: 'Servicios', value: 21, status: 'En curso' },
  ];

  readonly monthlyServices: MonthlyService[] = [
    { month: 'Ene', total: 38 },
    { month: 'Feb', total: 46 },
    { month: 'Mar', total: 52 },
    { month: 'Abr', total: 61 },
    { month: 'May', total: 58 },
    { month: 'Jun', total: 74 },
    { month: 'Jul', total: 69 },
    { month: 'Ago', total: 83 },
  ];

  ngOnInit(): void {
    void this.loadCurrentUser();
  }

  getMaxServices(): number {
    return Math.max(...this.monthlyServices.map((service) => service.total));
  }

  getBarHeight(total: number): string {
    return `${Math.max(12, (total / this.getMaxServices()) * 100)}%`;
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.getCurrentUser().pipe(timeout(10000)));
      this.applyCurrentUser(user);
    } catch {
      this.userName.set('Usuario');
      this.greeting.set('Bienvenido');
    }
  }

  private applyCurrentUser(user: AuthMeResponse): void {
    const name = user.persona?.nombre_completo?.trim() || user.email;
    const gender = user.persona?.genero?.trim().toUpperCase();

    this.userName.set(name);
    this.greeting.set(gender === 'F' ? 'Bienvenida' : 'Bienvenido');
  }
}
