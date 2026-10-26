// Service management (plan step I13; forms catalogue Part 13 §2.5 and §9:
// GOV-GOV-003 service-level objectives, 004 performance reports, 005 outage or
// disruption reports, 006 service changes, 014 architecture exceptions; §9.1
// the dashboard registry). Each record belongs to the institution that owns
// the service (or, for a dashboard or an exception, the institution named on
// it):
//
//   dashboards    registry: purpose, owner, the indicator definitions and twin
//                 metrics it shows, refresh policy, access class, limitations;
//                 registered by one official, published by a different one who
//                 can sign there, every version kept.
//   objectives    a service-level objective: the measure, its methodology and
//                 the target the nation sets (cited from the laws register or
//                 the institution's approved policy). No target ships: an
//                 objective without one says "no target set", and a target is
//                 in force only once a different official who can sign there
//                 approves it.
//   performance   computed from the records every time (cases of the service's
//                 procedure: received, decided, open, days to a decision,
//                 deadlines lapsed, reconsiderations, complaints), each figure
//                 a signal (lib/twin/signal.ts): Record, Sample in a
//                 demonstration, Not connected where there is no procedure,
//                 never a generated number. A report freezes the computed
//                 figures with their SHA-256; a different official validates it.
//   disruptions   reported by a named official with start, impact and channels
//                 affected; updates and recovery recorded; shown on the
//                 service's public page while open.
//   changes       a change to a service proposed with its reason and impact and
//                 approved or rejected by a different official who can sign.
//   exceptions    an architecture exception: what is waived, why, its scope and
//                 an expiry date (required); approved by a different official;
//                 shown expired once the date passes (computed, never stored).
//
// Nothing here is ever deleted. Held in platform state.

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit } from '@/lib/data/store/audit';
import { getMinistry } from '@/lib/data/store';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { roleOf, reaches, type Scope } from '@/lib/auth/roles';
import { cite, type Citation } from '@/lib/law/register';
import { listCases } from '@/lib/casework/engine';
import { samplesAllowed } from '@/lib/ops/mode';
import { uuid7 } from '@/lib/data/uuid7';
import { getService, publishedVersion, ownerOf, type CatalogueActor } from './catalogue';
import { listDefinitions } from '@/lib/indicators/register';
import { frontdoorKey } from './procedures';
import type { Signal } from '@/lib/twin/signal';

export const MEASURES = {
  'median-days-to-decision': { label: 'Median days from application to decision', unit: 'd', better: 'lower' },
  'share-decided-within-target': { label: 'Share decided within the target number of days', unit: '%', better: 'higher' },
  'deadlines-lapsed': { label: 'Statutory deadlines lapsed', unit: '1', better: 'lower' },
  'open-applications': { label: 'Applications open', unit: '1', better: 'lower' },
} as const;
export type Measure = keyof typeof MEASURES;
export const ACCESS_CLASSES = ['public', 'internal', 'restricted'] as const;

type Who = { id?: string; name: string };
export interface DashboardVersion { n: number; title: string; purpose: string; sources: string[]; refresh: string; access: typeof ACCESS_CLASSES[number]; limitations: string; proposedBy: Who; at: string; state: 'proposed' | 'published' | 'superseded' | 'withdrawn'; publishedBy?: Who; publishedAt?: string }
export interface Dashboard { id: string; institution: string; versions: DashboardVersion[] }
export interface Objective {
  id: string; service: string; institution: string; measure: Measure; methodology: string;
  /** The nation's target: absent until set and approved. For share-decided-within-target, `withinDays` too. */
  target?: { value: number; withinDays?: number; citations: Citation[]; basis: string; proposedBy: Who; at: string; approvedBy?: Who; approvedAt?: string; state: 'proposed' | 'approved' | 'withdrawn' }[];
  createdBy: Who; at: string;
}
export interface PerformanceReport { id: string; service: string; institution: string; period: { from: string; to: string }; figures: Record<string, Signal<number>>; sha256: string; recordedBy: Who; at: string; validatedBy?: Who; validatedAt?: string }
export interface Disruption { id: string; service: string; institution: string; startedAt: string; impact: string; channels: string[]; reportedBy: Who; updates: { at: string; by: string; text: string }[]; resolved?: { at: string; by: Who; recovery: string }; sample?: true }
export interface ServiceChange { id: string; service: string; institution: string; description: string; reason: string; impact: string; proposedBy: Who; at: string; decision?: { outcome: 'approved' | 'rejected'; by: Who; at: string; reasons: string } }
export interface ArchitectureException { id: string; institution: string; requirement: string; scope: string; justification: string; expiresOn: string; proposedBy: Who; at: string; approvedBy?: Who; approvedAt?: string; withdrawn?: { by: string; at: string; reason: string } }

