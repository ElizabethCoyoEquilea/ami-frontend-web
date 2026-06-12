import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkshopWebSocketService, type WebSocketMessage } from '../../../../core/services/workshop-websocket.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-workshop-section-layout',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
  `,
})
export class WorkshopSectionLayoutComponent implements OnInit, OnDestroy {
  private readonly wsService = inject(WorkshopWebSocketService);
  private readonly notificationService = inject(NotificationService);
  private removeProviderMessageListener: (() => void) | null = null;

  ngOnInit(): void {
    this.wsService.connect();
    this.removeProviderMessageListener = this.wsService.onProviderMessage((message: WebSocketMessage) => {
      if (this.isNewRequestMessage(message)) {
        this.notificationService.info('Tienes una nueva solicitud');
        return;
      }

      if (this.normalizeMessageType(message.tipo) === 'seguimiento iniciado') {
        this.notificationService.info('Un seguimiento iniciado');
      }
    });
  }

  ngOnDestroy(): void {
    this.removeProviderMessageListener?.();
    this.wsService.disconnect();
  }

  private normalizeMessageType(type: string | null | undefined): string {
    return type?.trim().toLowerCase().replaceAll('_', ' ') ?? '';
  }

  private isNewRequestMessage(message: WebSocketMessage): boolean {
    const messageType = this.normalizeMessageType(message.tipo);

    return messageType === 'solicitud nueva' || messageType === 'nueva solicitud';
  }
}
