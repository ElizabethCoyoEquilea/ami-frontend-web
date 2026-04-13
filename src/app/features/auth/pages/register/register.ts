import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  errorMessage = '';
  showVerificationModal = false;
  verificationLoading = false;
  verificationErrorMessage = '';
  verificationSuccessMessage = '';
  registeredEmail = '';

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

  verificationForm = this.formBuilder.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(10)]],
  });

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
    this.showVerificationModal = false;
    this.verificationErrorMessage = '';
    this.verificationSuccessMessage = '';

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
      next: (response) => {
        this.isLoading = false;
        if (this.isRegistrationConfirmed(response)) {
          this.openVerificationModal(formValue.email);
          this.cdr.detectChanges();
          return;
        }

        this.errorMessage = 'No se pudo completar el registro. Intentalo nuevamente.';
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        // Algunos backends devuelven `true` como texto y HttpClient lo reporta como error de parseo con status 200.
        if (error.status === 200 && this.isRegistrationConfirmed(error.error)) {
          this.openVerificationModal(formValue.email);
          this.cdr.detectChanges();
          return;
        }

        this.errorMessage = 'No se pudo completar el registro. Intentalo nuevamente.';
        this.cdr.detectChanges();
      },
    });
  }

  submitVerification(): void {
    this.verificationErrorMessage = '';
    this.verificationSuccessMessage = '';

    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      return;
    }

    const formValue = this.verificationForm.getRawValue();

    this.verificationLoading = true;

    this.authService.verifyCode(this.registeredEmail, formValue.codigo).subscribe({
      next: (response: any) => {
        this.verificationLoading = false;
        this.verificationSuccessMessage = response.message || 'Usuario verificado correctamente';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showVerificationModal = false;
          this.router.navigateByUrl('/login');
        }, 2000);
      },
      error: () => {
        this.verificationLoading = false;
        this.verificationErrorMessage = 'Codigo de verificacion invalido. Intentalo nuevamente.';
        this.cdr.detectChanges();
      },
    });
  }

  closeVerificationModal(): void {
    if (!this.verificationLoading) {
      this.showVerificationModal = false;
      this.verificationForm.reset();
      this.verificationErrorMessage = '';
      this.verificationSuccessMessage = '';
    }
  }

  codigoFieldIsInvalid(): boolean {
    const field = this.verificationForm.controls.codigo;
    return field.invalid && (field.dirty || field.touched);
  }

  private isRegistrationConfirmed(response: unknown): boolean {
    if (response === true || response === 'true') {
      return true;
    }

    const payload = response as { registered?: unknown; data?: { registered?: unknown } };

    return (
      payload?.registered === true ||
      payload?.registered === 'true' ||
      payload?.data?.registered === true ||
      payload?.data?.registered === 'true'
    );
  }

  private openVerificationModal(email: string): void {
    this.registeredEmail = email;
    this.showVerificationModal = true;
    this.verificationForm.reset();
    this.verificationErrorMessage = '';
    this.verificationSuccessMessage = '';
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
