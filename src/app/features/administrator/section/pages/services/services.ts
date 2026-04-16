import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

type ServicesTab = 'register' | 'catalog';
type ServiceStatus = 'Activo' | 'Inactivo';

interface WorkshopServiceItem {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio_estandar: number;
  unidad_medida: string;
  estado: ServiceStatus;
}

@Component({
  selector: 'app-services',
  imports: [NavbarComponent, ReactiveFormsModule, SidebarComponent],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class ServicesComponent {
  private readonly formBuilder = inject(FormBuilder);

  activeTab = signal<ServicesTab>('register');
  registerMessage = signal('');
  services = signal<WorkshopServiceItem[]>([
    {
      id: 1,
      nombre: 'Cambio de aceite',
      descripcion: 'Cambio de aceite de motor y revision basica.',
      categoria: 'Mantenimiento',
      precio_estandar: 120,
      unidad_medida: 'Servicio',
      estado: 'Activo',
    },
    {
      id: 2,
      nombre: 'Alineacion',
      descripcion: 'Ajuste de alineacion del vehiculo.',
      categoria: 'Suspension',
      precio_estandar: 90,
      unidad_medida: 'Servicio',
      estado: 'Activo',
    },
  ]);

  serviceForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
    categoria: ['', [Validators.required]],
    precio_estandar: [0, [Validators.required, Validators.min(0.01)]],
    unidad_medida: ['', [Validators.required]],
  });

  setActiveTab(tab: ServicesTab): void {
    this.activeTab.set(tab);
    this.registerMessage.set('');
  }

  fieldIsInvalid(fieldName: keyof typeof this.serviceForm.controls): boolean {
    const field = this.serviceForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  registerService(): void {
    this.registerMessage.set('');

    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const formValue = this.serviceForm.getRawValue();
    const nextId = Math.max(0, ...this.services().map((service) => service.id)) + 1;

    this.services.update((services) => [
      ...services,
      {
        id: nextId,
        nombre: formValue.nombre,
        descripcion: formValue.descripcion,
        categoria: formValue.categoria,
        precio_estandar: Number(formValue.precio_estandar),
        unidad_medida: formValue.unidad_medida,
        estado: 'Activo',
      },
    ]);

    this.serviceForm.reset({
      nombre: '',
      descripcion: '',
      categoria: '',
      precio_estandar: 0,
      unidad_medida: '',
    });
    this.registerMessage.set('Servicio registrado correctamente.');
    this.activeTab.set('catalog');
  }

  deactivateService(serviceId: number): void {
    this.services.update((services) =>
      services.map((service) => (service.id === serviceId ? { ...service, estado: 'Inactivo' } : service)),
    );
  }
}
