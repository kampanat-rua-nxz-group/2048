import type { Tile } from './types';

/** Odds of one spawn value. Probabilities across a distribution sum to 1. */
export type SpawnOdds = { readonly value: number; readonly probability: number };

/** Share of the 2/4 spawns that come out as a 4. */
const FOUR_PROBABILITY = 0.1;

/**
 * Each rung unlocks a bigger spawn value once the board's largest tile reaches it,
 * so a board that keeps growing keeps filling with tiles worth merging. The first
 * rung sits at the winning tile: play up to 2048 keeps the classic 2/4 spawns.
 */
const LADDER: readonly { readonly unlockedAt: number; readonly value: number; readonly probability: number }[] = [
  { unlockedAt: 2048, value: 8, probability: 0.08 },
  { unlockedAt: 8192, value: 16, probability: 0.04 },
  { unlockedAt: 32768, value: 32, probability: 0.02 },
];

export function highestTile(tiles: readonly Tile[]): number {
  let highest = 0;
  for (const tile of tiles) if (tile.value > highest) highest = tile.value;
  return highest;
}

/** Spawn odds for a board whose largest tile is `highest`, ordered 2, 4, then the unlocked rungs. */
export function spawnOdds(highest: number): readonly SpawnOdds[] {
  const unlocked = LADDER.filter((rung) => highest >= rung.unlockedAt);
  const small = 1 - unlocked.reduce((sum, rung) => sum + rung.probability, 0);
  return [
    { value: 2, probability: small * (1 - FOUR_PROBABILITY) },
    { value: 4, probability: small * FOUR_PROBABILITY },
    ...unlocked.map(({ value, probability }) => ({ value, probability })),
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
