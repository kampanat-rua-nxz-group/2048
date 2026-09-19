// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindInput, keyToDirection } from './input';

describe('keyToDirection', () => {
  it.each([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['w', 'up'],
    ['A', 'left'],
    ['s', 'down'],
    ['D', 'right'],
  ])('maps %s to %s', (key, dir) => {
    expect(keyToDirection(key)).toBe(dir);
  });

  it('returns null for unrelated keys', () => {
    expect(keyToDirection('Enter')).toBeNull();
  });
});

describe('bindInput', () => {
  let unbind: () => void = () => {};
  afterEach(() => unbind());

  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    window.dispatchEvent(event);
    return event;
  };

  it('calls onMove and prevents default scrolling for game keys', () => {
    const onMove = vi.fn();
    unbind = bindInput(window, () => false, onMove);
    const event = press('ArrowLeft');
    expect(onMove).toHaveBeenCalledWith('left');
    expect(event.defaultPrevented).toBe(true);
  });

  it('drops presses while locked', () => {
    const onMove = vi.fn();
    unbind = bindInput(window, () => true, onMove);
    press('ArrowLeft');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores unrelated keys and leaves their default alone', () => {
    const onMove = vi.fn();
    unbind = bindInput(window, () => false, onMove);
    const event = press('Tab');
    expect(onMove).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores game keys held with a modifier, leaving browser shortcuts alone', () => {
    const onMove = vi.fn();
    unbind = bindInput(window, () => false, onMove);
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true, [modifier]: true });
      window.dispatchEvent(event);
      expect(onMove).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('stops listening after unbind', () => {
    const onMove = vi.fn();
    bindInput(window, () => false, onMove)();
    press('ArrowLeft');
    expect(onMove).not.toHaveBeenCalled();
  });
});
