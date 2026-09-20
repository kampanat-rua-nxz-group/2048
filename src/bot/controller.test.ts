// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { continueAfterWin, createGame, move } from '../game/board';
import { seededRng } from '../game/rng';
import type { Tile } from '../game/types';
import { createBotController, type BotStatus, type BotWorker } from './controller';
import type { SearchResult } from './expectimax';

class SearchWorker implements BotWorker {
  onmessage: BotWorker['onmessage'] = null;
  onerror: BotWorker['onerror'] = null;
  onmessageerror: BotWorker['onmessageerror'] = null;
  requests: (readonly Tile[])[] = [];
  terminated = false;
  postMessage(tiles: readonly Tile[]) { this.requests.push(tiles); }
  terminate() { this.terminated = true; }
  reply(direction: SearchResult['direction']) {
    return this.onmessage?.(new MessageEvent('message', { data: { direction, depth: 2, nodes: 10 } }));
  }
}

function setup() {
  const rng = seededRng(42);
  let state = createGame(rng);
  let animating = false;
  let finishAnimation = () => {};
  const workers: SearchWorker[] = [];
  let status: BotStatus = 'idle';
  const bot = createBotController({
    getState: () => state,
    isAnimating: () => animating,
    continueGame: () => { state = continueAfterWin(state); },
    play: async (direction) => {
      state = move(state, direction, rng).state;
      animating = true;
      await new Promise<void>((resolve) => { finishAnimation = resolve; });
      animating = false;
    },
    onStatus: (next) => { status = next; },
  }, () => {
    const worker = new SearchWorker();
    workers.push(worker);
    return worker;
  });
  return {
    bot, workers, getState: () => state, getStatus: () => status,
    finish: () => finishAnimation(),
    setState: (next: typeof state) => { state = next; },
    setAnimating: (value: boolean) => { animating = value; },
  };
}

afterEach(() => vi.useRealTimers());

describe('bot controller', () => {
  it('waits for a move animation before searching the next board', async () => {
    const app = setup();
    app.bot.start();
    const worker = app.workers[0]!;
    const pending = worker.reply('right');
    expect(worker.requests).toHaveLength(1);
    app.finish();
    await pending;
    expect(worker.requests).toHaveLength(2);
    expect(worker.requests[1]).toEqual(app.getState().tiles);
    app.bot.stop();
  });

  it('discards an answer after Stop and does not affect a restarted bot', async () => {
    const app = setup();
    app.bot.start();
    const old = app.workers[0]!;
    app.bot.stop();
    expect(old.terminated).toBe(true);
    app.bot.start();
    const before = app.getState();
    await old.reply('right');
    expect(app.getState()).toBe(before);
    expect(app.getStatus()).toBe('running');
    expect(app.workers[1]!.requests).toHaveLength(1);
    app.bot.stop();
  });

  it('does not resume after Stop during an animation', async () => {
    const app = setup();
    app.bot.start();
    const worker = app.workers[0]!;
    const pending = worker.reply('right');
    app.bot.stop();
    app.finish();
    await pending;
    expect(worker.requests).toHaveLength(1);
    expect(app.getStatus()).toBe('idle');
  });

  it('discards a stale answer when the game state has changed', async () => {
    const app = setup();
    app.bot.start();
    const fresh = createGame(seededRng(7));
    app.setState(fresh);
    await app.workers[0]!.reply('right');
    expect(app.getState()).toBe(fresh);
    expect(app.workers[0]!.requests.at(-1)).toEqual(fresh.tiles);
    app.bot.stop();
  });

  it('automatically continues at 2048 and refuses to start a finished game', () => {
    const app = setup();
    app.setState({ ...app.getState(), won: true });
    app.bot.start();
    expect(app.getState().keepPlaying).toBe(true);
    app.bot.stop();
    app.setState({ ...app.getState(), over: true });
    app.bot.start();
    expect(app.getStatus()).toBe('over');
    expect(app.workers).toHaveLength(1);
  });

  it('waits for an existing manual animation and cancels that wait on Stop', async () => {
    vi.useFakeTimers();
    const app = setup();
    app.setAnimating(true);
    app.bot.start();
    expect(app.workers[0]!.requests).toHaveLength(0);
    app.bot.stop();
    app.setAnimating(false);
    await vi.runAllTimersAsync();
    expect(app.workers[0]!.requests).toHaveLength(0);
  });

  it('stops after a worker error so manual play remains available', () => {
    const app = setup();
    app.bot.start();
    app.workers[0]!.onerror?.(new ErrorEvent('error'));
    expect(app.bot.isRunning()).toBe(false);
    expect(app.workers[0]!.terminated).toBe(true);
    expect(app.getStatus()).toBe('error');
  });
});
