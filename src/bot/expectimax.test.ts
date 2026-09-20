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
    // Omitting 4s chooses left; reversing 90/10 chooses right. Correct odds choose up.
    const tiles = tilesFrom([32, 64, 256, 32, 512, 8, 2, 64, 8, 256, 512, 2, 4, 8, 0, 2]);
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
