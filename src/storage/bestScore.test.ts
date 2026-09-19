import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEST_SCORE_KEY, loadBestScore, saveBestScore, type StorageLike } from './bestScore';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

describe('loadBestScore', () => {
  it('returns 0 when nothing is stored', () => {
    expect(loadBestScore(memoryStorage())).toBe(0);
  });

  it('returns a stored integer', () => {
    expect(loadBestScore(memoryStorage({ [BEST_SCORE_KEY]: '1234' }))).toBe(1234);
  });

  it.each(['abc', '-5', '1.5', ''])('returns 0 for invalid value %j', (raw) => {
    expect(loadBestScore(memoryStorage({ [BEST_SCORE_KEY]: raw }))).toBe(0);
  });

  it('returns 0 when storage throws', () => {
    expect(loadBestScore(throwingStorage)).toBe(0);
  });

  it('returns 0 when no storage is available', () => {
    expect(loadBestScore(null)).toBe(0);
  });
});

describe('saveBestScore', () => {
  it('writes the score and reports success', () => {
    const storage = memoryStorage();
    expect(saveBestScore(88, storage)).toBe(true);
    expect(storage.data[BEST_SCORE_KEY]).toBe('88');
  });

  it('reports failure when storage throws', () => {
    expect(saveBestScore(88, throwingStorage)).toBe(false);
  });

  it('reports failure when no storage is available', () => {
    expect(saveBestScore(88, null)).toBe(false);
  });
});

describe('default storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    if (descriptor && descriptor.configurable) {
      delete (globalThis as any).localStorage;
    }
  });

  it('loadBestScore() with no argument reads from default localStorage', () => {
    const storage = memoryStorage({ [BEST_SCORE_KEY]: '5678' });
    vi.stubGlobal('localStorage', storage);
    expect(loadBestScore()).toBe(5678);
  });

  it('saveBestScore(n) with no argument writes to default localStorage', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    expect(saveBestScore(999)).toBe(true);
    expect(storage.data[BEST_SCORE_KEY]).toBe('999');
  });

  it('loadBestScore() returns 0 when localStorage access throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    expect(loadBestScore()).toBe(0);
  });

  it('saveBestScore(n) returns false when localStorage access throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    expect(saveBestScore(5)).toBe(false);
  });
});
