import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-reports',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  operationalFilterForm = this.formBuilder.nonNullable.group({
    startDate: ['2026-04-01'],
    endDate: ['2026-04-29'],
  });

  financialFilterForm = this.formBuilder.nonNullable.group({
    startDate: ['2026-04-01'],
    endDate: ['2026-04-29'],
  });

  goToOperationalReport(): void {
    const { startDate, endDate } = this.operationalFilterForm.getRawValue();

    void this.router.navigate(['../operational'], {
      relativeTo: this.route,
      queryParams: {
        fecha_inicio: startDate,
        fecha_fin: endDate,
      },
    });
  }

  goToFinancialReport(): void {
    const { startDate, endDate } = this.financialFilterForm.getRawValue();

    void this.router.navigate(['../financial'], {
      relativeTo: this.route,
      queryParams: {
        fecha_inicio: startDate,
        fecha_fin: endDate,
      },
    });
  }
}
