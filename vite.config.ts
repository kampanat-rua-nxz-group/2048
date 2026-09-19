import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // Three.js alone is ~540 kB minified (~137 kB gzip); keep the warning for anything beyond it.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/game/**/*.ts', 'src/storage/**/*.ts', 'src/ui/three/motion.ts', 'src/ui/three/palette.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
