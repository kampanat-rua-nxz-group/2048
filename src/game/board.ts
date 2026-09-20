import { canMove, hasWon, slideLine } from './rules';
import type { Rng } from './rng';
import { highestTile, spawnOdds, spawnValue } from './spawn';
import { SIZE, type Cell, type Direction, type GameState, type MoveEvent, type MoveResult, type Tile } from './types';

const INDICES = Array.from({ length: SIZE }, (_, i) => i);

export function emptyCells(tiles: readonly Tile[]): Cell[] {
  const taken = new Set(tiles.map((t) => `${t.row},${t.col}`));
  return INDICES.flatMap((row) => INDICES.map((col) => ({ row, col }))).filter(
    (cell) => !taken.has(`${cell.row},${cell.col}`),
  );
}

/** Picks a uniformly random empty cell (first rng call) and a value (second rng call). */
export function spawnTile(tiles: readonly Tile[], id: number, rng: Rng): Tile | null {
  const empty = emptyCells(tiles);
  if (empty.length === 0) return null;
  const cell = empty[Math.floor(rng() * empty.length)]!;
  const value = spawnValue(spawnOdds(highestTile(tiles)), rng());
  return { id, value, row: cell.row, col: cell.col };
}

export function createGame(rng: Rng): GameState {
  const first = spawnTile([], 0, rng);
  if (first === null) throw new Error('Cannot spawn on an empty board');
  const second = spawnTile([first], 1, rng);
  if (second === null) throw new Error('Cannot spawn second tile');
  return { tiles: [first, second], score: 0, won: false, keepPlaying: false, over: false, nextId: 2 };
}

export function continueAfterWin(state: GameState): GameState {
  return { ...state, keepPlaying: true };
}

/** Cells of line k, ordered from the edge the tiles move toward. */
function lineCells(dir: Direction, k: number): Cell[] {
  switch (dir) {
    case 'left':
      return INDICES.map((i) => ({ row: k, col: i }));
    case 'right':
      return INDICES.map((i) => ({ row: k, col: SIZE - 1 - i }));
    case 'up':
      return INDICES.map((i) => ({ row: i, col: k }));
    case 'down':
      return INDICES.map((i) => ({ row: SIZE - 1 - i, col: k }));
  }
}

function unchanged(state: GameState): MoveResult {
  return { state, events: [], changed: false };
}

/** Slides and merges without adding a random tile. Useful for examining possible moves. */
export function slide(state: GameState, dir: Direction): MoveResult {
  if (state.over || (state.won && !state.keepPlaying)) return unchanged(state);

  const byCell = new Map(state.tiles.map((t) => [`${t.row},${t.col}`, t]));
  const byId = new Map(state.tiles.map((t) => [t.id, t]));
  const tiles: Tile[] = [];
  const events: MoveEvent[] = [];
  let nextId = state.nextId;
  let scoreDelta = 0;
  let changed = false;

  for (const k of INDICES) {
    const cells = lineCells(dir, k);
    const result = slideLine(cells.map((c) => byCell.get(`${c.row},${c.col}`) ?? null));
    scoreDelta += result.scoreDelta;

    for (const m of result.moves) {
      const dest = cells[m.to]!;
      if (m.kind === 'merge') {
        const id = nextId++;
        tiles.push({ id, value: m.value, row: dest.row, col: dest.col });
        events.push({ kind: 'merged', fromIds: m.fromIds, id, value: m.value, row: dest.row, col: dest.col });
        changed = true;
        continue;
      }
      const tile = byId.get(m.id);
      if (tile === undefined) throw new Error(`Unknown tile id ${m.id}`);
      tiles.push({ ...tile, row: dest.row, col: dest.col });
      if (tile.row !== dest.row || tile.col !== dest.col) {
        events.push({ kind: 'moved', id: tile.id, toRow: dest.row, toCol: dest.col });
        changed = true;
      }
    }
  }

  if (!changed) return unchanged(state);

  return {
    state: { ...state, tiles, score: state.score + scoreDelta, nextId, won: state.won || hasWon(tiles), over: !canMove(tiles) },
    events,
    changed: true,
  };
}

export function move(state: GameState, dir: Direction, rng: Rng): MoveResult {
  const result = slide(state, dir);
  if (!result.changed) return result;
  const { tiles } = result.state;
  let { nextId } = result.state;
  const events = [...result.events];

  const spawned = spawnTile(tiles, nextId, rng);
  const finalTiles = spawned === null ? tiles : [...tiles, spawned];
  if (spawned !== null) {
    events.push({ kind: 'spawned', id: spawned.id, value: spawned.value, row: spawned.row, col: spawned.col });
    nextId += 1;
  }

  return {
    state: {
      ...result.state,
      tiles: finalTiles,
      over: !canMove(finalTiles),
      nextId,
    },
    events,
    changed: true,
  };
}
