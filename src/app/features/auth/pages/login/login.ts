import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';
  showResetPasswordModal = false;
  resetPasswordLoading = false;
  resetPasswordErrorMessage = '';
  resetPasswordSuccessMessage = '';

  loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
  });

  resetPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get emailIsInvalid(): boolean {
    const emailControl = this.loginForm.controls.email;
    return emailControl.invalid && (emailControl.dirty || emailControl.touched);
  }

  get passwordIsInvalid(): boolean {
    const passwordControl = this.loginForm.controls.contrasena;
    return passwordControl.invalid && (passwordControl.dirty || passwordControl.touched);
  }

  get resetEmailIsInvalid(): boolean {
    const emailControl = this.resetPasswordForm.controls.email;
    return emailControl.invalid && (emailControl.dirty || emailControl.touched);
  }

  openResetPasswordModal(): void {
    this.resetPasswordErrorMessage = '';
    this.resetPasswordSuccessMessage = '';
    this.showResetPasswordModal = true;
    this.resetPasswordForm.reset({
      email: this.loginForm.controls.email.value,
    });
  }

  closeResetPasswordModal(): void {
    if (this.resetPasswordLoading) {
      return;
    }

    this.showResetPasswordModal = false;
    this.resetPasswordForm.reset();
    this.resetPasswordErrorMessage = '';
    this.resetPasswordSuccessMessage = '';
  }

  submitResetPassword(): void {
    this.resetPasswordErrorMessage = '';
    this.resetPasswordSuccessMessage = '';

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.resetPasswordLoading = true;

    this.authService.resetPassword(this.resetPasswordForm.getRawValue().email).subscribe({
      next: (response) => {
        this.resetPasswordLoading = false;
        this.resetPasswordSuccessMessage = response.message || 'Revisa tu correo para continuar con el cambio de contrasena.';
      },
      error: () => {
        this.resetPasswordLoading = false;
        this.resetPasswordErrorMessage = 'No se pudo enviar la solicitud. Intentalo nuevamente.';
      },
    });
  }

  submitLogin(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/my-workshops');
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No se pudo iniciar sesion. Revisa tus credenciales.';
      },
    });
  }
}
