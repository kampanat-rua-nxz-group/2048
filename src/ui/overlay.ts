import type { GameState } from '../game/types';

export type OverlayKind = 'win' | 'over';

export type OverlayHandlers = {
  readonly onNewGame: () => void;
  readonly onKeepGoing: () => void;
};

export type Overlay = { show(kind: OverlayKind): void; hide(): void };

/** Decides which overlay, if any, a move from prev to next should reveal. */
export function overlayFor(prev: GameState, next: GameState): OverlayKind | null {
  if (next.won && !prev.won && !next.keepPlaying) return 'win';
  if (next.over) return 'over';
  return null;
}

const MESSAGES: Readonly<Record<OverlayKind, string>> = { win: 'You win!', over: 'Game over' };

export function createOverlay(root: HTMLElement, handlers: OverlayHandlers): Overlay {
  const doc = root.ownerDocument;

  const message = doc.createElement('p');
  message.className = 'overlay-message';
  message.id = 'overlay-message';

  const keepGoing = doc.createElement('button');
  keepGoing.type = 'button';
  keepGoing.textContent = 'Keep going';
  keepGoing.addEventListener('click', handlers.onKeepGoing);

  const newGame = doc.createElement('button');
  newGame.type = 'button';
  newGame.textContent = 'New game';
  newGame.addEventListener('click', handlers.onNewGame);

  const actions = doc.createElement('div');
  actions.className = 'overlay-actions';
  actions.append(keepGoing, newGame);

  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-labelledby', message.id);
  root.replaceChildren(message, actions);
  root.hidden = true;

  return {
    show(kind) {
      message.textContent = MESSAGES[kind];
      keepGoing.hidden = kind !== 'win';
      root.hidden = false;
      (kind === 'win' ? keepGoing : newGame).focus();
    },
    hide() {
      root.hidden = true;
    },
  };
}
