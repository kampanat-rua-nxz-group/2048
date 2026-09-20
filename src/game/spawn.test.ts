import { describe, expect, it } from 'vitest';
import { highestTile, spawnOdds, spawnValue, type SpawnOdds } from './spawn';

const valuesOf = (odds: readonly SpawnOdds[]): number[] => odds.map((odd) => odd.value);
const probabilityOf = (odds: readonly SpawnOdds[], value: number): number =>
  odds.find((odd) => odd.value === value)?.probability ?? 0;

describe('highestTile', () => {
  it('is zero on an empty board', () => {
    expect(highestTile([])).toBe(0);
  });

  it('reads the largest value regardless of order', () => {
    const tiles = [64, 1024, 4].map((value, id) => ({ id, value, row: 0, col: id }));
    expect(highestTile(tiles)).toBe(1024);
  });
});

describe('spawnOdds', () => {
  it('spawns only 2s and 4s at 90/10 before the first rung', () => {
    for (const highest of [0, 2, 512, 1024, 2047]) {
      expect(spawnOdds(highest)).toEqual([
        { value: 2, probability: 0.9 },
        { value: 4, probability: 0.1 },
      ]);
    }
  });

  it.each([
    [2048, [2, 4, 8]],
    [4096, [2, 4, 8]],
    [8192, [2, 4, 8, 16]],
    [16384, [2, 4, 8, 16]],
    [32768, [2, 4, 8, 16, 32]],
    [131072, [2, 4, 8, 16, 32]],
  ])('unlocks %i-tile spawns %j', (highest, expected) => {
    expect(valuesOf(spawnOdds(highest))).toEqual(expected);
  });

  it('keeps every distribution a probability distribution', () => {
    for (const highest of [0, 2048, 8192, 32768]) {
      const odds = spawnOdds(highest);
      expect(odds.every((odd) => odd.probability > 0)).toBe(true);
      expect(odds.reduce((sum, odd) => sum + odd.probability, 0)).toBeCloseTo(1, 10);
    }
  });

  it('takes the big spawns out of the small ones, keeping 2s nine times as likely as 4s', () => {
    const odds = spawnOdds(8192);
    expect(probabilityOf(odds, 8)).toBeCloseTo(0.08, 10);
    expect(probabilityOf(odds, 16)).toBeCloseTo(0.04, 10);
    expect(probabilityOf(odds, 2) + probabilityOf(odds, 4)).toBeCloseTo(0.88, 10);
    expect(probabilityOf(odds, 2)).toBeCloseTo(9 * probabilityOf(odds, 4), 10);
  });

  it('makes small spawns rarer as the board grows', () => {
    const smalls = [0, 2048, 8192, 32768].map((highest) => probabilityOf(spawnOdds(highest), 2));
    expect(smalls).toEqual([...smalls].sort((a, b) => b - a));
    expect(new Set(smalls).size).toBe(smalls.length);
  });
});

describe('spawnValue', () => {
  const odds = spawnOdds(8192); // 2: 0.792, 4: 0.088, 8: 0.08, 16: 0.04

  it.each([
    [0, 2],
    [0.791, 2],
    [0.8, 4],
    [0.88, 8],
    [0.96, 16],
    [0.999, 16],
  ])('maps a roll of %f to %i', (roll, expected) => {
    expect(spawnValue(odds, roll)).toBe(expected);
  });

  it('returns the last value when rounding leaves the buckets short of 1', () => {
    expect(spawnValue([{ value: 2, probability: 0.5 }, { value: 4, probability: 0.499999 }], 0.9999999)).toBe(4);
  });
});
