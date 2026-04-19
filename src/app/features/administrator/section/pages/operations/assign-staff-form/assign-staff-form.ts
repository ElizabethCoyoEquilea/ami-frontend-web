import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface AvailableStaff {
  name: string;
  specialty: string;
}

@Component({
  selector: 'app-assign-staff-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './assign-staff-form.html',
  styleUrl: './assign-staff-form.css',
})
export class AssignStaffFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) availableStaff: AvailableStaff[] = [];
  @Input({ required: true }) assignmentDate = '';
  @Input() isLoadingStaff = false;
  @Input() staffErrorMessage = '';
  @Output() staffAssign = new EventEmitter<string>();
  @Output() cancelStaffAssign = new EventEmitter<void>();

  staffForm = this.formBuilder.nonNullable.group({
    staffName: ['', Validators.required],
  });

  staffIsInvalid(): boolean {
    const field = this.staffForm.controls.staffName;
    return field.invalid && (field.dirty || field.touched);
  }

  submitStaff(): void {
    if (this.isLoadingStaff || this.staffErrorMessage || this.availableStaff.length === 0) {
      return;
    }

    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    this.staffAssign.emit(this.staffForm.getRawValue().staffName);
  }

  cancel(): void {
    this.cancelStaffAssign.emit();
  }
}
