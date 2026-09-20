import type { Tile } from '../game/types';
import { chooseMove } from './expectimax';

self.onmessage = ({ data }: MessageEvent<readonly Tile[]>) => {
  self.postMessage(chooseMove(data));
};
