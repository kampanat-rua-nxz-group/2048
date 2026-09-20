import { THEMES, themeById, themeVariables, type Theme } from './three/palette';

/** Paints a theme onto the page: `data-theme` plus the CSS custom properties the stylesheet reads. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset.theme = theme.id;
  for (const [name, value] of Object.entries(themeVariables(theme))) root.style.setProperty(name, value);
}

/** Fills the theme <select> and reports picks; the caller applies and persists them. */
export function createThemePicker(
  select: HTMLSelectElement,
  current: Theme,
  onSelect: (theme: Theme) => void,
): void {
  const doc = select.ownerDocument;
  select.replaceChildren(
    ...THEMES.map((theme) => {
      const option = doc.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      return option;
    }),
  );
  select.value = current.id;
  select.addEventListener('change', () => {
    const picked = themeById(select.value);
    if (picked !== undefined) onSelect(picked);
  });
}
