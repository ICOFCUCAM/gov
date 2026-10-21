// The composable classification of the state (docs/CONSTITUTIONAL_ARCHITECTURE.md
// §1.2; plan phase 4; audit H). A nation's profile keeps one `stateForm`
// (locked: setup, presets and the branch templates read it) and may record,
// beside it, the classification on independent axes: forms of state, forms of
// government, territorial arrangements, legal traditions and recognised types
// of authority, each a list, with where they come from and from when, and the
// style the platform uses for the state on its front door.
//
// Mechanism only: the platform never chooses a value for a nation. Until a
// nation records its classification, it is derived from `stateForm` (only what
// that value already says) and from the legal system named in the deployment
// profile; derived values are marked so screens can say so. Pure: runs in the
// browser and on the server.

import type { SovereignProfile, StateClassification, PlatformStyle, StateForm } from '@/lib/api/types';

export const PLATFORM_STYLES: { key: PlatformStyle; label: string; platform: string }[] = [
  { key: 'government', label: 'Government', platform: 'Official Government Platform' },
  { key: 'republic', label: 'Republic', platform: 'Official Government Platform' },
  { key: 'federation', label: 'Federation', platform: 'Official Government Platform' },
  { key: 'union', label: 'Union', platform: 'Official Government Platform' },
  { key: 'kingdom', label: 'Kingdom', platform: 'Official Kingdom Platform' },
  { key: 'emirate', label: 'Emirate', platform: 'Official Emirate Platform' },
  { key: 'sultanate', label: 'Sultanate', platform: 'Official Sultanate Platform' },
  { key: 'principality', label: 'Principality', platform: 'Official Principality Platform' },
  { key: 'grand-duchy', label: 'Grand duchy', platform: 'Official Grand Duchy Platform' },
];
export const isPlatformStyle = (v: unknown): v is PlatformStyle => PLATFORM_STYLES.some(s => s.key === v);

/** Starting lists for each axis (open lists: a nation may record others). */
export const CLASSIFICATION_CHOICES: Record<'stateForms' | 'governmentForms' | 'territorialArrangements' | 'legalTraditions' | 'authorityTypes', string[]> = {
  stateForms: ['republic', 'monarchy', 'federation', 'city-state', 'union', 'theocratic'],
  governmentForms: ['presidential', 'parliamentary', 'semi-presidential', 'directorial', 'absolute', 'constitutional-monarchy'],
  territorialArrangements: ['unitary', 'federal', 'devolved', 'confederal', 'union'],
  legalTraditions: ['civil_law', 'common_law', 'mixed', 'customary_law', 'religious_law'],
  authorityTypes: ['constitutional', 'statutory', 'customary', 'religious'],
};

/**
 * The style derived from the state form until a nation records one: the
 * outputs `platformLabel` has always had (monarchies are kingdoms, emirates by
 * name are emirates, every other form a government), so nothing changes for
 * an existing nation.
 */
export function derivedStyle(stateForm: string, stateName: string): PlatformStyle {
  if (stateForm !== 'monarchy') return 'government';
  return /emirate/i.test(stateName) ? 'emirate' : 'kingdom';
}

/** The front-door label for a style. */
export const styleLabel = (style: PlatformStyle): string => PLATFORM_STYLES.find(s => s.key === style)?.platform ?? 'Official Government Platform';

const FROM_FORM: Record<StateForm, Pick<StateClassification, 'stateForms' | 'governmentForms' | 'territorialArrangements'>> = {
  // What each form already says, and nothing more (constitution.ts labels "republic" a presidential republic).
  republic: { stateForms: ['republic'], governmentForms: ['presidential'], territorialArrangements: [] },
  parliamentary: { stateForms: ['republic'], governmentForms: ['parliamentary'], territorialArrangements: [] },
  federation: { stateForms: ['federation'], governmentForms: [], territorialArrangements: ['federal'] },
  monarchy: { stateForms: ['monarchy'], governmentForms: [], territorialArrangements: [] },
  'city-state': { stateForms: ['city-state'], governmentForms: [], territorialArrangements: [] },
  union: { stateForms: ['union'], governmentForms: [], territorialArrangements: ['union'] },
};
const TRADITION: Record<string, string> = { civil: 'civil_law', common: 'common_law', mixed: 'mixed', religious: 'religious_law', customary: 'customary_law' };

