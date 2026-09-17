import { inject, Injectable, signal } from '@angular/core';
import { Place } from '../../../core/models/place.model';
import { StorageService } from '../../../core/services/storage.service';

const storageKey = 'travel-places-wishlist';

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false;
  const place = value as Record<string, unknown>;
  const nullableText = (field: unknown): boolean => field === null || typeof field === 'string';
  return (
    typeof place['id'] === 'string' &&
    place['id'].trim().length > 0 &&
    nullableText(place['name']) &&
    nullableText(place['formattedAddress']) &&
    nullableText(place['city']) &&
    nullableText(place['country']) &&
    nullableText(place['primaryCategory']) &&
    typeof place['latitude'] === 'number' &&
    Number.isFinite(place['latitude']) &&
    typeof place['longitude'] === 'number' &&
    Number.isFinite(place['longitude']) &&
    Array.isArray(place['categories']) &&
    place['categories'].every((category: unknown) => typeof category === 'string')
  );
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly storage = inject(StorageService);
  private readonly savedPlaces = signal<Place[]>(this.restore());
  readonly places = this.savedPlaces.asReadonly();

  add(place: Place): void {
    if (!this.isInWishlist(place.id)) this.update([...this.savedPlaces(), place]);
  }

  remove(placeId: string): void {
    if (this.isInWishlist(placeId)) {
      this.update(this.savedPlaces().filter((place) => place.id !== placeId));
    }
  }

  toggle(place: Place): void {
    if (this.isInWishlist(place.id)) this.remove(place.id);
    else this.add(place);
  }

  isInWishlist(placeId: string): boolean {
    return this.savedPlaces().some((place) => place.id === placeId);
  }

  private update(places: Place[]): void {
    this.savedPlaces.set(places);
    this.storage.write(storageKey, places);
  }

  private restore(): Place[] {
    const stored = this.storage.read(storageKey);
    if (!Array.isArray(stored)) return [];
    const places = stored.filter(isPlace);
    return [...new Map(places.map((place) => [place.id, place])).values()];
  }
}
