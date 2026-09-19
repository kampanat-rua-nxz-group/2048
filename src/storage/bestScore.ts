export const BEST_SCORE_KEY = 'game-2048:best-score';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing localStorage throws in some privacy modes; treat as unavailable.
    return null;
  }
}

export function loadBestScore(storage: StorageLike | null = browserStorage()): number {
  if (storage === null) return 0;
  try {
    const raw = storage.getItem(BEST_SCORE_KEY);
    if (raw === null || raw === '') return 0;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Returns false when the score could not be persisted; the caller keeps its in-memory value. */
export function saveBestScore(score: number, storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(BEST_SCORE_KEY, String(score));
    return true;
  } catch {
    return false;
  }
}
