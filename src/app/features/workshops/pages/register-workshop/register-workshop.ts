import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface StoredWorkshop {
  id: number;
  name: string;
  description: string;
  address: string;
  coverageRadius: number;
  openingTime: string;
  closingTime: string;
  status: 'Activo' | 'Inactivo';
}

@Component({
  selector: 'app-register-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-workshop.html',
  styleUrl: './register-workshop.css',
})
export class RegisterWorkshopComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly storageKey = 'ami_workshops';

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

  submitWorkshop(): void {
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

    const workshops = this.getStoredWorkshops();
    const workshop: StoredWorkshop = {
      id: Date.now(),
      name: formValue.name,
      description: formValue.description,
      address: formValue.address,
      coverageRadius: formValue.coverageRadius,
      openingTime: formValue.openingTime,
      closingTime: formValue.closingTime,
      status: 'Activo',
    };

    localStorage.setItem(this.storageKey, JSON.stringify([...workshops, workshop]));
    this.router.navigateByUrl('/my-workshops');
  }

  private getStoredWorkshops(): StoredWorkshop[] {
    const storedWorkshops = localStorage.getItem(this.storageKey);

    if (!storedWorkshops) {
      return [];
    }

    try {
      return JSON.parse(storedWorkshops) as StoredWorkshop[];
    } catch {
      return [];
    }
  }
}
