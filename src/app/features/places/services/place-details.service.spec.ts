import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { PlaceDetails } from '../../../core/models/place-details.model';
import { PlacesService } from './places.service';

describe('PlacesService details', () => {
  let service: PlacesService;
  let http: HttpTestingController;
  let originalKey: string;
  beforeEach(() => {
    originalKey = environment.geoapify.apiKey;
    environment.geoapify.apiKey = 'test-only-key';
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlacesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    environment.geoapify.apiKey = originalKey;
    vi.restoreAllMocks();
    http.verify();
  });

  function respond(id: string): void {
    const request = http.expectOne((req) => req.url.endsWith('/v2/place-details'));
    expect(request.request.params.get('id')).toBe(id);
    expect(request.request.params.get('features')).toBe('details');
    expect(request.request.method).toBe('GET');
    request.flush({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { feature_type: 'details', place_id: id, name: 'Castle', lat: 48, lon: 17 },
        },
      ],
    });
  }

  it('uses the requested ID and caches successful details for ten minutes', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
    let result: PlaceDetails | null = null;
    service.getDetails('id').subscribe((details) => (result = details));
    respond('id');
    expect(result).toMatchObject({ id: 'id', name: 'Castle' });
    clock.mockReturnValue(599999);
    service.getDetails('id').subscribe();
    http.expectNone(() => true);
    service.getDetails('other').subscribe();
    respond('other');
    clock.mockReturnValue(600000);
    service.getDetails('id').subscribe();
    respond('id');
  });

  it('returns null for no matching details and does not cache failures', () => {
    let result: PlaceDetails | null | undefined;
    service.getDetails('id').subscribe((details) => (result = details));
    http
      .expectOne((req) => req.url.endsWith('/v2/place-details'))
      .flush({ type: 'FeatureCollection', features: [] });
    expect(result).toBeNull();
    service.getDetails('id').subscribe({ error: () => {} });
    http
      .expectOne((req) => req.url.endsWith('/v2/place-details'))
      .flush({}, { status: 500, statusText: 'Error' });
    service.getDetails('id').subscribe();
    respond('id');
  });

  it('rejects missing IDs without sending a request', () => {
    let error: unknown;
    service.getDetails(' ').subscribe({ error: (value: unknown) => (error = value) });
    expect(error).toBeInstanceOf(Error);
    http.expectNone(() => true);
  });
});
