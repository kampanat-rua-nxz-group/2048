import { describe, expect, it } from 'vitest';
import { createGame, move, slide } from '../game/board';
import { seededRng } from '../game/rng';
import type { Direction } from '../game/types';
import { evaluate, fromTiles, slidePosition } from './position';

const directions: Direction[] = ['left', 'up', 'right', 'down'];

describe('search positions', () => {
  it('merges each tile once and supports tiles beyond 32768', () => {
    const board = [15, 15, 16, 16, ...Array<number>(12).fill(0)];
    const snapshot = [...board];
    expect(slidePosition(board, 'left')).toEqual({
      board: [16, 17, 0, 0, ...Array<number>(12).fill(0)], scoreDelta: 196608,
    });
    expect(board).toEqual(snapshot);
  });

  it('agrees with the game core in every direction across a seeded game', () => {
    const rng = seededRng(2048);
    let state = createGame(rng);
    for (let turn = 0; turn < 120 && !state.over; turn += 1) {
      const board = fromTiles(state.tiles);
      for (const direction of directions) {
        const expected = slide(state, direction);
        const actual = slidePosition(board, direction);
        if (!expected.changed) expect(actual).toBeNull();
        else expect(actual).toEqual({ board: fromTiles(expected.state.tiles), scoreDelta: expected.state.score - state.score });
      }
      const legal = directions.filter((direction) => slide(state, direction).changed);
      state = move(state, legal[turn % legal.length]!, rng).state;
    }
  });

  it('prefers ordered tiles to a trapped large tile with the same empty space', () => {
    const ordered = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0];
    const trapped = [...ordered];
    [trapped[0], trapped[5]] = [trapped[5]!, trapped[0]!];
    expect(evaluate(ordered)).toBeGreaterThan(evaluate(trapped));
  });
});