/**
 * The classification in force for a profile: what the nation recorded, else
 * derived from its `stateForm` and the legal system in its deployment
 * profile (`derived: true`). Recorded axes left empty stay empty.
 */
export function classificationOf(p: Pick<SovereignProfile, 'stateForm' | 'stateName' | 'constitution' | 'deployment'>): StateClassification & { derived: boolean } {
  const c = p.constitution?.classification;
  if (c) {
    return {
      stateForms: [...(c.stateForms ?? [])], governmentForms: [...(c.governmentForms ?? [])], territorialArrangements: [...(c.territorialArrangements ?? [])],
      legalTraditions: [...(c.legalTraditions ?? [])], authorityTypes: [...(c.authorityTypes ?? [])],
      style: c.style ?? derivedStyle(p.stateForm, p.stateName ?? ''),
      ...(c.sources?.length ? { sources: [...c.sources] } : {}), ...(c.effectiveFrom ? { effectiveFrom: c.effectiveFrom } : {}), derived: false,
    };
  }
  const f = FROM_FORM[p.stateForm] ?? { stateForms: [p.stateForm], governmentForms: [], territorialArrangements: [] };
  const ls = p.deployment?.jurisdiction?.legalSystem;
  const tradition = ls ? TRADITION[ls] : undefined;
  return {
    stateForms: [...f.stateForms], governmentForms: [...f.governmentForms], territorialArrangements: [...f.territorialArrangements],
    legalTraditions: tradition ? [tradition] : [],
    authorityTypes: ls === 'customary' ? ['customary'] : ls === 'religious' ? ['religious'] : [],
    style: derivedStyle(p.stateForm, p.stateName ?? ''), derived: true,
  };
}

const AXES = ['stateForms', 'governmentForms', 'territorialArrangements', 'legalTraditions', 'authorityTypes'] as const;
const VALUE = /^[a-z][a-z0-9_-]{1,40}$/;

/** Check a classification sent by setup (PUT /api/sovereign): lists of short keys, a known style, sources, a date. */
export function checkClassification(x: unknown): StateClassification | { error: string } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { error: 'The classification is { stateForms, governmentForms, territorialArrangements, legalTraditions, authorityTypes, style?, sources?, effectiveFrom? }' };
  const v = x as Record<string, unknown>;
  const out = {} as StateClassification;
  for (const a of AXES) {
    const list = v[a] ?? [];
    if (!Array.isArray(list) || list.length > 10 || list.some(s => typeof s !== 'string' || !VALUE.test(s))) return { error: `${a} is a list (up to 10) of short keys, e.g. ${CLASSIFICATION_CHOICES[a].slice(0, 3).join(', ')}` };
    out[a] = [...new Set(list as string[])];
  }
  if (v.style !== undefined && v.style !== null && v.style !== '') {
    if (!isPlatformStyle(v.style)) return { error: `The style is one of ${PLATFORM_STYLES.map(s => s.key).join(', ')}` };
    out.style = v.style;
  }
  if (v.sources !== undefined) {
    if (!Array.isArray(v.sources) || v.sources.length > 10 || v.sources.some(s => typeof s !== 'string')) return { error: 'Sources are a list (up to 10) of the instruments the classification rests on' };
    const s = (v.sources as string[]).map(t => t.trim().slice(0, 300)).filter(Boolean);
    if (s.length) out.sources = s;
  }
  if (v.effectiveFrom !== undefined && v.effectiveFrom !== '') {
    if (typeof v.effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveFrom)) return { error: 'The date the classification applies from is YYYY-MM-DD' };
    out.effectiveFrom = v.effectiveFrom;
  }
  return out;
}
