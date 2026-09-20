import { WIN_VALUE, type Tile } from './types';

/** Odds of one spawn value. Probabilities across a distribution sum to 1. */
export type SpawnOdds = { readonly value: number; readonly probability: number };

/** Share of spawns that are a 4 while the board is still on its way to the win. */
const FOUR_BASE = 0.1;
/** Added to that share for each doubling of the largest tile, counting the win itself. */
const FOUR_STEP = 0.05;
/** The share stops climbing here, so the board never turns into a coin flip. */
const FOUR_MAX = 0.25;

export function highestTile(tiles: readonly Tile[]): number {
  let highest = 0;
  for (const tile of tiles) if (tile.value > highest) highest = tile.value;
  return highest;
}

/**
 * Share of spawns that come out as a 4 on a board whose largest tile is `highest`.
 * Play up to the win keeps the classic 10%; past it every doubling adds a step,
 * so a board that keeps growing fills with tiles that are worth more to merge.
 */
export function fourProbability(highest: number): number {
  if (highest < WIN_VALUE) return FOUR_BASE;
  const steps = Math.log2(highest) - Math.log2(WIN_VALUE) + 1;
  return Math.min(FOUR_MAX, FOUR_BASE + FOUR_STEP * steps);
}

/** Spawn odds for a board whose largest tile is `highest`, ordered 2 then 4. */
export function spawnOdds(highest: number): readonly SpawnOdds[] {
  const four = fourProbability(highest);
  return [
    { value: 2, probability: 1 - four },
    { value: 4, probability: four },
  ];
}

/** Picks a value from `odds` with a single roll in [0, 1). */
export function spawnValue(odds: readonly SpawnOdds[], roll: number): number {
  let cumulative = 0;
  for (const odd of odds) {
    cumulative += odd.probability;
    if (roll < cumulative) return odd.value;
  }
  // Floating point can leave the last bucket a hair short of 1.
  return odds[odds.length - 1]!.value;
}
