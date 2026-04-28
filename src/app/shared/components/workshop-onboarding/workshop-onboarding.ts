import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  Renderer2,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkshopOnboardingService, type WorkshopOnboardingStep } from '../../services/workshop-onboarding.service';

interface OnboardingPosition {
  top: string;
  left: string;
  right: string;
  bottom: string;
  transform: string;
  opacity: string;
  pointerEvents: string;
}

@Component({
  selector: 'app-workshop-onboarding',
  templateUrl: './workshop-onboarding.html',
  styleUrl: './workshop-onboarding.css',
})
export class WorkshopOnboardingComponent implements AfterViewInit {
  private readonly onboardingService = inject(WorkshopOnboardingService);
  private readonly router = inject(Router);
  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = this.onboardingService.isOpen;
  readonly currentStep = this.onboardingService.currentStep;
  readonly currentStepIndex = this.onboardingService.currentStepIndex;
  readonly totalSteps = this.onboardingService.totalSteps;
  readonly canGoBack = computed(() => this.currentStepIndex() > 0);
  readonly isLastStep = computed(() => this.currentStepIndex() === this.totalSteps() - 1);

  readonly panelPosition = signal<OnboardingPosition>({
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    opacity: '0',
    pointerEvents: 'none',
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.clearHighlight();
        return;
      }

      void this.navigateToCurrentStep(this.currentStep());
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      if (!this.isOpen()) {
        return;
      }

      window.requestAnimationFrame(() => this.syncToCurrentStep());
    });

    this.destroyRef.onDestroy(() => {
      this.clearHighlight();
    });
  }

  startTour(): void {
    this.onboardingService.start();
  }

  nextStep(): void {
    this.onboardingService.next();
  }

  previousStep(): void {
    this.onboardingService.previous();
  }

  closeTour(): void {
    this.onboardingService.close();
    this.clearHighlight();
  }

  private async navigateToCurrentStep(step: WorkshopOnboardingStep): Promise<void> {
    const workshopId = this.getWorkshopIdFromUrl();

    if (!workshopId) {
      return;
    }

    await this.router.navigate(['/admin/workshop', workshopId, step.key]);
    window.requestAnimationFrame(() => this.syncToCurrentStep());
  }

  private syncToCurrentStep(): void {
    const step = this.currentStep();
    const target = this.findSidebarTarget(step.key);

    this.clearHighlight();

    if (!target) {
      return;
    }

    this.renderer.addClass(target, 'onboarding-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.panelPosition.set(this.getPanelPosition(target));
  }

  private clearHighlight(): void {
    const highlighted = this.elementRef.nativeElement.ownerDocument?.querySelector('.onboarding-highlight');

    if (highlighted) {
      this.renderer.removeClass(highlighted, 'onboarding-highlight');
    }
  }

  private findSidebarTarget(stepKey: WorkshopOnboardingStep['key']): HTMLElement | null {
    const selector = `[data-onboarding-target="${stepKey}"]`;
    const target = this.elementRef.nativeElement.ownerDocument?.querySelector(selector);
    return target instanceof HTMLElement ? target : null;
  }

  private getPanelPosition(target: HTMLElement): OnboardingPosition {
    const rect = target.getBoundingClientRect();
    const panelWidth = Math.min(22 * 16, window.innerWidth - 32);
    const margin = 18;

    if (window.innerWidth <= 768) {
      return {
        top: `${Math.min(rect.bottom + 14, window.innerHeight - 24)}px`,
        left: '16px',
        right: '16px',
        bottom: 'auto',
        transform: 'none',
        opacity: '1',
        pointerEvents: 'auto',
      };
    }

    const preferredLeft = rect.right + margin;
    const fitsOnRight = preferredLeft + panelWidth <= window.innerWidth - 16;
    const left = fitsOnRight ? preferredLeft : Math.max(16, rect.left - panelWidth - margin);

    return {
      top: `${Math.max(16, rect.top - 8)}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
      opacity: '1',
      pointerEvents: 'auto',
    };
  }

  private getWorkshopIdFromUrl(): string | null {
    const match = this.router.url.match(/\/admin\/workshop\/([^/?#]+)/);
    return match?.[1] ?? null;
  }
}