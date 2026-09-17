import { CacheService } from './cache.service';

describe('CacheService', () => {
  afterEach(() => vi.useRealTimers());

  it('returns typed values before expiry and removes them at ten minutes', () => {
    vi.useFakeTimers();
    const cache = new CacheService();
    cache.set('places:castle', ['castle']);
    vi.advanceTimersByTime(600_000 - 1);
    expect(cache.get<string[]>('places:castle')).toEqual(['castle']);
    vi.advanceTimersByTime(1);
    expect(cache.get<string[]>('places:castle')).toBeUndefined();
  });

  it('keeps keys independent and starts TTL when each value is stored', () => {
    vi.useFakeTimers();
    const cache = new CacheService();
    cache.set('castle', 1);
    vi.advanceTimersByTime(300_000);
    cache.set('museum', 2);
    vi.advanceTimersByTime(300_000);
    expect(cache.get<number>('castle')).toBeUndefined();
    expect(cache.get<number>('museum')).toBe(2);
  });
});
