import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlaceSearchParams } from '../../../../core/models/place.model';

@Component({
  selector: 'app-place-search',
  imports: [ReactiveFormsModule],
  templateUrl: './place-search.html',
  styleUrl: './place-search.scss',
})
export class PlaceSearch {
  readonly loading = input(false);
  readonly initialSearch = input<PlaceSearchParams | null>(null);
  readonly searchSubmitted = output<PlaceSearchParams>();
  protected readonly form = new FormGroup({
    keyword: new FormControl('', { nonNullable: true }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });

  constructor() {
    effect(() => {
      this.form.reset(this.initialSearch() ?? { keyword: '', location: '' });
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    const { location, keyword } = this.form.getRawValue();
    const normalizedLocation = typeof location === 'string' ? location.trim() : '';
    const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : '';
    if (!normalizedLocation) {
      this.form.controls.location.setErrors({ required: true });
      return;
    }
    this.searchSubmitted.emit({ location: normalizedLocation, keyword: normalizedKeyword });
  }
}
