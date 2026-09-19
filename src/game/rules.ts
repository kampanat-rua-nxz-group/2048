import { SIZE, WIN_VALUE, type Tile } from './types';

export type LineCell = { readonly id: number; readonly value: number } | null;

export type LineMove =
  | { readonly kind: 'move'; readonly id: number; readonly to: number }
  | { readonly kind: 'merge'; readonly fromIds: readonly [number, number]; readonly value: number; readonly to: number };

export type SlideResult = {
  readonly moves: readonly LineMove[];
  readonly values: readonly (number | null)[];
  readonly scoreDelta: number;
};

/** Slides one line toward index 0, merging each pair at most once. */
export function slideLine(line: readonly LineCell[]): SlideResult {
  const tiles = line.filter((cell): cell is NonNullable<LineCell> => cell !== null);
  const moves: LineMove[] = [];
  const values: (number | null)[] = line.map(() => null);
  let scoreDelta = 0;
  let target = 0;
  let i = 0;

  while (i < tiles.length) {
    const current = tiles[i]!;
    const next = tiles[i + 1];
    if (next !== undefined && next.value === current.value) {
      const value = current.value * 2;
      moves.push({ kind: 'merge', fromIds: [current.id, next.id], value, to: target });
      values[target] = value;
      scoreDelta += value;
      i += 2;
    } else {
      moves.push({ kind: 'move', id: current.id, to: target });
      values[target] = current.value;
      i += 1;
    }
    target += 1;
  }

  return { moves, values, scoreDelta };
}

export function canMove(tiles: readonly Tile[]): boolean {
  if (tiles.length < SIZE * SIZE) return true;
  const valueAt = new Map(tiles.map((t) => [`${t.row},${t.col}`, t.value]));
  return tiles.some(
    (t) =>
      valueAt.get(`${t.row},${t.col + 1}`) === t.value ||
      valueAt.get(`${t.row + 1},${t.col}`) === t.value,
  );
}

export function hasWon(tiles: readonly Tile[]): boolean {
  return tiles.some((t) => t.value >= WIN_VALUE);
}
