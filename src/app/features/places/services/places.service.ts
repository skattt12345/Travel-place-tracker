import { inject, Injectable } from '@angular/core';
import { defer, map, Observable, of, switchMap, tap } from 'rxjs';
import { GeoapifyLocation, GeoapifyPlaceFeature } from '../../../core/models/api-response.model';
import { Place, PlaceSearchParams } from '../../../core/models/place.model';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cache.service';
import { categoryForKeyword, defaultTouristCategories } from './place-search-categories';
import { PlaceDetails } from '../../../core/models/place-details.model';
import { mapPlaceDetails } from './place-details.mapper';
import { PLACES_LIMIT } from '../../../core/config/places.config';

export class InvalidPlaceIdError extends Error {
  constructor() {
    super('Invalid or missing place ID.');
  }
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  getDetails(placeId: string): Observable<PlaceDetails | null> {
    return defer(() => {
      const id = placeId;
      if (typeof id !== 'string' || !id || /[\s\u0000-\u001f]/.test(id)) {
        throw new InvalidPlaceIdError();
      }
      const key = `place-details:${id}`;
      const cached = this.cache.get<PlaceDetails>(key);
      if (cached !== undefined) return of(cached);
      return this.api.getPlaceDetails(id).pipe(
        map((response) => {
          const feature = response.features.find(
            ({ properties }) => properties.feature_type === 'details',
          );
          return feature ? mapPlaceDetails(feature.properties, id) : null;
        }),
        tap((details) => {
          if (details) this.cache.set(key, details);
        }),
      );
    });
  }

  search(params: PlaceSearchParams): Observable<Place[]> {
    return defer(() => {
      const category = categoryForKeyword(params.keyword);
      const location = params.location.trim().replace(/\s+/g, ' ');
      const key = JSON.stringify([
        'places',
        location.toLowerCase(),
        category ?? defaultTouristCategories,
        category ? '' : params.keyword.trim().toLowerCase(),
        PLACES_LIMIT,
      ]);
      const cached = this.cache.get<Place[]>(key);
      if (cached !== undefined) return of(cached);
      return this.fetchPlaces({ ...params, location }).pipe(
        tap((places) => this.cache.set(key, places)),
      );
    });
  }

  private resolveLocation(location: string): Observable<GeoapifyLocation> {
    return defer(() => {
      if (!location) {
        throw new Error('Enter a city or location.');
      }
      const key = `geocode:${location.toLowerCase()}`;
      const cached = this.cache.get<GeoapifyLocation>(key);
      if (cached !== undefined) return of(cached);
      return this.api.geocode(location).pipe(
        map((response) => {
          const resolved = response.results[0];
          if (
            !resolved ||
            !Number.isFinite(resolved.lat) ||
            !Number.isFinite(resolved.lon) ||
            Math.abs(resolved.lat) > 90 ||
            Math.abs(resolved.lon) > 180
          ) {
            throw new Error(
              'Location not found. Try adding a country or a more specific location.',
            );
          }
          return { lat: resolved.lat, lon: resolved.lon };
        }),
        tap((coordinates) => this.cache.set(key, coordinates)),
      );
    });
  }

  private fetchPlaces(params: PlaceSearchParams): Observable<Place[]> {
    return this.resolveLocation(params.location).pipe(
      switchMap((location) => {
        const keyword = params.keyword.trim();
        const category = categoryForKeyword(keyword);
        // Category/name filtering happens before Geoapify applies the result limit.
        // Unknown keywords are place names, not a local filter over generic results.
        return this.api.getTouristPlaces(
          location,
          category ?? defaultTouristCategories,
          category ? undefined : keyword || undefined,
        );
      }),
      map((response) => response.features.map((feature) => this.toPlace(feature))),
      // Defensively exclude blank names even if the provider's named condition passes.
      map((places) => places.filter((place) => place.name !== null)),
    );
  }

  private toPlace({ properties }: GeoapifyPlaceFeature): Place {
    const categories = properties.categories ?? [];
    const primaryCategory = categories.reduce<string | null>(
      (selected, category) =>
        !selected || category.split('.').length > selected.split('.').length ? category : selected,
      null,
    );
    return {
      id: properties.place_id,
      name: properties.name?.trim() || null,
      formattedAddress: properties.formatted ?? null,
      city: properties.city ?? null,
      country: properties.country ?? null,
      latitude: properties.lat,
      longitude: properties.lon,
      categories,
      primaryCategory,
    };
  }
}