type Db = { dashboards: Dashboard[]; objectives: Objective[]; reports: PerformanceReport[]; disruptions: Disruption[]; changes: ServiceChange[]; exceptions: ArchitectureException[] };
const seed = (): Db => ({ dashboards: [], objectives: [], reports: [], disruptions: [], changes: [], exceptions: [] });
const g = globalThis as unknown as { __civicosServiceManagement?: Db };
const db = (): Db => touch('__civicosServiceManagement', g.__civicosServiceManagement = withDefaults(g.__civicosServiceManagement ??= seed(), seed()));
export function resetServiceManagement(): void { g.__civicosServiceManagement = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const who = (a: CatalogueActor): Who => ({ ...(a.id ? { id: a.id } : {}), name: a.name });
const id = (prefix: string) => `${prefix}-${uuid7().slice(-10)}`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Officials of the institution (or the whole government within reach) record; never an auditor. */
export function recordRefusal(s: Scope, institution: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read service records but not change them';
  if (!institution) return 'No institution is named as responsible for this service yet (Configuration → Who is responsible)';
  return reaches(s, institution) ? null : 'Recorded by officials of the institution that owns the service';
}
/** A different official who can sign at the institution approves, publishes or validates. */
export function approveRefusal(s: Scope, institution: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read service records but not change them';
  if (!institution || s.institution !== institution) return 'Approved by an official of the institution that owns the service';
  return roleOf(s) === 'signatory' ? null : 'Approving needs an official who can sign there';
}
const check = (a: CatalogueActor, why: (s: Scope, i: string) => string | null, institution: string): string | null => (a.scope ? why(a.scope, institution) : null);
const different = (earlier: Who, a: CatalogueActor) => dualControlRefusal({ by: earlier.name, ...(earlier.id ? { byId: earlier.id } : {}) }, { by: a.name, ...(a.id ? { byId: a.id } : {}) });

/** The service and the institution that owns it now. */
function serviceOwner(serviceId: string): { name: string; institution: string; procedure?: string } | { error: string } {
  const e = getService(serviceId);
  const v = e ? publishedVersion(e) : undefined;
  if (!e || !v) return { error: 'No published service of the catalogue has that id' };
  return { name: v.terms.name, institution: ownerOf(v.terms.owner), ...(v.terms.procedure ? { procedure: v.terms.procedure } : {}) };
}

// ── Dashboards ─────────────────────────────────────────────────────────────

export function proposeDashboard(input: { id?: unknown; institution?: unknown; title?: unknown; purpose?: unknown; sources?: unknown; refresh?: unknown; access?: unknown; limitations?: unknown }, a: CatalogueActor, now = new Date()): Dashboard | { error: string } {
  const d = db();
  const existing = input.id ? d.dashboards.find(x => x.id === str(input.id, 60)) : undefined;
  if (input.id && !existing) return { error: 'No such dashboard' };
  const institution = existing?.institution ?? str(input.institution, 80);
  if (!getMinistry(institution)) return { error: 'Name the institution that owns the dashboard' };
  const why = check(a, recordRefusal, institution);
  if (why) return { error: why };
  const title = str(input.title, 160), purpose = str(input.purpose, 2000);
  if (!title || !purpose) return { error: 'Give the dashboard a title and the decision or public information it serves' };
  const known = new Set(listDefinitions().map(x => x.id));
  const sources = (Array.isArray(input.sources) ? input.sources : str(input.sources, 2000).split(/[\n,]+/)).map(x => str(x, 120)).filter(Boolean).slice(0, 30);
  if (!sources.length) return { error: 'Name its approved sources: indicator definitions (their ids) or twin metrics (metric:<key>)' };
  for (const s of sources) if (!known.has(s) && !/^metric:[a-z0-9_.-]{2,80}$/.test(s)) return { error: `${s}: name an indicator definition of the register or a twin metric (metric:<key>)` };
  const access = (ACCESS_CLASSES as readonly string[]).includes(str(input.access)) ? str(input.access) as Dashboard['versions'][number]['access'] : null;
  if (!access) return { error: 'The access class is public, internal or restricted' };
  if (existing?.versions.some(v => v.state === 'proposed')) return { error: 'A version is already waiting to be published' };
  const dash = existing ?? { id: id('DSH'), institution, versions: [] };
  if (!existing) d.dashboards.push(dash);
  dash.versions.push({ n: (dash.versions.at(-1)?.n ?? 0) + 1, title, purpose, sources, refresh: str(input.refresh, 200) || 'Computed when opened', access, limitations: str(input.limitations, 2000), proposedBy: who(a), at: now.toISOString(), state: 'proposed' });
  recordAudit(a.name, 'dashboard.propose', `Dashboard:${dash.id}`, 'ok', `${title} · ${access}`);
  return clone(dash);
}

export function publishDashboard(dashId: unknown, a: CatalogueActor, now = new Date()): Dashboard | { error: string } {
  const dash = db().dashboards.find(x => x.id === str(dashId, 60));
  const v = dash?.versions.find(x => x.state === 'proposed');
  if (!dash || !v) return { error: 'No dashboard version is waiting' };
  const why = check(a, approveRefusal, dash.institution) ?? different(v.proposedBy, a);
  if (why) return { error: why };
  for (const x of dash.versions) if (x.state === 'published') x.state = 'superseded';
  Object.assign(v, { state: 'published', publishedBy: who(a), publishedAt: now.toISOString() });
  recordAudit(a.name, 'dashboard.publish', `Dashboard:${dash.id}`, 'ok', `version ${v.n} proposed by ${v.proposedBy.name}`);
  return clone(dash);
}

// ── Service-level objectives ───────────────────────────────────────────────

export function defineObjective(input: { service?: unknown; measure?: unknown; methodology?: unknown }, a: CatalogueActor, now = new Date()): Objective | { error: string } {
  const s = serviceOwner(str(input.service, 80));
  if ('error' in s) return s;
  const why = check(a, recordRefusal, s.institution);
  if (why) return { error: why };
  const measure = str(input.measure, 60) as Measure;
  if (!(measure in MEASURES)) return { error: `The measure is one of ${Object.keys(MEASURES).join(', ')}` };
  const methodology = str(input.methodology, 2000);
  if (methodology.length < 10) return { error: 'Describe the methodology (what is counted, from which records)' };
  if (db().objectives.some(o => o.service === str(input.service, 80) && o.measure === measure)) return { error: 'This service already has an objective for that measure' };
  const o: Objective = { id: id('SLO'), service: str(input.service, 80), institution: s.institution, measure, methodology, createdBy: who(a), at: now.toISOString() };
  db().objectives.push(o);
  recordAudit(a.name, 'slo.define', `Objective:${o.id}`, 'ok', `${o.service} · ${measure} (no target until one is approved)`);
  return clone(o);
}

/** Propose the nation's target for an objective, citing the law or approved policy that sets it. */
export function proposeTarget(objectiveId: unknown, input: { value?: unknown; withinDays?: unknown; citations?: unknown; basis?: unknown }, a: CatalogueActor, now = new Date()): Objective | { error: string } {
  const o = db().objectives.find(x => x.id === str(objectiveId, 60));
  if (!o) return { error: 'No such objective' };
  const why = check(a, recordRefusal, o.institution);
  if (why) return { error: why };
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0 || (o.measure === 'share-decided-within-target' && value > 100)) return { error: 'The target is a number (a share is 0 to 100)' };
  const withinDays = Number(input.withinDays);
  if (o.measure === 'share-decided-within-target' && !(Number.isInteger(withinDays) && withinDays > 0)) return { error: 'Give the number of days the share is counted within' };
  const on = now.toISOString().slice(0, 10);
  const citations: Citation[] = [];
  for (const c of (Array.isArray(input.citations) ? input.citations : []).slice(0, 5) as { instrument?: unknown; eId?: unknown }[]) {
    const r = cite(str(c?.instrument, 120), str(c?.eId, 120), on);
    if ('error' in r) return { error: `Legal basis: ${r.error}` };
    citations.push(r);
  }
  const basis = str(input.basis, 500);
  if (!citations.length && !basis) return { error: 'Cite the law, or name the approved policy, that sets the target' };
  if (o.target?.some(t => t.state === 'proposed')) return { error: 'A target is already waiting for approval' };
  (o.target ??= []).push({ value, ...(o.measure === 'share-decided-within-target' ? { withinDays } : {}), citations, basis, proposedBy: who(a), at: now.toISOString(), state: 'proposed' });
  recordAudit(a.name, 'slo.target.propose', `Objective:${o.id}`, 'ok', `${value}${MEASURES[o.measure].unit === '%' ? '%' : ''}${o.measure === 'share-decided-within-target' ? ` within ${withinDays} days` : ''}`);
  return clone(o);
}

