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
import { nationOffices, chamberText, type NationOffices } from '@/lib/nation/offices';
import { getMessages, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export interface NationFacts {
  iso3?: string;
  regions?: string[];
  currency?: string;
  locale?: string;
  stateForm?: StateForm;
  constitution?: NationalConstitution;
  stateName?: string;
  executiveTitle?: string;
  legislatureName?: string;
  /** True once setup is complete; offices keep the reference wording until then. */
  configured?: boolean;
  paymentRail?: string;
  timeZone?: string;
  emergency?: { general?: string; police?: string; fire?: string; ambulance?: string };
  foreignAffairs?: { partners?: { name: string; capital?: string }[]; memberships?: string[] };
  /** The nation's AI-assistant opt-in from setup (false = off; unset = on, as before). */
  aiAssistant?: boolean;
  /** Insignia monogram and colour from the sovereign profile (identity). */
  seal?: string;
  accent?: string;
}

const state: { iso3?: string; regions: string[]; currency: string; locale: string; stateForm?: StateForm; constitution?: NationalConstitution; stateName?: string; executiveTitle?: string; legislatureName?: string; configured: boolean; paymentRail?: string; timeZone?: string; emergency?: NationFacts['emergency']; foreignAffairs?: NationFacts['foreignAffairs']; aiAssistant?: boolean; seal?: string; accent?: string } = {
  configured: false,
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
  state.stateName = f.stateName;
  state.executiveTitle = f.executiveTitle;
  state.legislatureName = f.legislatureName;
  state.configured = !!f.configured;
  state.paymentRail = f.paymentRail?.trim() || undefined;
  state.timeZone = validZone(f.timeZone) ? f.timeZone : undefined;
  state.emergency = f.emergency;
  state.foreignAffairs = f.foreignAffairs;
  state.aiAssistant = f.aiAssistant;
  state.seal = f.seal?.trim() || undefined;
  state.accent = f.accent && /^#[0-9a-fA-F]{6}$/.test(f.accent) ? f.accent : undefined;
}

/**
 * Interface text in the nation's language (chosen in setup), from the
 * dictionaries in lib/i18n; English for any language without one yet.
 */
export function nationMessages(): Messages {
  return getMessages(state.locale as Locale);
}

/** The nation's language code from setup (e.g. 'en', 'sw', 'ar'). */
export function nationLocale(): string {
  return state.locale;
}

/** Text direction of the nation's language, for surfaces that render it. */
export function nationTextDir(): 'ltr' | 'rtl' {
  return state.locale === 'ar' ? 'rtl' : 'ltr';
}

/** Whether the nation has the AI assistant on (the same rule /api/ai/advisory applies). */
export function nationAiEnabled(): boolean {
  return state.aiAssistant !== false;
}

/**
 * Wording for a panel that presents itself as AI: the AI wording while the
 * nation has the assistant on, the plain wording once it has switched it off.
 * The panel and its content stay the same either way.
 */
export function aiLabel(ai: string, plain: string): string {
  return nationAiEnabled() ? ai : plain;
}

/** The nation's own diplomatic partners and memberships, when it has declared them. */
export function nationForeignAffairs(): { partners: { name: string; capital?: string }[]; memberships: string[] } {
  return {
    partners: (state.foreignAffairs?.partners ?? []).filter(p => p.name?.trim()),
    memberships: (state.foreignAffairs?.memberships ?? []).map(m => m.trim()).filter(Boolean),
  };
}

function validZone(tz?: string): tz is string {
  if (!tz) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

/** Time of day in the nation's time zone (browser time until one is set). */
export function nationTime(d: Date, locale: string | undefined = 'en-GB'): string {
  return d.toLocaleTimeString(locale, state.timeZone ? { hour12: false, timeZone: state.timeZone } : locale ? { hour12: false } : undefined);
}

/** Short UTC-offset label for the nation's time zone, e.g. "GMT+3"; the reference label until set. */
export function nationTimeZoneLabel(reference: string): string {
  if (!state.timeZone) return reference;
  const part = new Intl.DateTimeFormat('en-GB', { timeZone: state.timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName');
  return part?.value ?? reference;
}

/** A public emergency number; each surface keeps its reference number until the nation sets one. */
export function nationEmergencyNumber(kind: 'general' | 'police' | 'fire' | 'ambulance', reference: string): string {
  const e = state.emergency;
  return e?.[kind]?.trim() || e?.general?.trim() || reference;
}

/** The emergency numbers the nation has set in setup (none before then), for listing them together. */
export function nationEmergencyContacts(): { kind: 'general' | 'police' | 'fire' | 'ambulance'; number: string }[] {
  const e = state.emergency ?? {};
  return (['general', 'police', 'fire', 'ambulance'] as const).flatMap(kind => (e[kind]?.trim() ? [{ kind, number: e[kind]!.trim() }] : []));
}

/** The nation's domestic payment rail (a neutral default until one is set). */
export function nationPaymentRail(): string {
  return state.paymentRail ?? 'Mobile Money';
}

/** The installed nation's offices (reference wording until setup is complete). */
export function currentOffices(): NationOffices {
  return nationOffices({
    stateName: state.stateName ?? '', stateForm: state.stateForm ?? 'republic', executiveTitle: state.executiveTitle ?? '',
    legislatureName: state.legislatureName ?? '', currency: state.currency, regionNoun: 'region', locale: state.locale,
    constitution: state.constitution,
  }, state.configured);
}

/**
 * The installed nation's insignia for public surfaces: its seal monogram (or
 * the initials of its name) and colour. Null until setup is complete, so the
 * reference glyphs stay in place before a nation is installed.
 */
export function nationInsignia(): { seal: string; accent: string | undefined; name: string } | null {
  if (!state.configured || !state.stateName?.trim()) return null;
  const name = state.stateName.trim();
  const words = name.split(/\s+/).filter(w => !/^(of|the|and|de|al)$/i.test(w));
  const seal = state.seal || (words.length ? words : name.split(/\s+/)).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return { seal, accent: state.accent, name };
}

/** Institution app names that follow the nation's offices and chambers. */
export function nationAppLabel(id: string, label: string): string {
  if (!state.configured) return label;
  const o = currentOffices();
  if (id === 'presidency') return `${o.executiveOffice} · Cabinet Office`;
  if (id === 'assembly') return o.primaryChamber;
  if (id === 'senate') return o.upperChamber ?? label;
  return label;
}

/** Legislature-app wording with the nation's own chamber names (see `chamberText`). */
export function nationChamberText(text: string): string {
  return chamberText(text, currentOffices());
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

/**
 * The nation's region for a reference slot: dashboards that name example
 * regions inline (e.g. 'North Province') map each to a slot index, so they
 * show the nation's own regions once set and the reference name until then.
 */
export function regionName(slot: number, reference: string): string {
  const r = state.regions;
  return r.length ? r[slot % r.length]! : reference;
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
      // Explicit, so Node (server) and browsers agree: "$213M", not "$213.00M".
      minimumFractionDigits: 0,
      maximumFractionDigits: opts.digits ?? (compact ? 2 : 0),
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
