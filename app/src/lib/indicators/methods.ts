// The computations an indicator definition may name (plan step I3: "an
// indicator's value is computed from the registers and cases, never typed").
// Each method has an id and a version; a definition cites both, so a changed
// computation needs a new version of the definition and a new approval. Every
// method reads the platform's own records only (cases through the case engine,
// registered civil events, the organisations register), counts their ids for
// the lineage, and states its coverage:
//
//   case work      the procedures approved at the institution (the engine
//                  records every case of an approved procedure; none approved
//                  means its cases are not kept here: no value, not zero)
//   regions        the nation's operational regions; a region reports once the
//                  register holds any record placed in it, so a covered region
//                  with none in the period is a computed zero and an uncovered
//                  one is missing; a national figure only when every region
//                  reports
//
// Sample records (made by sample cases in demo and training) are counted only
// where samples are allowed, and then mark the value Sample; in production they
// never count. Nothing here writes a record.

import { casesOf } from '@/lib/casework/engine';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import type { Case } from '@/lib/casework/types';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { eventFacts } from '@/lib/civil/register';
import { listOrganisations, current } from '@/lib/organisations/register';
import { nationRegions } from '@/lib/nation/registry';
import type { Coverage } from './types';

export interface MethodContext {
  /** The institution whose records are counted (case-work methods). */
  institution?: string;
  /** The period: start inclusive, end exclusive (ISO dates). */
  start: string; end: string;
  /** Whether sample records may count (samplesAllowed()). */
  samples: boolean;
  params?: Record<string, string>;
}

export interface RawGroup { key: string; label: string; value: number | null; base: number; numerator?: number; denominator?: number; ids?: string[] }
export interface RawResult {
  /** Why there is no source: no value at all (Not connected). */
  unavailable?: string;
  /** The value before disclosure (null: not computable, e.g. a ratio of nothing, a national figure without every region). */
  value: number | null;
  /** How many records the value rests on (the cell the disclosure rule protects). */
  base: number;
  numerator?: number; denominator?: number;
  ids: string[];
  /** A sample record was counted. */
  sample: boolean;
  lastAt?: string;
  coverage: Coverage;
  groups?: RawGroup[];
  /** Why the value is null although records exist. */
  note?: string;
}

export interface Method {
  id: string;
  version: number;
  label: string;
  /** The unit (UCUM) its values carry. */
  unit: string;
  geography: 'institution' | 'region';
  /** How coverage is decided, in words (copied into a definition's terms). */
  coverage: string;
  /** Parameters it accepts. */
  params?: string[];
  compute(ctx: MethodContext): RawResult;
}

const inPeriod = (at: string | undefined, ctx: MethodContext) => !!at && at.slice(0, 10) >= ctx.start && at.slice(0, 10) < ctx.end;
const latest = (ats: (string | undefined)[]) => ats.filter((x): x is string => !!x).sort().at(-1);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const round1 = (x: number) => Math.round(x * 10) / 10;

// ── case work ──────────────────────────────────────────────────────────────

/** The approved procedures an institution runs (optionally one family, e.g. `police.`). */
function proceduresAt(institution: string, family?: string): { key: string; title: string }[] {
  const seen = new Map<string, string>();
  for (const p of listPackages({ state: 'approved' })) {
    if (family && !p.key.startsWith(family)) continue;
    if (ownerInstitution(p.owner, authorityFor) === institution) seen.set(p.key, p.title);
  }
  return [...seen].map(([key, title]) => ({ key, title }));
}

const CASE_COVERAGE = 'The procedures approved at the institution (the case engine records every case of an approved procedure); with none approved its cases are not kept in the platform and no value is shown';

interface CaseView { cases: Case[]; procedures: { key: string; title: string }[]; coverage: Coverage; unavailable?: string }
function caseView(ctx: MethodContext): CaseView {
  const inst = ctx.institution;
  const family = ctx.params?.family?.trim() || undefined;
  if (!inst) return { cases: [], procedures: [], coverage: { expected: 0, reporting: 0, completeness: 'not_calculated', of: 'procedures' }, unavailable: 'Case-work indicators are computed for one institution' };
  const procedures = proceduresAt(inst, family);
  const n = procedures.length;
  const coverage: Coverage = { expected: n, reporting: n, completeness: n ? 'complete' : 'none', of: family ? `approved ${family.replace(/\.$/, '')} procedures` : 'approved procedures' };
  if (!n) return { cases: [], procedures, coverage, unavailable: `${getMinistry(inst)?.name ?? inst} has no approved ${family ? `${family.replace(/\.$/, '')} ` : ''}procedure: its cases are not kept in the platform` };
  const keys = new Set(procedures.map(p => p.key));
  const cases = casesOf(inst).filter(c => keys.has(c.package.key) && (ctx.samples || c.source !== 'sample'));
  return { cases, procedures, coverage };
}

