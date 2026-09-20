import css from '../../styles.css?raw';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  THEMES,
  TILE_VALUES,
  contrastRatio,
  themeById,
  themeVariables,
  tileColors,
} from './palette';

describe('tileColors', () => {
  it('uses the dark ink on light tiles and the light ink on dark tiles', () => {
    expect(tileColors(2)).toEqual({ body: '#E8E1CF', ink: '#2E3A33' });
    expect(tileColors(2048)).toEqual({ body: '#6E1F2E', ink: '#F2EEE3' });
  });

  it('uses the super colors above 2048', () => {
    expect(tileColors(4096)).toEqual(tileColors(1 << 20));
    expect(tileColors(4096).body).toBe('#2A1418');
  });

  it.each([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096])(
    'keeps numeral contrast at 3:1 or better for %i',
    (value) => {
      const { body, ink } = tileColors(value);
      expect(contrastRatio(body, ink)).toBeGreaterThanOrEqual(3);
    },
  );

  it('throws for a value the ramp has no color for', () => {
    expect(() => tileColors(3)).toThrow('No color for tile value 3');
  });

  it.each(THEMES.map((theme) => [theme.name, theme] as const))(
    '%s keeps every numeral at 3:1 or better',
    (_name, theme) => {
      for (const value of [...TILE_VALUES, 4096]) {
        const { body, ink } = tileColors(value, theme);
        expect(theme.inks).toContain(ink);
        expect(contrastRatio(body, ink)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it('recolors the same value per theme', () => {
    const bodies = THEMES.map((theme) => tileColors(1024, theme).body);
    expect(new Set(bodies).size).toBe(THEMES.length);
  });
});

describe('themes', () => {
  it('ships unique ids and names, with Ceramic as the default', () => {
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((theme) => theme.name)).size).toBe(THEMES.length);
    expect(DEFAULT_THEME.id).toBe('ceramic');
    expect(THEMES).toContain(DEFAULT_THEME);
  });

  it('finds a theme by id and rejects anything unknown', () => {
    expect(themeById('ocean')?.name).toBe('Ocean');
    expect(themeById('sepia')).toBeUndefined();
    expect(themeById(null)).toBeUndefined();
  });

  it('gives every theme a full ramp of #RRGGBB colors', () => {
    for (const theme of THEMES) {
      const colors = [...TILE_VALUES.map((value) => theme.bodyByValue[value]), theme.superBody, ...theme.inks];
      expect(colors).toHaveLength(TILE_VALUES.length + 3);
      for (const color of colors) expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('themeVariables', () => {
  it('exports the surfaces and a body and ink for every tile', () => {
    const vars = themeVariables(DEFAULT_THEME);
    expect(vars['--page']).toBe(DEFAULT_THEME.surfaces.page);
    expect(vars['--accent']).toBe(DEFAULT_THEME.surfaces.accent);
    expect(vars['--tile-2']).toBe('#E8E1CF');
    expect(vars['--tile-2-ink']).toBe('#2E3A33');
    expect(vars['--tile-super']).toBe('#2A1418');
    expect(vars['--tile-super-ink']).toBe('#F2EEE3');
    for (const value of TILE_VALUES) {
      expect(vars[`--tile-${value}`]).toBeDefined();
      expect(vars[`--tile-${value}-ink`]).toBeDefined();
    }
  });

  // The stylesheet repeats the default theme so the page paints before JS runs; keep the two in step.
  it('matches the defaults hand-written in styles.css', () => {
    const root = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? '';
    const declared = new Map(
      [...root.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, value]) => [name!, value!.toLowerCase()]),
    );
    expect(declared.size).toBeGreaterThan(0);
    for (const [name, value] of Object.entries(themeVariables(DEFAULT_THEME))) {
      expect(declared.get(name)).toBe(value.toLowerCase());
    }
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for equal colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3F4D44', '#3F4D44')).toBe(1);
  });

  it('rejects malformed hex', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow('Invalid hex color: red');
  });
});
