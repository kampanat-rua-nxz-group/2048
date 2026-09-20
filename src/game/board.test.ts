import { describe, expect, it } from 'vitest';
import { continueAfterWin, createGame, emptyCells, move, slide, spawnTile } from './board';
import { seededRng, sequenceRng } from './rng';
import type { Direction, GameState, Tile } from './types';

type Grid = readonly (readonly (number | null)[])[];

// Tile ids follow reading order: row * 4 + col.
function stateFromGrid(grid: Grid, overrides: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = grid.flatMap((row, r) =>
    row.flatMap((value, c) => (value === null ? [] : [{ id: r * 4 + c, value, row: r, col: c }])),
  );
  return { tiles, score: 0, won: false, keepPlaying: false, over: false, nextId: 16, ...overrides };
}

function gridFromState(state: GameState): (number | null)[][] {
  const grid: (number | null)[][] = Array.from({ length: 4 }, () => [null, null, null, null]);
  for (const t of state.tiles) grid[t.row]![t.col] = t.value;
  return grid;
}

// rng values: first picks the empty cell index, second < 0.9 means a 2.
const spawnFirstEmptyAsTwo = () => sequenceRng([0, 0]);

describe('createGame', () => {
  it('starts with two tiles, zero score, and no flags', () => {
    const state = createGame(seededRng(1));
    expect(state.tiles).toHaveLength(2);
    expect(state.tiles.every((t) => t.value === 2 || t.value === 4)).toBe(true);
    expect(new Set(state.tiles.map((t) => `${t.row},${t.col}`)).size).toBe(2);
    expect(state).toMatchObject({ score: 0, won: false, keepPlaying: false, over: false, nextId: 2 });
  });

  it('is deterministic for the same seed', () => {
    expect(createGame(seededRng(42))).toEqual(createGame(seededRng(42)));
  });
});

describe('spawnTile', () => {
  it('places a 2 when the value roll is below 0.9', () => {
    expect(spawnTile([], 7, sequenceRng([0, 0.89]))).toEqual({ id: 7, value: 2, row: 0, col: 0 });
  });

  it('places a 4 when the value roll is 0.9 or above', () => {
    expect(spawnTile([], 7, sequenceRng([0.999, 0.9]))).toEqual({ id: 7, value: 4, row: 3, col: 3 });
  });

  it('returns null on a full board', () => {
    const full = stateFromGrid(Array.from({ length: 4 }, () => [2, 4, 2, 4])).tiles;
    expect(emptyCells(full)).toEqual([]);
    expect(spawnTile(full, 0, sequenceRng([]))).toBeNull();
  });

  it('places a 4 on a roll a pre-win board would read as a 2, once the board holds a 2048', () => {
    const won = stateFromGrid([[2048, 2, null, null]]).tiles;
    const beforeWin = stateFromGrid([[1024, 2, null, null]]).tiles;
    expect(spawnTile(beforeWin, 7, sequenceRng([0, 0.87]))).toMatchObject({ value: 2 });
    expect(spawnTile(won, 7, sequenceRng([0, 0.87]))).toEqual({ id: 7, value: 4, row: 0, col: 2 });
  });

  it('never spawns anything but a 2 or a 4, however far the board has gone', () => {
    const tiles = stateFromGrid([[65536, 2, null, null]]).tiles;
    for (const roll of [0, 0.5, 0.74, 0.76, 0.999]) {
      expect(spawnTile(tiles, 7, sequenceRng([0, roll]))?.value).toBeOneOf([2, 4]);
    }
  });
});

