import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlaceCard } from '../../../places/components/place-card/place-card';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlist-page',
  imports: [RouterLink, PlaceCard],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.scss',
})
export class WishlistPage {
  protected readonly wishlist = inject(WishlistService);
}
