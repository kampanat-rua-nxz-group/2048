import type { Direction, GameState, Tile } from '../game/types';
import type { SearchResult } from './expectimax';

export type BotStatus = 'idle' | 'running' | 'over' | 'error';
export type BotWorker = {
  postMessage(tiles: readonly Tile[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<SearchResult>) => void | Promise<void>) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
};
type Host = {
  getState(): GameState;
  isAnimating(): boolean;
  continueGame(): void;
  play(direction: Direction): Promise<void>;
  onStatus(status: BotStatus): void;
};

/** Owns the worker and serializes search → move → animation → search. */
export function createBotController(host: Host, createWorker: () => BotWorker) {
  let worker: BotWorker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function stop(status: BotStatus = 'idle'): void {
    const previous = worker;
    worker = null;
    previous?.terminate();
    clearTimeout(timer);
    timer = undefined;
    host.onStatus(status);
  }

  function start(): void {
    if (worker !== null) return;
    if (host.getState().over) return stop('over');
    let current: BotWorker;
    try {
      current = createWorker();
    } catch {
      stop('error');
      return;
    }
    worker = current;
    let pending: GameState | null = null;
    host.onStatus('running');

    function request(): void {
      if (worker !== current) return;
      if (host.getState().over) return stop('over');
      if (host.isAnimating()) {
        timer = setTimeout(request, 16);
        return;
      }
      if (host.getState().won && !host.getState().keepPlaying) host.continueGame();
      pending = host.getState();
      try {
        current.postMessage(pending.tiles);
      } catch {
        stop('error');
      }
    }

    current.onmessage = async ({ data }) => {
      if (worker !== current || pending === null) return;
      const searched = pending;
      pending = null;
      if (host.getState() !== searched) return request();
      if (data.direction === null) return stop(host.getState().over ? 'over' : 'error');
      try {
        await host.play(data.direction);
        request();
      } catch {
        if (worker === current) stop('error');
      }
    };
    const fail = (event: Event) => {
      event.preventDefault();
      if (worker === current) stop('error');
    };
    current.onerror = fail;
    current.onmessageerror = fail;
    request();
  }

  return { start, stop, isRunning: () => worker !== null };
}