export function approveTarget(objectiveId: unknown, a: CatalogueActor, now = new Date()): Objective | { error: string } {
  const o = db().objectives.find(x => x.id === str(objectiveId, 60));
  const t = o?.target?.find(x => x.state === 'proposed');
  if (!o || !t) return { error: 'No target is waiting' };
  const why = check(a, approveRefusal, o.institution) ?? different(t.proposedBy, a);
  if (why) return { error: why };
  for (const x of o.target!) if (x.state === 'approved') x.state = 'withdrawn';
  Object.assign(t, { state: 'approved', approvedBy: who(a), approvedAt: now.toISOString() });
  recordAudit(a.name, 'slo.target.approve', `Objective:${o.id}`, 'ok', `proposed by ${t.proposedBy.name}`);
  return clone(o);
}

export const targetInForce = (o: Objective) => o.target?.filter(t => t.state === 'approved').at(-1);

// ── Performance, computed from the records ─────────────────────────────────

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const DAY = 86_400_000;

/** A service's performance for a period, computed from its procedure's cases now (never stored, never generated). */
export function servicePerformance(serviceId: string, period: { from: string; to: string }): { service: string; institution: string; period: { from: string; to: string }; figures: Record<string, Signal<number>>; objectives: { id: string; measure: Measure; label: string; target: number | null; withinDays?: number; met: boolean | null }[] } | { error: string } {
  const s = serviceOwner(serviceId);
  if ('error' in s) return s;
  if (!DATE.test(period.from) || !DATE.test(period.to) || period.from > period.to) return { error: 'The period is two dates, from and to' };
  const objectives = db().objectives.filter(o => o.service === serviceId);
  const nc = (what: string): Signal<number> => ({ value: null, kind: 'unavailable', source: what });
  if (!s.procedure || !s.institution) {
    const why = !s.procedure ? 'Information only: no procedure carries applications' : 'No institution is named as responsible';
    return { service: serviceId, institution: s.institution, period, figures: { received: nc(why), decided: nc(why), open: nc(why), medianDaysToDecision: nc(why), deadlinesLapsed: nc(why), reconsiderations: nc(why), complaints: nc(why) }, objectives: objectives.map(o => ({ id: o.id, measure: o.measure, label: MEASURES[o.measure].label, target: targetInForce(o)?.value ?? null, met: null })) };
  }
  const samples = samplesAllowed();
  const inPeriod = (t?: string) => !!t && t.slice(0, 10) >= period.from && t.slice(0, 10) <= period.to;
  const cases = listCases({ procedure: s.procedure, owner: s.institution, limit: 1000 }).filter(c => samples || c.source !== 'sample');
  const usedSample = cases.some(c => c.source === 'sample');
  const kind: Signal['kind'] = usedSample ? 'sample' : 'record';
  const source = `Cases of ${s.procedure} at ${getMinistry(s.institution)?.name ?? s.institution} (lib/casework)`;
  const sig = (value: number | null, unit = '1'): Signal<number> => (value === null ? { value: null, unit, kind: 'unavailable', source: `${source}: none in the period` } : { value, unit, kind, source });
  const received = cases.filter(c => inPeriod(c.openedAt));
  const decided = cases.filter(c => c.closedAt && inPeriod(c.closedAt) && c.decisions.length);
  const days = decided.map(c => (Date.parse(c.closedAt!) - Date.parse(c.openedAt)) / DAY);
  const lapsed = cases.reduce((n, c) => n + c.deadlines.filter(d => d.lapsed && inPeriod(d.lapsed)).length, 0);
  const reconKey = frontdoorKey('svc.reconsideration', s.institution), complaintKey = frontdoorKey('svc.complaint', s.institution);
  const refs = new Set(cases.map(c => c.ref));
  const recon = listCases({ procedure: reconKey, limit: 1000 }).filter(c => (samples || c.source !== 'sample') && inPeriod(c.openedAt) && refs.has(String(c.fields.originalCase ?? '')));
  const complaints = listCases({ procedure: complaintKey, limit: 1000 }).filter(c => (samples || c.source !== 'sample') && inPeriod(c.openedAt) && c.fields.service === serviceId);
  const med = median(days);
  const figures: Record<string, Signal<number>> = {
    received: sig(received.length), decided: sig(decided.length), open: sig(cases.filter(c => !c.closedAt).length),
    medianDaysToDecision: sig(med === null ? null : Math.round(med * 10) / 10, 'd'), deadlinesLapsed: sig(lapsed), reconsiderations: sig(recon.length), complaints: sig(complaints.length),
  };
  const out = objectives.map(o => {
    const t = targetInForce(o);
    let met: boolean | null = null;
    if (t) {
      if (o.measure === 'median-days-to-decision') met = med === null ? null : med <= t.value;
      if (o.measure === 'deadlines-lapsed') met = lapsed <= t.value;
      if (o.measure === 'open-applications') met = cases.filter(c => !c.closedAt).length <= t.value;
      if (o.measure === 'share-decided-within-target' && t.withinDays) {
        const share = days.length ? (days.filter(d => d <= t.withinDays!).length / days.length) * 100 : null;
        figures.shareWithinTarget = sig(share === null ? null : Math.round(share), '%');
        met = share === null ? null : share >= t.value;
      }
    }
    return { id: o.id, measure: o.measure, label: MEASURES[o.measure].label, target: t?.value ?? null, ...(t?.withinDays ? { withinDays: t.withinDays } : {}), met };
  });
  return { service: serviceId, institution: s.institution, period, figures, objectives: out };
}

