import { WIN_VALUE, type Direction, type GameState, type MoveEvent } from '../game/types';

export type Renderer = {
  /** Clears the board and draws every tile in state. Abandons any in-flight apply. */
  reset(state: GameState): void;
  /** Animates one move's events; resolves when the slide and follow-up changes are done. `dir` drives optional effects. */
  apply(events: readonly MoveEvent[], dir?: Direction): Promise<void>;
  isAnimating(): boolean;
};

export type RendererOptions = { readonly slideMs: number };

type TileView = { readonly value: number; readonly row: number; readonly col: number };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function tileClass(value: number): string {
  return value > WIN_VALUE ? 'tile-super' : `tile-${value}`;
}

function setPosition(el: HTMLElement, row: number, col: number): void {
  el.style.setProperty('--row', String(row));
  el.style.setProperty('--col', String(col));
}

export function createRenderer(container: HTMLElement, options: RendererOptions): Renderer {
  const doc = container.ownerDocument;
  let elements = new Map<number, HTMLElement>();
  let generation = 0;
  let animating = false;

  const createTileEl = (tile: TileView, extraClass?: string): HTMLElement => {
    const el = doc.createElement('div');
    el.className = ['tile', tileClass(tile.value), extraClass].filter(Boolean).join(' ');
    el.textContent = String(tile.value);
    setPosition(el, tile.row, tile.col);
    return el;
  };

  const elementFor = (id: number): HTMLElement => {
    const el = elements.get(id);
    if (el === undefined) throw new Error(`Unknown tile id ${id}`);
    return el;
  };

  const addTile = (id: number, tile: TileView, extraClass: string): void => {
    const el = createTileEl(tile, extraClass);
    container.appendChild(el);
    elements = new Map(elements).set(id, el);
  };

  const removeTile = (id: number): void => {
    elementFor(id).remove();
    const next = new Map(elements);
    next.delete(id);
    elements = next;
  };

  return {
    reset(state) {
      generation += 1;
      animating = false;
      container.replaceChildren();
      elements = new Map();
      for (const tile of state.tiles) {
        const el = createTileEl(tile);
        container.appendChild(el);
        elements.set(tile.id, el);
      }
    },

    async apply(events) {
      const started = generation;
      animating = true;
      try {
        for (const e of events) {
          if (e.kind === 'moved') setPosition(elementFor(e.id), e.toRow, e.toCol);
          if (e.kind === 'merged') for (const id of e.fromIds) setPosition(elementFor(id), e.row, e.col);
        }
        await wait(options.slideMs);
        if (started !== generation) return;
        for (const e of events) {
          if (e.kind === 'merged') {
            for (const id of e.fromIds) removeTile(id);
            addTile(e.id, e, 'tile-merged');
          }
          if (e.kind === 'spawned') addTile(e.id, e, 'tile-new');
        }
      } finally {
        if (started === generation) animating = false;
      }
    },

    isAnimating: () => animating,
  };
}
