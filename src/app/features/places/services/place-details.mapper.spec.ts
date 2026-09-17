import { mapPlaceDetails } from './place-details.mapper';

describe('mapPlaceDetails', () => {
  it('maps documented details and media fields', () => {
    const result = mapPlaceDetails(
      {
        feature_type: 'details',
        place_id: 'id',
        name: 'Castle',
        lat: 48,
        lon: 17,
        address_line1: 'Street 1',
        address_line2: 'City',
        categories: ['tourism', 'tourism.sights.castle'],
        description: 'Provided description',
        opening_hours: 'Mo-Fr 09:00-17:00',
        website: 'https://example.org/',
        wiki_and_media: {
          image: 'https://example.org/photo.jpg',
          wikipedia: 'sk:Bratislavský hrad',
          wikimedia_commons: 'Category:Bratislava Castle',
        },
      },
      'id',
    );
    expect(result).toMatchObject({
      id: 'id',
      name: 'Castle',
      latitude: 48,
      longitude: 17,
      formattedAddress: 'Street 1, City',
      primaryCategory: 'tourism.sights.castle',
      description: 'Provided description',
      openingHours: 'Mo-Fr 09:00-17:00',
      website: 'https://example.org/',
      imageUrl: 'https://example.org/photo.jpg',
      wikipediaUrl: 'https://sk.wikipedia.org/wiki/Bratislavsk%C3%BD_hrad',
      wikimediaCommonsUrl: 'https://commons.wikimedia.org/wiki/Category%3ABratislava_Castle',
    });
  });

  it('keeps absent values null and preserves the requested ID', () => {
    expect(mapPlaceDetails({ feature_type: 'details' }, 'id')).toEqual({
      id: 'id',
      name: null,
      formattedAddress: null,
      city: null,
      country: null,
      latitude: null,
      longitude: null,
      categories: [],
      primaryCategory: null,
      description: null,
      website: null,
      openingHours: null,
      imageUrl: null,
      wikidataId: null,
      wikipediaUrl: null,
      wikimediaCommonsUrl: null,
    });
  });

  it('rejects unsafe URLs and unrecognized wiki references', () => {
    const result = mapPlaceDetails(
      {
        feature_type: 'details',
        website: 'javascript:alert(1)',
        wiki_and_media: {
          image: 'data:image/png;base64,test',
          wikipedia: 'Castle',
          wikimedia_commons: 'https://example.org/fake',
        },
      },
      'id',
    );
    expect(result.website).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.wikipediaUrl).toBeNull();
    expect(result.wikimediaCommonsUrl).toBeNull();
  });

  it('accepts explicit wiki URLs', () => {
    const result = mapPlaceDetails(
      {
        feature_type: 'details',
        wiki_and_media: {
          wikipedia: 'https://en.wikipedia.org/wiki/Castle',
          wikimedia_commons: 'https://commons.wikimedia.org/wiki/File:Castle.jpg',
        },
      },
      'id',
    );
    expect(result.wikipediaUrl).toBe('https://en.wikipedia.org/wiki/Castle');
    expect(result.wikimediaCommonsUrl).toBe('https://commons.wikimedia.org/wiki/File:Castle.jpg');
  });
});
