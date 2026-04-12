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

  loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
  });

  get emailIsInvalid(): boolean {
    const emailControl = this.loginForm.controls.email;
    return emailControl.invalid && (emailControl.dirty || emailControl.touched);
  }

  get passwordIsInvalid(): boolean {
    const passwordControl = this.loginForm.controls.contrasena;
    return passwordControl.invalid && (passwordControl.dirty || passwordControl.touched);
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
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No se pudo iniciar sesion. Revisa tus credenciales.';
      },
    });
  }
}
