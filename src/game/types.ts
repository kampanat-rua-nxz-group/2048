export const SIZE = 4;
export const WIN_VALUE = 2048;

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Cell = { readonly row: number; readonly col: number };

export type Tile = {
  readonly id: number;
  readonly value: number;
  readonly row: number;
  readonly col: number;
};

export type GameState = {
  readonly tiles: readonly Tile[];
  readonly score: number;
  readonly won: boolean;
  readonly keepPlaying: boolean;
  readonly over: boolean;
  readonly nextId: number;
};

export type MoveEvent =
  | { readonly kind: 'moved'; readonly id: number; readonly toRow: number; readonly toCol: number }
  | {
      readonly kind: 'merged';
      readonly fromIds: readonly [number, number];
      readonly id: number;
      readonly value: number;
      readonly row: number;
      readonly col: number;
    }
  | { readonly kind: 'spawned'; readonly id: number; readonly value: number; readonly row: number; readonly col: number };

export type MoveResult = {
  readonly state: GameState;
  readonly events: readonly MoveEvent[];
  readonly changed: boolean;
};
