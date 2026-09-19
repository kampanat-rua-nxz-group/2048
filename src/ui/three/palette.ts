import { WIN_VALUE } from '../../game/types';

export const INK_DARK = '#2E3A33';
export const INK_LIGHT = '#F2EEE3';

/** Ceramic ramp: bone → gold → oxblood. */
const BODY_BY_VALUE: Readonly<Record<number, string>> = {
  2: '#E8E1CF',
  4: '#E0D4B4',
  8: '#D9C48E',
  16: '#D1B566',
  32: '#C9A227',
  64: '#B8862A',
  128: '#A66A2E',
  256: '#9A5132',
  512: '#8C3B36',
  1024: '#8C2F39',
  2048: '#6E1F2E',
};
const SUPER_BODY = '#2A1418';
const LAST_DARK_INK_VALUE = 64;

export type TileColors = { readonly body: string; readonly ink: string };

export function tileColors(value: number): TileColors {
  if (value > WIN_VALUE) return { body: SUPER_BODY, ink: INK_LIGHT };
  const body = BODY_BY_VALUE[value];
  if (body === undefined) throw new Error(`No color for tile value ${value}`);
  return { body, ink: value <= LAST_DARK_INK_VALUE ? INK_DARK : INK_LIGHT };
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (match === null) throw new Error(`Invalid hex color: ${hex}`);
  const n = Number.parseInt(match[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
