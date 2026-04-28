import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkshopWebSocketService } from '../../../../core/services/workshop-websocket.service';

@Component({
  selector: 'app-workshop-section-layout',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
  `,
})
export class WorkshopSectionLayoutComponent implements OnInit, OnDestroy {
  private readonly wsService = inject(WorkshopWebSocketService);

  ngOnInit(): void {
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }
}
