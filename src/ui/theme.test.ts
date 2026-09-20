// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { applyTheme, createThemePicker } from './theme';
import { DEFAULT_THEME, THEMES, themeById, themeVariables } from './three/palette';

const OCEAN = themeById('ocean')!;

describe('applyTheme', () => {
  it('tags the root and writes every theme variable', () => {
    const root = document.documentElement;
    applyTheme(root, OCEAN);

    expect(root.dataset.theme).toBe('ocean');
    for (const [name, value] of Object.entries(themeVariables(OCEAN))) {
      expect(root.style.getPropertyValue(name)).toBe(value);
    }
  });

  it("replaces the previous theme's values", () => {
    const root = document.createElement('div');
    applyTheme(root, OCEAN);
    applyTheme(root, DEFAULT_THEME);

    expect(root.dataset.theme).toBe('ceramic');
    expect(root.style.getPropertyValue('--tile-2')).toBe(themeVariables(DEFAULT_THEME)['--tile-2']);
  });
});

describe('createThemePicker', () => {
  const picker = () => document.createElement('select');

  it('lists every theme and preselects the current one', () => {
    const select = picker();
    createThemePicker(select, OCEAN, () => {});

    expect([...select.options].map((option) => option.value)).toEqual(THEMES.map((theme) => theme.id));
    expect([...select.options].map((option) => option.textContent)).toEqual(THEMES.map((theme) => theme.name));
    expect(select.value).toBe('ocean');
  });

  it('reports the picked theme', () => {
    const select = picker();
    const onSelect = vi.fn();
    createThemePicker(select, DEFAULT_THEME, onSelect);

    select.value = 'midnight';
    select.dispatchEvent(new Event('change'));

    expect(onSelect).toHaveBeenCalledWith(themeById('midnight'));
  });

  it('ignores a value that is not a theme', () => {
    const select = picker();
    const onSelect = vi.fn();
    createThemePicker(select, DEFAULT_THEME, onSelect);

    select.value = 'sepia'; // no such option, so the select clears itself
    select.dispatchEvent(new Event('change'));
    expect(onSelect).toHaveBeenCalledTimes(0);
  });
});
