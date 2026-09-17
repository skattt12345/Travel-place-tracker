# Travel Places Tracker

A responsive Angular SPA for discovering tourist places by keyword and location,
viewing place details, and saving favorite places.

## Live Demo

[https://travel-place-tracker.vercel.app/places](https://travel-place-tracker.vercel.app/places)

## Features

- Search tourist places by keyword and city/location
- Geoapify Places API integration
- Place details with address, coordinates, categories, and available metadata
- Real place images enriched through Wikimedia/Wikidata when available
- Wishlist persisted in localStorage
- Local user ratings and tips/reviews persisted in the browser
- 10-minute search cache to avoid repeated API requests for the same search
- Search state preserved through URL query parameters
- Responsive mobile, tablet, and desktop UI
- Lazy-loaded Angular routes
- SPA routing compatible with Vercel

## Tech Stack

- Angular 22 with standalone components
- TypeScript
- RxJS for HTTP operations
- Angular Signals for state
- SCSS
- Geoapify API
- Wikimedia / Wikidata
- localStorage
- Vercel
- Git / GitHub

## Architecture

The application is organized by feature under `src/app/`:

- `core/`: shared models, configuration, API access, caching, storage, and image enrichment services.
- `features/places/`: search, place cards, list and detail pages, and local feedback.
- `features/wishlist/`: wishlist page and persistent wishlist state.
- `shared/`: reusable UI components, including the header and loader.

`app.routes.ts` defines lazy-loaded pages; `app.config.ts` configures application providers.

## Getting Started

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/skattt12345/Travel-place-tracker.git
   cd Travel-place-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example environment configuration:

   ```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   ```

4. Set `environment.geoapify.apiKey` in `src/environments/environment.ts` to your
   own Geoapify API key. Keep the existing `baseUrl`. The local file is ignored by
   Git; the committed example contains a blank key. A blank key allows builds,
   but search requires a valid key.

5. Start the development server:

   ```bash
   ng serve
   ```

   If Angular CLI is not on your PATH, use `npm start` or `npx ng serve`.
   Open [localhost:4200](http://localhost:4200/). The app reloads as source files change.

Local development reads the environment file, not `GEOAPIFY_API_KEY`. That
environment variable is used by the deployment build described below.

## Testing

Run the application unit tests with Angular's Vitest runner:

```bash
npm test
```

For a single non-watch run:

```bash
npm test -- --watch=false
```

Run the environment generator tests separately with Node's built-in test runner:

```bash
node --test scripts/generate-environment.test.mjs
```

The generator tests use isolated temporary directories and dummy values. They
verify missing/blank key handling and safe generation without changing your local
environment file or logging a key.

## Production Build

```bash
npm run build
```

This runs the optimized Angular production build using your existing local
environment file. Browser assets are written to
`dist/travel-places-tracker/browser`.

## Deployment

In the Vercel project's Environment Variables, add `GEOAPIFY_API_KEY` with your own
key for **Production**, and for **Preview** if preview deployments should support
search.

The build command is configured in `vercel.json`:

```bash
npm run vercel-build
```

This runs `scripts/generate-environment.mjs` followed by `ng build`. The generator
requires a nonblank `GEOAPIFY_API_KEY`, fails clearly when it is missing, and writes
the ignored `src/environments/environment.ts` with the Geoapify base URL
`https://api.geoapify.com`. It never logs the key.

Run this command only in the deployment checkout: it replaces that checkout's
environment file. Normal `npm start` and `npm run build` do not run the generator
and leave your local configuration intact.

Vercel serves `dist/travel-places-tracker/browser`. The SPA rewrites serve
`index.html` for `/places`, `/places/:id`, and `/wishlist`, allowing direct visits
and refreshes without rewriting static assets or API paths.

**API-key security:** The key stays out of Git, but is embedded in the public
browser bundle and visible in API requests. Configure Geoapify allowed
origins/referrers for your local and deployment domains. A build-time environment
variable does not make a client-side API key a server-side secret.

## Notes

### Data sources and local feedback

Geoapify provides place discovery and details. Wikimedia/Wikidata is used only
to enrich place images when available, with Wikipedia/Commons fallbacks. Photos
and metadata depend on source availability; no fake public ratings, reviews, or
photos are generated.

Wishlist entries are stored in localStorage under `travel-places-wishlist`.
Ratings and tips/reviews entered by the user are stored only in that browser
under `travel-places-feedback`, associated with the application's stable `Place.id`.
They are personal feedback, not public Geoapify reviews or ratings from Google,
Tripadvisor, Wikimedia, or other users. There is no global or average rating.

### Search behavior

Search geocodes the submitted location and requests up to 20 named places within
10 km of the first match, biased toward that location. Results are not exhaustive
or ranked by popularity. The request and UI share `PLACES_LIMIT` in
`src/app/core/config/places.config.ts`.

Keywords are trimmed and matched case-insensitively to these categories:

| Keyword                  | Geoapify category                        |
| ------------------------ | ---------------------------------------- |
| castle / castles         | `tourism.sights.castle`                  |
| museum / museums         | `entertainment.museum`                   |
| monument / monuments     | `tourism.sights.memorial.monument`       |
| church / churches        | `religion.place_of_worship.christianity` |
| viewpoint / viewpoints   | `tourism.attraction.viewpoint`           |
| park / parks             | `leisure.park`                           |
| attraction / attractions | `tourism.attraction`                     |

`Christian church` and `Christian churches` use the same category as `church`,
including places not classified as tourist sights.

An empty keyword requests the union of `tourism.sights`, `tourism.attraction`,
`entertainment.museum`, and `leisure.park`. Other keywords use Geoapify's `name`
parameter within those categories; translation and fuzzy matching are not
guaranteed. The UI distinguishes category searches from place-name searches.

All searches use `conditions=named`, with a defensive blank-name check after
normalization. Category/name filtering happens at the API level before the result
limit, not client-side over a limited generic result set.

API references: [Geocoding](https://apidocs.geoapify.com/docs/geocoding/) and
[Places](https://apidocs.geoapify.com/docs/places/).

### Caching and navigation

Resolved coordinates are cached in memory for 10 minutes under `geocode:<location>`
using trimmed, lowercase location keys with repeated whitespace collapsed.
Successful searches are cached separately by location, category/name, and result
limit. Changing category in the same city reuses coordinates; repeating an entire
search skips both API calls. Failed requests and unresolved locations are not cached.

The keyword and location are preserved in URL query parameters. Returning from
details restores the form and search, reusing cached results while available.
Refreshing a search URL restores the search, but resets the in-memory cache.

## Author

GitHub: [https://github.com/skattt12345](https://github.com/skattt12345)
