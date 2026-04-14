import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private resetPasswordCloseTimer?: ReturnType<typeof setTimeout>;

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

  ngOnDestroy(): void {
    this.clearResetPasswordCloseTimer();
  }

  openResetPasswordModal(): void {
    this.clearResetPasswordCloseTimer();
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

    this.clearResetPasswordCloseTimer();
    this.showResetPasswordModal = false;
    this.resetPasswordForm.reset();
    this.resetPasswordErrorMessage = '';
    this.resetPasswordSuccessMessage = '';
  }

  private clearResetPasswordCloseTimer(): void {
    if (this.resetPasswordCloseTimer) {
      clearTimeout(this.resetPasswordCloseTimer);
      this.resetPasswordCloseTimer = undefined;
    }
  }

  private scheduleResetPasswordModalClose(): void {
    this.clearResetPasswordCloseTimer();
    this.resetPasswordCloseTimer = setTimeout(() => {
      this.closeResetPasswordModal();
    }, 5000);
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
        if (response.result) {
          this.resetPasswordSuccessMessage = response.message || 'Revisa tu correo para continuar con el cambio de contrasena.';
          this.scheduleResetPasswordModalClose();
          return;
        }

        this.resetPasswordErrorMessage = response.message || 'No se pudo enviar la solicitud. Intentalo nuevamente.';
      },
      error: () => {
        this.resetPasswordLoading = false;
        this.resetPasswordErrorMessage = 'No se pudo enviar la solicitud. Intentalo nuevamente.';
      },
    });
  }

  async submitLogin(): Promise<void> {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      await firstValueFrom(this.authService.login(this.loginForm.getRawValue()));
      await this.router.navigateByUrl('/admin/my-workshops');
    } catch {
      this.loginForm.reset();
      this.loginForm.markAsPristine();
      this.loginForm.markAsUntouched();
      this.errorMessage = 'No se pudo iniciar sesion. Revisa tus credenciales.';
    } finally {
      this.isLoading = false;
    }
  }
}
