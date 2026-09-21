import type { Direction, Tile } from '../game/types';
import { DIRECTIONS, evaluate, evaluateAfterSpawn, fromTiles, slidePosition, type Position } from './position';

export type SearchOptions = {
  readonly timeMs?: number;
  readonly maxDepth?: number;
  /** Approximate rarer spawn sequences with the board heuristic; zero searches exactly. */
  readonly minProbability?: number;
};
export type SearchResult = { readonly direction: Direction | null; readonly depth: number; readonly nodes: number };

/** Iterative deepening retains the last fully completed search when time runs out. */
export function chooseMove(tiles: readonly Tile[], options: SearchOptions = {}): SearchResult {
  const deadline = performance.now() + (options.timeMs ?? 150);
  const maxDepth = options.maxDepth ?? 8;
  const minProbability = options.minProbability ?? 0.0001;
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
  const cache = Array.from({ length: maxDepth + 1 }, () => new Map<string, { probability: number; value: number }>());

  function checkTime(): void {
    nodes += 1;
    if ((nodes & 127) === 0 && performance.now() >= deadline) throw timeout;
  }

  function player(position: Position, depth: number, probability: number): number {
    checkTime();
    if (depth === 0 || probability < minProbability) return evaluate(position);
    const key = String.fromCharCode(...position);
    const cached = cache[depth]!.get(key);
    const cacheProbability = minProbability === 0 || depth === 1 ? 0 : probability;
    // The cutoff depends on path probability as well as board and depth.
    if (cached !== undefined && cached.probability === cacheProbability) return cached.value;
    let best = -1e9;
    for (const dir of DIRECTIONS) {
      const moved = slidePosition(position, dir);
      if (moved !== null) best = Math.max(best, moved.scoreDelta + chance(moved.board, depth - 1, probability));
    }
    cache[depth]!.set(key, { probability: cacheProbability, value: best });
    return best;
  }

  function chance(position: Position, depth: number, probability: number): number {
    checkTime();
    if (depth === 0) return evaluateAfterSpawn(position);
    let total = 0;
    let empty = 0;
    for (let i = 0; i < 16; i += 1) if (position[i] === 0) empty += 1;
    if (empty > 0 && probability * 0.9 / empty < minProbability) return evaluateAfterSpawn(position);
    const spawned = [...position];
    for (let i = 0; i < 16; i += 1) {
      if (position[i] !== 0) continue;
      spawned[i] = 1;
      total += 0.9 * player(spawned, depth, probability * 0.9 / empty);
      spawned[i] = 2;
      total += 0.1 * player(spawned, depth, probability * 0.1 / empty);
      spawned[i] = 0;
    }
    return empty === 0 ? player(position, depth, probability) : total / empty;
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let best = -Infinity;
    let candidate = direction;
    try {
      for (const moved of moves) {
        if (performance.now() >= deadline) throw timeout;
        const value = moved.scoreDelta + chance(moved.board, depth - 1, 1);
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
