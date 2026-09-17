import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { routes } from '../../../../app.routes';
import { Place } from '../../../../core/models/place.model';
import { WikimediaService } from '../../../../core/services/wikimedia.service';
import { WishlistService } from '../../../wishlist/services/wishlist.service';
import { PlaceCard } from '../../components/place-card/place-card';
import { PlacesService } from '../../services/places.service';

describe('Paris place identity', () => {
  // Actual search/details IDs returned by Geoapify for Conciergerie on 2026-09-17.
  const searchId =
    '517472d06fa9c4024059c8844ebe8f6d4840f00103f901d07543360000000092030c436f6e636965726765726965';
  const detailId =
    '517472d06fa9c402405946ef4dbe8f6d4840f00103f901d07543360000000092030c436f6e636965726765726965';

  it('preserves the search ID through card, route, request and wishlist despite a different response ID', async () => {
    const originalKey = environment.geoapify.apiKey;
    environment.geoapify.apiKey = 'test-only-key';
    localStorage.clear();
    try {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: WikimediaService, useValue: { imageFor: () => of(null) } },
        ],
      });
      const http = TestBed.inject(HttpTestingController);
      let places: Place[] = [];
      TestBed.inject(PlacesService)
        .search({ location: 'Paris', keyword: 'museum' })
        .subscribe((result) => (places = result));
      http
        .expectOne((req) => req.url.endsWith('/v1/geocode/search'))
        .flush({ results: [{ lat: 48.85, lon: 2.35 }] });
      http
        .expectOne((req) => req.url.endsWith('/v2/places'))
        .flush({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [2.35, 48.85] },
              properties: { place_id: searchId, name: 'Conciergerie', lat: 48.85, lon: 2.35 },
            },
          ],
        });
      expect(places[0].id).toBe(searchId);
      const card = TestBed.createComponent(PlaceCard);
      card.componentRef.setInput('place', places[0]);
      card.detectChanges();
      const href = (card.nativeElement as HTMLElement).querySelector('a')?.getAttribute('href');
      expect(href).toBe('/places/' + searchId);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(href!);
      const route = TestBed.inject(Router).routerState.snapshot.root.firstChild;
      expect(route?.paramMap.get('id')).toBe(searchId);
      const request = http.expectOne((req) => req.url.endsWith('/v2/place-details'));
      expect(request.request.params.get('id')).toBe(searchId);
      request.flush({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              feature_type: 'details',
              place_id: detailId,
              name: 'Conciergerie',
              lat: 48.85,
              lon: 2.35,
            },
          },
        ],
      });
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Conciergerie');
      harness.routeNativeElement?.querySelector('button')?.click();
      expect(TestBed.inject(WishlistService).isInWishlist(searchId)).toBe(true);
      expect(TestBed.inject(WishlistService).isInWishlist(detailId)).toBe(false);
      http.verify();
    } finally {
      environment.geoapify.apiKey = originalKey;
      localStorage.clear();
    }
  });
});