/** Freeze a performance report: the computed figures and their SHA-256 (GOV-GOV-004); validated by a different official. */
export function recordReport(input: { service?: unknown; from?: unknown; to?: unknown }, a: CatalogueActor, now = new Date()): PerformanceReport | { error: string } {
  const p = servicePerformance(str(input.service, 80), { from: str(input.from, 10), to: str(input.to, 10) });
  if ('error' in p) return p;
  const why = check(a, recordRefusal, p.institution);
  if (why) return { error: why };
  const body = JSON.stringify({ service: p.service, period: p.period, figures: p.figures });
  const r: PerformanceReport = { id: id('SPR'), service: p.service, institution: p.institution, period: p.period, figures: p.figures, sha256: createHash('sha256').update(body).digest('hex'), recordedBy: who(a), at: now.toISOString() };
  db().reports.push(r);
  recordAudit(a.name, 'service.report.record', `Report:${r.id}`, 'ok', `${r.service} ${r.period.from}..${r.period.to} · ${r.sha256.slice(0, 12)}`);
  return clone(r);
}

export function validateReport(reportId: unknown, a: CatalogueActor, now = new Date()): PerformanceReport | { error: string } {
  const r = db().reports.find(x => x.id === str(reportId, 60));
  if (!r) return { error: 'No such report' };
  if (r.validatedBy) return { error: 'Already validated' };
  const why = check(a, approveRefusal, r.institution) ?? different(r.recordedBy, a);
  if (why) return { error: why };
  Object.assign(r, { validatedBy: who(a), validatedAt: now.toISOString() });
  recordAudit(a.name, 'service.report.validate', `Report:${r.id}`, 'ok', `recorded by ${r.recordedBy.name}`);
  return clone(r);
}

