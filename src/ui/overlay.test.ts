// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../game/types';
import { createOverlay, overlayFor } from './overlay';

const state = (overrides: Partial<GameState> = {}): GameState => ({
  tiles: [],
  score: 0,
  won: false,
  keepPlaying: false,
  over: false,
  nextId: 0,
  ...overrides,
});

describe('overlayFor', () => {
  it('shows win on the move that first reaches 2048', () => {
    expect(overlayFor(state(), state({ won: true }))).toBe('win');
  });

  it('does not show win again after the player continued', () => {
    expect(overlayFor(state({ won: true, keepPlaying: true }), state({ won: true, keepPlaying: true }))).toBeNull();
  });

  it('shows game over', () => {
    expect(overlayFor(state(), state({ over: true }))).toBe('over');
  });

  it('prefers win when the winning move also ends the game', () => {
    expect(overlayFor(state(), state({ won: true, over: true }))).toBe('win');
  });

  it('returns null for an ordinary move', () => {
    expect(overlayFor(state(), state({ score: 4 }))).toBeNull();
  });
});

describe('createOverlay', () => {
  let root: HTMLElement;
  const handlers = { onNewGame: vi.fn(), onKeepGoing: vi.fn() };

  beforeEach(() => {
    root = document.createElement('div');
    handlers.onNewGame.mockReset();
    handlers.onKeepGoing.mockReset();
  });

  const button = (label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent === label)!;

  it('starts hidden', () => {
    createOverlay(root, handlers);
    expect(root.hidden).toBe(true);
  });

  it('shows the win message with both buttons', () => {
    createOverlay(root, handlers).show('win');
    expect(root.hidden).toBe(false);
    expect(root.querySelector('.overlay-message')!.textContent).toBe('You win!');
    expect(button('Keep going').hidden).toBe(false);
  });

  it('shows game over without the keep going button', () => {
    createOverlay(root, handlers).show('over');
    expect(root.querySelector('.overlay-message')!.textContent).toBe('Game over');
    expect(button('Keep going').hidden).toBe(true);
  });

  it('wires the buttons to the handlers', () => {
    createOverlay(root, handlers).show('win');
    button('Keep going').click();
    button('New game').click();
    expect(handlers.onKeepGoing).toHaveBeenCalledOnce();
    expect(handlers.onNewGame).toHaveBeenCalledOnce();
  });

  it('hides again', () => {
    const overlay = createOverlay(root, handlers);
    overlay.show('over');
    overlay.hide();
    expect(root.hidden).toBe(true);
  });

  it('is a dialog labelled by its message, for screen readers', () => {
    createOverlay(root, handlers);
    expect(root.getAttribute('role')).toBe('dialog');
    const labelledBy = root.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();
    const label = root.querySelector(`#${labelledBy}`);
    expect(label).toBe(root.querySelector('.overlay-message'));
  });

  describe('focus on show', () => {
    beforeEach(() => {
      document.body.appendChild(root);
    });

    afterEach(() => {
      root.remove();
    });

    it('focuses "Keep going" on win', () => {
      createOverlay(root, handlers).show('win');
      expect(document.activeElement).toBe(button('Keep going'));
    });

    it('focuses "New game" on game over', () => {
      createOverlay(root, handlers).show('over');
      expect(document.activeElement).toBe(button('New game'));
    });
  });
});
