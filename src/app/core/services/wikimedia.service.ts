import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, defer, map, Observable, of, switchMap, tap, timeout } from 'rxjs';
import { PlaceDetails } from '../models/place-details.model';
import { WikidataResponse, WikimediaImageResponse } from '../models/wikimedia-response.model';
import { CacheService } from './cache.service';

const wikidataEndpoint = 'https://www.wikidata.org/w/api.php';
const commonsEndpoint = 'https://commons.wikimedia.org/w/api.php';

@Injectable({ providedIn: 'root' })
export class WikimediaService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  imageFor(place: PlaceDetails): Observable<string | null> {
    if (place.imageUrl) return of(place.imageUrl);
    const wikidata =
      place.wikidataId && /^Q[1-9]\d*$/.test(place.wikidataId)
        ? this.cached('wikidata:' + place.wikidataId, () => this.fromWikidata(place.wikidataId!))
        : of(null);
    return wikidata.pipe(
      switchMap((image) => (image ? of(image) : this.fromWikipedia(place.wikipediaUrl))),
      switchMap((image) =>
        image ? of(image) : this.fromCommonsReference(place.wikimediaCommonsUrl),
      ),
      catchError(() => of(null)),
    );
  }

  private cached(key: string, lookup: () => Observable<string | null>): Observable<string | null> {
    return defer(() => {
      const cacheKey = 'wikimedia-image:' + key;
      const cached = this.cache.get<string>(cacheKey);
      return cached
        ? of(cached)
        : lookup().pipe(
            tap((image) => {
              if (image) this.cache.set(cacheKey, image);
            }),
          );
    }).pipe(catchError(() => of(null)));
  }

  private fromWikidata(id: string): Observable<string | null> {
    return this.http
      .get<WikidataResponse>(wikidataEndpoint, {
        params: {
          action: 'wbgetentities',
          ids: id,
          props: 'claims',
          format: 'json',
          origin: '*',
        },
      })
      .pipe(
        timeout(8000),
        switchMap((response) => {
          const claims = (response.entities?.[id]?.claims?.P18 ?? []).filter(
            (claim) =>
              claim.rank !== 'deprecated' && typeof claim.mainsnak?.datavalue?.value === 'string',
          );
          const claim = claims.find((item) => item.rank === 'preferred') ?? claims[0];
          const filename = claim?.mainsnak?.datavalue?.value;
          return typeof filename === 'string' && filename.trim()
            ? this.commonsFile('File:' + filename)
            : of(null);
        }),
      );
  }

  private commonsFile(title: string): Observable<string | null> {
    return this.http
      .get<WikimediaImageResponse>(commonsEndpoint, {
        params: {
          action: 'query',
          prop: 'imageinfo',
          titles: title,
          iiprop: 'url',
          iiurlwidth: 1000,
          format: 'json',
          formatversion: 2,
          origin: '*',
        },
      })
      .pipe(
        timeout(8000),
        map((response) => {
          const info = response.query?.pages?.[0]?.imageinfo?.[0];
          return this.imageUrl(info?.thumburl) ?? this.imageUrl(info?.url);
        }),
      );
  }

  private fromWikipedia(reference: string | null): Observable<string | null> {
    return defer(() => {
      if (!reference) return of(null);
      const url = new URL(reference);
      if (
        url.protocol !== 'https:' ||
        !/^[a-z]{2,3}(?:-[a-z]+)?\.wikipedia\.org$/.test(url.hostname) ||
        !url.pathname.startsWith('/wiki/')
      )
        return of(null);
      const title = decodeURIComponent(url.pathname.slice(6));
      if (!title) return of(null);
      return this.cached('wikipedia:' + url.hostname + ':' + title, () =>
        this.http
          .get<WikimediaImageResponse>(url.origin + '/w/api.php', {
            params: {
              action: 'query',
              prop: 'pageimages',
              titles: title,
              piprop: 'thumbnail',
              pithumbsize: 1000,
              redirects: 1,
              format: 'json',
              formatversion: 2,
              origin: '*',
            },
          })
          .pipe(
            timeout(8000),
            map((response) => this.imageUrl(response.query?.pages?.[0]?.thumbnail?.source)),
          ),
      );
    }).pipe(catchError(() => of(null)));
  }

  private fromCommonsReference(reference: string | null): Observable<string | null> {
    return defer(() => {
      if (!reference) return of(null);
      const url = new URL(reference);
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'commons.wikimedia.org' ||
        !url.pathname.startsWith('/wiki/')
      )
        return of(null);
      const title = decodeURIComponent(url.pathname.slice(6));
      // A Commons category is not a uniquely identified photo.
      return /^File:.+/i.test(title)
        ? this.cached('commons:' + title, () => this.commonsFile(title))
        : of(null);
    }).pipe(catchError(() => of(null)));
  }

  private imageUrl(value: string | undefined): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        ['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname) &&
        !url.username &&
        !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
}
