import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Place, PlaceSearchParams } from '../../../../core/models/place.model';
import { Loader } from '../../../../shared/components/loader/loader';
import { PlaceSearch } from '../../components/place-search/place-search';
import { PlaceCard } from '../../components/place-card/place-card';
import { PlacesService } from '../../services/places.service';
import { categoryForKeyword } from '../../services/place-search-categories';
import { PLACES_LIMIT } from '../../../../core/config/places.config';

interface SearchState {
  status: 'idle' | 'loading' | 'success' | 'error';
  places: Place[];
  error: string | null;
}

@Component({
  selector: 'app-places-list-page',
  imports: [PlaceSearch, PlaceCard, Loader],
  templateUrl: './places-list-page.html',
  styleUrl: './places-list-page.scss',
})
export class PlacesListPage {
  private readonly placesService = inject(PlacesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searches = new Subject<PlaceSearchParams | null>();
  protected readonly initialSearch = signal<PlaceSearchParams | null>(null);
  protected readonly state = signal<SearchState>({ status: 'idle', places: [], error: null });
  protected readonly searchDescription = signal('');

  constructor() {
    this.searches
      .pipe(
        switchMap((params) =>
          params
            ? this.placesService.search(params).pipe(
                map((places): SearchState => ({ status: 'success', places, error: null })),
                catchError((error: unknown) =>
                  of<SearchState>({
                    status: 'error',
                    places: [],
                    error:
                      error instanceof HttpErrorResponse
                        ? 'Unable to load places. Please try again later.'
                        : error instanceof Error
                          ? error.message
                          : 'Unable to load places. Please try again.',
                  }),
                ),
                startWith<SearchState>({ status: 'loading', places: [], error: null }),
              )
            : of<SearchState>({ status: 'idle', places: [], error: null }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));

    this.route.queryParamMap
      .pipe(
        map((query): PlaceSearchParams | null => {
          const location = (query.get('location') ?? '').trim();
          return location ? { location, keyword: (query.get('keyword') ?? '').trim() } : null;
        }),
        distinctUntilChanged((a, b) => a?.keyword === b?.keyword && a?.location === b?.location),
        takeUntilDestroyed(),
      )
      .subscribe((params) => {
        this.initialSearch.set(params);
        if (params) this.runSearch(params);
        else {
          this.searchDescription.set('');
          this.searches.next(null);
        }
      });
  }

  protected search(params: PlaceSearchParams): void {
    const current = this.initialSearch();
    if (current?.keyword === params.keyword && current.location === params.location) {
      this.runSearch(params);
      return;
    }
    void this.router.navigate(['/places'], { queryParams: params });
  }

  private runSearch(params: PlaceSearchParams): void {
    const keyword = params.keyword;
    const scope = !keyword
      ? 'Named sights, attractions, museums, and parks'
      : categoryForKeyword(keyword)
        ? `Category: ${keyword}`
        : `Place name: "${keyword}" (among sights, attractions, museums, and parks)`;
    this.searchDescription.set(
      `${scope}. Up to ${PLACES_LIMIT} matches within 10 km of the resolved location.`,
    );
    this.searches.next(params);
  }
}
