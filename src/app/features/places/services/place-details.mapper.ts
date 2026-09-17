import { GeoapifyPlaceDetailsProperties } from '../../../core/models/api-response.model';
import { PlaceDetails } from '../../../core/models/place-details.model';

function text(value: string | undefined): string | null {
  return value?.trim() || null;
}

function httpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function wikipediaUrl(value: string | undefined): string | null {
  const url = httpUrl(value);
  if (url) {
    return /(^|\.)wikipedia\.org$/.test(new URL(url).hostname) ? url : null;
  }
  const reference = value?.match(/^([a-z]{2,3}(?:-[a-z]+)?):(.+)$/i);
  return reference
    ? `https://${reference[1].toLowerCase()}.wikipedia.org/wiki/${encodeURIComponent(reference[2].trim().replace(/ /g, '_'))}`
    : null;
}

function commonsUrl(value: string | undefined): string | null {
  const url = httpUrl(value);
  if (url) return new URL(url).hostname === 'commons.wikimedia.org' ? url : null;
  return value && /^(File|Category):\S/i.test(value)
    ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(value.replace(/ /g, '_'))}`
    : null;
}

export function mapPlaceDetails(p: GeoapifyPlaceDetailsProperties, id: string): PlaceDetails {
  const categories = p.categories ?? [];
  return {
    // Geoapify may return a different detail ID for the same requested search place.
    // Keep the requested ID stable for routing, cache and wishlist identity.
    id,
    name: text(p.name),
    formattedAddress:
      text(p.formatted) ??
      ([text(p.address_line1), text(p.address_line2)].filter(Boolean).join(', ') || null),
    city: text(p.city),
    country: text(p.country),
    latitude: typeof p.lat === 'number' && Number.isFinite(p.lat) ? p.lat : null,
    longitude: typeof p.lon === 'number' && Number.isFinite(p.lon) ? p.lon : null,
    categories,
    primaryCategory: categories.reduce<string | null>(
      (selected, category) =>
        !selected || category.split('.').length > selected.split('.').length ? category : selected,
      null,
    ),
    description: text(p.description),
    website: httpUrl(p.website),
    openingHours: text(p.opening_hours),
    imageUrl: httpUrl(p.wiki_and_media?.image),
    wikidataId: /^Q[1-9]\d*$/.test(p.wiki_and_media?.wikidata ?? '')
      ? p.wiki_and_media!.wikidata!
      : null,
    wikipediaUrl: wikipediaUrl(p.wiki_and_media?.wikipedia),
    wikimediaCommonsUrl: commonsUrl(p.wiki_and_media?.wikimedia_commons),
  };
}
