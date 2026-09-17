// Verified against https://apidocs.geoapify.com/docs/places/ (supported categories).
const keywordCategories: Readonly<Record<string, string>> = {
  castle: 'tourism.sights.castle',
  castles: 'tourism.sights.castle',
  museum: 'entertainment.museum',
  museums: 'entertainment.museum',
  monument: 'tourism.sights.memorial.monument',
  monuments: 'tourism.sights.memorial.monument',
  church: 'religion.place_of_worship.christianity',
  churches: 'religion.place_of_worship.christianity',
  'christian church': 'religion.place_of_worship.christianity',
  'christian churches': 'religion.place_of_worship.christianity',
  viewpoint: 'tourism.attraction.viewpoint',
  viewpoints: 'tourism.attraction.viewpoint',
  park: 'leisure.park',
  parks: 'leisure.park',
  attraction: 'tourism.attraction',
  attractions: 'tourism.attraction',
};

export const defaultTouristCategories =
  'tourism.sights,tourism.attraction,entertainment.museum,leisure.park';

export function categoryForKeyword(keyword: string): string | undefined {
  const normalized = keyword.trim().toLowerCase();
  return Object.hasOwn(keywordCategories, normalized) ? keywordCategories[normalized] : undefined;
}
