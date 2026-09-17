# Travel Places Tracker

A frontend test assignment for discovering tourist places, viewing real place
details/photos, saving a wishlist, and keeping personal ratings and tips.

Built with Angular 22 standalone components, TypeScript, SCSS, Angular Signals,
RxJS, and browser localStorage.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Setup after cloning

1. Copy the example configuration:

   ```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   ```

2. Set `environment.geoapify.apiKey` in `src/environments/environment.ts` to
   your own Geoapify API key. This local file is ignored by Git; the example
   configuration contains no key and is committed instead.
3. Install dependencies and start the application:

   ```bash
   npm install
   ng serve
   ```

   If Angular CLI is not on your PATH, use `npx ng serve` or `npm start`.

## Deployment to Vercel

Add `GEOAPIFY_API_KEY` in the Vercel project's Environment Variables for Production
and for Preview if preview deployments should support search. Supply your own key.

Vercel uses `npm run vercel-build`, as configured in `vercel.json`. This runs
`scripts/generate-environment.mjs` before the production Angular build. The script
requires a nonblank `GEOAPIFY_API_KEY` and generates the ignored
`src/environments/environment.ts` without logging the key. The output directory is
`dist/travel-places-tracker/browser`.

Run this deployment command only in the deployment checkout: it replaces that
checkout's environment file. Normal `npm start` and `npm run build` do not run the
generator and continue using your existing local environment file.

The SPA rewrites serve `index.html` for `/places`, `/places/:id`, and `/wishlist`,
so refreshing these routes works without rewriting static assets or API paths.

The key stays out of Git, but is embedded in the public browser bundle and visible
in API requests. Configure Geoapify allowed origins/referrers for your deployment
domains; a build-time variable does not make a browser API key a server-side secret.

## Geoapify search configuration

Set `environment.geoapify.apiKey` in `src/environments/environment.ts` to your own key.
The example's empty key allows builds after copying the file, but search requires a key.
This file is used by both development and production builds. Browser API keys are
visible in the built application; configure allowed origins/referrers in Geoapify.

Search geocodes the submitted location and requests up to 20 named places within
10 km of the first match, biased toward that location. Results are not exhaustive
or ranked by popularity.

The request and UI share `PLACES_LIMIT` in `src/app/core/config/places.config.ts`.
Resolved coordinates are cached for 10 minutes under `geocode:<location>`, using
trimmed, lowercase location keys with repeated whitespace collapsed. Successful
complete searches remain separately cached by location, category/name, and limit.
Changing category in the same city reuses coordinates; repeating the entire search
skips both API calls. Failed requests and unresolved locations are not cached.

Keywords are trimmed and matched case-insensitively against this exact mapping.
The listed plural forms are also supported:

| Keyword                  | Geoapify category                        |
| ------------------------ | ---------------------------------------- |
| castle / castles         | `tourism.sights.castle`                  |
| museum / museums         | `entertainment.museum`                   |
| monument / monuments     | `tourism.sights.memorial.monument`       |
| church / churches        | `religion.place_of_worship.christianity` |
| viewpoint / viewpoints   | `tourism.attraction.viewpoint`           |
| park / parks             | `leisure.park`                           |
| attraction / attractions | `tourism.attraction`                     |

The aliases `Christian church` and `Christian churches` use the same Christian
places-of-worship category as `church`, including places not classified as tourist sights.

An empty keyword requests the union of `tourism.sights`, `tourism.attraction`,
`entertainment.museum`, and `leisure.park`. Other keywords are sent through the
documented `name` parameter within that same set of categories; name matching
follows Geoapify's behavior, with no promised translation or fuzzy matching.
The page explicitly labels category versus place-name searches and their scope.
All searches use `conditions=named`, with a defensive blank-name check after
normalization. There is no client-side keyword filtering that could reject
localized names or miss matches beyond a generic first page.

Request references: [Geocoding](https://apidocs.geoapify.com/docs/geocoding/)
and [Places](https://apidocs.geoapify.com/docs/places/).

## Data sources and local feedback

Geoapify provides place search and details. Wikidata/Wikimedia and Wikipedia
enrich details with real photos when available. Wishlist entries are stored
locally under `travel-places-wishlist`.

Ratings and tips/reviews are created by the current user and stored only in this
browser under `travel-places-feedback`, associated with the stable application
`Place.id`. They are not external ratings/reviews from Geoapify, Google,
Tripadvisor, Wikimedia, or other users. There is no average or global rating.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
