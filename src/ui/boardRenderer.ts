import { SIZE } from '../game/types';
import { createRenderer, type Renderer } from './renderer';
import { createThreeRenderer } from './three/threeRenderer';

export type BoardRendererKind = 'webgl' | 'dom';
export type BoardRendererOptions = { readonly slideMs: number; readonly reducedMotion: boolean };

function createDomBoard(host: HTMLElement, options: BoardRendererOptions): Renderer {
  const doc = host.ownerDocument;
  const grid = doc.createElement('div');
  grid.className = 'grid';
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const cell = doc.createElement('div');
    cell.className = 'cell';
    grid.appendChild(cell);
  }
  const tiles = doc.createElement('div');
  tiles.className = 'tiles';
  host.replaceChildren(grid, tiles);
  return createRenderer(tiles, { slideMs: options.reducedMotion ? 0 : options.slideMs });
}

/** Prefers the Three.js tray; uses the flat DOM board when WebGL cannot start. */
export function createBoardRenderer(
  host: HTMLElement,
  options: BoardRendererOptions,
): { renderer: Renderer; kind: BoardRendererKind } {
  try {
    return { renderer: createThreeRenderer(host, options), kind: 'webgl' };
  } catch {
    host.replaceChildren();
    return { renderer: createDomBoard(host, options), kind: 'dom' };
  }
}
