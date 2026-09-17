import { Component, inject } from '@angular/core';
import { WishlistService } from '../../../features/wishlist/services/wishlist.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected readonly wishlist = inject(WishlistService);
}