// ── Disruptions ────────────────────────────────────────────────────────────

export function reportDisruption(input: { service?: unknown; startedAt?: unknown; impact?: unknown; channels?: unknown; sample?: unknown }, a: CatalogueActor, now = new Date()): Disruption | { error: string } {
  const s = serviceOwner(str(input.service, 80));
  if ('error' in s) return s;
  const why = check(a, recordRefusal, s.institution);
  if (why) return { error: why };
  const impact = str(input.impact, 2000);
  if (impact.length < 5) return { error: 'Describe the impact on people using the service' };
  const startedAt = str(input.startedAt, 30) || now.toISOString();
  if (Number.isNaN(Date.parse(startedAt))) return { error: 'When did it start?' };
  if (input.sample === true && !samplesAllowed()) return { error: 'A production installation holds no sample disruption' };
  const d: Disruption = { id: id('DIS'), service: str(input.service, 80), institution: s.institution, startedAt, impact, channels: (Array.isArray(input.channels) ? input.channels : []).map(x => str(x, 20)).filter(Boolean).slice(0, 5), reportedBy: who(a), updates: [], ...(input.sample === true ? { sample: true as const } : {}) };
  db().disruptions.push(d);
  recordAudit(a.name, 'service.disruption.report', `Disruption:${d.id}`, 'ok', `${d.service}: ${impact.slice(0, 120)}`);
  return clone(d);
}

