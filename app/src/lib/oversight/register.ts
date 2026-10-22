// The records of independent oversight (Institutional specification Part 4
// §C.3 supreme audit, §C.4 ombudsman, §C.5 data protection, §C.6 human
// rights, §C.7 anti-corruption; catalogue Part 12 §7.3 and register
// REG-DEM-015 "Public accountability findings register"; plan step I8).
//
// Each body's records are its own: findings with their recommendations and
// reasons, the follow-up of each recommendation, evidence requests made under
// an approved relationship, referrals (a reference to the case only) and the
// data-protection authority's requests to a controller. They are written by
// the effects of the body's own procedures (lib/oversight/procedures.ts), so
// every change is a step of a case under an approved procedure; the body's
// officials alone act on those cases (the bodies are independent:
// institutionBounds(), caseActRefusal()).
//
// What another institution adds sits beside the body's record and never
// changes it:
//   - the management response of the institution a finding concerns
//     (respondToFinding()): "the audited ministry may respond to a finding and
//     submit evidence, but it must not edit the audit institution's finding"
//     (§C.3 separation rule; acceptance P4-04);
//   - evidence the audited institution submits to an evidence request
//     (submitEvidence());
//   - a controller's answer to the data-protection authority
//     (answerControllerRequest()): what it did with a person's request about
//     its records. The authority never reads the record itself.
// Each of those is checked here against the institution the record names.
//
// A finding is a recommendation with reasons, never an automatic decision
// and never an order: whatever the recommendation asks is done, or not, by
// the institution concerned under its own procedures. A finding is corrected
// only by a new version (the earlier kept); it is never deleted.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { roleOf, type Scope } from '@/lib/auth/roles';
import type { AuthorityKey } from '@/lib/nation/deployment';

/** The oversight bodies, by their slot in the deployment profile (each optional, none named by default). */
export type OversightSlot = Extract<AuthorityKey, 'supremeAudit' | 'ombudsman' | 'humanRights' | 'anticorruption' | 'dataProtection'>;
export const OVERSIGHT_SLOTS: { slot: OversightSlot; label: string; prefix: string }[] = [
  { slot: 'ombudsman', label: 'Ombudsman', prefix: 'ombudsman.' },
  { slot: 'humanRights', label: 'Human rights institution', prefix: 'human-rights.' },
  { slot: 'anticorruption', label: 'Anti-corruption commission', prefix: 'integrity.' },
  { slot: 'supremeAudit', label: 'Public audit office', prefix: 'audit.' },
  { slot: 'dataProtection', label: 'Data-protection authority', prefix: 'data-protection.' },
];

export interface CaseRef { id: string; ref: string }
export interface Actor { id?: string; name: string; institution?: string }

export interface FindingVersion {
  n: number; at: string; by: Actor; reason: string;
  /** The standard or rule the matter is measured against (audit: criteria). */
  criteria?: string;
  /** What was found. */
  condition: string;
  cause?: string;
  effect?: string;
  /** Evidence relied on: document ids of the case, or described items. */
  evidence: string[];
  /** The recommendation: what the institution concerned is asked to do. Never an order. */
  recommendation: string;
}
export type FindingStage = 'draft' | 'communicated' | 'issued';
export interface ManagementResponse {
  n: number; at: string; by: Actor;
  position: 'accepted' | 'partly-accepted' | 'disputed';
  text: string;
  /** What it will do, and by when it says. */
  action?: string;
  evidence: string[];
}
export interface FollowUp { n: number; at: string; by: Actor; status: 'open' | 'in-progress' | 'implemented' | 'partly-implemented' | 'not-implemented'; note: string }
export interface Finding {
  number: string;
  /** The body (institution id) and its slot. */
  body: string; slot: OversightSlot;
  case: CaseRef;
  /** The institution the finding concerns. */
  concerns: string;
  stage: FindingStage;
  versions: FindingVersion[];
  /** The sealed decision that issued it (the report's approval, or the body's finding). */
  decision?: string;
  responses: ManagementResponse[];
  followUps: FollowUp[];
  sample?: true;
}
export interface EvidenceSubmission { n: number; at: string; by: Actor; description: string; document?: { id: string; sha256?: string } }
export interface EvidenceRequest {
  number: string; body: string; case: CaseRef;
  /** The institution asked. */
  to: string;
  /** The approved relationship it is made under, as in force when made. */
  relationship: { id: string; version: number; type: string };
  purpose: string; recordTypes: string[];
  requested: string;
  /** The date the body asks for it by (its own choice, never a statutory period typed in). */
  due?: string;
  at: string; by: Actor;
  submissions: EvidenceSubmission[];
  closed?: { at: string; by: Actor; reason: string };
  sample?: true;
}
export interface Referral {
  number: string; body: string; case: CaseRef;
  /** The receiving institution. */
  to: string;
  kind: 'prosecution' | 'court' | 'audit' | 'regulator' | 'other';
  /** Why. The referral carries the case reference and this, nothing of the file. */
  reason: string;
  at: string; by: Actor; sample?: true;
}
export interface ControllerRequest {
  number: string; body: string; case: CaseRef;
  /** The institution that controls the records. */
  controller: string;
  relationship: { id: string; version: number; type: string };
  kind: 'access' | 'correction' | 'erasure' | 'restriction' | 'objection' | 'investigation';
  /** The records concerned, by register and reference (never their content). */
  records: { register: string; id: string }[];
  purpose: string; asked: string;
  at: string; by: Actor;
  answer?: { at: string; by: Actor; outcome: 'provided' | 'corrected' | 'erased' | 'restricted' | 'refused' | 'partly' | 'no-record'; reasons: string };
  sample?: true;
}

