import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { defer, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PLACES_LIMIT } from '../config/places.config';
import {
  GeoapifyGeocodingResponse,
  GeoapifyPlaceDetailsResponse,
  GeoapifyLocation,
  GeoapifyPlacesResponse,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getPlaceDetails(id: string): Observable<GeoapifyPlaceDetailsResponse> {
    return this.get('/v2/place-details', { id, features: 'details' });
  }

  geocode(location: string): Observable<GeoapifyGeocodingResponse> {
    return this.get('/v1/geocode/search', {
      text: location,
      format: 'json',
      limit: 1,
    });
  }

  getTouristPlaces(
    location: GeoapifyLocation,
    categories: string,
    name?: string,
  ): Observable<GeoapifyPlacesResponse> {
    return this.get('/v2/places', {
      categories,
      conditions: 'named',
      ...(name ? { name } : {}),
      filter: `circle:${location.lon},${location.lat},10000`,
      bias: `proximity:${location.lon},${location.lat}`,
      limit: PLACES_LIMIT,
    });
  }

  private get<T>(path: string, parameters: Record<string, string | number>): Observable<T> {
    return defer(() => {
      const apiKey = environment.geoapify.apiKey.trim();
      if (!apiKey) {
        throw new Error(
          'Place search is unavailable because the Geoapify API key is not configured.',
        );
      }
      const params = new HttpParams({ fromObject: { ...parameters, apiKey } });
      return this.http.get<T>(`${environment.geoapify.baseUrl}${path}`, { params });
    });
  }
}