export function updateDisruption(disId: unknown, input: { text?: unknown; resolve?: unknown; recovery?: unknown }, a: CatalogueActor, now = new Date()): Disruption | { error: string } {
  const d = db().disruptions.find(x => x.id === str(disId, 60));
  if (!d) return { error: 'No such disruption' };
  if (d.resolved) return { error: 'Already resolved' };
  const why = check(a, recordRefusal, d.institution);
  if (why) return { error: why };
  const text = str(input.text, 1000);
  if (input.resolve === true) {
    const recovery = str(input.recovery, 2000);
    if (!recovery) return { error: 'Describe the recovery' };
    d.resolved = { at: now.toISOString(), by: who(a), recovery };
    recordAudit(a.name, 'service.disruption.resolve', `Disruption:${d.id}`, 'ok', recovery.slice(0, 160));
  } else {
    if (!text) return { error: 'Write the update' };
    d.updates.push({ at: now.toISOString(), by: a.name, text });
    recordAudit(a.name, 'service.disruption.update', `Disruption:${d.id}`, 'ok', text.slice(0, 160));
  }
  return clone(d);
}

// ── Service changes ────────────────────────────────────────────────────────

export function proposeChange(input: { service?: unknown; description?: unknown; reason?: unknown; impact?: unknown }, a: CatalogueActor, now = new Date()): ServiceChange | { error: string } {
  const s = serviceOwner(str(input.service, 80));
  if ('error' in s) return s;
  const why = check(a, recordRefusal, s.institution);
  if (why) return { error: why };
  const description = str(input.description, 2000), reason = str(input.reason, 1000), impact = str(input.impact, 1000);
  if (!description || !reason || !impact) return { error: 'Describe the change, why it is needed and its impact on people using the service' };
  const c: ServiceChange = { id: id('CHG'), service: str(input.service, 80), institution: s.institution, description, reason, impact, proposedBy: who(a), at: now.toISOString() };
  db().changes.push(c);
  recordAudit(a.name, 'service.change.propose', `Change:${c.id}`, 'ok', `${c.service}: ${description.slice(0, 120)}`);
  return clone(c);
}

export function decideChange(changeId: unknown, input: { outcome?: unknown; reasons?: unknown }, a: CatalogueActor, now = new Date()): ServiceChange | { error: string } {
  const c = db().changes.find(x => x.id === str(changeId, 60));
  if (!c) return { error: 'No such change' };
  if (c.decision) return { error: 'Already decided' };
  const outcome = input.outcome === 'approved' || input.outcome === 'rejected' ? input.outcome : null;
  const reasons = str(input.reasons, 1000);
  if (!outcome || !reasons) return { error: 'Approve or reject, with reasons' };
  const why = check(a, approveRefusal, c.institution) ?? different(c.proposedBy, a);
  if (why) return { error: why };
  c.decision = { outcome, by: who(a), at: now.toISOString(), reasons };
  recordAudit(a.name, `service.change.${outcome === 'approved' ? 'approve' : 'reject'}`, `Change:${c.id}`, 'ok', `proposed by ${c.proposedBy.name}`);
  return clone(c);
}

// ── Architecture exceptions ────────────────────────────────────────────────

export function proposeException(input: { institution?: unknown; requirement?: unknown; scope?: unknown; justification?: unknown; expiresOn?: unknown }, a: CatalogueActor, now = new Date()): ArchitectureException | { error: string } {
  const institution = str(input.institution, 80);
  if (!getMinistry(institution)) return { error: 'Name the institution the exception is for' };
  const why = check(a, recordRefusal, institution);
  if (why) return { error: why };
  const requirement = str(input.requirement, 400), scope = str(input.scope, 1000), justification = str(input.justification, 2000), expiresOn = str(input.expiresOn, 10);
  if (!requirement || !scope || !justification) return { error: 'Name the requirement waived, the scope of the exception and its justification' };
  if (!DATE.test(expiresOn) || expiresOn <= now.toISOString().slice(0, 10)) return { error: 'An exception always expires: give a future expiry date' };
  const x: ArchitectureException = { id: id('AEX'), institution, requirement, scope, justification, expiresOn, proposedBy: who(a), at: now.toISOString() };
  db().exceptions.push(x);
  recordAudit(a.name, 'architecture.exception.propose', `Exception:${x.id}`, 'ok', `${requirement.slice(0, 120)} · until ${expiresOn}`);
  return clone(x);
}

