import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'places' },
  {
    path: 'places',
    title: 'Places | Travel Places Tracker',
    loadComponent: () =>
      import('./features/places/pages/places-list-page/places-list-page').then((m) => m.PlacesListPage),
  },
  {
    path: 'places/:id',
    title: 'Place Details | Travel Places Tracker',
    loadComponent: () =>
      import('./features/places/pages/place-detail-page/place-detail-page').then((m) => m.PlaceDetailPage),
  },
  {
    path: 'wishlist',
    title: 'Wishlist | Travel Places Tracker',
    loadComponent: () =>
      import('./features/wishlist/pages/wishlist-page/wishlist-page').then((m) => m.WishlistPage),
  },
];
