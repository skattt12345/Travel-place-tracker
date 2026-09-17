import { Place } from './place.model';

export interface PlaceDetails extends Omit<Place, 'latitude' | 'longitude'> {
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  website: string | null;
  openingHours: string | null;
  imageUrl: string | null;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  wikimediaCommonsUrl: string | null;
}
