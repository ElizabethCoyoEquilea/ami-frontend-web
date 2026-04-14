import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkshopService } from '../../../../../core/services/workshop.service';

@Component({
  selector: 'app-register-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-workshop.html',
  styleUrl: './register-workshop.css',
})
export class RegisterWorkshopComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workshopService = inject(WorkshopService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';

  workshopForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    address: ['', [Validators.required]],
    coverageRadius: [1, [Validators.required, Validators.min(1)]],
    openingTime: ['', [Validators.required]],
    closingTime: ['', [Validators.required]],
  });

  fieldIsInvalid(fieldName: keyof typeof this.workshopForm.controls): boolean {
    const field = this.workshopForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  async submitWorkshop(): Promise<void> {
    this.errorMessage = '';

    if (this.workshopForm.invalid) {
      this.workshopForm.markAllAsTouched();
      return;
    }

    const formValue = this.workshopForm.getRawValue();

    if (formValue.openingTime >= formValue.closingTime) {
      this.errorMessage = 'La hora de apertura debe ser menor que la hora de cierre.';
      return;
    }

    this.isLoading = true;

    const workshop = {
      nombre: formValue.name,
      descripcion: formValue.description,
      radio_cobertura: Number(formValue.coverageRadius),
      calificacion: 0,
      direccion: formValue.address,
      longitud: null,
      latitud: null,
      horario_inicio: this.toBackendTime(formValue.openingTime),
      horario_fin: this.toBackendTime(formValue.closingTime),
    };

    try {
      await firstValueFrom(this.workshopService.createWorkshop(workshop));
      await this.router.navigateByUrl('/admin/my-workshops');
    } catch {
      this.errorMessage = 'No se pudo registrar el taller. Intentalo nuevamente.';
    } finally {
      this.isLoading = false;
    }
  }

  private toBackendTime(time: string): string {
    if (time.length === 5) {
      return `${time}:00`;
    }

    return time;
  }
}
