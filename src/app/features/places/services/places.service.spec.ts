import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { PlacesService } from './places.service';
import { Place } from '../../../core/models/place.model';
import { GeoapifyPlaceFeature } from '../../../core/models/api-response.model';

describe('PlacesService', () => {
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
    vi.restoreAllMocks();
    environment.geoapify.apiKey = originalKey;
    http.verify();
  });

  const feature: GeoapifyPlaceFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [2.3, 48.8] },
    properties: {
      place_id: 'fixture-place',
      name: 'Test monument',
      formatted: 'Test address',
      city: 'Paris',
      country: 'France',
      lat: 48.8,
      lon: 2.3,
      categories: ['tourism', 'tourism.sights', 'tourism.sights.memorial'],
    },
  };

  function completeSearch(geocode = true): void {
    if (geocode) resolveLocation();
    else http.expectNone((req) => req.url.endsWith('/v1/geocode/search'));
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({
        type: 'FeatureCollection',
        features: [feature],
      });
  }

  it('caches the full search across normalized locations and category aliases', () => {
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
    completeSearch();
    let result: Place[] = [];
    service
      .search({ location: ' PARIS ', keyword: 'CASTLES' })
      .subscribe((places) => (result = places));
    http.expectNone(() => true);
    expect(result[0]?.id).toBe(feature.properties.place_id);
  });

  it('does not share cache entries between different categories or locations', () => {
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
    completeSearch();
    service.search({ location: 'Paris', keyword: 'museum' }).subscribe();
    completeSearch(false);
    service.search({ location: 'Bratislava', keyword: 'castle' }).subscribe();
    http
      .expectOne((req) => req.url.endsWith('/v1/geocode/search'))
      .flush({ results: [{ lat: 48, lon: 17 }] });
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({ type: 'FeatureCollection', features: [] });
  });

  it('keeps unknown name searches independent', () => {
    service.search({ location: 'Paris', keyword: 'Name A' }).subscribe();
    completeSearch();
    service.search({ location: 'Paris', keyword: 'Name B' }).subscribe();
    completeSearch(false);
    service.search({ location: ' paris ', keyword: ' name a ' }).subscribe();
    http.expectNone(() => true);
  });

  it('repeats API work when the successful result reaches ten minutes old', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
    completeSearch();
    now.mockReturnValue(601000);
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
    completeSearch();
  });

  it('does not cache failures but does cache successful empty results', () => {
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe({ error: () => {} });
    resolveLocation();
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
    http.expectNone((req) => req.url.endsWith('/v1/geocode/search'));
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({ type: 'FeatureCollection', features: [] });
    let result: Place[] | undefined;
    service
      .search({ location: 'Paris', keyword: 'castle' })
      .subscribe((places) => (result = places));
    http.expectNone(() => true);
    expect(result).toEqual([]);
  });

  function resolveLocation(): void {
    const request = http.expectOne((req) => req.url.endsWith('/v1/geocode/search'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('text')).toBe('Paris');
    expect(request.request.params.get('format')).toBe('json');
    expect(request.request.params.get('limit')).toBe('1');
    request.flush({ results: [{ lat: 48.8, lon: 2.3 }] });
  }

  it('reuses Bratislava geocoding across categories, full results on repetition, and geocodes Paris separately', () => {
    service.search({ location: ' Bratislava ', keyword: 'castle' }).subscribe();
    const geocode = http.expectOne((req) => req.url.endsWith('/v1/geocode/search'));
    expect(geocode.request.params.get('text')).toBe('Bratislava');
    geocode.flush({ results: [{ lat: 48.15, lon: 17.11 }] });
    const castles = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(castles.request.params.get('categories')).toBe('tourism.sights.castle');
    expect(castles.request.params.get('limit')).toBe('20');
    castles.flush({ type: 'FeatureCollection', features: [feature] });

    service.search({ location: 'bratislava', keyword: 'museum' }).subscribe();
    http.expectNone((req) => req.url.endsWith('/v1/geocode/search'));
    const museums = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(museums.request.params.get('filter')).toBe('circle:17.11,48.15,10000');
    expect(museums.request.params.get('categories')).toBe('entertainment.museum');
    museums.flush({ type: 'FeatureCollection', features: [feature] });

    let immediate: Place[] | undefined;
    service
      .search({ location: ' BRATISLAVA ', keyword: ' MUSEUM ' })
      .subscribe((places) => (immediate = places));
    expect(immediate?.[0].id).toBe(feature.properties.place_id);
    http.expectNone(() => true);

    service.search({ location: 'Paris', keyword: 'museum' }).subscribe();
    completeSearch();
  });

  it('normalizes repeated location whitespace for both caches', () => {
    service.search({ location: '  New   York ', keyword: 'castle' }).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/v1/geocode/search'));
    expect(request.request.params.get('text')).toBe('New York');
    request.flush({ results: [{ lat: 40, lon: -74 }] });
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({ type: 'FeatureCollection', features: [] });
    service.search({ location: 'new york', keyword: 'museum' }).subscribe();
    completeSearch(false);
    service.search({ location: ' NEW  YORK ', keyword: 'castles' }).subscribe();
    http.expectNone(() => true);
  });

  it.each(['http', 'empty', 'invalid-coordinates'])(
    'does not cache unsuccessful geocoding: %s',
    (kind) => {
      service.search({ location: 'Paris', keyword: 'castle' }).subscribe({ error: () => {} });
      const request = http.expectOne((req) => req.url.endsWith('/v1/geocode/search'));
      if (kind === 'http') request.flush({}, { status: 503, statusText: 'Unavailable' });
      else request.flush({ results: kind === 'empty' ? [] : [{ lat: 999, lon: 2 }] });
      http.expectNone((req) => req.url.endsWith('/v2/places'));
      service.search({ location: 'Paris', keyword: 'castle' }).subscribe();
      completeSearch();
    },
  );

  it('geocodes, requests nearby tourism places, and maps normalized results', () => {
    let result: Place[] = [];
    service.search({ location: ' Paris ', keyword: '' }).subscribe((places) => (result = places));
    resolveLocation();
    const request = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(request.request.params.get('categories')).toBe(
      'tourism.sights,tourism.attraction,entertainment.museum,leisure.park',
    );
    expect(request.request.params.get('conditions')).toBe('named');
    expect(request.request.params.has('name')).toBe(false);
    expect(request.request.params.get('filter')).toBe('circle:2.3,48.8,10000');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.has('keyword')).toBe(false);
    request.flush({ type: 'FeatureCollection', features: [feature] });
    expect(result).toEqual([
      {
        id: 'fixture-place',
        name: 'Test monument',
        formattedAddress: 'Test address',
        city: 'Paris',
        country: 'France',
        latitude: 48.8,
        longitude: 2.3,
        categories: feature.properties.categories,
        primaryCategory: 'tourism.sights.memorial',
      },
    ]);
  });

  it('preserves missing optional data without inventing values', () => {
    let result: Place[] = [];
    service.search({ location: 'Paris', keyword: '' }).subscribe((places) => (result = places));
    resolveLocation();
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({
        type: 'FeatureCollection',
        features: [
          {
            ...feature,
            properties: { place_id: 'minimal', name: 'Named POI', lat: 48.8, lon: 2.3 },
          },
        ],
      });
    expect(result[0]?.name).toBe('Named POI');
    expect(result[0]?.formattedAddress).toBeNull();
    expect(result[0]?.primaryCategory).toBeNull();
    expect(result[0]?.categories).toEqual([]);
  });

  it('uses the server name filter for unknown keywords and preserves an empty response', () => {
    let result: Place[] | undefined;
    service
      .search({ location: 'Paris', keyword: 'unmatched' })
      .subscribe((places) => (result = places));
    resolveLocation();
    const request = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(request.request.params.get('name')).toBe('unmatched');
    expect(request.request.params.has('query')).toBe(false);
    request.flush({
      type: 'FeatureCollection',
      features: [],
    });
    expect(result).toEqual([]);
  });

  it.each([
    [' castle ', 'tourism.sights.castle'],
    ['CASTLES', 'tourism.sights.castle'],
    ['museum', 'entertainment.museum'],
    ['museums', 'entertainment.museum'],
    ['monument', 'tourism.sights.memorial.monument'],
    ['monuments', 'tourism.sights.memorial.monument'],
    ['church', 'religion.place_of_worship.christianity'],
    ['churches', 'religion.place_of_worship.christianity'],
    [' Christian Church ', 'religion.place_of_worship.christianity'],
    ['Christian churches', 'religion.place_of_worship.christianity'],
    ['viewpoint', 'tourism.attraction.viewpoint'],
    ['viewpoints', 'tourism.attraction.viewpoint'],
    ['park', 'leisure.park'],
    ['parks', 'leisure.park'],
    ['attraction', 'tourism.attraction'],
    ['attractions', 'tourism.attraction'],
  ])('requests the category for %s without filtering localized names', (keyword, category) => {
    let result: Place[] = [];
    service.search({ location: 'Paris', keyword }).subscribe((places) => (result = places));
    resolveLocation();
    const request = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(request.request.params.get('categories')).toBe(category);
    expect(request.request.params.get('conditions')).toBe('named');
    expect(request.request.params.has('name')).toBe(false);
    request.flush({
      type: 'FeatureCollection',
      features: [
        {
          ...feature,
          properties: { ...feature.properties, name: 'Localized POI', categories: [category] },
        },
      ],
    });
    expect(result[0]?.name).toBe('Localized POI');
  });

  it('excludes missing or whitespace-only names while retaining named places', () => {
    let result: Place[] = [];
    service.search({ location: 'Paris', keyword: '' }).subscribe((places) => (result = places));
    resolveLocation();
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({
        type: 'FeatureCollection',
        features: [
          feature,
          { ...feature, properties: { place_id: 'unnamed', lat: 48.8, lon: 2.3 } },
          { ...feature, properties: { ...feature.properties, place_id: 'blank', name: '  ' } },
        ],
      });
    expect(result.map((place) => place.id)).toEqual(['fixture-place']);
  });

  it('keeps multiword names intact and lets Geoapify match them', () => {
    let result: Place[] = [];
    service
      .search({ location: 'Paris', keyword: '  Bratislavsky hrad  ' })
      .subscribe((places) => (result = places));
    resolveLocation();
    const request = http.expectOne((req) => req.url.endsWith('/v2/places'));
    expect(request.request.params.get('name')).toBe('Bratislavsky hrad');
    request.flush({ type: 'FeatureCollection', features: [feature] });
    expect(result).toHaveLength(1);
  });

  it('reports an unresolved location without requesting places', () => {
    let error: unknown;
    service
      .search({ location: 'Paris', keyword: '' })
      .subscribe({ error: (value: unknown) => (error = value) });
    http.expectOne((req) => req.url.endsWith('/v1/geocode/search')).flush({ results: [] });
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Location not found');
  });

  it('reports missing configuration without issuing a request', () => {
    environment.geoapify.apiKey = '';
    let error: unknown;
    service
      .search({ location: 'Paris', keyword: '' })
      .subscribe({ error: (value: unknown) => (error = value) });
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('API key is not configured');
  });

  it('propagates HTTP failures to the page', () => {
    let error: unknown;
    service
      .search({ location: 'Paris', keyword: '' })
      .subscribe({ error: (value: unknown) => (error = value) });
    resolveLocation();
    http
      .expectOne((req) => req.url.endsWith('/v2/places'))
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toBeDefined();
  });
});
