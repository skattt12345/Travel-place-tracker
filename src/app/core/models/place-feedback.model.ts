export type PlaceRating = 1 | 2 | 3 | 4 | 5;

export const REVIEW_MAX_LENGTH = 500;

export interface PlaceReview {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
}

export interface PlaceFeedback {
  readonly placeId: string;
  readonly rating: PlaceRating | null;
  readonly reviews: readonly PlaceReview[];
}
