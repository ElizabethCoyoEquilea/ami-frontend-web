import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-request-quote-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './request-quote-form.html',
  styleUrl: './request-quote-form.css',
})
export class RequestQuoteFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) requestDescription = '';
  @Input() isSubmitting = false;
  @Input() errorMessage = '';
  @Output() quoteSubmit = new EventEmitter<number>();
  @Output() cancelQuote = new EventEmitter<void>();

  quoteForm = this.formBuilder.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });

  amountIsInvalid(): boolean {
    const field = this.quoteForm.controls.amount;
    return field.invalid && (field.dirty || field.touched);
  }

  submitQuote(): void {
    if (this.isSubmitting) {
      return;
    }

    if (this.quoteForm.invalid) {
      this.quoteForm.markAllAsTouched();
      return;
    }

    this.quoteSubmit.emit(Number(this.quoteForm.getRawValue().amount));
  }

  cancel(): void {
    this.cancelQuote.emit();
  }
}
