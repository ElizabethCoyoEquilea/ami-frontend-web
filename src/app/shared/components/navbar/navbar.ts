import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { WorkshopOnboardingService } from '../../services/workshop-onboarding.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(WorkshopOnboardingService);

  readonly currentUrl = signal(this.router.url);
  readonly workshopId = computed(() => this.getWorkshopId(this.currentUrl()));
  readonly showWorkshopGuide = computed(() => this.workshopId() !== null);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
      });
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  startGuide(): void {
    if (!this.showWorkshopGuide()) {
      return;
    }

    this.onboardingService.start();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  private getWorkshopId(url: string): string | null {
    return url.match(/\/admin\/workshop\/([^/?#]+)/)?.[1] ?? null;
  }
}
