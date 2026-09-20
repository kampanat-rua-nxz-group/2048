// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createBoardRenderer } from './boardRenderer';
import { DEFAULT_THEME } from './three/palette';

describe('createBoardRenderer', () => {
  it('falls back to the DOM renderer when WebGL is unavailable', () => {
    // jsdom has no WebGL, so the Three.js renderer throws on context creation.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    const { kind, renderer } = createBoardRenderer(host, { slideMs: 0, reducedMotion: false, theme: DEFAULT_THEME });
    errors.mockRestore();

    expect(kind).toBe('dom');
    expect(host.querySelectorAll('.cell')).toHaveLength(16);
    renderer.reset({
      tiles: [{ id: 1, value: 2, row: 0, col: 0 }],
      score: 0,
      won: false,
      keepPlaying: false,
      over: false,
      nextId: 2,
    });
    expect(host.querySelector('.tiles .tile')?.textContent).toBe('2');
  });
});
