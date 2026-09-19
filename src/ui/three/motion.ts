import { SIZE, type Direction } from '../../game/types';

/** World units. One tile is 1 wide; the gap between tiles is GAP. */
export const GAP = 0.12;
export const CELL_PITCH = 1 + GAP;
export const TILT_RADIANS = (4 * Math.PI) / 180;
const POP_PEAK = 0.15;

export type Point = { readonly x: number; readonly z: number };

export function cellToWorld(row: number, col: number): Point {
  const offset = (SIZE - 1) / 2;
  return { x: (col - offset) * CELL_PITCH, z: (row - offset) * CELL_PITCH };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - (1 - c) ** 3;
}

export function lerpPoint(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
}

/** Tray rotation that lowers the edge the tiles slide toward. Camera looks from +z. */
export function tiltFor(dir: Direction): Point {
  switch (dir) {
    case 'left':
      return { x: 0, z: TILT_RADIANS };
    case 'right':
      return { x: 0, z: -TILT_RADIANS };
    case 'up':
      return { x: -TILT_RADIANS, z: 0 };
    case 'down':
      return { x: TILT_RADIANS, z: 0 };
  }
}

const LEVEL: Point = { x: 0, z: 0 };

/**
 * Tray tilt path: eases from `from` (the tray's rotation when this tilt started, which may
 * already be mid-tilt) to `to` over the slide, then eases back to level over the settle window.
 */
export function tiltPoint(elapsedMs: number, slideMs: number, settleMs: number, from: Point, to: Point): Point {
  if (slideMs <= 0) return LEVEL;
  if (elapsedMs < slideMs) return lerpPoint(from, to, easeOutCubic(elapsedMs / slideMs));
  if (settleMs <= 0) return LEVEL;
  return lerpPoint(to, LEVEL, easeOutCubic((elapsedMs - slideMs) / settleMs));
}

/** Merge pop: 1 → 1 + POP_PEAK → 1 as a sine arch. */
export function popScale(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return 1;
  return 1 + POP_PEAK * Math.sin(Math.PI * clamp01(elapsedMs / durationMs));
}

/** Spawn grow: 0 → 1. */
export function appearScale(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return easeOutCubic(elapsedMs / durationMs);
}
