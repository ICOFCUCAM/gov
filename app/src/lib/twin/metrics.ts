// The twin's metric registry (review R5, register 16.6): what each metric
// means, in which unit it is counted and how regional values may be combined
// into a national one. Kept inside the twin store (lib/twin/db.ts).
//
//   unit         a UCUM code (Unified Code for Units of Measure), checked
//                against a bundled list of common units; counted things are
//                UCUM annotations such as {persons} or {beds}, currencies the
//                ISO 4217 code as an annotation, e.g. {KES}
//   aggregation  sum (population), mean, weighted-mean (by another metric,
//                e.g. a rate weighted by population) or none (an index, a
//                rate without weights): never summed by default
//   period       instant (a stock on a date) or the period a value covers
//   sdmxConcept  the code the statistics office uses for it in SDMX files
//
// Metrics already observed before the registry existed appear as
// aggregation "none" (origin "observed") until an official registers them, so
// nothing is summed that was not meant to be. A short list of standard
// definitions (population and similar stocks) applies when nobody has
// registered the metric yet; an official's definition always wins.

import { recordAudit } from '@/lib/data/store';
import { twinDb } from './db';
import { archivedMetrics } from './archive';
import { derivedMetric, formulaOf } from './derived';

export type Aggregation = 'sum' | 'mean' | 'weighted-mean' | 'none';
export type MetricPeriod = 'instant' | 'year' | 'quarter' | 'month' | 'day';
export type MetricOrigin = 'official' | 'standard' | 'observed';

export interface MetricDef {
  id: string;
  label: string;
  /** UCUM code. */
  unit: string;
  aggregation: Aggregation;
  /** For weighted-mean: the metric whose values weight each region. */
  weightMetric?: string;
  /** The SDMX concept or code list value the statistics office uses. */
  sdmxConcept?: string;
  period: MetricPeriod;
  description?: string;
  /** official: registered here; standard: the platform's standard definition; observed: found in observations, not yet defined. */
  origin: MetricOrigin;
  registeredBy?: string;
  registeredAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export const METRIC_ID = /^[a-z][a-z0-9_.]{1,63}$/;
export const AGGREGATIONS: Aggregation[] = ['sum', 'mean', 'weighted-mean', 'none'];
export const PERIODS: MetricPeriod[] = ['instant', 'year', 'quarter', 'month', 'day'];

// ── UCUM ──────────────────────────────────────────────────────────────────

/**
 * Common UCUM atoms (case-sensitive codes), prefixed where the prefix is in
 * common use. A unit is one or more of these joined by "." (times) or "/"
 * (per), each with an optional integer exponent (m2, s-1) and annotation
 * ({persons}); integers and powers of ten (10*3) are allowed as factors.
 */
export const UCUM_ATOMS: readonly string[] = [
  // dimensionless
  '1', '%', '[ppth]', '[ppm]', '[ppb]', '[pptr]',
  // length and area
  'm', 'km', 'cm', 'mm', 'um', 'nm', '[mi_i]', '[nmi_i]', '[ft_i]', '[in_i]', '[yd_i]', 'ha', 'ar', '[acr_i]', '[sft_i]',
  // volume
  'L', 'kL', 'hL', 'dL', 'cL', 'mL', 'uL', '[gal_us]', '[gal_br]', '[bbl_us]',
  // mass
  'g', 'kg', 'mg', 'ug', 'ng', 't', '[lb_av]', '[oz_av]',
  // time
  's', 'ms', 'min', 'h', 'd', 'wk', 'mo', 'a',
  // energy and power
  'J', 'kJ', 'MJ', 'GJ', 'TJ', 'PJ', 'cal', 'kcal', 'W', 'kW', 'MW', 'GW', 'TW', 'eV',
  // temperature, pressure
  'Cel', 'K', '[degF]', 'Pa', 'hPa', 'kPa', 'MPa', 'bar', 'mbar', 'atm', 'mm[Hg]',
  // electricity, frequency
  'V', 'kV', 'mV', 'A', 'mA', 'Ohm', 'Hz', 'kHz', 'MHz', 'GHz', 'C', 'F',
  // information
  'bit', 'kbit', 'Mbit', 'Gbit', 'By', 'kBy', 'MBy', 'GBy', 'TBy', 'PBy', 'Bd',
  // amount, concentration, radiation, light, angle
  'mol', 'mmol', 'umol', 'eq', 'meq', 'Sv', 'mSv', 'uSv', 'Gy', 'Bq', 'cd', 'lm', 'lx', 'deg', 'rad', 'sr', 'dB', '[pH]', '[IU]', '[iU]',
];
const ATOMS = new Set(UCUM_ATOMS);

/** Units offered when registering a metric (the form's suggestions). */
export const COMMON_UNITS: readonly string[] = [
  '{persons}', '{households}', '{cases}', '{beds}', '{facilities}', '1', '%', '/10*3{persons}', '/10*5{persons}',
  'km', 'km2', 'ha', 'm3', 'L', 't', 'kg', 'MW', 'GW', 'kW.h', 'MW.h', 'GW.h', 'Cel', 'mm', 'mm/d', 'km/h', 'd', 'a', 'GBy',
];

const ANNOTATION = /^\{[!-z|~]*\}$/; // ASCII 33–126 except braces
function splitTerms(code: string): { op: '' | '.' | '/'; term: string }[] | null {
  const out: { op: '' | '.' | '/'; term: string }[] = [];
  let depth = 0, cur = '', op: '' | '.' | '/' = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth < 0) return null; }
    if (depth === 0 && (ch === '.' || ch === '/')) {
      if (cur === '' && !(i === 0 && ch === '/')) return null;
      if (cur !== '') out.push({ op, term: cur });
      op = ch; cur = '';
      continue;
    }
    cur += ch;
  }
  if (depth !== 0 || cur === '') return null;
  out.push({ op, term: cur });
  return out;
}

