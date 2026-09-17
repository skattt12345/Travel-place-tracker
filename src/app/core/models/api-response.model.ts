// Only the Geoapify fields consumed by this application are modeled.
export interface GeoapifyPlaceDetailsResponse {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: GeoapifyPlaceDetailsProperties;
  }[];
}

export interface GeoapifyPlaceDetailsProperties {
  feature_type: string;
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
  categories?: string[];
  description?: string;
  website?: string;
  opening_hours?: string;
  wiki_and_media?: {
    wikidata?: string;
    wikipedia?: string;
    wikimedia_commons?: string;
    image?: string;
  };
}

export interface GeoapifyGeocodingResponse {
  results: GeoapifyLocation[];
}

export interface GeoapifyLocation {
  lat: number;
  lon: number;
  formatted?: string;
}

export interface GeoapifyPlacesResponse {
  type: 'FeatureCollection';
  features: GeoapifyPlaceFeature[];
}

export interface GeoapifyPlaceFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    place_id: string;
    name?: string;
    formatted?: string;
    city?: string;
    country?: string;
    lat: number;
    lon: number;
    categories?: string[];
  };
}
