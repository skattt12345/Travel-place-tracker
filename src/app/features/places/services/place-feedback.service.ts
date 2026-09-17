import { inject, Injectable, signal } from '@angular/core';
import {
  PlaceFeedback,
  PlaceRating,
  PlaceReview,
  REVIEW_MAX_LENGTH,
} from '../../../core/models/place-feedback.model';
import { StorageService } from '../../../core/services/storage.service';

const storageKey = 'travel-places-feedback';

function isRating(value: unknown): value is PlaceRating {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isReview(value: unknown): value is PlaceReview {
  if (typeof value !== 'object' || value === null) return false;
  const review = value as Record<string, unknown>;
  return (
    typeof review['id'] === 'string' &&
    review['id'].trim().length > 0 &&
    typeof review['text'] === 'string' &&
    review['text'].trim().length > 0 &&
    review['text'].trim().length <= REVIEW_MAX_LENGTH &&
    typeof review['createdAt'] === 'string' &&
    Number.isFinite(Date.parse(review['createdAt']))
  );
}

@Injectable({ providedIn: 'root' })
export class PlaceFeedbackService {
  private readonly storage = inject(StorageService);
  private readonly feedback = signal<readonly PlaceFeedback[]>(this.restore());

  forPlace(placeId: string): PlaceFeedback | undefined {
    return this.feedback().find((item) => item.placeId === placeId);
  }

  setRating(placeId: string, rating: number): void {
    if (!placeId.trim() || !isRating(rating)) return;
    const current = this.forPlace(placeId);
    this.save({ placeId, rating, reviews: current?.reviews ?? [] });
  }

  addReview(placeId: string, value: string): boolean {
    const text = value.trim();
    if (!placeId.trim() || !text || text.length > REVIEW_MAX_LENGTH) return false;
    const current = this.forPlace(placeId);
    const review: PlaceReview = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };
    this.save({
      placeId,
      rating: current?.rating ?? null,
      reviews: [...(current?.reviews ?? []), review],
    });
    return true;
  }

  removeReview(placeId: string, reviewId: string): void {
    const current = this.forPlace(placeId);
    if (!current || !current.reviews.some((review) => review.id === reviewId)) return;
    this.save({ ...current, reviews: current.reviews.filter((review) => review.id !== reviewId) });
  }

  private save(item: PlaceFeedback): void {
    const next = [...this.feedback().filter((saved) => saved.placeId !== item.placeId), item];
    this.feedback.set(next);
    this.storage.write(storageKey, next);
  }

  private restore(): PlaceFeedback[] {
    const stored = this.storage.read(storageKey);
    if (!Array.isArray(stored)) return [];
    const restored = new Map<string, PlaceFeedback>();
    for (const value of stored as unknown[]) {
      if (typeof value !== 'object' || value === null) continue;
      const item = value as Record<string, unknown>;
      const placeId = item['placeId'];
      if (typeof placeId !== 'string' || !placeId.trim()) continue;
      const reviews = Array.isArray(item['reviews'])
        ? item['reviews'].filter(isReview).map((review) => ({
            id: review.id,
            text: review.text.trim(),
            createdAt: new Date(review.createdAt).toISOString(),
          }))
        : [];
      restored.set(placeId, {
        placeId,
        rating: isRating(item['rating']) ? item['rating'] : null,
        reviews: [...new Map(reviews.map((review) => [review.id, review])).values()],
      });
    }
    return [...restored.values()];
  }
}
