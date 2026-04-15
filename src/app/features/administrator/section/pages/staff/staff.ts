import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

type StaffTab = 'invite' | 'list';
type ProviderStatus = 'Ocupado' | 'Disponible';

interface ServiceProvider {
  name: string;
  specialty: string;
  status: ProviderStatus;
}

@Component({
  selector: 'app-staff',
  imports: [NavbarComponent, ReactiveFormsModule, SidebarComponent],
  templateUrl: './staff.html',
  styleUrl: './staff.css',
})
export class StaffComponent {
  private readonly formBuilder = inject(FormBuilder);

  activeTab = signal<StaffTab>('invite');
  invitationMessage = signal('');

  invitationForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly serviceProviders: ServiceProvider[] = [
    { name: 'Carlos Mendez', specialty: 'Mecanica general', status: 'Disponible' },
    { name: 'Andrea Vargas', specialty: 'Electricidad automotriz', status: 'Ocupado' },
    { name: 'Miguel Suarez', specialty: 'Frenos y suspension', status: 'Disponible' },
    { name: 'Carlos Rojas', specialty: 'Mecanica general', status: 'Disponible' },
    { name: 'Andrea Vargas', specialty: 'Electricidad automotriz', status: 'Ocupado' },
    { name: 'Miguel Suarez', specialty: 'Frenos y suspension', status: 'Disponible' },
  ];

  setActiveTab(tab: StaffTab): void {
    this.activeTab.set(tab);
  }

  emailIsInvalid(): boolean {
    const email = this.invitationForm.controls.email;
    return email.invalid && (email.dirty || email.touched);
  }

  sendInvitation(): void {
    this.invitationMessage.set('');

    if (this.invitationForm.invalid) {
      this.invitationForm.markAllAsTouched();
      return;
    }

    const { email } = this.invitationForm.getRawValue();
    this.invitationMessage.set(`Invitacion enviada a ${email}.`);
    this.invitationForm.reset();
  }
}
