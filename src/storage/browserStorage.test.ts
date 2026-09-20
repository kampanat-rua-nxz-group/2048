import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage } from './browserStorage';

afterEach(() => {
  vi.unstubAllGlobals();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (descriptor?.configurable === true) delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('browserStorage', () => {
  it('returns localStorage when it is available', () => {
    const storage = { getItem: () => null, setItem: () => {} };
    vi.stubGlobal('localStorage', storage);
    expect(browserStorage()).toBe(storage);
  });

  it('returns null when it is missing', () => {
    expect(browserStorage()).toBeNull();
  });

  it('returns null when access throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    expect(browserStorage()).toBeNull();
  });
});
