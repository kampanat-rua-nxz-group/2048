// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SWIPE_MIN_PX, bindSwipeInput, swipeToDirection } from './touch';

describe('swipeToDirection', () => {
  it.each([
    [60, 0, 'right'],
    [-60, 0, 'left'],
    [0, 60, 'down'],
    [0, -60, 'up'],
    [60, 20, 'right'],
    [-20, -60, 'up'],
  ])('maps a (%s, %s) drag to %s', (dx, dy, dir) => {
    expect(swipeToDirection(dx, dy)).toBe(dir);
  });

  it('ignores drags shorter than the threshold', () => {
    expect(swipeToDirection(SWIPE_MIN_PX - 1, SWIPE_MIN_PX - 1)).toBeNull();
    expect(swipeToDirection(0, 0)).toBeNull();
  });

  it('accepts a drag exactly at the threshold', () => {
    expect(swipeToDirection(SWIPE_MIN_PX, 0)).toBe('right');
  });

  it('resolves an even diagonal vertically', () => {
    expect(swipeToDirection(60, 60)).toBe('down');
  });
});

describe('bindSwipeInput', () => {
  let unbind: () => void = () => {};
  afterEach(() => unbind());

  const target = () => document.createElement('div');

  const pointer = (el: HTMLElement, type: string, x: number, y: number, init: PointerEventInit = {}) => {
    const event = new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, cancelable: true, ...init });
    el.dispatchEvent(event);
    return event;
  };

  const swipe = (el: HTMLElement, dx: number, dy: number) => {
    pointer(el, 'pointerdown', 100, 100);
    pointer(el, 'pointermove', 100 + dx, 100 + dy);
    pointer(el, 'pointerup', 100 + dx, 100 + dy);
  };

  it('calls onMove once the drag passes the threshold', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    swipe(el, -80, 10);
    expect(onMove).toHaveBeenCalledExactlyOnceWith('left');
  });

  it('reports the move as soon as the threshold is crossed, before the finger lifts', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointerdown', 100, 100);
    pointer(el, 'pointermove', 100, 180);
    expect(onMove).toHaveBeenCalledWith('down');
  });

  it('reports only one move per drag', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointerdown', 100, 100);
    pointer(el, 'pointermove', 180, 100);
    pointer(el, 'pointermove', 260, 100);
    pointer(el, 'pointerup', 260, 100);
    expect(onMove).toHaveBeenCalledExactlyOnceWith('right');
  });

  it('treats a tap as no move', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    swipe(el, 2, 3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('drops swipes while locked', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => true, onMove);
    swipe(el, 80, 0);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores a second finger so pinches do not move the board', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointerdown', 100, 100);
    pointer(el, 'pointerdown', 200, 200, { pointerId: 2 });
    pointer(el, 'pointermove', 40, 100);
    pointer(el, 'pointermove', 260, 200, { pointerId: 2 });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores moves from a pointer that never went down', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointermove', 300, 100);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('abandons a drag that is cancelled', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointerdown', 100, 100);
    pointer(el, 'pointercancel', 100, 100);
    pointer(el, 'pointermove', 300, 100);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores secondary mouse buttons', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    pointer(el, 'pointerdown', 100, 100, { button: 2 });
    pointer(el, 'pointermove', 300, 100);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('starts a fresh drag after the previous one ends', () => {
    const el = target();
    const onMove = vi.fn();
    unbind = bindSwipeInput(el, () => false, onMove);
    swipe(el, 80, 0);
    swipe(el, 0, -80);
    expect(onMove).toHaveBeenNthCalledWith(1, 'right');
    expect(onMove).toHaveBeenNthCalledWith(2, 'up');
  });

  it('takes pointer capture when the target supports it, so a drag survives leaving the board', () => {
    const el = target();
    const capture = vi.fn();
    Object.defineProperty(el, 'setPointerCapture', { value: capture, configurable: true });
    unbind = bindSwipeInput(el, () => false, vi.fn());
    pointer(el, 'pointerdown', 100, 100);
    expect(capture).toHaveBeenCalledWith(1);
  });

  it('stops listening after unbind', () => {
    const el = target();
    const onMove = vi.fn();
    bindSwipeInput(el, () => false, onMove)();
    swipe(el, 80, 0);
    expect(onMove).not.toHaveBeenCalled();
  });
});
