import { describe, expect, it } from 'vitest';
import { canMove, hasWon, slideLine, type LineCell } from './rules';
import type { Tile } from './types';

const toLine = (values: readonly (number | null)[]): LineCell[] =>
  values.map((value, i) => (value === null ? null : { id: i, value }));

const tilesFromGrid = (grid: readonly (readonly (number | null)[])[]): Tile[] =>
  grid.flatMap((row, r) =>
    row.flatMap((value, c) => (value === null ? [] : [{ id: r * 4 + c, value, row: r, col: c }])),
  );

describe('slideLine', () => {
  it.each([
    { input: [2, 2, 2, 2], values: [4, 4, null, null], score: 8 },
    { input: [2, 2, 4, null], values: [4, 4, null, null], score: 4 },
    { input: [4, null, 4, 8], values: [8, 8, null, null], score: 8 },
    { input: [2, 4, 8, 16], values: [2, 4, 8, 16], score: 0 },
    { input: [null, null, null, 2], values: [2, null, null, null], score: 0 },
    { input: [null, null, null, null], values: [null, null, null, null], score: 0 },
  ])('slides $input to $values scoring $score', ({ input, values, score }) => {
    const result = slideLine(toLine(input));
    expect(result.values).toEqual(values);
    expect(result.scoreDelta).toBe(score);
  });

  it('reports merges with both source ids and moves with target index', () => {
    const result = slideLine(toLine([null, 2, null, 2]));
    expect(result.moves).toEqual([{ kind: 'merge', fromIds: [1, 3], value: 4, to: 0 }]);
  });

  it('reports a move for every surviving tile, including ones that stay put', () => {
    const result = slideLine(toLine([2, null, 4, null]));
    expect(result.moves).toEqual([
      { kind: 'move', id: 0, to: 0 },
      { kind: 'move', id: 2, to: 1 },
    ]);
  });

  it('does not mutate its input', () => {
    const line = toLine([2, 2, null, 4]);
    const snapshot = structuredClone(line);
    slideLine(line);
    expect(line).toEqual(snapshot);
  });
});

describe('canMove', () => {
  it('is true when any cell is empty', () => {
    expect(canMove(tilesFromGrid([[2, null, null, null]]))).toBe(true);
  });

  it('is true on a full board with a horizontal pair', () => {
    const grid = [
      [2, 2, 4, 8],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    ];
    expect(canMove(tilesFromGrid(grid))).toBe(true);
  });

  it('is true on a full board with a vertical pair', () => {
    const grid = [
      [2, 4, 2, 4],
      [2, 8, 4, 2],
      [4, 2, 8, 4],
      [8, 4, 2, 8],
    ];
    expect(canMove(tilesFromGrid(grid))).toBe(true);
  });

  it('is false on a full board with no equal neighbours', () => {
    const grid = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(canMove(tilesFromGrid(grid))).toBe(false);
  });
});

describe('hasWon', () => {
  it('is true once a tile reaches 2048', () => {
    expect(hasWon(tilesFromGrid([[2048]]))).toBe(true);
  });

  it('is false below 2048', () => {
    expect(hasWon(tilesFromGrid([[1024, 1024]]))).toBe(false);
  });
});
