import { Component } from '@angular/core';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-home',
  imports: [NavbarComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {}
