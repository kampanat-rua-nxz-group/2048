import { describe, expect, it } from 'vitest';
import { fourProbability, highestTile, spawnOdds, spawnValue, type SpawnOdds } from './spawn';

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

describe('fourProbability', () => {
  it.each([0, 2, 128, 512, 1024])('stays at 10%% while the largest tile is %i', (highest) => {
    expect(fourProbability(highest)).toBe(0.1);
  });

  it.each([
    [2048, 0.15],
    [4096, 0.2],
    [8192, 0.25],
  ])('climbs a step per doubling past the win: %i gives %f', (highest, expected) => {
    expect(fourProbability(highest)).toBeCloseTo(expected, 10);
  });

  it.each([8192, 16384, 131072])('caps at 25%% from %i up', (highest) => {
    expect(fourProbability(highest)).toBeCloseTo(0.25, 10);
  });

  it('never decreases as the board grows', () => {
    const board = [0, 2, 1024, 2048, 4096, 8192, 16384, 65536];
    const shares = board.map(fourProbability);
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
  });
});

describe('spawnOdds', () => {
  it('only ever offers a 2 or a 4', () => {
    for (const highest of [0, 1024, 2048, 4096, 8192, 65536]) {
      expect(spawnOdds(highest).map((odd) => odd.value)).toEqual([2, 4]);
    }
  });

  it('keeps every distribution a probability distribution', () => {
    for (const highest of [0, 1024, 2048, 4096, 8192, 65536]) {
      const odds = spawnOdds(highest);
      expect(odds.every((odd) => odd.probability > 0)).toBe(true);
      expect(odds.reduce((sum, odd) => sum + odd.probability, 0)).toBeCloseTo(1, 10);
    }
  });

  it('trades 2s for 4s as the board grows', () => {
    expect(probabilityOf(spawnOdds(1024), 2)).toBeCloseTo(0.9, 10);
    expect(probabilityOf(spawnOdds(8192), 2)).toBeCloseTo(0.75, 10);
    expect(probabilityOf(spawnOdds(8192), 4)).toBeCloseTo(0.25, 10);
  });
});

describe('spawnValue', () => {
  it.each([
    [0, 2],
    [0.89, 2],
    [0.9, 4],
    [0.999, 4],
  ])('maps a roll of %f to %i before the win', (roll, expected) => {
    expect(spawnValue(spawnOdds(1024), roll)).toBe(expected);
  });

  it.each([
    [0.74, 2],
    [0.76, 4],
    [0.999, 4],
  ])('maps a roll of %f to %i at the cap', (roll, expected) => {
    expect(spawnValue(spawnOdds(8192), roll)).toBe(expected);
  });

  it('returns the last value when rounding leaves the buckets short of 1', () => {
    expect(spawnValue([{ value: 2, probability: 0.5 }, { value: 4, probability: 0.499999 }], 0.9999999)).toBe(4);
  });
});