export function approveException(exId: unknown, a: CatalogueActor, now = new Date()): ArchitectureException | { error: string } {
  const x = db().exceptions.find(y => y.id === str(exId, 60));
  if (!x) return { error: 'No such exception' };
  if (x.approvedBy || x.withdrawn) return { error: 'Already decided' };
  const why = check(a, approveRefusal, x.institution) ?? different(x.proposedBy, a);
  if (why) return { error: why };
  Object.assign(x, { approvedBy: who(a), approvedAt: now.toISOString() });
  recordAudit(a.name, 'architecture.exception.approve', `Exception:${x.id}`, 'ok', `until ${x.expiresOn}, proposed by ${x.proposedBy.name}`);
  return clone(x);
}

export function withdrawException(exId: unknown, reason: unknown, a: CatalogueActor, now = new Date()): ArchitectureException | { error: string } {
  const x = db().exceptions.find(y => y.id === str(exId, 60));
  if (!x) return { error: 'No such exception' };
  if (x.withdrawn) return { error: 'Already withdrawn' };
  const why = check(a, recordRefusal, x.institution);
  if (why) return { error: why };
  const r = str(reason, 500);
  if (!r) return { error: 'Say why it is withdrawn' };
  x.withdrawn = { by: a.name, at: now.toISOString(), reason: r };
  recordAudit(a.name, 'architecture.exception.withdraw', `Exception:${x.id}`, 'ok', r.slice(0, 160));
  return clone(x);
}

/** An exception's standing on a day, computed (never stored): waiting, in force, expired or withdrawn. */
export const exceptionState = (x: ArchitectureException, on = new Date()): 'waiting' | 'in-force' | 'expired' | 'withdrawn' =>
  x.withdrawn ? 'withdrawn' : !x.approvedBy ? 'waiting' : on.toISOString().slice(0, 10) >= x.expiresOn ? 'expired' : 'in-force';

// ── reads ──────────────────────────────────────────────────────────────────

export function serviceManagement(institutions?: string[], on = new Date()) {
  const d = db();
  const mine = <T extends { institution: string }>(xs: T[]) => xs.filter(x => !institutions || institutions.includes(x.institution)).map(clone);
  return {
    dashboards: mine(d.dashboards), objectives: mine(d.objectives).map(o => ({ ...o, label: MEASURES[o.measure].label, inForce: targetInForce(o) ?? null })),
    reports: mine(d.reports), disruptions: mine(d.disruptions), changes: mine(d.changes),
    exceptions: mine(d.exceptions).map(x => ({ ...x, state: exceptionState(x, on) })),
  };
}
/** Open disruptions of a service (its public page shows them). */
export const openDisruptions = (serviceId: string): Disruption[] => db().disruptions.filter(x => x.service === serviceId && !x.resolved && (!x.sample || samplesAllowed())).map(clone);

/** Waiting items for the onboarding hub. */
export function waitingServiceManagement(): { what: string; by: string; at: string }[] {
  const d = db();
  return [
    ...d.dashboards.flatMap(x => x.versions.filter(v => v.state === 'proposed').map(v => ({ what: `Dashboard ${v.title}: waiting to be published`, by: v.proposedBy.name, at: v.at }))),
    ...d.objectives.flatMap(o => (o.target ?? []).filter(t => t.state === 'proposed').map(t => ({ what: `Service-level target for ${o.service} (${MEASURES[o.measure].label}): waiting for approval`, by: t.proposedBy.name, at: t.at }))),
    ...d.reports.filter(r => !r.validatedBy).map(r => ({ what: `Performance report for ${r.service}: waiting for validation`, by: r.recordedBy.name, at: r.at })),
    ...d.changes.filter(c => !c.decision).map(c => ({ what: `Service change for ${c.service}: waiting for a decision`, by: c.proposedBy.name, at: c.at })),
    ...d.exceptions.filter(x => !x.approvedBy && !x.withdrawn).map(x => ({ what: `Architecture exception: ${x.requirement.slice(0, 80)}`, by: x.proposedBy.name, at: x.at })),
  ];
}
