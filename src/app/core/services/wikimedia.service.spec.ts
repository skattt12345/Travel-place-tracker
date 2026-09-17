import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WikimediaService } from './wikimedia.service';
import { mapPlaceDetails } from '../../features/places/services/place-details.mapper';

describe('WikimediaService', () => {
  let service: WikimediaService;
  let http: HttpTestingController;
  const photo = 'https://thumb.wikimedia.org/wikipedia/commons/test.jpg';
  const place = () =>
    mapPlaceDetails(
      {
        feature_type: 'details',
        wiki_and_media: { wikidata: 'Q123' },
      },
      'id',
    );
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WikimediaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('prefers an existing Geoapify image without requests', () => {
    let result: string | null = null;
    service
      .imageFor({ ...place(), imageUrl: 'https://example.org/photo.jpg' })
      .subscribe((image) => (result = image));
    expect(result).toBe('https://example.org/photo.jpg');
    http.expectNone(() => true);
  });

  it('resolves P18 through Commons and caches the successful image', () => {
    let result: string | null = null;
    service.imageFor(place()).subscribe((image) => (result = image));
    const request = http.expectOne((req) => req.url.includes('wikidata.org'));
    expect(request.request.params.get('ids')).toBe('Q123');
    request.flush({
      entities: {
        Q123: {
          claims: {
            P18: [
              { rank: 'deprecated', mainsnak: { datavalue: { value: 'Old.jpg' } } },
              { rank: 'preferred', mainsnak: { datavalue: { value: 'Castle.jpg' } } },
            ],
          },
        },
      },
    });
    const commons = http.expectOne((req) => req.url.includes('commons.wikimedia.org'));
    expect(commons.request.params.get('titles')).toBe('File:Castle.jpg');
    commons.flush({ query: { pages: [{ imageinfo: [{ thumburl: photo }] }] } });
    expect(result).toBe(photo);
    service.imageFor(place()).subscribe();
    http.expectNone(() => true);
  });

  it('handles missing P18 without inventing an image', () => {
    let result: string | null | undefined;
    service.imageFor(place()).subscribe((image) => (result = image));
    http.expectOne((req) => req.url.includes('wikidata.org')).flush({ entities: { Q123: {} } });
    expect(result).toBeNull();
  });

  it('falls back to the exact Wikipedia page after a Wikidata failure', () => {
    let result: string | null = null;
    service
      .imageFor({ ...place(), wikipediaUrl: 'https://sk.wikipedia.org/wiki/Test_castle' })
      .subscribe((image) => (result = image));
    http
      .expectOne((req) => req.url.includes('wikidata.org'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    const request = http.expectOne((req) => req.url === 'https://sk.wikipedia.org/w/api.php');
    expect(request.request.params.get('titles')).toBe('Test_castle');
    request.flush({ query: { pages: [{ thumbnail: { source: photo } }] } });
    expect(result).toBe(photo);
  });

  it('returns null on failures and retries rather than caching the failure', () => {
    let result: string | null | undefined;
    service.imageFor(place()).subscribe((image) => (result = image));
    http
      .expectOne((req) => req.url.includes('wikidata.org'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(result).toBeNull();
    service.imageFor(place()).subscribe();
    http.expectOne((req) => req.url.includes('wikidata.org')).flush({});
  });

  it('uses exact Commons files but does not select arbitrary category images', () => {
    service
      .imageFor({
        ...place(),
        wikidataId: null,
        wikimediaCommonsUrl: 'https://commons.wikimedia.org/wiki/File:Castle.jpg',
      })
      .subscribe();
    http.expectOne((req) => req.url.includes('commons.wikimedia.org')).flush({});
    service
      .imageFor({
        ...place(),
        wikidataId: null,
        wikimediaCommonsUrl: 'https://commons.wikimedia.org/wiki/Category:Castles',
      })
      .subscribe();
    http.expectNone(() => true);
  });
});
