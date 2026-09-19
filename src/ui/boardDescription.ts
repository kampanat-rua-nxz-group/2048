import { SIZE, type GameState } from '../game/types';

/** Plain-text board for the screen-reader live region. */
export function describeBoard(state: GameState): string {
  const valueAt = new Map(state.tiles.map((t) => [`${t.row},${t.col}`, t.value]));
  const rows = Array.from({ length: SIZE }, (_, row) => {
    const cells = Array.from({ length: SIZE }, (_, col) => String(valueAt.get(`${row},${col}`) ?? 'empty'));
    return `Row ${row + 1}: ${cells.join(', ')}.`;
  });
  return [`Score ${state.score}.`, ...rows].join(' ');
}
