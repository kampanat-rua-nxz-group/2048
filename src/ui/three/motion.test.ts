import { describe, expect, it } from 'vitest';
import {
  CELL_PITCH,
  appearScale,
  cellToWorld,
  easeOutCubic,
  lerpPoint,
  popScale,
  tiltFor,
  tiltPoint,
  TILT_RADIANS,
} from './motion';

describe('cellToWorld', () => {
  it('centres the 4x4 board on the origin', () => {
    expect(cellToWorld(0, 0)).toEqual({ x: -1.5 * CELL_PITCH, z: -1.5 * CELL_PITCH });
    expect(cellToWorld(3, 3)).toEqual({ x: 1.5 * CELL_PITCH, z: 1.5 * CELL_PITCH });
  });

  it('maps columns to x and rows to z', () => {
    const a = cellToWorld(1, 2);
    const b = cellToWorld(1, 3);
    expect(b.x - a.x).toBeCloseTo(CELL_PITCH);
    expect(b.z).toBe(a.z);
  });
});

describe('easeOutCubic', () => {
  it.each([
    [0, 0],
    [1, 1],
    [-1, 0],
    [2, 1],
  ])('maps %d to %d and clamps', (t, expected) => {
    expect(easeOutCubic(t)).toBe(expected);
  });

  it('is ahead of linear in the middle', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });
});

describe('lerpPoint', () => {
  it('interpolates both axes', () => {
    expect(lerpPoint({ x: 0, z: 0 }, { x: 2, z: -4 }, 0.25)).toEqual({ x: 0.5, z: -1 });
  });
});

describe('tiltFor', () => {
  it.each([
    ['left', { x: 0, z: TILT_RADIANS }],
    ['right', { x: 0, z: -TILT_RADIANS }],
    ['up', { x: -TILT_RADIANS, z: 0 }],
    ['down', { x: TILT_RADIANS, z: 0 }],
  ] as const)('tips the tray toward %s', (dir, expected) => {
    expect(tiltFor(dir)).toEqual(expected);
  });
});

describe('tiltPoint', () => {
  const slide = 100;
  const settle = 300;
  const level = { x: 0, z: 0 };
  // A tilt toward 'left' (z only) is interrupted mid-flight by a new tilt toward 'up' (x only) —
  // the exact scenario that used to snap the tray flat before re-tilting.
  const from = { x: 0, z: 0.03 };
  const to = { x: -0.05, z: 0 };

  it('starts exactly at the given start point and reaches the target by the end of the slide', () => {
    expect(tiltPoint(0, slide, settle, from, to)).toEqual(from);
    expect(tiltPoint(slide, slide, settle, from, to)).toEqual(to);
  });

  it('eases from the start toward the target during the slide', () => {
    const mid = tiltPoint(slide / 2, slide, settle, from, to);
    expect(mid.x).toBeLessThan(0);
    expect(mid.x).toBeGreaterThan(to.x);
    expect(mid.z).toBeGreaterThan(0);
    expect(mid.z).toBeLessThan(from.z);
  });

  it('settles back to level after the settle window regardless of the start point', () => {
    const mid = tiltPoint(slide + settle / 2, slide, settle, from, to);
    expect(mid.x).toBeLessThan(0);
    expect(mid.x).toBeGreaterThan(to.x);
    expect(mid.z).toBe(0);
    expect(tiltPoint(slide + settle, slide, settle, from, to)).toEqual(level);
    expect(tiltPoint(slide + settle + 50, slide, settle, from, to)).toEqual(level);
  });

  it('is level when motion is disabled', () => {
    expect(tiltPoint(50, 0, 0, from, to)).toEqual(level);
  });
});

describe('popScale and appearScale', () => {
  it('pops above 1 mid-way and returns to 1', () => {
    expect(popScale(0, 150)).toBe(1);
    expect(popScale(75, 150)).toBeCloseTo(1.15);
    expect(popScale(150, 150)).toBe(1);
    expect(popScale(400, 150)).toBe(1);
  });

  it('grows spawns from 0 to 1', () => {
    expect(appearScale(0, 150)).toBe(0);
    expect(appearScale(150, 150)).toBe(1);
    expect(appearScale(75, 150)).toBeGreaterThan(0.5);
  });

  it('snaps to 1 when the duration is 0', () => {
    expect(popScale(0, 0)).toBe(1);
    expect(appearScale(0, 0)).toBe(1);
  });
});
