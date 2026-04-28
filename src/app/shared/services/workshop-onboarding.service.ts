import { Injectable, computed, signal } from '@angular/core';

export interface WorkshopOnboardingStep {
  key: 'dashboard' | 'staff' | 'services' | 'operations' | 'reports' | 'profile';
  label: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class WorkshopOnboardingService {
  private readonly stepsList: WorkshopOnboardingStep[] = [
    {
      key: 'dashboard',
      label: 'Panel',
      description: 'En esta pantalla veras diferentes datos para mantenerte al dia con tu taller',
    },
    {
      key: 'staff',
      label: 'Personal',
      description:
        'Aqui podras ver tu lista de trabajadores y podras invitarlos mediante su correo (El trabajdor debe registrarse primero desde la app )',
    },
    {
      key: 'services',
      label: 'Servicios',
      description:
        'Aqui podras listar y registrar los diferentes servicios que ofrece tu taller, tambien desde el listado tendras la opcion de editar un servicio',
    },
    {
      key: 'operations',
      label: 'Operaciones',
      description:
        'En esta pantalla te llegaran las solicitudes que se piden a tu taller, deberas enviar una cotizacion al cliente y una vez aceptado parasar a asignar un trabajador a esa solicitud, en la pestana servicios veras todos los servicios completados y podras ver el detalle y pago de cada servicio',
    },
    {
      key: 'reports',
      label: 'Reportes',
      description:
        'Podras obtener datos importantes sobre los trabajos realizado y las ganancias obtenidas con la opcion de exportarlo en pdf',
    },
    {
      key: 'profile',
      label: 'Mi perfil',
      description: 'Aqui puedes ver tus datos y editarlos o actualizar la contrasena',
    },
  ];

  readonly isOpen = signal(false);
  readonly currentStepIndex = signal(0);
  readonly steps = computed(() => this.stepsList);
  readonly currentStep = computed(() => this.stepsList[this.currentStepIndex()] ?? this.stepsList[0]);
  readonly totalSteps = computed(() => this.stepsList.length);

  start(): void {
    this.currentStepIndex.set(0);
    this.isOpen.set(true);
  }

  next(): void {
    if (this.currentStepIndex() >= this.stepsList.length - 1) {
      this.close();
      return;
    }

    this.currentStepIndex.update((value) => Math.min(value + 1, this.stepsList.length - 1));
  }

  previous(): void {
    this.currentStepIndex.update((value) => Math.max(value - 1, 0));
  }

  goToStep(stepKey: WorkshopOnboardingStep['key']): void {
    const stepIndex = this.stepsList.findIndex((step) => step.key === stepKey);

    if (stepIndex >= 0) {
      this.currentStepIndex.set(stepIndex);
      this.isOpen.set(true);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }
}