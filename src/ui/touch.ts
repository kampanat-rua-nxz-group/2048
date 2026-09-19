import type { Direction } from '../game/types';

/** Shortest drag that counts as a swipe, in CSS pixels; anything smaller reads as a tap. */
export const SWIPE_MIN_PX = 24;

/** Maps a drag delta to the direction it leans, or null while it is still too short to be deliberate. */
export function swipeToDirection(dx: number, dy: number, minDistance: number = SWIPE_MIN_PX): Direction | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < minDistance) return null;
  if (absX > absY) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

type SwipeTarget = Pick<HTMLElement, 'addEventListener' | 'removeEventListener' | 'setPointerCapture'>;

type Drag = { readonly id: number; readonly x: number; readonly y: number };

/**
 * Wires pointer drags on `target` to onMove: one move per drag, reported the moment the
 * threshold is crossed so the board answers under the finger. Swipes while isLocked() is
 * true are dropped, as key presses are. Returns an unbind function.
 */
export function bindSwipeInput(
  target: SwipeTarget,
  isLocked: () => boolean,
  onMove: (dir: Direction) => void,
): () => void {
  let drag: Drag | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button > 0) return;
    if (drag !== null) {
      drag = null; // a second finger: a pinch or a two-finger scroll, not a swipe
      return;
    }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    // Missing in non-browser DOMs; without it a drag that leaves the board simply ends there.
    if (typeof target.setPointerCapture === 'function') target.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (drag === null || event.pointerId !== drag.id) return;
    const dir = swipeToDirection(event.clientX - drag.x, event.clientY - drag.y);
    if (dir === null) return;
    drag = null;
    if (isLocked()) return;
    onMove(dir);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (drag !== null && event.pointerId === drag.id) drag = null;
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerEnd);
  target.addEventListener('pointercancel', onPointerEnd);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerEnd);
    target.removeEventListener('pointercancel', onPointerEnd);
  };
}
