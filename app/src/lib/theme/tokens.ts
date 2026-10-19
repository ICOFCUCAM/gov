// CivicOS design tokens — the one source for the colours the platform's
// surfaces share (docs/CONSOLE_DESIGN.md). Kept outside any 'use client'
// module so server components can read it.
//
// Three grounds:
//   LIGHT    citizen, public and admin surfaces (`:root` in globals.css)
//   SOV      the graphite officer apps and National Shell (`.sov`)
//   CONSOLE  the deep-navy command console: Situation Room and every page in
//            CommandShell (spread as inline custom properties)
// plus the status colours drawn on the dark grounds (STATUS), the platform's
// "live / information" teal (INFO), and the institutional champagne the front
// door uses for authority (INSTITUTIONAL).
//
// Values are "r g b" triplets for the CSS custom properties (used as
// rgb(var(--c-ink) / <alpha>)) and hex for inline styles. globals.css must
// match LIGHT and SOV exactly and every text colour must read at 4.5:1 on its
// grounds (tokens.test.ts checks both).

export type Triplet = `${number} ${number} ${number}`;
export type Ground = Record<`--c-${string}`, Triplet>;

export const LIGHT: Ground = {
  '--c-bg': '247 245 241',
  '--c-surface': '255 255 255',
  '--c-surface-2': '241 238 232',
  '--c-ink': '26 29 35',
  '--c-ink-soft': '71 80 97',
  '--c-ink-muted': '95 104 122',
  '--c-line': '217 212 200',
  '--c-line-soft': '236 232 222',
  '--c-link': '31 95 173',
  '--c-link-hover': '19 63 120',
  '--c-ok': '45 106 79',
  // 5.2:1 on white (was 176 132 0 at 3.4:1).
  '--c-warn': '138 103 0',
  '--c-alert': '138 58 54',
};

export const SOV: Ground = {
  '--c-bg': '9 12 17',
  '--c-surface': '17 21 28',
  '--c-surface-2': '26 32 42',
  '--c-ink': '226 231 238',
  '--c-ink-soft': '160 170 184',
  // 4.8:1 on surface-2 (was 124 134 149 at 4.4:1).
  '--c-ink-muted': '130 140 155',
  '--c-line': '42 50 62',
  '--c-line-soft': '30 37 47',
  '--c-link': '124 172 232',
  '--c-link-hover': '168 200 244',
  '--c-ok': '95 200 140',
  '--c-warn': '214 170 70',
  '--c-alert': '226 110 102',
};

export const CONSOLE: Ground = {
  '--c-bg': '7 12 20',
  '--c-surface': '12 18 30',
  '--c-surface-2': '19 27 43',
  '--c-ink': '226 233 243',
  '--c-ink-soft': '150 165 186',
  // 5.5:1 on surface-2 (was 101 116 139 at 3.6:1).
  '--c-ink-muted': '129 147 173',
  '--c-line': '28 38 56',
  '--c-line-soft': '21 29 44',
  '--c-link': '74 198 212',
  '--c-link-hover': '130 220 230',
};

/** Status colours on the dark grounds (always paired with a word or shape, never colour alone). */
export const STATUS = {
  alert: '#f1707a',
  warn: '#e0b341',
  ok: '#34d39c',
  // 5.4:1 as text on the console surface (was #6b7a90 at 4.3:1).
  neutral: '#7d8ba1',
} as const;

/** The platform's "live / information" teal: links, live markers, the console's highlight before setup. */
export const INFO = '#37c7d4';

/** Institutional champagne: constitutional authority (seals, signatures, verified marks), never a status. */
export const INSTITUTIONAL = {
  ground: '#04060a',
  champagne: '#d9c398',
  champagneHi: '#f4e4bd',
} as const;

/** Decision-class colours (tailwind `class-a` … `class-e`); class C reads at 5.2:1 on white (was #b08400). */
export const DECISION_CLASS = {
  a: '#4a6b8a',
  b: '#2d6a4f',
  c: '#8a6700',
  d: '#8a3a36',
  e: '#5c3a8a',
} as const;

/**
 * Shaded maps (lib/map): a five-step sequential ramp from low to high that
 * stays distinguishable for the common forms of colour blindness (blue to
 * yellow, rising lightness, after cividis), readable on the dark console and
 * on white. Status meaning on maps is carried by shape as well as colour.
 */
export const MAP_SEQUENTIAL = ['#1f3a5f', '#3b5a7a', '#6e7f8d', '#b0a370', '#f2d25b'] as const;

/** "r g b" → "#rrggbb". */
export const hexOf = (t: Triplet | string): string =>
  `#${t.split(' ').map(n => Number(n).toString(16).padStart(2, '0')).join('')}`;