const decisionAt = (c: Case) => c.history.find(s => s.decision)?.at;
const openAtEnd = (c: Case, ctx: MethodContext) => c.openedAt.slice(0, 10) < ctx.end && (!c.closedAt || c.closedAt.slice(0, 10) >= ctx.end);

/** A count of cases selected by `pick`, grouped by procedure. */
function caseCount(ctx: MethodContext, pick: (c: Case) => boolean, when: (c: Case) => string | undefined): RawResult {
  const v = caseView(ctx);
  if (v.unavailable) return { unavailable: v.unavailable, value: null, base: 0, ids: [], sample: false, coverage: v.coverage };
  const hit = v.cases.filter(pick);
  return {
    value: hit.length, base: hit.length, ids: hit.map(c => c.id), sample: hit.some(c => c.source === 'sample'), lastAt: latest(hit.map(when)), coverage: v.coverage,
    groups: v.procedures.map(p => { const n = hit.filter(c => c.package.key === p.key).length; return { key: p.key, label: p.title, value: n, base: n }; }),
  };
}

/** A share (per cent) of cases selected by `of` that also meet `meets`, grouped by procedure. */
function caseShare(ctx: MethodContext, of: (c: Case) => boolean, meets: (c: Case) => boolean, when: (c: Case) => string | undefined): RawResult {
  const v = caseView(ctx);
  if (v.unavailable) return { unavailable: v.unavailable, value: null, base: 0, ids: [], sample: false, coverage: v.coverage };
  const den = v.cases.filter(of), num = den.filter(meets);
  const pct = (a: number, b: number) => (b ? round1((100 * a) / b) : null);
  return {
    value: pct(num.length, den.length), base: den.length, numerator: num.length, denominator: den.length,
    ...(den.length ? {} : { note: 'No case in the period to divide by' }),
    ids: den.map(c => c.id), sample: den.some(c => c.source === 'sample'), lastAt: latest(den.map(when)), coverage: v.coverage,
    groups: v.procedures.map(p => {
      const d = den.filter(c => c.package.key === p.key), n = d.filter(meets);
      return { key: p.key, label: p.title, value: pct(n.length, d.length), base: d.length, numerator: n.length, denominator: d.length };
    }),
  };
}

const decidedIn = (ctx: MethodContext) => (c: Case) => inPeriod(decisionAt(c), ctx);
const lateBy = (c: Case, at: string | undefined) => !!at && c.deadlines.some(d => !!d.lapsed && d.lapsed <= at);

// ── regions ────────────────────────────────────────────────────────────────

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Records placed in regions: counted in the period, with coverage from every record up to the period's end. */
function regionCount(items: { id: string; at: string; region?: string; sample: boolean }[], ctx: MethodContext, inside: (x: { at: string }) => boolean, registerLabel: string): RawResult {
  const regions = [...nationRegions()];
  const of = 'the nation\'s operational regions';
  if (!regions.length) return { unavailable: 'The nation has no operational regions (National settings)', value: null, base: 0, ids: [], sample: false, coverage: { expected: 0, reporting: 0, completeness: 'not_calculated', of } };
  const usable = items.filter(x => ctx.samples || !x.sample);
  const regionOf = new Map(regions.map(r => [fold(r), r]));
  const placed = usable.map(x => ({ ...x, region: x.region ? regionOf.get(fold(x.region)) : undefined }));
  const upToEnd = placed.filter(x => x.at.slice(0, 10) < ctx.end);
  const covered = new Set(upToEnd.map(x => x.region).filter((r): r is string => !!r));
  const hit = placed.filter(x => inside(x));
  const coverage: Coverage = { expected: regions.length, reporting: covered.size, completeness: covered.size === regions.length ? 'complete' : covered.size ? 'partial' : 'none', of };
  if (!covered.size) return { unavailable: `The ${registerLabel} holds no record placed in any region yet: not connected`, value: null, base: 0, ids: [], sample: false, coverage };
  const groups: RawGroup[] = regions.map(r => {
    if (!covered.has(r)) return { key: r, label: r, value: null, base: 0 };
    const ids = hit.filter(x => x.region === r).map(x => x.id);
    return { key: r, label: r, value: ids.length, base: ids.length, ids };
  });
  const unplaced = hit.filter(x => !x.region).length;
  const complete = coverage.completeness === 'complete';
  return {
    value: complete ? hit.filter(x => x.region).length : null, base: hit.length, ids: hit.map(x => x.id), sample: hit.some(x => x.sample), lastAt: latest(hit.map(x => x.at)), coverage, groups,
    ...(complete ? (unplaced ? { note: `${unplaced} record${unplaced === 1 ? '' : 's'} with no region recorded ${unplaced === 1 ? 'is' : 'are'} not in the regional figures` } : {}) : { note: `Only ${coverage.reporting} of ${coverage.expected} regions report: a national figure needs every region` }),
  };
}

// ── the registry ───────────────────────────────────────────────────────────

