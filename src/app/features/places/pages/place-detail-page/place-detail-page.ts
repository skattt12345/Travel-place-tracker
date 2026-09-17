import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { PlaceDetails } from '../../../../core/models/place-details.model';
import { Place } from '../../../../core/models/place.model';
import { Loader } from '../../../../shared/components/loader/loader';
import { WishlistService } from '../../../wishlist/services/wishlist.service';
import { InvalidPlaceIdError, PlacesService } from '../../services/places.service';
import { WikimediaService } from '../../../../core/services/wikimedia.service';
import { PlaceFeedback } from '../../components/place-feedback/place-feedback';

interface DetailsState {
  status: 'loading' | 'success' | 'not-found' | 'invalid-id' | 'error';
  details: PlaceDetails | null;
  error: string | null;
}

@Component({
  selector: 'app-place-detail-page',
  imports: [RouterLink, Loader, PlaceFeedback],
  templateUrl: './place-detail-page.html',
  styleUrl: './place-detail-page.scss',
})
export class PlaceDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly places = inject(PlacesService);
  private readonly wikimedia = inject(WikimediaService);
  protected readonly wishlist = inject(WishlistService);
  protected readonly imageFailed = signal(false);
  protected readonly state = signal<DetailsState>({
    status: 'loading',
    details: null,
    error: null,
  });
  protected readonly wishlistPlace = computed<Place | null>(() => {
    const details = this.state().details;
    if (!details || details.latitude === null || details.longitude === null) return null;
    const {
      id,
      name,
      formattedAddress,
      city,
      country,
      latitude,
      longitude,
      categories,
      primaryCategory,
    } = details;
    return {
      id,
      name,
      formattedAddress,
      city,
      country,
      latitude,
      longitude,
      categories,
      primaryCategory,
    };
  });
  protected readonly category = computed(
    () => this.state().details?.primaryCategory?.replace(/[._]/g, ' ') ?? null,
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        switchMap((id) => {
          this.imageFailed.set(false);
          return this.places.getDetails(id).pipe(
            switchMap((details) => {
              if (!details || details.imageUrl) return of(details);
              return this.wikimedia.imageFor(details).pipe(
                map((imageUrl) => ({ ...details, imageUrl })),
                catchError(() => of(details)),
                startWith(details),
              );
            }),
            map((details): DetailsState => ({
              status: details ? 'success' : 'not-found',
              details,
              error: null,
            })),
            catchError((error: unknown) =>
              of<DetailsState>({
                status: error instanceof InvalidPlaceIdError ? 'invalid-id' : 'error',
                details: null,
                error:
                  error instanceof HttpErrorResponse
                    ? `Unable to load place details (HTTP ${error.status || 'network error'}). Please try again later.`
                    : error instanceof Error
                      ? error.message
                      : 'Unable to load place details.',
              }),
            ),
            startWith<DetailsState>({ status: 'loading', details: null, error: null }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }
}
