import { browserStorage, type StorageLike } from './browserStorage';

export const THEME_KEY = 'game-2048:theme';

/** The stored theme id, or null when nothing usable is stored; the caller validates it. */
export function loadThemeId(storage: StorageLike | null = browserStorage()): string | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(THEME_KEY);
    return raw === null || raw === '' ? null : raw;
  } catch {
    return null;
  }
}

/** Returns false when the choice could not be persisted; the session keeps it in memory. */
export function saveThemeId(id: string, storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(THEME_KEY, id);
    return true;
  } catch {
    return false;
  }
}
