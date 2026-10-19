// CivicOS — Update Center hosting & deployment requests, server-side.
//
// A nation chooses how it runs the platform: its own data centre, another
// cloud, our hosted cloud, or a perpetual licence it operates alone.
// Workflow: request → automatic preliminary estimate (cost model in
// lib/updates/hosting-model.ts) → engineering review by the publisher
// (adjust and issue a versioned assessment) → the nation accepts or asks
// for a revision → the chosen path is recorded. A perpetual licence is
// issued at once from the price list: the nation needs no consultation.
// Switching later is a new request; its assessment carries a migration
// plan with data-export and no-lock-in guarantees. Every step is audited.
// Isolation: callers pass the nation the server resolved (lib/updates/access).

import type { HostingCenter, HostingEstimate, HostingPath, HostingQuestionnaire, HostingRequest, HostingStage, SubscribedNation } from '@/lib/api/types';
import { recordAudit } from '@/lib/data/store/audit';
import { pricing } from './security-store';
import { adjust, defaultQuestionnaire, estimate, HOSTING_MODEL, unitCostTable, validateQuestionnaire } from '@/lib/updates/hosting-model';

export const HOSTING_PATHS: HostingPath[] = ['sovereign-dc', 'other-cloud', 'hosted', 'perpetual'];
export const PATH_LABEL: Record<HostingPath, string> = {
  'sovereign-dc': 'Sovereign data centre', 'other-cloud': 'Another cloud', hosted: 'Our hosted cloud', perpetual: 'Buy outright and self-operate',
};

interface HostingDb { requests: HostingRequest[]; current: Record<string, HostingPath>; seq: number }
const g = globalThis as unknown as { __civicosHosting?: HostingDb };
function hdb(): HostingDb { return (g.__civicosHosting ??= { requests: [], current: {}, seq: 4000 }); }
export function resetHosting(): void { g.__civicosHosting = { requests: [], current: {}, seq: 4000 }; }

/** The path a nation runs today: recorded acceptance, else inferred from how it receives releases. */
export function currentPath(n: SubscribedNation): HostingPath | undefined {
  return hdb().current[n.id] ?? (n.deliveryMode === 'saas' ? 'hosted' : undefined);
}

function clean(q: Partial<HostingQuestionnaire>): HostingQuestionnaire {
  const d = defaultQuestionnaire();
  const num = (v: unknown, fb: number) => (v === undefined || v === '' ? fb : Number(v));
  const caps = q.capabilities ?? d.capabilities!;
  return {
    population: num(q.population, d.population), activeUsers: num(q.activeUsers, d.activeUsers),
    institutions: num(q.institutions, d.institutions), services: num(q.services, d.services),
    residency: (q.residency ?? d.residency) as HostingQuestionnaire['residency'], legalConstraints: String(q.legalConstraints ?? '').trim(),
    availability: num(q.availability, d.availability), rtoHours: num(q.rtoHours, d.rtoHours), rpoMinutes: num(q.rpoMinutes, d.rpoMinutes),
    existingFacility: (q.existingFacility ?? d.existingFacility) as HostingQuestionnaire['existingFacility'],
    power: (q.power ?? d.power) as HostingQuestionnaire['power'], connectivity: (q.connectivity ?? d.connectivity) as HostingQuestionnaire['connectivity'],
    itStaff: num(q.itStaff, d.itStaff),
    cloudKind: (['public-hyperscaler', 'regional-sovereign', 'private-cloud'].includes(q.cloudKind as string) ? q.cloudKind : d.cloudKind) as HostingQuestionnaire['cloudKind'],
    cloudRegionInCountry: q.cloudRegionInCountry ?? d.cloudRegionInCountry,
    capabilities: { kubernetes: !!caps.kubernetes, managedPostgres: !!caps.managedPostgres, objectStorage: !!caps.objectStorage, kms: !!caps.kms },
    plan: (['standard', 'enterprise', 'sovereign-dedicated'].includes(q.plan as string) ? q.plan : d.plan) as HostingQuestionnaire['plan'],
    term: Number(q.term) === 5 ? 5 : 1,
    support: q.support !== false, updates: q.updates !== false,
  };
}

function estimateFor(n: SubscribedNation, path: HostingPath, q: HostingQuestionnaire, from?: HostingPath): HostingEstimate {
  const pr = pricing(n);
  return estimate(path, q, pr.rate, pr.currency, from);
}