function validTerm(term: string): boolean {
  if (ANNOTATION.test(term)) return true;
  const ann = term.indexOf('{');
  const core = ann >= 0 ? term.slice(0, ann) : term;
  if (ann >= 0 && !ANNOTATION.test(term.slice(ann))) return false;
  if (/^\d+$/.test(core) || /^10\*[+-]?\d+$/.test(core)) return true;
  if (ATOMS.has(core)) return true;
  const m = /^(.*?)([+-]?\d+)$/.exec(core);
  return !!m && m[1] !== '' && ATOMS.has(m[1]!) && m[1] !== '1';
}

/** Whether a code is a UCUM unit built from the bundled list. */
export function isUcum(code: string): boolean {
  const c = code.trim();
  if (!c || c.length > 64 || /\s/.test(c)) return false;
  const terms = splitTerms(c);
  return !!terms && terms.every(t => validTerm(t.term));
}

/**
 * The UCUM code for a unit as a source writes it: a valid code as it is, a
 * plain word as an annotation ("persons" → {persons}), nothing for an empty
 * or unreadable unit.
 */
export function toUcum(text: string | undefined): string | undefined {
  const s = (text ?? '').trim();
  if (!s) return undefined;
  if (isUcum(s)) return s;
  const word = s.replace(/\s+/g, '_');
  return /^[!-z|~]{1,48}$/.test(word) && !/[{}]/.test(word) && isUcum(`{${word}}`) ? `{${word}}` : undefined;
}

/** Whether two units as written are the same UCUM unit (persons and {persons} are). */
export function sameUnit(a: string | undefined, b: string | undefined): boolean {
  const x = toUcum(a), y = toUcum(b);
  return !!x && x === y;
}

// ── Standard definitions ──────────────────────────────────────────────────

/** Definitions that are the same in every nation (stocks that add up across regions). */
export const STANDARD_METRICS: readonly Omit<MetricDef, 'origin'>[] = [
  { id: 'population', label: 'Population', unit: '{persons}', aggregation: 'sum', period: 'instant', sdmxConcept: 'POP' },
  { id: 'households', label: 'Households', unit: '{households}', aggregation: 'sum', period: 'instant' },
  { id: 'area', label: 'Area', unit: 'km2', aggregation: 'sum', period: 'instant' },
];

// ── Registry ──────────────────────────────────────────────────────────────

const observedMetricIds = (): Set<string> => new Set([...twinDb().observations.map(o => o.metric), ...archivedMetrics()]);

/** A metric's definition: the official's, the standard one, or "observed" (aggregation none) when it only appears in observations. */
export function getMetric(id: string): MetricDef | undefined {
  const own = twinDb().metrics[id];
  if (own) return { ...own };
  const std = STANDARD_METRICS.find(m => m.id === id);
  if (std) return { ...std, origin: 'standard' };
  if (observedMetricIds().has(id)) return { id, label: id, unit: '1', aggregation: 'none', period: 'instant', origin: 'observed' };
  return undefined;
}

