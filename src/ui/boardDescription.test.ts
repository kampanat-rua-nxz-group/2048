import { describe, expect, it } from 'vitest';
import { describeBoard } from './boardDescription';

describe('describeBoard', () => {
  it('reads the board row by row with empty cells named', () => {
    const text = describeBoard({
      tiles: [
        { id: 1, value: 2, row: 0, col: 0 },
        { id: 2, value: 8, row: 0, col: 3 },
        { id: 3, value: 4, row: 3, col: 1 },
      ],
      score: 12,
      won: false,
      keepPlaying: false,
      over: false,
      nextId: 4,
    });
    expect(text).toBe(
      'Score 12. Row 1: 2, empty, empty, 8. Row 2: empty, empty, empty, empty. ' +
        'Row 3: empty, empty, empty, empty. Row 4: empty, 4, empty, empty.',
    );
  });
});
