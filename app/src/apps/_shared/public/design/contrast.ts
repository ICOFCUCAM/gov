// Colour contrast for the public sites (WCAG 2.2, 1.4.3 Contrast (Minimum)).
//
// A ministry's theme colours are its identity, but text in them must stay
// readable: every colour a design uses for text, links or behind white text is
// darkened — keeping its hue — just enough to reach 4.5:1 on the light
// backgrounds it sits on. Colours that already pass are left untouched.

import type { PublicSiteTheme } from '../PublicSiteShell';

/** WCAG AA for normal-size text. */
export const AA = 4.5;

const rgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
const hex = (c: number[]) => `#${c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Relative luminance (WCAG 2.2 definition). */
export function luminance(colour: string): number {
  const [r, g, b] = rgb(colour).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** The colour, darkened in small steps (same hue) until it reaches `ratio` against every background. */
export function readableOn(colour: string, backgrounds: string[], ratio = AA): string {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colour)) return colour;
  const base = rgb(colour);
  for (let k = 1; k >= 0.2; k -= 0.02) {
    const c = hex(base.map(v => v * k));
    if (backgrounds.every(bg => contrast(c, bg) >= ratio)) return c;
  }
  return '#000000';
}

/**
 * The theme with its text colours made readable: primary, accent, inkSoft and
 * the emergency colours carry links, buttons with white text and labels, so
 * each reaches 4.5:1 on white and on the theme's light surfaces.
 */
export function accessibleTheme(theme: PublicSiteTheme): PublicSiteTheme {
  const light = ['#ffffff', theme.surface, theme.surfaceMute].filter(c => /^#/.test(c));
  return {
    ...theme,
    ink: readableOn(theme.ink, light),
    inkSoft: readableOn(theme.inkSoft, light),
    primary: readableOn(theme.primary, light),
    accent: readableOn(theme.accent, light),
    emergencyA: readableOn(theme.emergencyA, light),
    emergencyB: readableOn(theme.emergencyB, light),
  };
}
