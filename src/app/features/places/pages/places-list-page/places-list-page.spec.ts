import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { PlacesListPage } from './places-list-page';
import { PlacesService } from '../../services/places.service';

describe('PlacesListPage search events', () => {
  it.each([
    ['museum', 'Paris'],
    ['castle', 'Bratislava'],
    ['', 'Bratislava'],
  ])('submits normalized %s + %s and ignores native search events', async (keyword, location) => {
    const search = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      imports: [PlacesListPage],
      providers: [
        provideRouter([{ path: 'places', component: PlacesListPage }]),
        { provide: PlacesService, useValue: { search } },
      ],
    });
    const harness = await RouterTestingHarness.create('/places');
    const fixture = harness.fixture;
    await fixture.whenStable();
    const element = harness.routeNativeElement!;
    const keywordInput = element.querySelector('input[type="search"]') as HTMLInputElement;
    const locationInput = element.querySelector('input[type="text"]') as HTMLInputElement;
    keywordInput.value = ' ' + keyword + ' ';
    keywordInput.dispatchEvent(new Event('input'));
    locationInput.value = ' ' + location + ' ';
    locationInput.dispatchEvent(new Event('input'));
    keywordInput.dispatchEvent(new Event('search', { bubbles: true }));
    await fixture.whenStable();
    expect(search).not.toHaveBeenCalled();
    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(search).toHaveBeenCalledExactlyOnceWith({ keyword, location });
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams).toEqual({
      keyword,
      location,
    });
  });
});