export const METHODS: Method[] = [
  { id: 'cases.opened', version: 1, label: 'Cases opened in the period', unit: '{cases}', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseCount(ctx, c => inPeriod(c.openedAt, ctx), c => c.openedAt) },
  { id: 'cases.decided', version: 1, label: 'Cases decided in the period (first decision)', unit: '{cases}', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseCount(ctx, decidedIn(ctx), decisionAt) },
  { id: 'cases.open_at_end', version: 1, label: 'Cases open at the end of the period', unit: '{cases}', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseCount(ctx, c => openAtEnd(c, ctx), c => c.history.at(-1)?.at) },
  { id: 'cases.open_past_deadline', version: 1, label: 'Open cases with a deadline passed at the end of the period', unit: '{cases}', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseCount(ctx, c => openAtEnd(c, ctx) && c.deadlines.some(d => !!d.lapsed && d.lapsed.slice(0, 10) < ctx.end && (!d.met || d.met.slice(0, 10) >= ctx.end)), c => c.deadlines.map(d => d.lapsed).filter(Boolean).sort().at(-1)) },
  { id: 'cases.days_to_decision', version: 1, label: 'Median days from opening to the first decision, for cases decided in the period', unit: 'd', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => {
      const v = caseView(ctx);
      if (v.unavailable) return { unavailable: v.unavailable, value: null, base: 0, ids: [], sample: false, coverage: v.coverage };
      const hit = v.cases.filter(decidedIn(ctx));
      const days = (c: Case) => (Date.parse(decisionAt(c)!) - Date.parse(c.openedAt)) / 86_400_000;
      const m = median(hit.map(days));
      return {
        value: m === null ? null : round1(m), base: hit.length, ids: hit.map(c => c.id), sample: hit.some(c => c.source === 'sample'), lastAt: latest(hit.map(decisionAt)), coverage: v.coverage,
        ...(hit.length ? {} : { note: 'No case decided in the period' }),
        groups: v.procedures.map(p => { const h = hit.filter(c => c.package.key === p.key); const pm = median(h.map(days)); return { key: p.key, label: p.title, value: pm === null ? null : round1(pm), base: h.length }; }),
      };
    } },
  { id: 'cases.decided_on_time', version: 1, label: 'Share of cases decided in the period before any deadline passed', unit: '%', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseShare(ctx, decidedIn(ctx), c => !lateBy(c, decisionAt(c)), decisionAt) },
  { id: 'decisions.citing_law', version: 1, label: 'Share of cases decided in the period whose decision cites a law version from the laws register', unit: '%', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseShare(ctx, decidedIn(ctx), c => !!c.history.find(s => s.decision)?.citations?.some(x => !!x.version), decisionAt) },
  { id: 'referrals.unresolved', version: 1, label: 'Referrals from other institutions still open at the end of the period', unit: '{cases}', geography: 'institution', coverage: CASE_COVERAGE, params: ['family'],
    compute: ctx => caseCount(ctx, c => openAtEnd(c, ctx) && c.links.some(l => l.kind === 'referred-from'), c => c.openedAt) },
  { id: 'civil.registered', version: 1, label: 'Vital events registered in the period, by region', unit: '{events}', geography: 'region', params: ['kind'],
    coverage: 'The nation\'s operational regions; a region reports once the civil register holds any event placed in it; a national figure only when every region reports',
    compute: ctx => {
      const kind = (ctx.params?.kind ?? 'birth') as 'birth' | 'death' | 'marriage';
      const items = eventFacts(kind).map(e => ({ id: e.id, at: e.registeredAt, ...(e.region ? { region: e.region } : {}), sample: e.sample }));
      return regionCount(items, ctx, x => inPeriod(x.at, ctx), 'civil register');
    } },
  { id: 'organisations.in_standing', version: 1, label: 'Organisations holding a granted standing in a register at the end of the period, by region', unit: '{organisations}', geography: 'region', params: ['register'],
    coverage: 'The nation\'s operational regions; a region reports once the organisations register holds any organisation placed in it; a national figure only when every region reports',
    compute: ctx => {
      const reg = ctx.params?.register?.trim() || undefined;
      const items = listOrganisations({ limit: 2000 }).map(o => {
        // The standing as its history stood at the end of the period.
        const granted = o.standings.some(s => (!reg || s.register === reg) && s.history.filter(h => h.at.slice(0, 10) < ctx.end).at(-1)?.state === 'granted');
        return { id: o.number, at: o.createdAt, ...(current(o).region ? { region: current(o).region } : {}), sample: !!o.sample, granted };
      });
      const r = regionCount(items, ctx, x => (x as { granted?: boolean }).granted === true && x.at.slice(0, 10) < ctx.end, 'organisations register');
      return r;
    } },
];

export const getMethod = (id: string, version?: number): Method | undefined =>
  METHODS.find(m => m.id === id && (version === undefined || m.version === version));
