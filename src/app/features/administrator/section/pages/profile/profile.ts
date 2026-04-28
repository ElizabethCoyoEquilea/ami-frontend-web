import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthMeResponse, AuthService, UpdateAuthMeRequest } from '../../../../../core/services/auth.service';
import { SidebarComponent } from '../../../../../layout/sidebar/sidebar';
import { NavbarComponent } from '../../../../../shared/components/navbar/navbar';

@Component({
  selector: 'app-profile',
  imports: [NavbarComponent, SidebarComponent, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  user = signal<AuthMeResponse | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  isModalOpen = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  profileForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.minLength(6)]],
    nombre_completo: ['', [Validators.required]],
    fecha_nacimiento: ['', [Validators.required]],
    genero: ['M', [Validators.required]],
    telefono: ['', [Validators.required]],
    documento: ['', [Validators.required]],
  });

  ngOnInit(): void {
    void this.loadProfile();
  }

  async loadProfile(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);

    try {
      const user = await firstValueFrom(this.authService.getCurrentUser().pipe(timeout(10000)));
      this.user.set(user);
      this.patchForm(user);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error, 'No se pudieron cargar los datos del usuario.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  openEditModal(): void {
    const currentUser = this.user();

    if (currentUser) {
      this.patchForm(currentUser);
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isModalOpen.set(true);
  }

  closeEditModal(): void {
    if (this.isSaving()) {
      return;
    }

    this.errorMessage.set('');
    this.isModalOpen.set(false);
  }

  async saveChanges(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage.set('Completa correctamente los campos antes de guardar.');
      return;
    }

    const formValue = this.profileForm.getRawValue();
    const payload: UpdateAuthMeRequest = {
      email: formValue.email.trim(),
      persona: {
        nombre_completo: formValue.nombre_completo.trim(),
        fecha_nacimiento: formValue.fecha_nacimiento,
        genero: formValue.genero,
        telefono: formValue.telefono.trim(),
        documento: formValue.documento.trim(),
      },
    };

    const password = formValue.contrasena.trim();

    if (password) {
      payload.contrasena = password;
    }

    this.isSaving.set(true);

    try {
      const updatedUser = await firstValueFrom(this.authService.updateCurrentUser(payload).pipe(timeout(10000)));
      this.user.set(updatedUser);
      this.patchForm(updatedUser);
      this.isModalOpen.set(false);
      this.successMessage.set('Perfil actualizado correctamente.');
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error, 'No se pudo actualizar el perfil.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  getFieldError(fieldName: keyof typeof this.profileForm.controls): string {
    const field = this.profileForm.controls[fieldName];

    if (!field.touched || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return 'Este campo es requerido.';
    }

    if (field.errors['email']) {
      return 'Ingresa un correo valido.';
    }

    if (field.errors['minlength']) {
      return 'La contrasena debe tener al menos 6 caracteres.';
    }

    return 'Revisa este campo.';
  }

  private patchForm(user: AuthMeResponse): void {
    this.profileForm.reset({
      email: user.email,
      contrasena: '',
      nombre_completo: user.persona?.nombre_completo ?? '',
      fecha_nacimiento: user.persona?.fecha_nacimiento ?? '',
      genero: user.persona?.genero ?? 'M',
      telefono: user.persona?.telefono ?? '',
      documento: user.persona?.documento ?? '',
    });
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const backendError = (error as { error?: { detail?: string; message?: string; error?: string } }).error;
      return backendError?.detail ?? backendError?.message ?? backendError?.error ?? fallbackMessage;
    }

    if (typeof error === 'object' && error && 'name' in error && error.name === 'TimeoutError') {
      return 'El backend tardo demasiado en responder.';
    }

    return fallbackMessage;
  }
}
