import type { Group } from 'three';
import type { Direction, GameState, MoveEvent } from '../../game/types';
import type { Renderer } from '../renderer';
import { appearScale, cellToWorld, easeOutCubic, lerpPoint, popScale, tiltFor, tiltPoint, type Point } from './motion';
import type { Theme } from './palette';
import { createStage } from './stage';
import { createTileFactory } from './tiles';

export type ThreeRendererOptions = {
  readonly slideMs: number;
  readonly reducedMotion: boolean;
  readonly theme: Theme;
};
export type ThreeRenderer = Renderer & { dispose(): void };

/** Returns true when finished. */
type Animation = (elapsedMs: number) => boolean;
type Running = { readonly start: number; readonly step: Animation };

const SETTLE_MS = 320;
const POP_MS = 160;
const APPEAR_MS = 160;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Throws when WebGL is unavailable. */
export function createThreeRenderer(host: HTMLElement, options: ThreeRendererOptions): ThreeRenderer {
  const stage = createStage(host, options.theme);
  const factory = createTileFactory(options.theme);
  const slideMs = options.reducedMotion ? 0 : options.slideMs;
  const popMs = options.reducedMotion ? 0 : POP_MS;
  const appearMs = options.reducedMotion ? 0 : APPEAR_MS;

  let tiles = new Map<number, Group>();
  let running: readonly Running[] = [];
  let tilting: Running | null = null;
  let generation = 0;
  let animating = false;

  const tick = (now: number) => {
    running = running.filter(({ start, step }) => !step(now - start));
    stage.render();
    if (running.length === 0) stage.renderer.setAnimationLoop(null);
  };

  const play = (step: Animation): Running => {
    const entry: Running = { start: performance.now(), step };
    running = [...running, entry];
    stage.renderer.setAnimationLoop(tick);
    return entry;
  };

  const groupFor = (id: number): Group => {
    const group = tiles.get(id);
    if (group === undefined) throw new Error(`Unknown tile id ${id}`);
    return group;
  };

  const place = (group: Group, { x, z }: Point) => group.position.set(x, 0, z);

  const addTile = (id: number, value: number, row: number, col: number): Group => {
    const group = factory.create(value);
    place(group, cellToWorld(row, col));
    stage.tileLayer.add(group);
    tiles = new Map(tiles).set(id, group);
    return group;
  };

  const removeTile = (id: number) => {
    stage.tileLayer.remove(groupFor(id));
    const next = new Map(tiles);
    next.delete(id);
    tiles = next;
  };

  const slide = (group: Group, to: Point) => {
    const from: Point = { x: group.position.x, z: group.position.z };
    if (slideMs === 0) return place(group, to);
    play((elapsed) => {
      place(group, lerpPoint(from, to, easeOutCubic(elapsed / slideMs)));
      return elapsed >= slideMs;
    });
  };

  const tilt = (dir: Direction) => {
    const from: Point = { x: stage.tray.rotation.x, z: stage.tray.rotation.z };
    const to = tiltFor(dir);
    if (tilting !== null) {
      const finished = tilting;
      running = running.filter((entry) => entry !== finished);
    }
    tilting = play((elapsed) => {
      const point = tiltPoint(elapsed, slideMs, SETTLE_MS, from, to);
      stage.tray.rotation.set(point.x, 0, point.z);
      const done = elapsed >= slideMs + SETTLE_MS;
      if (done) tilting = null;
      return done;
    });
  };

  const scaleIn = (group: Group, scaleAt: (elapsed: number) => number, durationMs: number) => {
    if (durationMs <= 0) {
      group.scale.setScalar(scaleAt(durationMs));
      return;
    }
    group.scale.setScalar(scaleAt(0));
    play((elapsed) => {
      group.scale.setScalar(scaleAt(elapsed));
      return elapsed >= durationMs;
    });
  };

  return {
    reset(state: GameState) {
      generation += 1;
      animating = false;
      running = [];
      tilting = null;
      stage.renderer.setAnimationLoop(null);
      stage.tray.rotation.set(0, 0, 0);
      stage.tileLayer.clear();
      tiles = new Map();
      for (const tile of state.tiles) addTile(tile.id, tile.value, tile.row, tile.col);
      stage.render();
    },

    async apply(events: readonly MoveEvent[], dir?: Direction) {
      const started = generation;
      animating = true;
      try {
        for (const e of events) {
          if (e.kind === 'moved') slide(groupFor(e.id), cellToWorld(e.toRow, e.toCol));
          if (e.kind === 'merged') for (const id of e.fromIds) slide(groupFor(id), cellToWorld(e.row, e.col));
        }
        if (dir !== undefined && slideMs > 0) tilt(dir);
        stage.render();
        await wait(slideMs);
        if (started !== generation) return;
        for (const e of events) {
          if (e.kind === 'moved') place(groupFor(e.id), cellToWorld(e.toRow, e.toCol));
          if (e.kind === 'merged') {
            for (const id of e.fromIds) removeTile(id);
            scaleIn(addTile(e.id, e.value, e.row, e.col), (t) => popScale(t, popMs), popMs);
          }
          if (e.kind === 'spawned') {
            scaleIn(addTile(e.id, e.value, e.row, e.col), (t) => appearScale(t, appearMs), appearMs);
          }
        }
        stage.render();
      } finally {
        if (started === generation) animating = false;
      }
    },

    isAnimating: () => animating,

    setTheme(theme: Theme) {
      stage.setTheme(theme);
      factory.setTheme(theme);
      stage.render();
    },

    dispose() {
      generation += 1;
      running = [];
      tilting = null;
      factory.dispose();
      stage.dispose();
    },
  };
}
