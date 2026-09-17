import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  read(key: string): unknown {
    try {
      const value = localStorage.getItem(key);
      return value === null ? null : JSON.parse(value);
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep the in-memory wishlist usable when browser storage is unavailable or full.
    }
  }
}
