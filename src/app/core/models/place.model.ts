export interface Place {
  id: string;
  name: string | null;
  formattedAddress: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  categories: string[];
  primaryCategory: string | null;
}

export interface PlaceSearchParams {
  location: string;
  keyword: string;
}
