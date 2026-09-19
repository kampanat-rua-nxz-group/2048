/** Returns a float in [0, 1). */
export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

/** Deterministic mulberry32 generator for tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Replays fixed values in order; throws when exhausted. For tests. */
export function sequenceRng(values: readonly number[]): Rng {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error(`sequenceRng exhausted after ${values.length} values`);
    index += 1;
    return value;
  };
}
