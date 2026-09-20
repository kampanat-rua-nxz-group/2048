// @vitest-environment jsdom
import html from '../index.html?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BotWorker } from './bot/controller';
import type { Direction, Tile } from './game/types';

const fixture = vi.hoisted(() => ({ values: [1024, 1024, ...Array<number>(14).fill(0)] }));

vi.mock('./game/board', async (importOriginal) => {
  const core = await importOriginal<typeof import('./game/board')>();
  return {
    ...core,
    createGame: (rng: () => number) => ({
      ...core.createGame(rng), nextId: 16,
      tiles: fixture.values.flatMap((value, id) => value === 0 ? [] : [{ id, value, row: Math.floor(id / 4), col: id % 4 }]),
    }),
  };
});

vi.mock('./ui/boardRenderer', async () => {
  const { createRenderer } = await import('./ui/renderer');
  return {
    createBoardRenderer: (host: HTMLElement, options: { slideMs: number }) => ({
      renderer: createRenderer(host, options), kind: 'dom',
    }),
  };
});

class SearchWorker implements BotWorker {
  static latest: SearchWorker;
  onmessage: BotWorker['onmessage'] = null;
  onerror: BotWorker['onerror'] = null;
  onmessageerror: BotWorker['onmessageerror'] = null;
  requests: (readonly Tile[])[] = [];
  terminated = false;
  constructor() { SearchWorker.latest = this; }
  postMessage(tiles: readonly Tile[]) { this.requests.push(tiles); }
  terminate() { this.terminated = true; }
  reply(direction: Direction) {
    return this.onmessage?.(new MessageEvent('message', { data: { direction, depth: 1, nodes: 1 } }));
  }
}

const button = () => document.querySelector<HTMLButtonElement>('#toggle-bot')!;
const overlay = () => document.querySelector<HTMLElement>('#overlay')!;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal('Worker', SearchWorker);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: () => Promise.resolve([]) } });
  document.body.innerHTML = html;
});

afterEach(() => {
  if (button().getAttribute('aria-pressed') === 'true') button().click();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('bot integration', () => {
  it('lets a swipe take over from autoplay and ignores the pending bot answer', async () => {
    fixture.values = [2, 2, ...Array<number>(14).fill(0)];
    await import('./main');
    button().click();
    const worker = SearchWorker.latest;
    const board = document.querySelector('.board')!;
    board.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
    board.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 50, clientY: 100 }));
    board.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 50, clientY: 100 }));
    await vi.advanceTimersByTimeAsync(110);
    expect(worker.terminated).toBe(true);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#score')!.textContent).toBe('4');
    const description = document.querySelector('#board-status')!.textContent;
    await worker.reply('right');
    await vi.advanceTimersByTimeAsync(110);
    expect(document.querySelector('#board-status')!.textContent).toBe(description);
  });

  it('merges to 2048, skips the win dialog, and searches the continued game', async () => {
    fixture.values = [1024, 1024, ...Array<number>(14).fill(0)];
    await import('./main');
    button().click();
    const worker = SearchWorker.latest;
    const pending = worker.reply('left');
    await vi.advanceTimersByTimeAsync(110);
    await pending;
    expect(document.querySelector('#score')!.textContent).toBe('2048');
    expect(overlay().hidden).toBe(true);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(worker.requests).toHaveLength(2);
    expect(worker.requests[1]!.some((tile) => tile.value === 2048)).toBe(true);
  });

  it('shows game over, stops the worker, and re-enables the bot after New game', async () => {
    fixture.values = [0, 2, 4, 8, 4, 8, 16, 32, 8, 16, 32, 64, 16, 32, 64, 128];
    await import('./main');
    button().click();
    const worker = SearchWorker.latest;
    const pending = worker.reply('left');
    await vi.advanceTimersByTimeAsync(110);
    await pending;
    expect(overlay().hidden).toBe(false);
    expect(overlay().textContent).toContain('Game over');
    expect(worker.terminated).toBe(true);
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    document.querySelector<HTMLButtonElement>('#new-game')!.click();
    expect(button().disabled).toBe(false);
    expect(overlay().hidden).toBe(true);
  });
});
