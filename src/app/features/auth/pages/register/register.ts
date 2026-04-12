import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';

  registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', [Validators.required]],
      document: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordsMatchValidator,
    },
  );

  fieldIsInvalid(fieldName: keyof typeof this.registerForm.controls): boolean {
    const field = this.registerForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  passwordsDoNotMatch(): boolean {
    const confirmPassword = this.registerForm.controls.confirmPassword;
    return (
      this.registerForm.hasError('passwordsDoNotMatch') &&
      (confirmPassword.dirty || confirmPassword.touched)
    );
  }

  submitRegister(): void {
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formValue = this.registerForm.getRawValue();
    const registerPayload = {
      email: formValue.email,
      contrasena: formValue.password,
      persona: {
        nombre_completo: formValue.fullName,
        fecha_nacimiento: formValue.birthDate,
        genero: formValue.gender,
        telefono: formValue.phone,
        documento: formValue.document,
      },
    };

    this.isLoading = true;

    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No se pudo completar el registro. Intentalo nuevamente.';
      },
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordsDoNotMatch: true };
  }
}