/** Whether a metric may be imported: registered by an official, a standard metric, or one already observed before the registry existed. */
export const isKnownMetric = (id: string): boolean => getMetric(id) !== undefined;

/** Every metric definition: registered, standard and observed-only, by id. */
export function listMetrics(): MetricDef[] {
  const ids = new Set([...Object.keys(twinDb().metrics), ...STANDARD_METRICS.map(m => m.id), ...observedMetricIds()]);
  return [...ids].sort().map(id => getMetric(id)!).filter(Boolean);
}

export interface MetricInput {
  id?: string; label?: string; unit?: string; aggregation?: string; weightMetric?: string;
  sdmxConcept?: string; period?: string; description?: string; by?: string;
}

/**
 * Register a metric, or change its definition (a named official; audited with
 * what changed). Units must be UCUM; a weighted mean names the metric that
 * weights it.
 */
export function registerMetric(input: MetricInput): MetricDef | { error: string } {
  const by = (input.by ?? '').trim();
  if (!by) return { error: 'Name the official registering the metric' };
  const id = (input.id ?? '').trim().toLowerCase();
  if (!METRIC_ID.test(id)) return { error: 'A metric is lower case letters, digits, dots and underscores, e.g. population or cpi.all_items' };
  const derived = derivedMetric(id);
  if (derived) return { error: `${id} is derived (${formulaOf(derived)}) and computed from its inputs: register ${derived.numerator.id} and ${derived.denominator.id} instead` };
  const label = (input.label ?? '').trim().slice(0, 120);
  if (!label) return { error: 'Give the metric a label' };
  const unit = (input.unit ?? '').trim();
  if (!isUcum(unit)) return { error: `"${unit}" is not a UCUM unit: use a code such as km2, MW, % or an annotation such as {persons}` };
  const aggregation = input.aggregation as Aggregation;
  if (!AGGREGATIONS.includes(aggregation)) return { error: 'Choose how regional values combine: sum, mean, weighted-mean or none' };
  const period = (input.period ?? 'instant') as MetricPeriod;
  if (!PERIODS.includes(period)) return { error: 'The period is instant, year, quarter, month or day' };
  const weightMetric = input.weightMetric?.trim().toLowerCase() || undefined;
  if (aggregation === 'weighted-mean') {
    if (!weightMetric) return { error: 'A weighted mean names the metric that weights it, e.g. population' };
    if (weightMetric === id) return { error: 'A metric cannot weight itself' };
    if (!isKnownMetric(weightMetric)) return { error: `Register ${weightMetric} first` };
  }
  const sdmxConcept = input.sdmxConcept?.trim() || undefined;
  if (sdmxConcept && !/^[A-Za-z0-9_.@-]{1,64}$/.test(sdmxConcept)) return { error: 'An SDMX concept is a code of letters, digits, _ . @ or -' };
  const description = input.description?.trim().slice(0, 500) || undefined;
  const d = twinDb();
  const before = d.metrics[id];
  const now = new Date().toISOString();
  const def: MetricDef = {
    id, label, unit, aggregation, period, origin: 'official',
    ...(aggregation === 'weighted-mean' ? { weightMetric } : {}),
    ...(sdmxConcept ? { sdmxConcept } : {}), ...(description ? { description } : {}),
    registeredBy: before?.registeredBy ?? by, registeredAt: before?.registeredAt ?? now,
    ...(before ? { updatedBy: by, updatedAt: now } : {}),
  };
  d.metrics[id] = def;
  if (before) {
    const changed = (['label', 'unit', 'aggregation', 'weightMetric', 'sdmxConcept', 'period', 'description'] as const)
      .filter(k => before[k] !== def[k]).map(k => `${k}: ${before[k] ?? '—'} → ${def[k] ?? '—'}`);
    recordAudit(by, 'twin.metric.update', `TwinMetric:${id}`, 'ok', changed.join('; ') || 'no change');
  } else {
    recordAudit(by, 'twin.metric.register', `TwinMetric:${id}`, 'ok', `${label} · ${unit} · ${aggregation}${weightMetric && aggregation === 'weighted-mean' ? ` by ${weightMetric}` : ''} · ${period}`);
  }
  return { ...def };
}
