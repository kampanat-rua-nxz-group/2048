import type { Direction } from '../game/types';

const KEY_TO_DIRECTION: Readonly<Record<string, Direction>> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function keyToDirection(key: string): Direction | null {
  return KEY_TO_DIRECTION[key.toLowerCase()] ?? null;
}

type KeyTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** Wires keydown to onMove. Presses while isLocked() is true are dropped. Returns an unbind function. */
export function bindInput(target: KeyTarget, isLocked: () => boolean, onMove: (dir: Direction) => void): () => void {
  const handler = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const dir = keyToDirection(event.key);
    if (dir === null) return;
    event.preventDefault();
    if (isLocked()) return;
    onMove(dir);
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
