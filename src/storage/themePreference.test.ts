import { describe, expect, it } from 'vitest';
import type { StorageLike } from './browserStorage';
import { THEME_KEY, loadThemeId, saveThemeId } from './themePreference';

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

describe('loadThemeId', () => {
  it('returns the stored id', () => {
    expect(loadThemeId(memoryStorage({ [THEME_KEY]: 'ocean' }))).toBe('ocean');
  });

  it.each(['', undefined])('returns null when nothing usable is stored (%j)', (raw) => {
    const storage = memoryStorage(raw === undefined ? {} : { [THEME_KEY]: raw });
    expect(loadThemeId(storage)).toBeNull();
  });

  it('returns null when storage throws or is unavailable', () => {
    expect(loadThemeId(throwingStorage)).toBeNull();
    expect(loadThemeId(null)).toBeNull();
  });
});

describe('saveThemeId', () => {
  it('writes the id and reports success', () => {
    const storage = memoryStorage();
    expect(saveThemeId('blossom', storage)).toBe(true);
    expect(storage.data[THEME_KEY]).toBe('blossom');
  });

  it('reports failure when storage throws or is unavailable', () => {
    expect(saveThemeId('blossom', throwingStorage)).toBe(false);
    expect(saveThemeId('blossom', null)).toBe(false);
  });
});
