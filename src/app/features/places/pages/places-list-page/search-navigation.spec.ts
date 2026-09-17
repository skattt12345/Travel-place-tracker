import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { routes } from '../../../../app.routes';
import { environment } from '../../../../../environments/environment';
import { WikimediaService } from '../../../../core/services/wikimedia.service';

describe('Search navigation state', () => {
  let key: string;
  let http: HttpTestingController;
  beforeEach(() => {
    key = environment.geoapify.apiKey;
    environment.geoapify.apiKey = 'test-only-key';
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WikimediaService, useValue: { imageFor: () => of(null) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    environment.geoapify.apiKey = key;
    http.verify();
  });

  it.each([
    ['museum', 'uzhhorod'],
    ['castle', 'Bratislava'],
    ['', 'Paris'],
  ])(
    'restores %s + %s on entry and returns from details without repeating API work',
    async (keyword, location) => {
      const router = TestBed.inject(Router);
      const url = router.serializeUrl(
        router.createUrlTree(['/places'], { queryParams: { keyword, location } }),
      );
      const harness = await RouterTestingHarness.create(url);
      const geocode = http.expectOne((req) => req.url.endsWith('/v1/geocode/search'));
      expect(geocode.request.params.get('text')).toBe(location);
      geocode.flush({ results: [{ lat: 48, lon: 22 }] });
      http
        .expectOne((req) => req.url.endsWith('/v2/places'))
        .flush({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [22, 48] },
              properties: { place_id: 'stable-id', name: 'Named place', lat: 48, lon: 22 },
            },
          ],
        });
      await harness.fixture.whenStable();
      const checkForm = () => {
        expect(
          (harness.routeNativeElement!.querySelector('input[type=search]') as HTMLInputElement)
            .value,
        ).toBe(keyword);
        expect(
          (harness.routeNativeElement!.querySelector('input[type=text]') as HTMLInputElement).value,
        ).toBe(location);
        expect(harness.routeNativeElement!.textContent).toContain('Named place');
      };
      checkForm();
      const link = harness.routeNativeElement!.querySelector(
        'app-place-card a',
      ) as HTMLAnchorElement;
      expect(router.parseUrl(link.getAttribute('href')!).queryParams).toEqual({
        keyword,
        location,
      });
      await harness.navigateByUrl(link.getAttribute('href')!);
      http
        .expectOne((req) => req.url.endsWith('/v2/place-details'))
        .flush({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { feature_type: 'details', name: 'Named place', lat: 48, lon: 22 },
            },
          ],
        });
      await harness.fixture.whenStable();
      const back = harness.routeNativeElement!.querySelector('a')!;
      expect(back.getAttribute('href')).toBe(url);
      await harness.navigateByUrl(back.getAttribute('href')!);
      await harness.fixture.whenStable();
      checkForm();
      http.expectNone(() => true);
    },
  );

  it('opens /places without query parameters in the idle state', async () => {
    const harness = await RouterTestingHarness.create('/places');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('No search results yet.');
    expect(
      (harness.routeNativeElement!.querySelector('input[type=search]') as HTMLInputElement).value,
    ).toBe('');
    http.expectNone(() => true);
  });

  it('direct detail navigation links back to /places without query context', async () => {
    const harness = await RouterTestingHarness.create('/places/direct-id');
    http
      .expectOne((req) => req.url.endsWith('/v2/place-details'))
      .flush({
        type: 'FeatureCollection',
        features: [],
      });
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('a')?.getAttribute('href')).toBe('/places');
  });
});
