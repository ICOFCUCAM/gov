// CivicOS design tokens — the one source for the colours the platform's
// surfaces share (docs/CONSOLE_DESIGN.md). Kept outside any 'use client'
// module so server components can read it.
//
// Three grounds:
//   LIGHT    citizen, public and admin surfaces (`:root` in globals.css)
//   SOV      the graphite officer apps and National Shell (`.sov`)
//   CONSOLE  the deep-navy command console: Situation Room and every page in
//            CommandShell (spread as inline custom properties)
//   WORKSPACE the institutional workspace (`.ws`, plan step I10)
// plus the status colours drawn on the dark grounds (STATUS), the platform's
// "live / information" teal (INFO), and the institutional champagne the front
// door uses for authority (INSTITUTIONAL).
//
// Values are "r g b" triplets for the CSS custom properties (used as
// rgb(var(--c-ink) / <alpha>)) and hex for inline styles. globals.css must
// match LIGHT, SOV and WORKSPACE exactly and every text colour must read at
// 4.5:1 on its grounds (tokens.test.ts checks both). Beside the colours: the
// type scale, the spacing scale, controls and keyboard focus (plan step I10;
// type-scale.test.ts holds console code to them).

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

/**
 * The institutional workspace ground (plan step I10, specification Part 6 §B,
 * plan §3.3): Sovereign Editorial and Modern Institutional as one ground.
 * Warm canvas `#F7F7F2`, white surfaces, primary text `#252B29`, sovereign
 * green `#193B35` for primary actions and links. The specification's
 * secondary text `#6B7470` reads 4.48:1 on the canvas, so it is darkened
 * until it reads 4.5:1 on every workspace ground (`--c-ink-muted`).
 * Copper (`--c-emphasis`) is for limited emphasis on the canvas and white
 * surfaces only (4.53:1 on the canvas), never body text on `surface-2`.
 * Status colours are the light ground's: never the nation's accent, the
 * green or the copper. CSS: `.ws` in globals.css. No screen is repainted
 * with it yet: the console keeps its grounds (docs/CONSOLE_DESIGN.md §1);
 * the state gallery (/gov/help/states) shows every component on it.
 */
export const WORKSPACE: Ground = {
  '--c-bg': '247 247 242',
  '--c-surface': '255 255 255',
  '--c-surface-2': '239 239 232',
  '--c-ink': '37 43 41',
  '--c-ink-soft': '78 86 82',
  // The specification's 107 116 112 at 4.48:1 on the canvas, darkened: 4.9:1 on the canvas, 4.55:1 on surface-2.
  '--c-ink-muted': '101 110 106',
  '--c-line': '214 214 204',
  '--c-line-soft': '232 232 224',
  '--c-link': '25 59 53',
  '--c-link-hover': '15 40 36',
  '--c-ok': '45 106 79',
  '--c-warn': '138 103 0',
  '--c-alert': '138 58 54',
  '--c-accent': '25 59 53',
  '--c-emphasis': '168 93 66',
};

/**
 * The type scale (plan step I10, specification Part 6 §B "Typography and
 * spacing"): one scale, in pixels at the default 16px root and served in rem
 * so the text-size setting and browser zoom enlarge it. Tailwind's own steps
 * (`text-xs` … `text-3xl`) are the scale, with two steps added for the dense
 * console: `text-2xs` (11px, markers and captions only, never body text; the
 * phone floor of the console) and `text-compact` (13px, compact tables and
 * metadata). Console code takes sizes from it, never `text-[Npx]`
 * (type-scale.test.ts lists the exceptions with their reasons).
 */
export const TYPE_SCALE = {
  '2xs': 11,
  xs: 12,
  compact: 13,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;
export type TypeStep = keyof typeof TYPE_SCALE;
/** rem for a scale step (16px root). */
export const remOf = (px: number): string => `${+(px / 16).toFixed(4)}rem`;

/**
 * The specification's typography roles mapped onto the scale. `spec` is the
 * proposed range (px); `steps` are the scale steps that fill it. `command` is
 * the dense console's choice (Operational Command, plan §3.3) where it sits
 * below the range, with the reason.
 */
export const TYPE_ROLES: Record<string, { spec: [number, number]; steps: TypeStep[]; command?: { step: TypeStep; why: string } }> = {
  body: { spec: [14, 16], steps: ['sm', 'base'] },
  compactTable: { spec: [13, 14], steps: ['compact', 'sm'] },
  pageTitle: { spec: [28, 32], steps: ['3xl'], command: { step: 'lg', why: 'The console page title (ConsoleTabs) sits under a 56px command bar on a dense operational ground; the workspace ground uses 3xl' } },
  sectionHeading: { spec: [18, 22], steps: ['lg', 'xl'], command: { step: 'xs', why: 'Console sections (DataSystem Section) are uppercase, letter-spaced labels under the page title, not headings set large' } },
  smallLabel: { spec: [12, 13], steps: ['xs', 'compact'] },
  marker: { spec: [11, 11], steps: ['2xs'] },
};

/**
 * The spacing scale: a 4px base (specification: "Base spacing 4 px"), with
 * the 2px half step Tailwind already has (`0.5`, `1.5`, `2.5`, `3.5`) for
 * insets inside compact controls, and the 1px hairline (`px`) for borders.
 * Values in px; Tailwind's spacing utilities are this scale. Arbitrary
 * spacing (`p-[7px]`) is off the scale (type-scale.test.ts).
 */
export const SPACE_BASE = 4;
export const SPACE_SCALE = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96] as const;

/** Controls, containers and keyboard focus (specification Part 6 §B). */
export const CONTROL = {
  /** Common control height (spec 40–44px): `min-h-tap`, `--tap`. */
  height: 44,
  /** Standard card radius (spec 10–14px): Tailwind `rounded-md`. */
  cardRadius: 14,
} as const;

/**
 * Keyboard focus (spec: "clearly visible, high-contrast outline on every
 * interactive element"): a 3px amber outline 2px outside the element, with
 * a 2px halo of the ground's ink filling the gap, so one of the two reads at
 * 3:1 (WCAG 1.4.11) on every ground, light or dark (tokens.test.ts).
 * CSS: `:focus-visible` and `.focus-ring` in globals.css.
 */
export const FOCUS = { ring: '#ffbf47', width: 3, offset: 2, halo: 2 } as const;

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

/**
 * The night chrome (OnboardingFrame: welcome, setup, the Update Center, the
 * release publisher and the site editor): warm text on the institutional
 * ground. `soft` is the secondary level (as `text-white/60…75`), `muted`
 * replaces `text-white/40…55` and `faint` `text-white/15…35`; each reads at
 * 4.5:1 on the ground and on
 * the lightest panel (champagne hair at 12%), where the white-opacity
 * utilities fell to 2.5–3.8:1 (go-live review M-11). `champagneMuted` is the
 * dimmest champagne text (was `#d9c398` at 50–60% opacity).
 * Tailwind: `text-night-ink`, `text-night-soft`, `text-night-muted`,
 * `text-night-faint`, `text-night-champagne`.
 */
export const NIGHT = {
  ground: INSTITUTIONAL.ground,
  /** The lightest panel text sits on: champagne hair 12% over the ground. */
  panel: '#1e1d1b',
  ink: '#f3efe6',
  soft: '#c4c0b8',
  muted: '#a29e96',
  faint: '#928e87',
  champagneMuted: '#a5967a',
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
