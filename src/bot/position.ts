import { slideLine } from '../game/rules';
import type { Direction, Tile } from '../game/types';

/** Sixteen log2 tile values; zero denotes an empty cell. */
export type Position = readonly number[];
export type PositionMove = { readonly board: Position; readonly scoreDelta: number };
type Row = { readonly moved: readonly number[]; readonly scoreDelta: number; readonly value: number; readonly playable: boolean };

const rows = new Map<number, Row>();
export const DIRECTIONS: readonly Direction[] = ['left', 'up', 'right', 'down'];
const lines: Record<Direction, number[][]> = { left: [], up: [], right: [], down: [] };
for (let k = 0; k < 4; k += 1) {
  lines.left.push([k * 4, k * 4 + 1, k * 4 + 2, k * 4 + 3]);
  lines.up.push([k, k + 4, k + 8, k + 12]);
  lines.right.push([...lines.left[k]!].reverse());
  lines.down.push([...lines.up[k]!].reverse());
}

function rowInfo(board: Position, indices: readonly number[]): Row {
  // Five bits per rank also represent 32768, 65536 and larger tiles without wrapping.
  const key = board[indices[0]!]! + board[indices[1]!]! * 32 + board[indices[2]!]! * 1024 + board[indices[3]!]! * 32768;
  const cached = rows.get(key);
  if (cached !== undefined) return cached;
  const ranks = indices.map((index) => board[index]!);
  const result = slideLine(ranks.map((rank, id) => rank === 0 ? null : { id, value: 2 ** rank }));
  let empty = 0;
  let pairs = 0;
  let previous = 0;
  let increasing = 0;
  let decreasing = 0;
  let mass = 0;
  for (let i = 0; i < 4; i += 1) {
    const rank = ranks[i]!;
    if (rank === 0) empty += 1;
    else {
      if (rank === previous) pairs += 1;
      previous = rank;
      mass += rank ** 3.5;
    }
    if (i > 0) {
      const difference = rank ** 4 - ranks[i - 1]! ** 4;
      increasing += Math.max(0, difference);
      decreasing += Math.max(0, -difference);
    }
  }
  const row: Row = {
    moved: result.values.map((value) => value === null ? 0 : Math.log2(value)),
    scoreDelta: result.scoreDelta,
    // Empty space and merge opportunities keep play alive. Penalizing changes in
    // ordering pushes large tiles toward an edge; mass favors consolidating tiles.
    value: 250 * empty + 600 * pairs - 50 * Math.min(increasing, decreasing) - 10 * mass,
    playable: empty > 0 || pairs > 0,
  };
  if (rows.size >= 65536) rows.clear();
  rows.set(key, row);
  return row;
}

export function fromTiles(tiles: readonly Tile[]): Position {
  const board = Array<number>(16).fill(0);
  for (const tile of tiles) board[tile.row * 4 + tile.col] = Math.log2(tile.value);
  return board;
}

export function slidePosition(board: Position, direction: Direction): PositionMove | null {
  const next = Array<number>(16).fill(0);
  let scoreDelta = 0;
  let changed = false;
  for (const indices of lines[direction]) {
    const row = rowInfo(board, indices);
    scoreDelta += row.scoreDelta;
    for (let i = 0; i < 4; i += 1) {
      const index = indices[i]!;
      next[index] = row.moved[i]!;
      if (next[index] !== board[index]) changed = true;
    }
  }
  return changed ? { board: next, scoreDelta } : null;
}

export function evaluate(board: Position): number {
  let value = 0;
  let playable = false;
  for (const direction of ['left', 'up'] as const) {
    for (const indices of lines[direction]) {
      const row = rowInfo(board, indices);
      value += row.value;
      playable ||= row.playable;
    }
  }
  return playable ? value : -1e9;
}
