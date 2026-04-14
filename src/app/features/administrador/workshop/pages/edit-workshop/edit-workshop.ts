import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Workshop {
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
  selector: 'app-edit-workshop',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-workshop.html',
  styleUrl: './edit-workshop.css',
})
export class EditWorkshopComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly storageKey = 'ami_workshops';

  private workshopId = Number(this.route.snapshot.paramMap.get('id'));

  isLoading = false;
  errorMessage = '';
  workshopNotFound = false;

  workshopForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    address: ['', [Validators.required]],
    coverageRadius: [1, [Validators.required, Validators.min(1)]],
    openingTime: ['', [Validators.required]],
    closingTime: ['', [Validators.required]],
    isActive: [true],
  });

  constructor() {
    const workshop = this.findWorkshop();

    if (!workshop || Number.isNaN(this.workshopId)) {
      this.workshopNotFound = true;
      return;
    }

    this.workshopForm.patchValue({
      name: workshop.name,
      description: workshop.description,
      address: workshop.address,
      coverageRadius: workshop.coverageRadius ?? 1,
      openingTime: workshop.openingTime,
      closingTime: workshop.closingTime,
      isActive: workshop.status === 'Activo',
    });
  }

  fieldIsInvalid(fieldName: keyof typeof this.workshopForm.controls): boolean {
    const field = this.workshopForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  submitWorkshop(): void {
    this.errorMessage = '';

    if (this.workshopNotFound) {
      return;
    }

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

    const currentWorkshop = this.findWorkshop();
    const updatedWorkshop: Workshop = {
      id: this.workshopId,
      name: formValue.name,
      description: formValue.description,
      address: formValue.address,
      coverageRadius: formValue.coverageRadius,
      openingTime: formValue.openingTime,
      closingTime: formValue.closingTime,
      status: formValue.isActive ? 'Activo' : 'Inactivo',
    };

    const storedWorkshops = this.getStoredWorkshops();
    const workshopExistsInStorage = storedWorkshops.some((workshop) => workshop.id === this.workshopId);
    const nextWorkshops = workshopExistsInStorage
      ? storedWorkshops.map((workshop) => (workshop.id === this.workshopId ? updatedWorkshop : workshop))
      : [...storedWorkshops, updatedWorkshop];

    localStorage.setItem(this.storageKey, JSON.stringify(nextWorkshops));
    this.router.navigateByUrl('/my-workshops');
  }

  private findWorkshop(): Workshop | undefined {
    return this.getAllWorkshops().find((workshop) => workshop.id === this.workshopId);
  }

  private getAllWorkshops(): Workshop[] {
    const workshopsById = new Map<number, Workshop>();

    this.getStoredWorkshops().forEach((workshop) => workshopsById.set(workshop.id, workshop));

    return [...workshopsById.values()];
  }

  private getStoredWorkshops(): Workshop[] {
    const storedWorkshops = localStorage.getItem(this.storageKey);

    if (!storedWorkshops) {
      return [];
    }

    try {
      return JSON.parse(storedWorkshops) as Workshop[];
    } catch {
      return [];
    }
  }
}
