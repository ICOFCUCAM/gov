// The installed nation's colour on the platform's grounds. A nation may choose
// any colour in setup; these helpers keep it visible and its text readable on
// whichever ground draws it (WCAG 2.2: 3:1 for a graphic such as the seal
// tile, 4.5:1 for text).

import { contrast, readableOn, readableOnDark } from '@/apps/_shared/public/design/contrast';
import { CONSOLE, INFO, hexOf } from './tokens';

/** WCAG 1.4.11: a graphic needed to understand the page reads at 3:1 against its ground. */
export const GRAPHIC = 3;
const DARK_INK = '#07101c';

/**
 * The seal tile in the nation's colour on a dark ground: the colour itself,
 * lightened (same hue) only as far as it needs to stand out at 3:1, and the
 * monogram in white or near-black, whichever reads better on it. Before setup
 * (no accent) the tile wears the platform's teal.
 */
export function sealTile(accent: string | undefined, ground = hexOf(CONSOLE['--c-surface']!)): { fill: string; ink: string } {
  const base = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : INFO;
  const fill = contrast(base, ground) >= GRAPHIC ? base : readableOnDark(base, [ground], GRAPHIC);
  const ink = contrast('#ffffff', fill) >= contrast(DARK_INK, fill) ? '#ffffff' : DARK_INK;
  return { fill, ink };
}

/** The nation's colour as text: on a dark ground lightened, on a light ground darkened, to 4.5:1. */
export function accentText(accent: string | undefined, ground: string, dark: boolean): string {
  const base = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : INFO;
  return dark ? readableOnDark(base, [ground]) : readableOn(base, [ground]);
}
