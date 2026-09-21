import { describe, expect, it, vi } from 'vitest';
import { createGame, slide } from '../game/board';
import { seededRng } from '../game/rng';
import type { Direction, GameState, Tile } from '../game/types';
import { chooseMove } from './expectimax';
import { evaluate, fromTiles } from './position';

const directions: Direction[] = ['left', 'up', 'right', 'down'];
const tilesFrom = (values: number[]): Tile[] => values.flatMap((value, id) => (
  value === 0 ? [] : [{ id, value, row: Math.floor(id / 4), col: id % 4 }]
));

describe('expectimax', () => {
  it('spends fewer nodes on rare spawn sequences while retaining the best move', () => {
    const tiles = tilesFrom([16384, 8192, 4096, 2048, 256, 512, 1024, 1024, 128, 64, 32, 16, 0, 0, 2, 2]);
    const exact = chooseMove(tiles, { maxDepth: 4, timeMs: Infinity, minProbability: 0 });
    const pruned = chooseMove(tiles, { maxDepth: 4, timeMs: Infinity, minProbability: 0.01 });
    expect(pruned.direction).toBe(exact.direction);
    expect(pruned.depth).toBe(4);
    expect(pruned.nodes).toBeLessThan(exact.nodes / 2);
  });

  it.each([8192, 16384, 32768])('builds a tile above %i when that is the only legal merge', (value) => {
    const tiles = tilesFrom([value, value, 4, 2, 4, 2, 8, 4, 2, 4, 2, 8, 4, 2, 4, 2]);
    const result = chooseMove(tiles, { maxDepth: 2, timeMs: Infinity });
    const state: GameState = { tiles, score: 0, nextId: 16, won: true, over: false, keepPlaying: true };
    expect(slide(state, result.direction!).state.tiles.some((tile) => tile.value === value * 2)).toBe(true);
  });

  it('returns no move on a full board without adjacent equal tiles', () => {
    const tiles = tilesFrom([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(chooseMove(tiles).direction).toBeNull();
  });

  it('returns a legal fallback even when its thinking budget is exhausted', () => {
    const state = createGame(seededRng(42));
    const result = chooseMove(state.tiles, { timeMs: 0 });
    expect(result.direction).not.toBeNull();
    expect(slide(state, result.direction!).changed).toBe(true);
    expect(result.depth).toBe(0);
  });

  it('searches beyond the winning tile without modifying tiles or drawing randomness', () => {
    const tiles = tilesFrom([2048, 2048, 4, 2]);
    const before = structuredClone(tiles);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Search must not peek at RNG'); });
    try {
      const result = chooseMove(tiles, { maxDepth: 2, timeMs: Infinity });
      expect(result.direction).not.toBeNull();
      expect(result.depth).toBe(2);
      expect(tiles).toEqual(before);
    } finally {
      random.mockRestore();
    }
  });

  it('chooses the best probability-weighted outcome, including 4 spawns', () => {
    // Omitting 4s chooses down; reversing 90/10 chooses right. Correct odds choose up.
    const tiles = tilesFrom([256, 8, 2, 512, 512, 8, 16, 2, 4, 0, 32, 256, 512, 16, 64, 128]);
    const state: GameState = { tiles, score: 0, nextId: 16, won: false, over: false, keepPlaying: true };
    // Independent one-turn oracle uses the actual game engine and enumerates spawns.
    const scores = directions.map((direction) => {
      const moved = slide(state, direction);
      if (!moved.changed) return { direction, value: -Infinity };
      const occupied = new Set(moved.state.tiles.map((tile) => tile.row * 4 + tile.col));
      let sum = 0;
      for (let cell = 0; cell < 16; cell += 1) {
        if (occupied.has(cell)) continue;
        for (const [value, probability] of [[2, 0.9], [4, 0.1]] as const) {
          const spawned = [...moved.state.tiles, { id: 99, value, row: Math.floor(cell / 4), col: cell % 4 }];
          sum += probability * evaluate(fromTiles(spawned));
        }
      }
      return { direction, value: moved.state.score + sum / (16 - occupied.size) };
    });
    const expected = scores.sort((a, b) => b.value - a.value)[0]!;
    expect(expected.direction).toBe('up');
    expect(chooseMove(tiles, { maxDepth: 1, timeMs: Infinity }).direction).toBe(expected.direction);
  });
});
