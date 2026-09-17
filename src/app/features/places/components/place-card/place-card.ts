import { Component, computed, inject, input } from '@angular/core';
import { Place } from '../../../../core/models/place.model';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../../wishlist/services/wishlist.service';

@Component({
  selector: 'app-place-card',
  imports: [RouterLink],
  templateUrl: './place-card.html',
  styleUrl: './place-card.scss',
})
export class PlaceCard {
  protected readonly wishlist = inject(WishlistService);
  readonly place = input.required<Place>();
  protected readonly category = computed(
    () => this.place().primaryCategory?.replace(/[._]/g, ' ') ?? 'Category unavailable',
  );
}
