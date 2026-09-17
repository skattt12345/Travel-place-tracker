import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { REVIEW_MAX_LENGTH } from '../../../../core/models/place-feedback.model';
import { PlaceFeedbackService } from '../../services/place-feedback.service';

@Component({
  selector: 'app-place-feedback',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './place-feedback.html',
  styleUrl: './place-feedback.scss',
})
export class PlaceFeedback {
  readonly placeId = input.required<string>();
  protected readonly feedbackService = inject(PlaceFeedbackService);
  protected readonly feedback = computed(() => this.feedbackService.forPlace(this.placeId()));
  protected readonly ratings = [1, 2, 3, 4, 5] as const;
  protected readonly maxLength = REVIEW_MAX_LENGTH;
  protected readonly review = new FormControl('', { nonNullable: true });
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      this.placeId();
      this.review.reset();
      this.error.set('');
    });
  }

  protected addReview(): void {
    const text = this.review.value.trim();
    if (!text || text.length > this.maxLength) {
      this.error.set(
        !text ? 'Enter a tip or review.' : `Use at most ${this.maxLength} characters.`,
      );
      return;
    }
    if (this.feedbackService.addReview(this.placeId(), text)) {
      this.review.reset();
      this.error.set('');
    }
  }
}