interface Db { findings: Finding[]; evidence: EvidenceRequest[]; referrals: Referral[]; controller: ControllerRequest[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosOversight?: Db };
const db = (): Db => {
  const d = touch('__civicosOversight', g.__civicosOversight ??= { findings: [], evidence: [], referrals: [], controller: [], seq: {} });
  d.findings ??= []; d.evidence ??= []; d.referrals ??= []; d.controller ??= []; d.seq ??= {};
  return d;
};
export function resetOversight(): void { g.__civicosOversight = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(x => str(x, 300)).filter(Boolean) : str(v) ? str(v).split(/\n|;/).map(x => x.trim()).filter(Boolean) : []).slice(0, 50);

export const FINDING_STAGE_LABEL: Record<FindingStage, string> = { draft: 'Draft (the body\'s working record)', communicated: 'Sent for the response of the institution concerned', issued: 'Issued' };
export const POSITIONS: ManagementResponse['position'][] = ['accepted', 'partly-accepted', 'disputed'];
export const FOLLOW_UP_STATES: FollowUp['status'][] = ['open', 'in-progress', 'implemented', 'partly-implemented', 'not-implemented'];
export const REFERRAL_KINDS: Referral['kind'][] = ['prosecution', 'court', 'audit', 'regulator', 'other'];
export const REQUEST_KINDS: ControllerRequest['kind'][] = ['access', 'correction', 'erasure', 'restriction', 'objection', 'investigation'];
export const ANSWER_OUTCOMES: NonNullable<ControllerRequest['answer']>['outcome'][] = ['provided', 'corrected', 'erased', 'restricted', 'refused', 'partly', 'no-record'];

// ── Checks the procedures run before a step (no change) ──────────────────────

/** A finding's terms, checked: what was found, the recommendation and the reasons are required. */
export function checkFinding(input: { criteria?: unknown; condition?: unknown; cause?: unknown; effect?: unknown; evidence?: unknown; recommendation?: unknown }): Omit<FindingVersion, 'n' | 'at' | 'by' | 'reason'> | { error: string } {
  const condition = str(input.condition), recommendation = str(input.recommendation);
  if (!condition) return { error: 'Say what was found (the condition)' };
  if (!recommendation) return { error: 'Give the recommendation: what the institution concerned is asked to do' };
  return {
    ...(str(input.criteria) ? { criteria: str(input.criteria) } : {}), condition,
    ...(str(input.cause) ? { cause: str(input.cause) } : {}), ...(str(input.effect) ? { effect: str(input.effect) } : {}),
    evidence: list(input.evidence), recommendation,
  };
}

// ── Changes (only from lib/oversight/procedures.ts, and the three answers below) ──

export function recordFinding(input: { body: string; slot: OversightSlot; case: CaseRef; concerns: string; terms: Omit<FindingVersion, 'n' | 'at' | 'by' | 'reason'>; reason: string; by: Actor; sample?: boolean }, now = new Date()): Finding {
  const f: Finding = {
    number: next('FND', now), body: input.body, slot: input.slot, case: { ...input.case }, concerns: input.concerns, stage: 'draft',
    versions: [{ n: 1, at: now.toISOString(), by: { ...input.by }, reason: input.reason, ...clone(input.terms) }], responses: [], followUps: [],
    ...(input.sample ? { sample: true as const } : {}),
  };
  db().findings.push(f);
  recordAudit(input.by.name, 'oversight.finding.record', `Finding:${f.number}`, 'ok', `${input.case.ref} · concerns ${input.concerns} · draft`);
  return clone(f);
}

/** Correct a finding still under the body's control: a new version, the earlier kept. Never after it is issued. */
export function correctFinding(number: string, terms: Omit<FindingVersion, 'n' | 'at' | 'by' | 'reason'>, reason: string, by: Actor, now = new Date()): Finding | { error: string } {
  const f = db().findings.find(x => x.number === number);
  if (!f) return { error: 'No such finding' };
  if (f.stage === 'issued') return { error: 'An issued finding is not changed; a later finding or review links to it' };
  f.versions.push({ n: f.versions.length + 1, at: now.toISOString(), by: { ...by }, reason, ...clone(terms) });
  recordAudit(by.name, 'oversight.finding.correct', `Finding:${f.number}`, 'ok', `version ${f.versions.length}: ${reason.slice(0, 200)}`);
  return clone(f);
}

/** Move a case's findings on: communicated for the response of the institution concerned, or issued (with the sealed decision). */
export function advanceFindings(caseId: string, stage: Exclude<FindingStage, 'draft'>, by: Actor, decision?: string): string[] {
  const out: string[] = [];
  for (const f of db().findings.filter(x => x.case.id === caseId && x.stage !== 'issued')) {
    if (stage === 'communicated' && f.stage !== 'draft') continue;
    f.stage = stage;
    if (decision) f.decision = decision;
    out.push(f.number);
    recordAudit(by.name, `oversight.finding.${stage}`, `Finding:${f.number}`, 'ok', `${f.case.ref}${decision ? ` · decision ${decision}` : ''}`);
  }
  return out;
}

/** Record how a recommendation is followed up (the body's own assessment, with a note). */
export function recordFollowUp(number: string, status: unknown, note: unknown, by: Actor, now = new Date()): Finding | { error: string } {
  const f = db().findings.find(x => x.number === number);
  if (!f) return { error: 'No such finding' };
  if (f.stage !== 'issued') return { error: 'Follow-up is recorded once the finding is issued' };
  if (!FOLLOW_UP_STATES.includes(status as FollowUp['status'])) return { error: `The follow-up status is one of ${FOLLOW_UP_STATES.join(', ')}` };
  const n = str(note, 2000);
  if (!n) return { error: 'Say what the follow-up found' };
  f.followUps.push({ n: f.followUps.length + 1, at: now.toISOString(), by: { ...by }, status: status as FollowUp['status'], note: n });
  recordAudit(by.name, 'oversight.finding.follow-up', `Finding:${f.number}`, 'ok', String(status));
  return clone(f);
}

export function requestEvidence(input: Omit<EvidenceRequest, 'number' | 'at' | 'submissions' | 'closed' | 'sample'> & { sample?: boolean }, now = new Date()): EvidenceRequest {
  const { sample, ...rest } = input;
  const r: EvidenceRequest = { ...clone(rest), number: next('EVR', now), at: now.toISOString(), submissions: [], ...(sample ? { sample: true as const } : {}) };
  db().evidence.push(r);
  recordAudit(input.by.name, 'oversight.evidence.request', `EvidenceRequest:${r.number}`, 'ok', `${input.case.ref} · to ${input.to} · under relationship ${input.relationship.id} v${input.relationship.version} · purpose ${input.purpose.slice(0, 120)}`);
  return clone(r);
}

export function closeEvidenceRequest(number: string, reason: string, by: Actor, now = new Date()): EvidenceRequest | { error: string } {
  const r = db().evidence.find(x => x.number === number);
  if (!r) return { error: 'No such evidence request' };
  if (r.closed) return { error: 'It is already closed' };
  r.closed = { at: now.toISOString(), by: { ...by }, reason };
  recordAudit(by.name, 'oversight.evidence.close', `EvidenceRequest:${r.number}`, 'ok', reason.slice(0, 200));
  return clone(r);
}

export function recordReferral(input: Omit<Referral, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): Referral {
  const { sample, ...rest } = input;
  const r: Referral = { ...clone(rest), number: next('OVR', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().referrals.push(r);
  recordAudit(input.by.name, 'oversight.referral', `Referral:${r.number}`, 'ok', `${input.case.ref} · ${input.kind} · to ${input.to} · reference only`);
  return clone(r);
}

export function askController(input: Omit<ControllerRequest, 'number' | 'at' | 'answer' | 'sample'> & { sample?: boolean }, now = new Date()): ControllerRequest {
  const { sample, ...rest } = input;
  const r: ControllerRequest = { ...clone(rest), number: next('DPR', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().controller.push(r);
  recordAudit(input.by.name, 'oversight.controller.ask', `ControllerRequest:${r.number}`, 'ok', `${input.case.ref} · ${input.kind} · to ${input.controller} · ${input.records.length} record(s) · under relationship ${input.relationship.id} v${input.relationship.version}`);
  return clone(r);
}

// ── What another institution adds beside the body's record ───────────────────

const actorOf = (s: Scope & { id?: string; label?: string }, fallback: string): Actor => ({ ...(s.id ? { id: s.id } : {}), name: s.label ?? fallback, ...(s.institution ? { institution: s.institution } : {}) });
/** Officials of the named institution only, never an auditor and never the whole government on its behalf. */
function ofInstitution(s: Scope | null, institution: string, what: string): string | null {
  if (!s) return `Sign in: ${what} is made by a named official of the institution concerned`;
  if (roleOf(s) === 'auditor') return 'Auditors read records; they do not answer for an institution';
  if (s.institution !== institution) return `${what} is made only by officials of the institution concerned`;
  return null;
}

/**
 * The institution a finding concerns answers it: accepted, partly accepted or
 * disputed, with its reasons and evidence. Appended beside the finding; the
 * finding itself, its versions and its stage are untouched.
 */
export function respondToFinding(number: string, input: { position?: unknown; text?: unknown; action?: unknown; evidence?: unknown }, s: (Scope & { id?: string; label?: string }) | null, now = new Date()): Finding | { error: string } {
  const f = db().findings.find(x => x.number === number);
  if (!f) return { error: 'No such finding' };
  const why = ofInstitution(s, f.concerns, 'A response to a finding');
  if (why) return { error: why };
  if (f.stage === 'draft') return { error: 'The finding has not been sent to your institution for its response yet' };
  if (!POSITIONS.includes(input.position as ManagementResponse['position'])) return { error: `Say whether the finding is ${POSITIONS.join(', ')}` };
  const text = str(input.text, 8000);
  if (!text) return { error: 'Give the response and its reasons' };
  f.responses.push({ n: f.responses.length + 1, at: now.toISOString(), by: actorOf(s!, 'Official'), position: input.position as ManagementResponse['position'], text, ...(str(input.action, 2000) ? { action: str(input.action, 2000) } : {}), evidence: list(input.evidence) });
  recordAudit(s!.label ?? 'Official', 'oversight.finding.response', `Finding:${f.number}`, 'ok', `${String(input.position)} · by ${f.concerns} · the finding unchanged (version ${f.versions.length})`);
  return clone(f);
}

/** The institution asked submits evidence: what it is, and the document with its hash where one is attached. */
export function submitEvidence(number: string, input: { description?: unknown; document?: unknown; sha256?: unknown }, s: (Scope & { id?: string; label?: string }) | null, now = new Date()): EvidenceRequest | { error: string } {
  const r = db().evidence.find(x => x.number === number);
  if (!r) return { error: 'No such evidence request' };
  const why = ofInstitution(s, r.to, 'Evidence for a request');
  if (why) return { error: why };
  if (r.closed) return { error: 'This request is closed' };
  const description = str(input.description, 2000);
  if (!description) return { error: 'Describe what is submitted' };
  const doc = str(input.document, 120);
  r.submissions.push({ n: r.submissions.length + 1, at: now.toISOString(), by: actorOf(s!, 'Official'), description, ...(doc ? { document: { id: doc, ...(str(input.sha256, 64) ? { sha256: str(input.sha256, 64) } : {}) } } : {}) });
  recordAudit(s!.label ?? 'Official', 'oversight.evidence.submit', `EvidenceRequest:${r.number}`, 'ok', `submission ${r.submissions.length} by ${r.to}`);
  return clone(r);
}

/** The controller answers the data-protection authority: what it did, with reasons. The authority never reads the record. */
export function answerControllerRequest(number: string, input: { outcome?: unknown; reasons?: unknown }, s: (Scope & { id?: string; label?: string }) | null, now = new Date()): ControllerRequest | { error: string } {
  const r = db().controller.find(x => x.number === number);
  if (!r) return { error: 'No such request' };
  const why = ofInstitution(s, r.controller, 'The answer to the data-protection authority');
  if (why) return { error: why };
  if (r.answer) return { error: 'It has been answered; a further request is a new request' };
  if (!ANSWER_OUTCOMES.includes(input.outcome as NonNullable<ControllerRequest['answer']>['outcome'])) return { error: `The outcome is one of ${ANSWER_OUTCOMES.join(', ')}` };
  const reasons = str(input.reasons, 4000);
  if (!reasons) return { error: 'Give the reasons' };
  r.answer = { at: now.toISOString(), by: actorOf(s!, 'Official'), outcome: input.outcome as NonNullable<ControllerRequest['answer']>['outcome'], reasons };
  recordAudit(s!.label ?? 'Official', 'oversight.controller.answer', `ControllerRequest:${r.number}`, 'ok', `${String(input.outcome)} · by ${r.controller}`);
  return clone(r);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export const getFinding = (number: string): Finding | undefined => { const f = db().findings.find(x => x.number === number); return f ? clone(f) : undefined; };
export const findingsOfCase = (caseId: string): Finding[] => db().findings.filter(f => f.case.id === caseId || f.case.ref === caseId).map(clone);
export const evidenceOfCase = (caseId: string): EvidenceRequest[] => db().evidence.filter(r => r.case.id === caseId || r.case.ref === caseId).map(clone);
export const referralsOfCase = (caseId: string): Referral[] => db().referrals.filter(r => r.case.id === caseId || r.case.ref === caseId).map(clone);
export const controllerRequestsOfCase = (caseId: string): ControllerRequest[] => db().controller.filter(r => r.case.id === caseId || r.case.ref === caseId).map(clone);
export const getEvidenceRequest = (number: string): EvidenceRequest | undefined => { const r = db().evidence.find(x => x.number === number); return r ? clone(r) : undefined; };
export const getControllerRequest = (number: string): ControllerRequest | undefined => { const r = db().controller.find(x => x.number === number); return r ? clone(r) : undefined; };

/**
 * What an official may see of the oversight records: the body's own officials
 * see their body's records; the institution a finding, evidence request or
 * controller request concerns sees that record once it is sent to it (a
 * finding from `communicated`), never the body's case. Nobody else.
 */
export function oversightView(s: Scope | null): { findings: Finding[]; evidence: EvidenceRequest[]; referrals: Referral[]; controller: ControllerRequest[] } {
  const d = db();
  if (!s?.institution) return { findings: [], evidence: [], referrals: [], controller: [] };
  const me = s.institution;
  return {
    findings: d.findings.filter(f => f.body === me || (f.concerns === me && f.stage !== 'draft')).map(clone),
    evidence: d.evidence.filter(r => r.body === me || r.to === me).map(clone),
    referrals: d.referrals.filter(r => r.body === me).map(clone),
    controller: d.controller.filter(r => r.body === me || r.controller === me).map(clone),
  };
}

/** Counts (no content). */
export function oversightCounts(body?: string): { findings: number; issued: number; responses: number; evidenceRequests: number; referrals: number; controllerRequests: number; samples: number } {
  const d = db();
  const mine = <T extends { body: string }>(xs: T[]) => xs.filter(x => !body || x.body === body);
  const fs = mine(d.findings);
  const all = [...fs, ...mine(d.evidence), ...mine(d.referrals), ...mine(d.controller)] as { sample?: true }[];
  return { findings: fs.length, issued: fs.filter(f => f.stage === 'issued').length, responses: fs.reduce((n, f) => n + f.responses.length, 0), evidenceRequests: mine(d.evidence).length, referrals: mine(d.referrals).length, controllerRequests: mine(d.controller).length, samples: all.filter(x => x.sample).length };
}
