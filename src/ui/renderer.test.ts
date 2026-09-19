// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '../game/types';
import { createRenderer, type Renderer } from './renderer';

const baseState = (tiles: GameState['tiles']): GameState => ({
  tiles,
  score: 0,
  won: false,
  keepPlaying: false,
  over: false,
  nextId: 100,
});

let container: HTMLElement;
let renderer: Renderer;

const tileEls = () => Array.from(container.querySelectorAll<HTMLElement>('.tile'));
const position = (el: HTMLElement) => [el.style.getPropertyValue('--row'), el.style.getPropertyValue('--col')];

beforeEach(() => {
  container = document.createElement('div');
  renderer = createRenderer(container, { slideMs: 0 });
  renderer.reset(
    baseState([
      { id: 1, value: 2, row: 0, col: 1 },
      { id: 2, value: 2, row: 0, col: 3 },
      { id: 3, value: 8, row: 2, col: 2 },
    ]),
  );
});

describe('reset', () => {
  it('renders one element per tile with value, class, and position', () => {
    const els = tileEls();
    expect(els.map((el) => el.textContent)).toEqual(['2', '2', '8']);
    expect(els[2]!.classList.contains('tile-8')).toBe(true);
    expect(position(els[2]!)).toEqual(['2', '2']);
  });

  it('replaces all existing elements', () => {
    renderer.reset(baseState([{ id: 9, value: 4, row: 3, col: 3 }]));
    expect(tileEls().map((el) => el.textContent)).toEqual(['4']);
  });

  it('uses tile-super above 2048', () => {
    renderer.reset(baseState([{ id: 9, value: 4096, row: 0, col: 0 }]));
    expect(tileEls()[0]!.classList.contains('tile-super')).toBe(true);
  });
});

describe('apply', () => {
  it('moves a tile to its new cell', async () => {
    await renderer.apply([{ kind: 'moved', id: 3, toRow: 2, toCol: 0 }]);
    const el = tileEls().find((e) => e.textContent === '8')!;
    expect(position(el)).toEqual(['2', '0']);
  });

  it('replaces merge sources with one popped tile', async () => {
    await renderer.apply([{ kind: 'merged', fromIds: [1, 2], id: 10, value: 4, row: 0, col: 0 }]);
    const values = tileEls().map((el) => el.textContent);
    expect(values).toEqual(['8', '4']);
    const merged = tileEls()[1]!;
    expect(merged.classList.contains('tile-merged')).toBe(true);
    expect(position(merged)).toEqual(['0', '0']);
  });

  it('adds spawned tiles with the appear class', async () => {
    await renderer.apply([{ kind: 'spawned', id: 11, value: 4, row: 3, col: 3 }]);
    const spawned = tileEls().find((el) => el.classList.contains('tile-new'))!;
    expect(spawned.textContent).toBe('4');
  });

  it('reports animating until the slide finishes', async () => {
    const pending = renderer.apply([{ kind: 'moved', id: 3, toRow: 2, toCol: 0 }]);
    expect(renderer.isAnimating()).toBe(true);
    await pending;
    expect(renderer.isAnimating()).toBe(false);
  });

  it('abandons an in-flight apply when reset happens mid-slide', async () => {
    const pending = renderer.apply([{ kind: 'merged', fromIds: [1, 2], id: 10, value: 4, row: 0, col: 0 }]);
    renderer.reset(baseState([{ id: 50, value: 16, row: 1, col: 1 }]));
    await pending;
    expect(tileEls().map((el) => el.textContent)).toEqual(['16']);
    expect(renderer.isAnimating()).toBe(false);
  });

  it('throws on an unknown tile id', async () => {
    await expect(renderer.apply([{ kind: 'moved', id: 999, toRow: 0, toCol: 0 }])).rejects.toThrow('Unknown tile id 999');
  });
});
