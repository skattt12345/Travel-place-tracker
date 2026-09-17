import { TestBed } from '@angular/core/testing';
import { PlaceFeedback } from './place-feedback';
import { PlaceFeedbackService } from '../../services/place-feedback.service';

describe('PlaceFeedback', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('reacts to ratings and reviews, validates input, and resets the draft on place changes', async () => {
    const fixture = TestBed.createComponent(PlaceFeedback);
    fixture.componentRef.setInput('placeId', 'castle');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(PlaceFeedbackService);
    (element.querySelector('input[value="4"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Your rating: 4/5');
    const form = element.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('Enter a tip or review.');
    const input = element.querySelector('textarea')!;
    input.value = '  Worth visiting.  ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(element.querySelector('article p')?.textContent).toBe('Worth visiting.');
    expect(element.querySelector('time')?.textContent?.trim()).toBeTruthy();
    element.querySelector('article button')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(service.forPlace('castle')?.reviews).toEqual([]);
    input.value = 'Unsaved draft';
    input.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('placeId', 'tower');
    await fixture.whenStable();
    expect(input.value).toBe('');
    expect(element.textContent).not.toContain('Your rating: 4/5');
    service.setRating('tower', 2);
    await fixture.whenStable();
    expect(element.textContent).toContain('Your rating: 2/5');
    expect(service.forPlace('castle')?.rating).toBe(4);
  });
});