/** Indicative comparison of the four paths, plus the nation's own requests. */
export function hostingCenter(n: SubscribedNation): HostingCenter {
  const requests = hdb().requests.filter(r => r.nationId === n.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const basis = requests[0]?.questionnaire ?? defaultQuestionnaire({ activeUsers: Math.max(50_000, n.estate.endpoints * 200) });
  const from = currentPath(n);
  const pr = pricing(n);
  return {
    nation: n, currentPath: from, currency: pr.currency, localPricing: pr.local, rate: pr.rate,
    comparison: Object.fromEntries(HOSTING_PATHS.map(p => [p, estimateFor(n, p, basis, from)])) as Record<HostingPath, HostingEstimate>,
    basis, requests,
    model: { version: HOSTING_MODEL.version, unitCosts: unitCostTable() },
  };
}

function step(r: HostingRequest, by: string, to: HostingStage, action: string, note?: string, detail?: string) {
  const a = recordAudit(by, `hosting.${action}`, `HostingRequest:${r.id}@${r.nationId}`, 'ok', detail ?? note);
  r.history.push({ at: new Date().toISOString(), by, from: r.history.length ? r.stage : null, to, note, auditSeq: a.seq });
  r.stage = to;
}

export function requestAssessment(n: SubscribedNation, input: { path?: string; questionnaire?: Partial<HostingQuestionnaire>; by?: string }): HostingRequest | { error: string } {
  if (!HOSTING_PATHS.includes(input.path as HostingPath)) return { error: `Choose a path: ${HOSTING_PATHS.join(', ')}` };
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person making the request' };
  const raw = input.questionnaire ?? {};
  const problems = validateQuestionnaire({ ...defaultQuestionnaire(), ...raw });
  if (problems.length) return { error: problems.join('; ') };
  const q = clean(raw);
  const path = input.path as HostingPath;
  const from = currentPath(n);
  const db = hdb();
  const r: HostingRequest = {
    id: `HR-${++db.seq}`, nationId: n.id, path, currentPath: from, questionnaire: q, stage: 'preliminary',
    submittedAt: new Date().toISOString(), submittedBy: by,
    preliminary: estimateFor(n, path, q, from), assessments: [], history: [],
  };
  db.requests.push(r);
  step(r, by, 'preliminary', 'request', `${PATH_LABEL[path]}${from && from !== path ? ` (switching from ${PATH_LABEL[from]})` : ''}`);
  if (path === 'perpetual') {
    // A perpetual licence is bought from the price list: no engineering review or consultation.
    r.assessments.push({ version: 1, issuedAt: r.submittedAt, issuedBy: 'Price list', notes: 'Issued from the published price list. You may operate entirely on your own.', estimate: r.preliminary });
    step(r, 'Price list', 'issued', 'issue', 'v1 from the price list');
  }
  return r;
}

/** The nation's answer to an issued assessment, or withdrawal of its request. */
export function nationAction(n: SubscribedNation, id: string, input: { action?: string; by?: string; note?: string }): HostingRequest | { error: string; status: number } {
  const r = hdb().requests.find(x => x.id === id && x.nationId === n.id);
  if (!r) return { error: 'Request not found', status: 404 };
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person taking this decision', status: 422 };
  const note = input.note?.trim() || undefined;
  switch (input.action) {
    case 'accept': {
      if (r.stage !== 'issued') return { error: 'Only an issued assessment can be accepted', status: 409 };
      const v = r.assessments[r.assessments.length - 1]!.version;
      r.decision = { at: new Date().toISOString(), by, version: v, note };
      hdb().current[n.id] = r.path;
      step(r, by, 'accepted', 'accept', note, `${PATH_LABEL[r.path]} · assessment v${v}`);
      return r;
    }
    case 'revise':
      if (r.stage !== 'issued') return { error: 'Only an issued assessment can be sent back for revision', status: 409 };
      if (!note || note.length < 10) return { error: 'Say what should change (at least 10 characters)', status: 422 };
      step(r, by, 'revision-requested', 'revise', note);
      return r;
    case 'withdraw':
      if (r.stage === 'accepted' || r.stage === 'withdrawn') return { error: `Request is already ${r.stage}`, status: 409 };
      step(r, by, 'withdrawn', 'withdraw', note);
      return r;
    default:
      return { error: 'Action must be accept, revise or withdraw', status: 422 };
  }
}

/** Publisher: start the engineering review, or issue a (new) versioned assessment. */
export function publisherHostingAction(id: string, input: { action?: string; by?: string; notes?: string; capexFactor?: number; annualFactor?: number; timelineFactor?: number }, nation: (id: string) => SubscribedNation | undefined): HostingRequest | { error: string; status: number } {
  const r = hdb().requests.find(x => x.id === id);
  if (!r) return { error: 'Request not found', status: 404 };
  const by = (input.by ?? '').trim() || 'Engineering review';
  switch (input.action) {
    case 'review':
      if (r.stage !== 'preliminary' && r.stage !== 'revision-requested') return { error: `Cannot start a review of a ${r.stage} request`, status: 409 };
      step(r, by, 'in-review', 'review');
      return r;
    case 'issue': {
      if (r.stage !== 'in-review') return { error: 'Start the engineering review first', status: 409 };
      const f = { capexFactor: Number(input.capexFactor ?? 1), annualFactor: Number(input.annualFactor ?? 1), timelineFactor: Number(input.timelineFactor ?? 1) };
      if (!Object.values(f).every(v => Number.isFinite(v) && v >= 0.5 && v <= 2)) return { error: 'Adjustment factors must be between 0.5 and 2', status: 422 };
      const notes = (input.notes ?? '').trim();
      if (notes.length < 10) return { error: 'Write the engineering notes (at least 10 characters)', status: 422 };
      const n = nation(r.nationId);
      if (!n) return { error: 'Nation not found', status: 404 };
      // Recompute from the answers (prices may have moved), then apply the review's adjustments.
      const base = estimateFor(n, r.path, r.questionnaire, r.currentPath);
      const v = r.assessments.length + 1;
      r.assessments.push({ version: v, issuedAt: new Date().toISOString(), issuedBy: by, notes, estimate: adjust(base, f) });
      step(r, by, 'issued', 'issue', notes, `v${v} · capex ×${f.capexFactor} · annual ×${f.annualFactor} · timeline ×${f.timelineFactor}`);
      return r;
    }
    default:
      return { error: 'Action must be review or issue', status: 422 };
  }
}

/** Publisher queue: every nation's requests, newest first. */
export function hostingQueue(): HostingRequest[] {
  return [...hdb().requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
