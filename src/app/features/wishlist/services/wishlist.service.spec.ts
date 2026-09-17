import { TestBed } from '@angular/core/testing';
import { Place } from '../../../core/models/place.model';
import { StorageService } from '../../../core/services/storage.service';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  const key = 'travel-places-wishlist';
  const place: Place = {
    id: 'test-place',
    name: 'Test place',
    formattedAddress: null,
    city: null,
    country: null,
    latitude: 48,
    longitude: 17,
    categories: [],
    primaryCategory: null,
  };
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds without duplicates and persists changes immediately', () => {
    const wishlist = TestBed.inject(WishlistService);
    wishlist.add(place);
    wishlist.add({ ...place });
    expect(wishlist.places()).toEqual([place]);
    expect(wishlist.isInWishlist(place.id)).toBe(true);
    expect(TestBed.inject(StorageService).read(key)).toEqual([place]);
  });

  it('removes and toggles places and persists removals', () => {
    const wishlist = TestBed.inject(WishlistService);
    wishlist.toggle(place);
    wishlist.toggle(place);
    expect(wishlist.places()).toEqual([]);
    wishlist.add(place);
    wishlist.remove(place.id);
    expect(wishlist.isInWishlist(place.id)).toBe(false);
    expect(TestBed.inject(StorageService).read(key)).toEqual([]);
  });

  it('restores persisted places in a fresh service instance', () => {
    TestBed.inject(WishlistService).add(place);
    TestBed.resetTestingModule();
    expect(TestBed.inject(WishlistService).places()).toEqual([place]);
  });

  it('ignores invalid records and deduplicates restored places', () => {
    localStorage.setItem(key, JSON.stringify([place, place, { id: 'invalid' }, null]));
    expect(TestBed.inject(WishlistService).places()).toEqual([place]);
  });

  it.each(['invalid JSON', '{}', 'null'])('handles invalid storage: %s', (value) => {
    localStorage.setItem(key, value);
    expect(TestBed.inject(WishlistService).places()).toEqual([]);
  });

  it('keeps wishlist usable if storage reads or writes fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    const wishlist = TestBed.inject(WishlistService);
    wishlist.add(place);
    expect(wishlist.places()).toEqual([place]);
  });
});
