// Nation registry — the installed nation's operational facts, shared by the
// governance engines, maps and money formatting. It is filled from the
// sovereign profile (server: the store; client: <NationRegistry> in the root
// layout), so engines stay pure and nation-neutral: none of them hardcode a
// country's regions, map or currency. Before a nation is installed every
// engine keeps its own reference data, so behaviour is unchanged.
//
// See docs/NATION_CONVERSION_MANIFEST.md (Nation Pack, steps 1–5).

import type { StateForm, NationalConstitution } from '@/lib/api/types';
import { constitutionFor, type ConstitutionModel } from '@/lib/gov/constitution';

export interface NationFacts {
  iso3?: string;
  regions?: string[];
  currency?: string;
  locale?: string;
  stateForm?: StateForm;
  constitution?: NationalConstitution;
}

const state: { iso3?: string; regions: string[]; currency: string; locale: string; stateForm?: StateForm; constitution?: NationalConstitution } = {
  regions: [],
  currency: 'USD',
  locale: 'en',
};

/** Apply the installed nation's facts. Idempotent; safe to call on every render. */
export function applyNation(f: NationFacts | null | undefined): void {
  if (!f) return;
  state.iso3 = f.iso3 && /^[A-Z]{3}$/.test(f.iso3) ? f.iso3 : undefined;
  state.regions = (f.regions ?? []).map(r => r.trim()).filter(Boolean);
  state.currency = f.currency && /^[A-Z]{3}$/.test(f.currency) ? f.currency : 'USD';
  state.locale = f.locale || 'en';
  state.stateForm = f.stateForm;
  state.constitution = f.constitution;
}

/** The installed nation's constitution: its form-of-state template with its own facts applied. */
export function nationConstitution(): ConstitutionModel {
  return constitutionFor(state.stateForm ?? 'republic', state.constitution);
}

/**
 * Seats in the nation's primary (index 0) or upper (index 1) chamber, when the
 * nation has declared its chambers; otherwise the engine's own reference figure.
 */
export function chamberSeats(index: 0 | 1, reference: number): number {
  const c = state.constitution?.chambers?.filter(x => x.name?.trim() && x.seats > 0)[index];
  return c ? Math.round(c.seats) : reference;
}

/** ISO 3166-1 alpha-3 code of the installed nation, if one is set. */
export function nationIso3(): string | undefined {
  return state.iso3;
}

/** The nation's operational regions, or an empty list before one is set. */
export function nationRegions(): readonly string[] {
  return state.regions;
}

export function nationCurrency(): string {
  return state.currency;
}

/**
 * A region list that follows the installed nation. Engines declare
 * `const REGIONS = regionList([...their reference regions])` and use it like
 * an array; it reads the nation's regions when set and the reference list
 * otherwise, at the moment it is used — so it is always current.
 */
export function regionList(reference: readonly string[]): string[] {
  const src = () => (state.regions.length ? state.regions : reference) as string[];
  return new Proxy([] as string[], {
    get(_t, prop) {
      const s = src();
      const v = Reflect.get(s, prop, s);
      return typeof v === 'function' ? v.bind(s) : v;
    },
    has: (_t, prop) => Reflect.has(src(), prop),
    ownKeys: () => Reflect.ownKeys(src()),
    getOwnPropertyDescriptor: (_t, prop) => {
      const d = Reflect.getOwnPropertyDescriptor(src(), prop);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

/**
 * Format an amount in the nation's currency, compactly for dashboards
 * (e.g. 2.84e9 → "UGX 2.84B" / "$2.84B").
 */
export function formatMoney(amount: number, opts: { compact?: boolean; digits?: number; currency?: string } = {}): string {
  const currency = opts.currency ?? state.currency;
  const compact = opts.compact ?? true;
  try {
    return new Intl.NumberFormat(state.locale === 'en' ? 'en' : state.locale, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: opts.digits ?? (compact ? 2 : 0),
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
