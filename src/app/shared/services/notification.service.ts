import { Injectable, signal } from '@angular/core';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  private nextId = 1;

  info(message: string, durationMs = 3500): void {
    this.push(message, 'info', durationMs);
  }

  success(message: string, durationMs = 3500): void {
    this.push(message, 'success', durationMs);
  }

  warning(message: string, durationMs = 3500): void {
    this.push(message, 'warning', durationMs);
  }

  error(message: string, durationMs = 3500): void {
    this.push(message, 'error', durationMs);
  }

  remove(id: number): void {
    this.notifications.update((current) => current.filter((item) => item.id !== id));
  }

  private push(message: string, type: NotificationType, durationMs: number): void {
    const notification: AppNotification = {
      id: this.nextId++,
      message,
      type,
    };

    this.notifications.update((current) => [...current, notification]);

    window.setTimeout(() => {
      this.remove(notification.id);
    }, durationMs);
  }
}
