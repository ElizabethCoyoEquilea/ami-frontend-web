import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-global-toast',
  imports: [NgClass],
  templateUrl: './global-toast.html',
  styleUrl: './global-toast.css',
})
export class GlobalToastComponent {
  protected readonly notificationService = inject(NotificationService);

  protected dismiss(id: number): void {
    this.notificationService.remove(id);
  }
}
