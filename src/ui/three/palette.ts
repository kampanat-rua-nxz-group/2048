import { WIN_VALUE } from '../../game/types';

/** Tile values with their own color, in ramp order; anything above uses the super color. */
export const TILE_VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, WIN_VALUE] as const;

export type Surfaces = {
  readonly page: string;
  readonly ink: string;
  readonly tray: string;
  readonly well: string;
  readonly paper: string;
  /** Focus rings and highlights. */
  readonly accent: string;
  /** Key-light tint for the WebGL tray. */
  readonly light: string;
};

export type Theme = {
  readonly id: string;
  readonly name: string;
  readonly surfaces: Surfaces;
  /** Numeral ink candidates; the higher-contrast one wins per tile. */
  readonly inks: readonly [string, string];
  readonly bodyByValue: Readonly<Record<number, string>>;
  readonly superBody: string;
};

/** Maps a ramp of eleven colors onto TILE_VALUES. */
function ramp(colors: readonly string[]): Readonly<Record<number, string>> {
  if (colors.length !== TILE_VALUES.length) throw new Error(`A tile ramp needs ${TILE_VALUES.length} colors`);
  return Object.fromEntries(TILE_VALUES.map((value, i) => [value, colors[i]!]));
}

/** Ceramic ramp: bone → gold → oxblood. */
const CERAMIC: Theme = {
  id: 'ceramic',
  name: 'Ceramic',
  surfaces: {
    page: '#B9C2B5', ink: '#1E2621', tray: '#2E3A33',
    well: '#3F4D44', paper: '#F2EEE3', accent: '#C9A227', light: '#FFE9C7',
  },
  inks: ['#2E3A33', '#F2EEE3'],
  bodyByValue: ramp([
    '#E8E1CF', '#E0D4B4', '#D9C48E', '#D1B566', '#C9A227', '#B8862A',
    '#A66A2E', '#9A5132', '#8C3B36', '#8C2F39', '#6E1F2E',
  ]),
  superBody: '#2A1418',
};

/** Midnight ramp: frost → indigo → magenta on a dark room. */
const MIDNIGHT: Theme = {
  id: 'midnight',
  name: 'Midnight',
  surfaces: {
    page: '#10141C', ink: '#E6ECF5', tray: '#1B2230',
    well: '#2A3546', paper: '#E6ECF5', accent: '#4FD1C5', light: '#BFE9FF',
  },
  inks: ['#121722', '#EAF2FF'],
  bodyByValue: ramp([
    '#DDE6F2', '#BFD2EA', '#9FC0E6', '#6FA8DC', '#4B8FD6', '#4F6FD0',
    '#5B57C8', '#6E45BE', '#8A36B0', '#A62C96', '#C21E6E',
  ]),
  superBody: '#3D0B2E',
};

/** Ocean ramp: sea foam → teal → deep water. */
const OCEAN: Theme = {
  id: 'ocean',
  name: 'Ocean',
  surfaces: {
    page: '#DCEFF0', ink: '#123338', tray: '#17454E',
    well: '#22606B', paper: '#F4FBFB', accent: '#C2621F', light: '#E4F5FF',
  },
  inks: ['#0C2A30', '#F4FBFB'],
  bodyByValue: ramp([
    '#EAF3EF', '#CDE7E3', '#A8DAD6', '#7ECBC9', '#4FB3B8', '#2E96A6',
    '#1F7C96', '#1A6285', '#17496F', '#163758', '#112741',
  ]),
  superBody: '#0A1626',
};

/** Blossom ramp: petal → rose → plum. */
const BLOSSOM: Theme = {
  id: 'blossom',
  name: 'Blossom',
  surfaces: {
    page: '#F6E4E8', ink: '#3A2029', tray: '#4A2A36',
    well: '#633A48', paper: '#FFF4F2', accent: '#C74F80', light: '#FFE2E8',
  },
  inks: ['#3A2029', '#FFF4F2'],
  bodyByValue: ramp([
    '#FBE8E6', '#F7D3D6', '#F4BCC6', '#EFA0B4', '#E783A3', '#DB6691',
    '#C74F80', '#AE3E70', '#923260', '#75274F', '#56203E',
  ]),
  superBody: '#2E1122',
};

export const THEMES: readonly Theme[] = [CERAMIC, MIDNIGHT, OCEAN, BLOSSOM];
export const DEFAULT_THEME: Theme = CERAMIC;

export function themeById(id: string | null | undefined): Theme | undefined {
  return THEMES.find((theme) => theme.id === id);
}

export type TileColors = { readonly body: string; readonly ink: string };

export function tileColors(value: number, theme: Theme = DEFAULT_THEME): TileColors {
  const body = value > WIN_VALUE ? theme.superBody : theme.bodyByValue[value];
  if (body === undefined) throw new Error(`No color for tile value ${value}`);
  const [dark, light] = theme.inks;
  return { body, ink: contrastRatio(body, dark) >= contrastRatio(body, light) ? dark : light };
}

/** CSS custom properties for a theme; the DOM board and page chrome read these. */
export function themeVariables(theme: Theme): Readonly<Record<string, string>> {
  const { page, ink, tray, well, paper, accent } = theme.surfaces;
  const vars: Record<string, string> = {
    '--page': page, '--ink': ink, '--tray': tray, '--well': well, '--paper': paper, '--accent': accent,
  };
  for (const value of TILE_VALUES) {
    const colors = tileColors(value, theme);
    vars[`--tile-${value}`] = colors.body;
    vars[`--tile-${value}-ink`] = colors.ink;
  }
  const superColors = tileColors(WIN_VALUE * 2, theme);
  vars['--tile-super'] = superColors.body;
  vars['--tile-super-ink'] = superColors.ink;
  return vars;
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
