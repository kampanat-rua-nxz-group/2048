import { createServer } from 'vite';

const games = Number(process.argv[2] ?? 10);
const timeMs = Number(process.argv[3] ?? 5);
const maxDepth = Number(process.argv[4] ?? 6);
if (!Number.isInteger(games) || games < 1 || !Number.isFinite(timeMs) || timeMs < 0 || !Number.isInteger(maxDepth) || maxDepth < 1) {
  throw new Error('Usage: npm run benchmark:bot -- <games >= 1> <ms per move >= 0> <depth >= 1>');
}
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
try {
  const { chooseMove } = await server.ssrLoadModule('/src/bot/expectimax.ts');
  const { createGame, move, continueAfterWin } = await server.ssrLoadModule('/src/game/board.ts');
  const { seededRng } = await server.ssrLoadModule('/src/game/rng.ts');
  const results = [];
  for (let seed = 1; seed <= games; seed += 1) {
    const rng = seededRng(seed);
    let state = createGame(rng);
    let turns = 0;
    let depths = 0;
    const start = performance.now();
    while (!state.over) {
      if (state.won && !state.keepPlaying) state = continueAfterWin(state);
      const result = chooseMove(state.tiles, { timeMs, maxDepth });
      if (result.direction === null) throw new Error(`No move returned for live game, seed ${seed}`);
      const moved = move(state, result.direction, rng);
      if (!moved.changed) throw new Error(`Illegal move, seed ${seed}`);
      state = moved.state;
      depths += result.depth;
      turns += 1;
    }
    const result = {
      seed, score: state.score, tile: Math.max(...state.tiles.map((tile) => tile.value)), turns,
      averageDepth: Number((depths / turns).toFixed(2)), msPerMove: Number(((performance.now() - start) / turns).toFixed(2)),
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  console.log(JSON.stringify({
    games, timeMs, maxDepth,
    averageScore: Math.round(results.reduce((sum, result) => sum + result.score, 0) / games),
    bestScore: Math.max(...results.map((result) => result.score)),
    reached2048: results.filter((result) => result.tile >= 2048).length,
    reached8192: results.filter((result) => result.tile >= 8192).length,
  }));
} finally {
  await server.close();
}
