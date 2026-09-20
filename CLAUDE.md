# game-2048 — browser 2048 with a Three.js "tilt tray" renderer

Vanilla TypeScript + Vite. A pure, immutable game core emits tile-id move events;
a Three.js renderer animates them, with a DOM renderer as fallback.
Design and plan live in Obsidian: [[2026-09-19-game-2048-design]], [[2026-09-19-game-2048-plan]]
(`Obsidian/02_Projects/game-2048/plans/`). Read the design spec before changing rules or rendering.

## Stack

| Layer | Tech |
|---|---|
| Language | TypeScript 7 (strict, `noUncheckedIndexedAccess`) |
| Build / dev | Vite 8 |
| Tests | Vitest 5 (node env; jsdom per file where needed), `@vitest/coverage-v8` |
| Rendering | three 0.186 (WebGL), DOM + CSS fallback |

## Layout

| Path | Role |
|---|---|
| `src/game/` | Pure core: `types.ts`, `rules.ts` (line slide/merge, `canMove`, `hasWon`), `board.ts` (`createGame`, `move`, `continueAfterWin`), `spawn.ts` (spawn odds, which grow with the largest tile), `rng.ts` |
| `src/storage/bestScore.ts` | Best score in localStorage; degrades to in-memory on failure |
| `src/ui/input.ts` | Arrow/WASD binding, ignores modifier keys, respects the lock while a move animates |
| `src/ui/touch.ts` | Pointer-drag swipes on the board: one move per drag, fired as the threshold is crossed |
| `src/ui/renderer.ts` | `Renderer` contract + DOM renderer |
| `src/ui/boardRenderer.ts` | Picks WebGL, falls back to DOM; kind is exposed as `body[data-renderer]` |
| `src/ui/three/` | `stage`, `tiles`, `threeRenderer`; pure `motion.ts` (easing, tilt) and `palette.ts` |
| `src/ui/overlay.ts`, `boardDescription.ts` | Win/over overlay; screen-reader board text |
| `src/main.ts` | App shell: wires state, input, renderer, overlay, and score |

## Commands

```
Dev:       npm run dev
Test:      npm test            # vitest run
Coverage:  npm run coverage    # gate: 80% on game, storage, motion, palette
Typecheck: npm run typecheck
Build:     npm run build       # tsc --noEmit && vite build
```

The rtk hook mangles `npx`, so use `./node_modules/.bin/<tool>` for direct tool calls.

## Conventions

- The game core stays pure and immutable: every move returns a new `GameState` plus events, and nothing mutates.
- Renderers consume `MoveEvent`s by tile id and must not reach into game logic.
- Spawn odds live only in `spawn.ts`. The bot's chance nodes read them from there, so the search never drifts from what the board actually does.
- Palette hex values exist in both `palette.ts` and `styles.css`, on purpose: the DOM fallback needs the same colors and CSS can't import TS. Edit both.
- `SLIDE_MS` (110, `main.ts`) is kept at or above the CSS `--slide-ms` (100ms) so the DOM renderer never snaps mid-transition.
- The catch blocks in `bestScore.ts` and `boardRenderer.ts` are intended degradations, not swallowed errors.
- Honor `prefers-reduced-motion`: skip scale animations and tilt.
- The board owns `touch-action: none`; swipe handling depends on it, so keep the two together.
- Swipes bind to `#board-view`, not `.board`, so drags on the overlay's buttons never steer the tray.
- Files ≤300 lines. TDD. Keep Three.js out of the coverage-gated modules.

## Status

v1 is implemented, reviewed, and has passing tests. Manual QA is still pending: tilt feel, the win overlay (temporarily set `WIN_VALUE=16`), the game-over overlay, macOS Reduce motion, VoiceOver, and Chrome with `--disable-webgl`. Mobile swipe input and the phone layouts were checked in headless Chromium at phone viewports, both renderers; real-device QA (iOS Safari rubber-banding, Android Chrome) is still pending.
