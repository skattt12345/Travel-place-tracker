import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../../core/services/storage.service';
import { PlaceFeedbackService } from './place-feedback.service';

describe('PlaceFeedbackService', () => {
  const key = 'travel-places-feedback';
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it.each([1, 2, 3, 4, 5])('sets and persists rating %s', (rating) => {
    const service = TestBed.inject(PlaceFeedbackService);
    service.setRating('place', rating);
    expect(service.forPlace('place')?.rating).toBe(rating);
    expect(TestBed.inject(StorageService).read(key)).toEqual([
      { placeId: 'place', rating, reviews: [] },
    ]);
  });

  it.each([0, 6, -1, 2.5, NaN, Infinity])('ignores invalid rating %s', (rating) => {
    const service = TestBed.inject(PlaceFeedbackService);
    service.setRating('place', 4);
    service.setRating('place', rating);
    expect(service.forPlace('place')?.rating).toBe(4);
  });

  it('trims reviews, assigns stable unique IDs, and removes only the specified review', () => {
    const service = TestBed.inject(PlaceFeedbackService);
    expect(service.addReview('place', '  Great view.  ')).toBe(true);
    service.addReview('place', 'Another tip');
    const reviews = service.forPlace('place')!.reviews;
    expect(reviews[0].text).toBe('Great view.');
    expect(reviews[0].id).not.toBe(reviews[1].id);
    expect(Number.isFinite(Date.parse(reviews[0].createdAt))).toBe(true);
    service.removeReview('place', reviews[0].id);
    expect(service.forPlace('place')?.reviews).toEqual([reviews[1]]);
    expect(TestBed.inject(StorageService).read(key)).toEqual([service.forPlace('place')]);
  });

  it('rejects blank and oversized reviews and accepts the length boundary', () => {
    const service = TestBed.inject(PlaceFeedbackService);
    expect(service.addReview('place', ' \n ')).toBe(false);
    expect(service.addReview('place', 'x'.repeat(501))).toBe(false);
    expect(service.forPlace('place')).toBeUndefined();
    expect(service.addReview('place', 'x'.repeat(500))).toBe(true);
  });

  it('isolates places, updates ratings without losing reviews, and restores all feedback', () => {
    const service = TestBed.inject(PlaceFeedbackService);
    service.setRating('castle', 5);
    service.addReview('castle', 'Great view.');
    service.setRating('tower', 4);
    service.addReview('tower', 'Very crowded.');
    service.setRating('castle', 3);
    const castle = service.forPlace('castle');
    const tower = service.forPlace('tower');
    service.removeReview('tower', castle!.reviews[0].id);
    expect(service.forPlace('tower')).toEqual(tower);
    TestBed.resetTestingModule();
    const restored = TestBed.inject(PlaceFeedbackService);
    expect(restored.forPlace('castle')).toEqual(castle);
    expect(restored.forPlace('tower')).toEqual(tower);
    expect(restored.forPlace('unknown')).toBeUndefined();
  });

  it('ignores malformed stored entries, invalid dates and invalid ratings', () => {
    TestBed.inject(StorageService).write(key, [
      null,
      {},
      {
        placeId: 'place',
        rating: 9,
        reviews: [
          { id: 'bad', text: 'Tip', createdAt: 'not a date' },
          { id: 'blank', text: ' ', createdAt: '2026-09-17T00:00:00.000Z' },
          { id: 'valid', text: ' Tip ', createdAt: '2026-09-17T00:00:00.000Z' },
        ],
      },
    ]);
    expect(TestBed.inject(PlaceFeedbackService).forPlace('place')).toEqual({
      placeId: 'place',
      rating: null,
      reviews: [{ id: 'valid', text: 'Tip', createdAt: '2026-09-17T00:00:00.000Z' }],
    });
  });

  it('handles invalid JSON and does not touch wishlist storage', () => {
    localStorage.setItem(key, 'broken JSON');
    TestBed.inject(StorageService).write('travel-places-wishlist', ['unchanged']);
    const service = TestBed.inject(PlaceFeedbackService);
    expect(service.forPlace('place')).toBeUndefined();
    service.setRating('place', 1);
    expect(TestBed.inject(StorageService).read('travel-places-wishlist')).toEqual(['unchanged']);
  });
});