describe('move', () => {
  const line: Grid = [
    [2, null, 2, 4],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];

  it.each<[Direction, (number | null)[][]]>([
    ['left', [[4, 4, 2, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]],
    ['right', [[2, null, 4, 4], [null, null, null, null], [null, null, null, null], [null, null, null, null]]],
    ['down', [[2, null, null, null], [null, null, null, null], [null, null, null, null], [2, null, 2, 4]]],
  ])('slides %s', (dir, expected) => {
    const result = move(stateFromGrid(line), dir, spawnFirstEmptyAsTwo());
    expect(result.changed).toBe(true);
    expect(gridFromState(result.state)).toEqual(expected);
  });

  it('slides up', () => {
    const grid: Grid = [
      [null, null, null, null],
      [2, null, null, null],
      [null, null, null, null],
      [2, null, null, 8],
    ];
    const result = move(stateFromGrid(grid), 'up', spawnFirstEmptyAsTwo());
    expect(gridFromState(result.state)).toEqual([
      [4, 2, null, 8],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('adds merged values to the score', () => {
    const result = move(stateFromGrid([[2, 2, 4, 4]], { score: 10 }), 'left', spawnFirstEmptyAsTwo());
    expect(result.state.score).toBe(22);
  });

  it('returns the same state, no events, and no spawn when nothing moves', () => {
    const state = stateFromGrid([[2, 4, 8, 16]]);
    const result = move(state, 'left', sequenceRng([]));
    expect(result).toEqual({ state, events: [], changed: false });
  });

  it('does not mutate the input state', () => {
    const state = stateFromGrid(line);
    const snapshot = structuredClone(state);
    move(state, 'left', spawnFirstEmptyAsTwo());
    expect(state).toEqual(snapshot);
  });

  it('emits moved, merged, and spawned events with ids', () => {
    const state = stateFromGrid([[null, 2, null, 2], [null, 8, null, null]]);
    const result = move(state, 'left', sequenceRng([0, 0]));
    expect(result.events).toEqual([
      { kind: 'merged', fromIds: [1, 3], id: 16, value: 4, row: 0, col: 0 },
      { kind: 'moved', id: 5, toRow: 1, toCol: 0 },
      { kind: 'spawned', id: 17, value: 2, row: 0, col: 1 },
    ]);
    expect(result.state.nextId).toBe(18);
    expect(result.state.tiles.map((t) => t.id).sort((a, b) => a - b)).toEqual([5, 16, 17]);
  });

  it('does not emit moved events for tiles that stay put', () => {
    const result = move(stateFromGrid([[2, null, null, 4]]), 'left', spawnFirstEmptyAsTwo());
    expect(result.events.filter((e) => e.kind === 'moved')).toEqual([{ kind: 'moved', id: 3, toRow: 0, toCol: 1 }]);
  });

  it('spawns from the odds the slide leaves behind, not the ones it started with', () => {
    // The merge lifts the board to 2048, which lifts this move's own spawn to 15% fours.
    const result = move(stateFromGrid([[1024, 1024, null, null]]), 'left', sequenceRng([0, 0.87]));
    expect(result.events.at(-1)).toMatchObject({ kind: 'spawned', value: 4 });
  });

  it('sets won when a tile reaches 2048', () => {
    const result = move(stateFromGrid([[1024, 1024]]), 'left', spawnFirstEmptyAsTwo());
    expect(result.state.won).toBe(true);
    expect(result.state.keepPlaying).toBe(false);
  });

  it('blocks moves after a win until the player continues', () => {
    const won = stateFromGrid([[2048, null, 2, null]], { won: true });
    expect(move(won, 'left', sequenceRng([])).changed).toBe(false);

    const continued = continueAfterWin(won);
    expect(continued).toMatchObject({ won: true, keepPlaying: true });
    expect(move(continued, 'left', spawnFirstEmptyAsTwo()).changed).toBe(true);
  });

  it('sets over when the board is full with no merges after the spawn', () => {
    const grid: Grid = [
      [null, 2, 4, 8],
      [4, 8, 16, 32],
      [8, 16, 32, 64],
      [16, 32, 64, 128],
    ];
    // After sliding left, the only empty cell is [0,3]; a 2 there leaves no merges.
    const result = move(stateFromGrid(grid), 'left', sequenceRng([0, 0]));
    expect(gridFromState(result.state)[0]).toEqual([2, 4, 8, 2]);
    expect(result.state.over).toBe(true);
  });

  it('ignores moves once the game is over', () => {
    const state = stateFromGrid([[2, null]], { over: true });
    expect(move(state, 'right', sequenceRng([])).changed).toBe(false);
  });
});

describe('slide', () => {
  it('merges without spawning, leaving the input and tile identities intact', () => {
    const state = stateFromGrid([[2, 2, 4, 4]], { score: 10 });
    const snapshot = structuredClone(state);
    const result = slide(state, 'left');
    expect(gridFromState(result.state)).toEqual([
      [4, 8, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    expect(result.state.score).toBe(22);
    expect(result.state.nextId).toBe(18);
    expect(result.events.map((event) => event.kind)).toEqual(['merged', 'merged']);
    expect(state).toEqual(snapshot);
  });
});

describe('continueAfterWin', () => {
  it('returns a new state without mutating the input', () => {
    const won = stateFromGrid([[2048]], { won: true });
    const next = continueAfterWin(won);
    expect(next).not.toBe(won);
    expect(won.keepPlaying).toBe(false);
  });
});
