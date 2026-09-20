import { spawnOdds } from '../game/spawn';
import type { Direction, Tile } from '../game/types';
import { DIRECTIONS, evaluate, fromTiles, slidePosition, type Position } from './position';

type SpawnRank = { readonly rank: number; readonly probability: number };

/** Spawn odds as log2 ranks, keyed by the board's largest rank. Shared across searches. */
const spawnRanks = new Map<number, readonly SpawnRank[]>();

function ranksFor(highestRank: number): readonly SpawnRank[] {
  const cached = spawnRanks.get(highestRank);
  if (cached !== undefined) return cached;
  const ranks = spawnOdds(2 ** highestRank).map(({ value, probability }) => ({ rank: Math.log2(value), probability }));
  spawnRanks.set(highestRank, ranks);
  return ranks;
}

export type SearchOptions = { readonly timeMs?: number; readonly maxDepth?: number };
export type SearchResult = { readonly direction: Direction | null; readonly depth: number; readonly nodes: number };

/** Iterative deepening retains the last fully completed search when time runs out. */
export function chooseMove(tiles: readonly Tile[], options: SearchOptions = {}): SearchResult {
  const deadline = performance.now() + (options.timeMs ?? 150);
  const maxDepth = options.maxDepth ?? 6;
  const board = fromTiles(tiles);
  const moves = DIRECTIONS.flatMap((direction) => {
    const moved = slidePosition(board, direction);
    return moved === null ? [] : [{ direction, ...moved }];
  });
  if (moves.length === 0) return { direction: null, depth: 0, nodes: 0 };

  // Always have a legal choice, even on a slow device or a zero thinking budget.
  moves.sort((a, b) => (b.scoreDelta + evaluate(b.board)) - (a.scoreDelta + evaluate(a.board)));
  let direction = moves[0]!.direction;
  let completedDepth = 0;
  let nodes = 0;
  const timeout = Symbol('search timeout');
  const cache = Array.from({ length: maxDepth + 1 }, () => new Map<string, number>());

  function checkTime(): void {
    nodes += 1;
    if ((nodes & 127) === 0 && performance.now() >= deadline) throw timeout;
  }

  function player(position: Position, depth: number): number {
    checkTime();
    if (depth === 0) return evaluate(position);
    const key = String.fromCharCode(...position);
    const cached = cache[depth]!.get(key);
    if (cached !== undefined) return cached;
    let best = -1e9;
    for (const dir of DIRECTIONS) {
      const moved = slidePosition(position, dir);
      if (moved !== null) best = Math.max(best, moved.scoreDelta + chance(moved.board, depth - 1));
    }
    cache[depth]!.set(key, best);
    return best;
  }

  function chance(position: Position, depth: number): number {
    checkTime();
    let total = 0;
    let empty = 0;
    let highestRank = 0;
    for (let i = 0; i < 16; i += 1) if (position[i]! > highestRank) highestRank = position[i]!;
    const ranks = ranksFor(highestRank);
    const spawned = [...position];
    for (let i = 0; i < 16; i += 1) {
      if (position[i] !== 0) continue;
      empty += 1;
      for (const { rank, probability } of ranks) {
        spawned[i] = rank;
        total += probability * player(spawned, depth);
      }
      spawned[i] = 0;
    }
    return empty === 0 ? player(position, depth) : total / empty;
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let best = -Infinity;
    let candidate = direction;
    try {
      for (const moved of moves) {
        if (performance.now() >= deadline) throw timeout;
        const value = moved.scoreDelta + chance(moved.board, depth - 1);
        if (value > best) {
          best = value;
          candidate = moved.direction;
        }
      }
    } catch (error) {
      if (error !== timeout) throw error;
      break;
    }
    direction = candidate;
    completedDepth = depth;
  }
  return { direction, depth: completedDepth, nodes };
}
