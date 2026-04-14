import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Workshop {
  id: number;
  name: string;
  description: string;
  address: string;
  coverageRadius?: number;
  openingTime: string;
  closingTime: string;
  status: 'Activo' | 'Inactivo';
  rating?: number;
}

@Component({
  selector: 'app-workshop-detail',
  imports: [RouterLink],
  templateUrl: './workshop-detail.html',
  styleUrl: './workshop-detail.css',
})
export class WorkshopDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly storageKey = 'ami_workshops';

  private readonly workshopId = Number(this.route.snapshot.paramMap.get('id'));

  workshop = this.findWorkshop();
  workshopNotFound = !this.workshop || Number.isNaN(this.workshopId);

  get displayRating(): number {
    return this.workshop?.rating ?? 0;
  }

  get starIndexes(): number[] {
    return [1, 2, 3, 4, 5];
  }

  get schedule(): string {
    if (!this.workshop) {
      return '';
    }

    return `${this.workshop.openingTime} - ${this.workshop.closingTime}`;
  }

  get coverageRadius(): string {
    if (!this.workshop?.coverageRadius) {
      return 'No registrado';
    }

    return `${this.workshop.coverageRadius} km`;
  }

  get calculatedState(): 'Abierto' | 'Cerrado' {
    if (!this.workshop || this.workshop.status === 'Inactivo') {
      return 'Cerrado';
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openingMinutes = this.timeToMinutes(this.workshop.openingTime);
    const closingMinutes = this.timeToMinutes(this.workshop.closingTime);

    if (openingMinutes <= closingMinutes) {
      return currentMinutes >= openingMinutes && currentMinutes < closingMinutes ? 'Abierto' : 'Cerrado';
    }

    return currentMinutes >= openingMinutes || currentMinutes < closingMinutes ? 'Abierto' : 'Cerrado';
  }

  get stateClasses(): string {
    return this.calculatedState === 'Abierto'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-[var(--color-error-borde)] bg-[var(--color-error-fondo)] text-[var(--color-error)]';
  }

  starIsFilled(star: number): boolean {
    return star <= Math.round(this.displayRating);
  }

  private findWorkshop(): Workshop | undefined {
    return this.getAllWorkshops().find((workshop) => workshop.id === this.workshopId);
  }

  private getAllWorkshops(): Workshop[] {
    const workshopsById = new Map<number, Workshop>();

    this.getStoredWorkshops().forEach((workshop) => {
      workshopsById.set(workshop.id, {
        ...workshop,
        rating: workshop.rating ?? this.getRatingForWorkshop(workshop.id),
      });
    });

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

  private getRatingForWorkshop(workshopId: number): number {
    const ratings = [4.8, 4.4, 4.2, 5, 3.9];
    return ratings[Math.abs(workshopId) % ratings.length];
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
