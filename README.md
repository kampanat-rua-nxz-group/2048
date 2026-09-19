# 2048

A browser version of 2048. The board is a 3D tray drawn with Three.js: each move tilts the tray and the tiles slide across it. Browsers without WebGL get a plain DOM and CSS board with the same rules and colors.

Play it on GitHub Pages at `https://kampanat-rua-nxz-group.github.io/2048/`.

## How to play

- Swipe across the board, or use the arrow keys or WASD, to slide every tile in one direction.
- Two tiles with the same number merge into one tile with their sum, and the new value is added to your score.
- After every move that changes the board, a new tile appears: a 2 (90%) or a 4 (10%).
- Build a 2048 tile to win. You can then keep playing for a higher score.
- The game ends when the board is full and no move can merge anything.

Your best score is kept in `localStorage`. If storage is unavailable, it lasts only for the session.

## Accessibility

- A hidden live region reads the board state to screen readers after each move.
- With `prefers-reduced-motion` set, tiles do not scale in and the tray does not tilt.
- Keys pressed with Ctrl, Cmd, or Alt pass through to the browser.
- The layout fits the viewport on phones in either orientation, and swipes on the board never scroll or zoom the page.

## Getting started

Requires Node 24 (the version CI uses).

```sh
npm install
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run coverage` | Run tests with coverage (80% gate) |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build |

## Project structure

```
src/
  game/        Pure, immutable game core: rules, board, RNG
  storage/     Best-score persistence
  ui/          Keyboard and swipe input, DOM renderer, overlay, screen-reader text
  ui/three/    Three.js stage, tiles, renderer, motion, palette
  main.ts      App shell that wires state, input, and rendering
```

The game core never mutates state. `move(state, direction, rng)` returns a new `GameState` plus a list of `MoveEvent`s (`moved`, `merged`, `spawned`) keyed by tile id. Renderers animate those events and never reach into game logic, so the Three.js and DOM renderers can be swapped. `document.body.dataset.renderer` shows which one is active.

## Testing

Vitest runs in a Node environment, and tests that need a DOM switch to jsdom per file. Coverage is enforced at 80% for lines, functions, branches, and statements across `src/game`, `src/storage`, `src/ui/three/motion.ts`, and `src/ui/three/palette.ts`. The Three.js scene code is left out of the gate.

## Deployment

Every push to `main` runs `.github/workflows/pages.yml`. The workflow runs the tests and the type check, builds with `vite build --mode ghpages` so assets resolve under `/2048/`, and deploys `dist/` to GitHub Pages. Other builds use `/` as the base path.

## Tech stack

TypeScript 7 (strict), Vite 8, Vitest 5, and three 0.186.
