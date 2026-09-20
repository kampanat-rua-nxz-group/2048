import './styles.css';
import { createBotController, type BotStatus } from './bot/controller';
import { continueAfterWin, createGame, move } from './game/board';
import { defaultRng } from './game/rng';
import type { Direction, GameState } from './game/types';
import { loadBestScore, saveBestScore } from './storage/bestScore';
import { describeBoard } from './ui/boardDescription';
import { createBoardRenderer } from './ui/boardRenderer';
import { bindInput } from './ui/input';
import { createOverlay, overlayFor } from './ui/overlay';
import { NUMERAL_FONT } from './ui/three/tiles';

const SLIDE_MS = 110;
const FONT_TIMEOUT_MS = 2000;

function requireElement(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (el === null) throw new Error(`Missing required element: ${selector}`);
  return el;
}

/** Tile numerals are painted into textures once, so wait briefly for the web font. */
async function loadNumeralFont(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([document.fonts.load(`800 64px ${NUMERAL_FONT}`).then(() => undefined), timeout]);
}

await loadNumeralFont();

const scoreEl = requireElement('#score');
const bestEl = requireElement('#best');
const statusEl = requireElement('#board-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const { renderer, kind } = createBoardRenderer(requireElement('#board-view'), { slideMs: SLIDE_MS, reducedMotion });
document.body.dataset.renderer = kind;
const overlay = createOverlay(requireElement('#overlay'), { onNewGame: newGame, onKeepGoing: keepGoing });

let state: GameState = createGame(defaultRng);
let best = loadBestScore();
const botButton = requireElement('#toggle-bot') as HTMLButtonElement;
const botStatus = requireElement('#bot-status');
const BOT_MESSAGES: Record<BotStatus, string> = {
  idle: 'Let the bot play for a high score.',
  running: 'Bot playing. Stop anytime to take over.',
  over: 'Game over. Start a new game to play again.',
  error: 'Bot stopped. Try again or play with the arrow keys.',
};
const bot = createBotController({
  getState: () => state,
  isAnimating: () => renderer.isAnimating(),
  continueGame: keepGoing,
  play: handleMove,
  onStatus(status) {
    const running = status === 'running';
    botButton.textContent = running ? 'Stop bot' : 'Start bot';
    botButton.setAttribute('aria-pressed', String(running));
    botStatus.textContent = BOT_MESSAGES[status];
  },
}, () => new Worker(new URL('./bot/worker.ts', import.meta.url), { type: 'module' }));

function renderText(): void {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(best);
  statusEl.textContent = describeBoard(state);
  botButton.disabled = state.over;
}

function newGame(): void {
  bot.stop();
  state = createGame(defaultRng);
  overlay.hide();
  renderer.reset(state);
  renderText();
}

function keepGoing(): void {
  state = continueAfterWin(state);
  overlay.hide();
  if (state.over) overlay.show('over');
}

async function handleMove(dir: Direction): Promise<void> {
  const prev = state;
  const result = move(state, dir, defaultRng);
  if (!result.changed) return;

  state = result.state;
  if (state.score > best) {
    best = state.score;
    saveBestScore(best);
  }
  renderText();

  try {
    await renderer.apply(result.events, dir);
  } catch (error) {
    renderer.reset(state);
    throw error;
  }
  if (state !== result.state) return; // a new game started mid-animation
  if (bot.isRunning() && state.won && !state.keepPlaying) keepGoing();
  const next = overlayFor(prev, state);
  if (next !== null) overlay.show(next);
}

bindInput(window, () => {
  // A manual direction cancels pending search even while a tile is sliding.
  if (bot.isRunning()) bot.stop();
  return renderer.isAnimating();
}, (dir) => {
  handleMove(dir).catch((error: unknown) => {
    reportError(error);
    renderer.reset(state);
  });
});
botButton.addEventListener('click', () => {
  if (bot.isRunning()) bot.stop();
  else bot.start();
});
requireElement('#new-game').addEventListener('click', newGame);
newGame();
