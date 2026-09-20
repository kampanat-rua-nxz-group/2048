export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Null when localStorage is missing or blocked; callers degrade to in-memory state. */
export function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing localStorage throws in some privacy modes; treat as unavailable.
    return null;
  }
}
