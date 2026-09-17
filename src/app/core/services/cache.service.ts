import { Injectable } from '@angular/core';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly ttl = 10 * 60 * 1000;

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Callers own their key namespace and use the same value type for reads and writes.
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttl });
  }
}
