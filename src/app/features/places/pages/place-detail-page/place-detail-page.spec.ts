import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PlaceDetailPage } from './place-detail-page';
import { InvalidPlaceIdError, PlacesService } from '../../services/places.service';
import { WishlistService } from '../../../wishlist/services/wishlist.service';
import { mapPlaceDetails } from '../../services/place-details.mapper';
import { WikimediaService } from '../../../../core/services/wikimedia.service';

describe('PlaceDetailPage', () => {
  it.each([
    ['empty', null, 'Geoapify returned no details', false],
    ['HTTP error', new HttpErrorResponse({ status: 503 }), 'HTTP 503', true],
    ['HTTP 404', new HttpErrorResponse({ status: 404 }), 'HTTP 404', true],
    ['invalid ID', new InvalidPlaceIdError(), 'Invalid or missing place ID', true],
  ])('distinguishes %s', async (_label, error, message, isError) => {
    TestBed.configureTestingModule({
      imports: [PlaceDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'id' })) } },
        {
          provide: PlacesService,
          useValue: {
            getDetails: () => (error ? throwError(() => error) : of(null)),
          },
        },
        { provide: WikimediaService, useValue: { imageFor: () => of(null) } },
      ],
    });
    const fixture = TestBed.createComponent(PlaceDetailPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(message);
    expect(element.querySelector('[role="alert"]') !== null).toBe(isError);
  });
  it('shows details before image lookup finishes and keeps them on enrichment failure', async () => {
    const images = new Subject<string | null>();
    TestBed.configureTestingModule({
      imports: [PlaceDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'id' })) } },
        {
          provide: PlacesService,
          useValue: {
            getDetails: () =>
              of(
                mapPlaceDetails(
                  {
                    feature_type: 'details',
                    name: 'Castle',
                    lat: 48,
                    lon: 17,
                  },
                  'id',
                ),
              ),
          },
        },
        { provide: WikimediaService, useValue: { imageFor: () => images } },
      ],
    });
    const fixture = TestBed.createComponent(PlaceDetailPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe('Castle');
    expect(element.querySelector('app-loader')).toBeNull();
    images.error(new Error('Unavailable'));
    await fixture.whenStable();
    expect(element.querySelector('h1')?.textContent).toBe('Castle');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
  afterEach(() => localStorage.clear());

  it('loads route IDs, toggles the shared wishlist, and handles broken images', async () => {
    localStorage.clear();
    const params = new BehaviorSubject(convertToParamMap({ id: 'first' }));
    const getDetails = vi.fn((id: string) =>
      of(
        mapPlaceDetails(
          {
            feature_type: 'details',
            place_id: id,
            name: 'Castle',
            lat: 48,
            lon: 17,
            wiki_and_media: { image: 'https://example.org/photo.jpg' },
          },
          id,
        ),
      ),
    );
    TestBed.configureTestingModule({
      imports: [PlaceDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: PlacesService, useValue: { getDetails } },
        { provide: WikimediaService, useValue: { imageFor: () => of(null) } },
      ],
    });
    const fixture = TestBed.createComponent(PlaceDetailPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(getDetails).toHaveBeenCalledWith('first');
    expect(element.textContent).not.toContain('Opening hours');
    element.querySelector('button')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(WishlistService).isInWishlist('first')).toBe(true);
    expect(element.querySelector('button')?.textContent).toContain('Remove');
    element.querySelector('button')?.click();
    expect(TestBed.inject(WishlistService).isInWishlist('first')).toBe(false);
    element.querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('No photo available');
    params.next(convertToParamMap({ id: 'second' }));
    await fixture.whenStable();
    expect(getDetails).toHaveBeenCalledWith('second');
    expect(element.querySelector('img')).not.toBeNull();
  });
});
