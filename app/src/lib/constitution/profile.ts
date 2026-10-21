// The constitutional profile as a versioned, governed package (docs/
// CONSTITUTIONAL_ARCHITECTURE.md §7, §7.2.6, §7.4, §8.3; plan phase 5).
// Mechanism only: the platform never chooses a nation's constitution, it
// records which version of each part (lib/constitution/parts.ts) was approved
// together, by whom, under which law, from when, and keeps every version.
//
// Lifecycle (each step a recorded, audited event by a named official):
//
//   draft → legal review → institutional consultation (when the nation requires
//   it or the drafter names institutions) → security validation → authorised
//   approval → scheduled activation → active → superseded
//
//   plus disputed (a change not yet active: frozen, the status quo stays in
//   force) and suspended_pending_review (the active profile under review: it
//   stays in force, its parts frozen) — each resolved only by a recorded
//   decision naming the act that decided it; withdrawn and set_aside end one.
//
// People: the legal reviewer, the security validator and every approver are
// different people from the drafter; approval needs at least two officials,
// each a different person (the platform minimum); the nation's own steps
// (lib/law/policy-change.ts: consultation required, more approvers, the
// institution that does legal review) add to these and never remove them.
//
// What it is not: a two-person technical approval is never the constitutional
// process. Each approval records the act of the body the nation's law empowers
// (`authorisedBy`); the platform carries out what that process decided.
//
// Activation: at the effective date, by the scheduled job (/api/cron/case-
// deadlines) or the next read of the profile (activateDue()); never without
// the recorded approvals. A profile approved and due counts as in force for
// every action even before that write (profile-state.ts profileInForce()).

import { recordAudit, verifyAuditChain } from '@/lib/data/store/audit';
import { getSetup } from '@/lib/data/store/sovereign';
import { getMinistry } from '@/lib/data/store/ministries';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, citeBasis, type PolicyVersion } from '@/lib/law/policy-change';
import { cite } from '@/lib/law/register';
import { dualControlRefusal, dualControlPendingHours, independenceOf } from '@/lib/data/dual-control';
import { verifyAccessLog } from '@/lib/records/access-log';
import type { OfficialRole } from '@/lib/auth/roles';
import { currentParts, partsDigest, changedParts, type LivePart } from './parts';
import {
  profileDb, profileInForce, frozenParts, PART_LABELS,
  type ConstitutionalProfile, type ProfileStatus, type ProfileActor, type ProfileProcessValues, type PartKey,
} from './profile-state';

export * from './profile-state';

/** What screens say about the platform's part in it (guidance §7.4: never presented as the constitutional process). */
export const LEGAL_PROCESS_NOTICE = 'This records the nation\'s own legal process; it does not replace it. A two-person approval here is a technical control: each approval names the act of the body the nation\'s law empowers to change its constitutional configuration (an amendment, a resolution, an order), and the platform carries out what that process decided.';

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: 'Draft', legal_review: 'Legal review', consultation: 'Institutional consultation', security_validation: 'Security validation',
  approval: 'Authorised approval', scheduled: 'Scheduled activation', active: 'Active', superseded: 'Superseded',
  disputed: 'Disputed', suspended_pending_review: 'Suspended pending review', withdrawn: 'Withdrawn', set_aside: 'Set aside',
};
/** The steps before approval, in order; a refresh returns to the first. */
const BEFORE_APPROVAL: ProfileStatus[] = ['draft', 'legal_review', 'consultation', 'security_validation', 'approval'];
/** Statuses a dispute can be raised in: a change on its way (not a draft: not yet a change). */
const DISPUTABLE: ProfileStatus[] = ['legal_review', 'consultation', 'security_validation', 'approval', 'scheduled'];
const WITHDRAWABLE: ProfileStatus[] = ['draft', 'legal_review', 'consultation', 'security_validation', 'approval', 'scheduled', 'disputed'];

const AUDIT = 'constitution.profile';
const PROCESS_AUDIT = 'constitution.profile-process';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = (now: Date) => now.toISOString().slice(0, 10);
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export interface ProfileOfficial extends ProfileActor { role?: OfficialRole }
const actorOf = (a: ProfileOfficial): ProfileActor => ({ by: a.by, ...(a.byId ? { byId: a.byId } : {}), ...(a.institution ? { institution: a.institution } : {}) });
const differs = (a: { by: string; byId?: string }, b: { by: string; byId?: string }) => dualControlRefusal({ by: a.by, ...(a.byId ? { byId: a.byId } : {}) }, { by: b.by, ...(b.byId ? { byId: b.byId } : {}) });

type Result = { profile: ConstitutionalProfile } | { error: string };
const out = (p: ConstitutionalProfile): Result => ({ profile: structuredClone(p) });
const find = (id: string) => profileDb().profiles.find(p => p.id === id);

function event(p: ConstitutionalProfile, step: string, actor: ProfileActor, to: ProfileStatus, now: Date, extra: { note?: string; outcome?: string; reference?: string } = {}) {
  const from = p.status;
  p.events.push({ seq: p.events.length + 1, at: now.toISOString(), step, ...actor, from, to, ...(extra.note ? { note: extra.note } : {}), ...(extra.outcome ? { outcome: extra.outcome } : {}), ...(extra.reference ? { reference: extra.reference } : {}) });
  p.status = to;
  recordAudit(actor.by, `${AUDIT}.${step}`, `ConstitutionalProfile:${p.id}`, 'ok',
    `Version ${p.version} · ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}${extra.outcome ? ` · ${extra.outcome}` : ''}${extra.reference ? ` · ${extra.reference.slice(0, 120)}` : ''}${extra.note ? ` · ${extra.note.slice(0, 120)}` : ''} · digest ${p.digest.slice(0, 12)}`);
}

const roleRefusal = (a: ProfileOfficial, allowed: OfficialRole[], what: string): string | null =>
  a.role && !allowed.includes(a.role) ? `${allowed.map(r => (r === 'signatory' ? 'an official who can sign' : `an ${r}`)).join(' or ').replace(/^./, c => c.toUpperCase())} ${what}` : null;

// ── Reading ────────────────────────────────────────────────────────────────

/** The parts as they stand now, with the digest a profile drafted now would carry. */
export function liveParts(now = new Date()): { parts: LivePart[]; digest: string } {
  const parts = currentParts(now);
  return { parts, digest: partsDigest(parts) };
}

/** Everything the screen shows (activating a profile that is due first). */
export function constitutionOverview(now = new Date()) {
  activateDue(now);
  lapseProcess(now);
  const d = profileDb();
  const live = liveParts(now);
  const active = profileInForce(now);
  return {
    notice: LEGAL_PROCESS_NOTICE,
    setupComplete: getSetup() !== null,
    inForce: active ? { id: active.id, version: active.version, digest: active.digest, title: active.title, effectiveFrom: active.effectiveFrom, status: active.status } : null,
    live,
    /** Parts changed through their own process since the profile in force was approved (draft a new version to approve them together). */
    drift: active ? changedParts(active.parts, live.parts) : [],
    frozen: frozenParts(),
    profiles: structuredClone(d.profiles).reverse(),
    process: { consultation: d.process.consultation, approvals: d.process.approvals, ...(d.process.legalReviewInstitution ? { legalReviewInstitution: d.process.legalReviewInstitution } : {}), adopted: d.process.adopted, changes: structuredClone(d.process.changes ?? {}) },
    labels: { status: STATUS_LABELS, parts: PART_LABELS },
  };
}

/** Profiles waiting for a step (the onboarding hub). */
export function waitingProfileSteps(): { id: string; version: number; what: string; by: string; at: string }[] {
  const d = profileDb();
  const out: { id: string; version: number; what: string; by: string; at: string }[] = [];
  for (const p of d.profiles) {
    const last = p.events.at(-1);
    const at = last?.at ?? p.drafted.at, by = last?.by ?? p.drafted.by;
    const what = p.status === 'legal_review' ? 'waiting for legal review'
      : p.status === 'consultation' ? `waiting for ${p.consult.filter(i => !p.consultations.some(c => c.institution === i)).map(i => getMinistry(i)?.name ?? i).join(', ')} to respond`
      : p.status === 'security_validation' ? 'waiting for security validation'
      : p.status === 'approval' ? `waiting for approval (${p.approvals.length} of ${d.process.approvals})`
      : p.status === 'disputed' || p.status === 'suspended_pending_review' ? 'disputed: waiting for a recorded decision (its parts are frozen)'
      : '';
    if (what) out.push({ id: p.id, version: p.version, what: `Constitutional profile version ${p.version}: ${what}`, by, at });
  }
  return out;
}

// ── Drafting ───────────────────────────────────────────────────────────────

export interface DraftInput { title?: unknown; effectiveFrom?: unknown; consult?: unknown; constraints?: unknown; note?: unknown }

function consultList(v: unknown): string[] | { error: string } {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 30 || v.some(x => typeof x !== 'string')) return { error: 'The institutions to consult are a list of institution ids' };
  const ids = [...new Set(v as string[])];
  const unknown = ids.filter(id => getMinistry(id)?.status !== 'active');
  return unknown.length ? { error: `Not an active institution: ${unknown.join(', ')}` } : ids;
}

/**
 * An administrator serving the whole government drafts a new profile version:
 * the parts as they stand now (by reference and digest), the date it is to
 * apply from, the institutions to consult, and its migration and rollback
 * constraints. Nothing applies until the steps are recorded.
 */
export function draftProfile(input: DraftInput, actor: ProfileOfficial, now = new Date()): Result {
  if (!getSetup()) return { error: 'Setup is still running: the first-run setup commissions the configuration; the constitutional profile is drafted once setup is complete' };
  if (actor.role && (actor.role !== 'administrator' || actor.institution)) return { error: 'An administrator serving the whole government drafts a constitutional profile' };
  const title = str(input.title, 200);
  if (!title) return { error: 'Give the draft a title (e.g. the amendment or order it carries out)' };
  const effectiveFrom = input.effectiveFrom === undefined || input.effectiveFrom === '' ? today(now) : input.effectiveFrom;
  if (typeof effectiveFrom !== 'string' || !ISO_DATE.test(effectiveFrom)) return { error: 'The date it is to apply from is YYYY-MM-DD' };
  const consult = consultList(input.consult);
  if ('error' in consult) return consult;
  const d = profileDb();
  const { parts, digest } = liveParts(now);
  const prev = profileInForce(now);
  const p: ConstitutionalProfile = {
    id: `CP-${d.profiles.length + 1}`, version: d.profiles.length + 1, title, status: 'draft',
    parts: parts.map(({ waiting: _w, ...x }) => x), digest,
    ...(prev ? { previous: { id: prev.id, version: prev.version, digest: prev.digest } } : {}),
    touches: changedParts(prev?.parts, parts), effectiveFrom, basis: [],
    ...(str(input.constraints, 1000) ? { constraints: str(input.constraints, 1000) } : {}),
    ...(str(input.note, 500) ? { note: str(input.note, 500) } : {}),
    drafted: { ...actorOf(actor), at: now.toISOString() }, consult, consultations: [], approvals: [], disputes: [], events: [],
  };
  d.profiles.push(p);
  p.events.push({ seq: 1, at: now.toISOString(), step: 'drafted', ...actorOf(actor), to: 'draft' });
  recordAudit(actor.by, `${AUDIT}.drafted`, `ConstitutionalProfile:${p.id}`, 'ok', `Version ${p.version} "${title}" · applies from ${effectiveFrom} · touches ${p.touches.length ? p.touches.map(k => PART_LABELS[k]).join(', ') : 'nothing'} · digest ${digest.slice(0, 12)}`);
  return out(p);
}

/**
 * Capture the parts again (before approval): the parts changed through their
 * own process since the draft. Every step recorded so far is kept in the
 * events and cleared from the profile; it returns to the draft.
 */
export function refreshProfile(id: string, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (!BEFORE_APPROVAL.includes(p.status)) return { error: `A profile is refreshed only before approval (it is ${STATUS_LABELS[p.status].toLowerCase()})` };
  const why = roleRefusal(actor, ['administrator'], 'refreshes a draft');
  if (why) return { error: why };
  const { parts, digest } = liveParts(now);
  const prev = profileInForce(now);
  Object.assign(p, { parts: parts.map(({ waiting: _w, ...x }) => x), digest, touches: changedParts(prev?.parts, parts), consultations: [], approvals: [] });
  if (prev) p.previous = { id: prev.id, version: prev.version, digest: prev.digest }; else delete p.previous;
  delete p.legalReview; delete p.security;
  event(p, 'refreshed', actorOf(actor), 'draft', now, { note: 'Parts captured again; the steps start over' });
  return out(p);
}

/** The drafter (or an administrator) sends the draft to legal review, citing the legal instruments it rests on. */
export function submitProfile(id: string, input: { legalBasis?: unknown; consult?: unknown; constraints?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'draft') return { error: 'Only a draft is sent to legal review' };
  const why = roleRefusal(actor, ['administrator'], 'sends a draft to legal review');
  if (why) return { error: why };
  if (input.consult !== undefined) {
    const c = consultList(input.consult);
    if ('error' in c) return c;
    p.consult = c;
  }
  if (str(input.constraints, 1000)) p.constraints = str(input.constraints, 1000);
  if (profileDb().process.consultation === 'required' && !p.consult.length) return { error: 'The nation requires an institutional consultation for every constitutional profile: name the institutions to consult' };
  const basis = citeBasis(input.legalBasis, today(now), `Constitutional profile version ${p.version}`);
  if ('error' in basis) return basis;
  p.basis = basis;
  event(p, 'submitted', actorOf(actor), 'legal_review', now, { note: basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ') });
  return out(p);
}

// ── Steps ──────────────────────────────────────────────────────────────────

/** Legal review: a different person from the drafter (of the institution the nation names for it, when it does). */
export function reviewProfile(id: string, input: { outcome?: unknown; note?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'legal_review') return { error: 'This profile is not waiting for legal review' };
  const why = roleRefusal(actor, ['administrator', 'signatory'], 'records the legal review');
  if (why) return { error: why };
  const inst = profileDb().process.legalReviewInstitution;
  if (inst && actor.role && actor.institution !== inst) return { error: `The nation names ${getMinistry(inst)?.name ?? inst} to carry out the legal review: an official there records it` };
  const same = differs(p.drafted, actor);
  if (same) return { error: `The legal review is by a different person from the drafter: ${same}` };
  const outcome = input.outcome === 'returned' ? 'returned' : input.outcome === 'cleared' ? 'cleared' : null;
  if (!outcome) return { error: 'The legal review is cleared or returned (with a note)' };
  const note = str(input.note, 1000);
  if (outcome === 'returned' && !note) return { error: 'Say why it is returned' };
  p.legalReview = { ...actorOf(actor), at: now.toISOString(), outcome, ...(note ? { note } : {}) };
  const next: ProfileStatus = outcome === 'returned' ? 'draft' : p.consult.length ? 'consultation' : 'security_validation';
  event(p, 'legal-review', actorOf(actor), next, now, { outcome, ...(note ? { note } : {}) });
  return out(p);
}

/** A consulted institution's view, recorded by one of its own officials; the step ends when every one has answered. */
export function consultOnProfile(id: string, input: { response?: unknown; note?: unknown; institution?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'consultation') return { error: 'This profile is not in consultation' };
  const why = roleRefusal(actor, ['administrator', 'signatory'], 'answers a consultation for their institution');
  if (why) return { error: why };
  const institution = actor.role ? actor.institution : (typeof input.institution === 'string' ? input.institution : actor.institution);
  if (!institution || !p.consult.includes(institution)) return { error: `An official of a consulted institution answers (${p.consult.map(i => getMinistry(i)?.name ?? i).join(', ')})` };
  if (p.consultations.some(c => c.institution === institution)) return { error: `${getMinistry(institution)?.name ?? institution} has already answered` };
  const response = input.response === 'agree' || input.response === 'object' || input.response === 'no-comment' ? input.response : null;
  if (!response) return { error: 'The response is agree, object or no-comment' };
  const note = str(input.note, 1000);
  if (response === 'object' && !note) return { error: 'Say what the institution objects to' };
  p.consultations.push({ ...actorOf(actor), institution, at: now.toISOString(), response, ...(note ? { note } : {}) });
  const done = p.consult.every(i => p.consultations.some(c => c.institution === i));
  event(p, 'consulted', { ...actorOf(actor), institution }, done ? 'security_validation' : 'consultation', now, { outcome: `${getMinistry(institution)?.name ?? institution}: ${response}`, ...(note ? { note } : {}) });
  return out(p);
}

/** The checks security validation runs. */
function securityChecks(p: ConstitutionalProfile, now: Date): { label: string; ok: boolean; blocking: boolean; detail?: string }[] {
  const live = liveParts(now);
  const changed = changedParts(p.parts, live.parts);
  const audit = verifyAuditChain();
  const access = verifyAccessLog();
  const frozen = frozenParts().filter(f => f.profile !== p.id);
  const lapsed = p.basis.filter(c => 'error' in cite(c.instrument, c.eId, today(now)));
  const waiting = live.parts.filter(x => x.waiting);
  return [
    { label: 'The parts are as the draft captured them', ok: live.digest === p.digest, blocking: true, ...(live.digest === p.digest ? {} : { detail: `Changed since: ${changed.map(k => PART_LABELS[k]).join(', ')} — refresh the draft` }) },
    { label: 'The audit chain is intact', ok: audit.ok, blocking: true },
    { label: 'The access log is intact', ok: access.ok, blocking: true, ...(access.ok ? {} : { detail: `Broken at entry ${access.brokenAt}` }) },
    { label: 'No part is frozen by a dispute', ok: frozen.length === 0, blocking: true, ...(frozen.length ? { detail: frozen.map(f => `${PART_LABELS[f.part]} (version ${f.version})`).join(', ') } : {}) },
    { label: 'Every legal instrument cited is in force', ok: lapsed.length === 0, blocking: true, ...(lapsed.length ? { detail: lapsed.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ') } : {}) },
    { label: 'No change is waiting in a part (for information)', ok: waiting.length === 0, blocking: false, ...(waiting.length ? { detail: `${waiting.map(x => x.label).join(', ')}: a change confirmed later will differ from this profile` } : {}) },
  ];
}

/** Security validation: an administrator, a different person from the drafter; passes only when every blocking check does. */
export function validateProfile(id: string, actor: ProfileOfficial, now = new Date()): Result & { passed?: boolean } {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'security_validation') return { error: 'This profile is not waiting for security validation' };
  const why = roleRefusal(actor, ['administrator'], 'records the security validation');
  if (why) return { error: why };
  const same = differs(p.drafted, actor);
  if (same) return { error: `Security validation is by a different person from the drafter: ${same}` };
  const checks = securityChecks(p, now);
  p.security = { ...actorOf(actor), at: now.toISOString(), checks };
  const passed = checks.every(c => c.ok || !c.blocking);
  if (passed) event(p, 'validated', actorOf(actor), 'approval', now, { outcome: 'passed' });
  else recordAudit(actor.by, `${AUDIT}.validated`, `ConstitutionalProfile:${p.id}`, 'denied', `Version ${p.version} · not passed: ${checks.filter(c => !c.ok && c.blocking).map(c => c.label).join('; ')}`);
  return { ...out(p), passed };
}

/**
 * Authorised approval: an administrator or an official who can sign, a
 * different person from the drafter and from every earlier approver, naming
 * the act of the body the nation's law empowers (`authorisedBy`). The last
 * approval the nation's rules ask for (two at least) schedules activation.
 */
export function approveProfile(id: string, input: { authorisedBy?: unknown; note?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'approval') return { error: 'This profile is not waiting for approval' };
  const why = roleRefusal(actor, ['administrator', 'signatory'], 'approves a constitutional profile');
  if (why) return { error: why };
  const authorisedBy = str(input.authorisedBy, 300);
  if (!authorisedBy) return { error: 'Name the act that authorises it under the nation\'s law (e.g. the amendment, resolution or order and its date): this approval records that process, it does not replace it' };
  const same = differs(p.drafted, actor);
  if (same) return { error: `An approver is a different person from the drafter: ${same}` };
  for (const a of p.approvals) { const w = differs(a, actor); if (w) return { error: `Each approval is by a different person: ${w}` }; }
  const live = liveParts(now);
  if (live.digest !== p.digest) return { error: `The parts changed since the draft (${changedParts(p.parts, live.parts).map(k => PART_LABELS[k]).join(', ')}): refresh it; the steps start over` };
  const independence = independenceOf(p.approvals.length ? p.approvals[0]!.byId : p.drafted.byId, actor.byId);
  const note = str(input.note, 500);
  p.approvals.push({ ...actorOf(actor), at: now.toISOString(), authorisedBy, ...(note ? { note } : {}), independence });
  const needed = Math.max(2, profileDb().process.approvals);
  if (p.approvals.length < needed) {
    event(p, 'approved', actorOf(actor), 'approval', now, { reference: authorisedBy, outcome: `${p.approvals.length} of ${needed}` });
    return out(p);
  }
  event(p, 'approved', actorOf(actor), 'scheduled', now, { reference: authorisedBy, outcome: `${p.approvals.length} of ${needed} · activation scheduled for ${p.effectiveFrom}` });
  activateDue(now);
  return out(find(id)!);
}

/**
 * Activate every scheduled profile whose date has come (the scheduled job and
 * reads): the one in force before is superseded and kept. Only a profile with
 * its recorded approvals is ever scheduled; a disputed one never activates.
 */
export function activateDue(now = new Date()): string[] {
  const d = profileDb();
  const due = d.profiles.filter(p => p.status === 'scheduled' && p.effectiveFrom <= today(now)).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.version - b.version);
  const system: ProfileActor = { by: 'System (scheduled activation)' };
  for (const p of due) {
    for (const old of d.profiles.filter(x => x !== p && (x.status === 'active' || x.status === 'suspended_pending_review'))) {
      old.supersededAt = now.toISOString(); old.supersededBy = p.id;
      event(old, 'superseded', system, 'superseded', now, { note: `By version ${p.version}` });
    }
    p.activatedAt = now.toISOString();
    event(p, 'activated', system, 'active', now, { note: `In force from ${p.effectiveFrom}; approved by ${p.approvals.map(a => a.by).join(', ')}` });
  }
  return due.map(p => p.id);
}

/** Withdraw a profile not yet active (the drafter or an administrator); a disputed one too, which lifts its freeze. Kept. */
export function withdrawProfile(id: string, input: { reason?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (!WITHDRAWABLE.includes(p.status)) return { error: `A ${STATUS_LABELS[p.status].toLowerCase()} profile is not withdrawn` };
  if (actor.role && actor.role !== 'administrator' && !(actor.byId && actor.byId === p.drafted.byId)) return { error: 'The drafter or an administrator withdraws a profile' };
  event(p, 'withdrawn', actorOf(actor), 'withdrawn', now, { ...(str(input.reason, 500) ? { note: str(input.reason, 500) } : {}) });
  return out(p);
}

// ── Disputes (§4.11, §8.3) ─────────────────────────────────────────────────

/**
 * Record that a change is contested (an administrator or an official who can
 * sign, of any institution): a profile on its way becomes disputed and will
 * not activate; the active profile becomes suspended pending review and stays
 * in force (the status quo). The parts it touches are frozen until a recorded
 * decision resolves it. The platform never decides the dispute.
 */
export function disputeProfile(id: string, input: { grounds?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  const active = p.status === 'active';
  if (!active && !DISPUTABLE.includes(p.status)) return { error: `A ${STATUS_LABELS[p.status].toLowerCase()} profile is not disputed here` };
  const why = roleRefusal(actor, ['administrator', 'signatory'], 'records a dispute');
  if (why) return { error: why };
  const grounds = str(input.grounds, 1000);
  if (!grounds) return { error: 'State the grounds: the disputed powers and the provisions in question' };
  const frozen: PartKey[] = p.touches.length ? [...p.touches] : p.parts.map(x => x.key);
  p.disputes.push({ raisedBy: actor.by, ...(actor.byId ? { raisedById: actor.byId } : {}), ...(actor.institution ? { institution: actor.institution } : {}), at: now.toISOString(), grounds, statusBefore: p.status, frozen });
  event(p, 'disputed', actorOf(actor), active ? 'suspended_pending_review' : 'disputed', now, { note: `${grounds.slice(0, 200)} · frozen: ${frozen.map(k => PART_LABELS[k]).join(', ')}` });
  return out(p);
}

/**
 * Resolve a dispute by the recorded decision of the authorised legal process
 * (a different person from the one who raised it records it, naming the
 * decision): upheld returns the profile to where it was (a scheduled one
 * activates if its date has come); set aside ends it — for an active profile
 * under review, the profile it superseded is reinstated by that decision.
 */
export function resolveDispute(id: string, input: { outcome?: unknown; reference?: unknown; note?: unknown }, actor: ProfileOfficial, now = new Date()): Result {
  const p = find(id);
  if (!p) return { error: 'No such profile' };
  if (p.status !== 'disputed' && p.status !== 'suspended_pending_review') return { error: 'This profile is not in dispute' };
  const why = roleRefusal(actor, ['administrator', 'signatory'], 'records the decision that resolves a dispute');
  if (why) return { error: why };
  const d = p.disputes.at(-1)!;
  const same = differs({ by: d.raisedBy, ...(d.raisedById ? { byId: d.raisedById } : {}) }, actor);
  if (same) return { error: `The decision is recorded by a different person from the one who raised the dispute: ${same}` };
  const outcome = input.outcome === 'upheld' || input.outcome === 'set-aside' ? input.outcome : null;
  if (!outcome) return { error: 'The outcome is upheld (the change stands) or set-aside' };
  const reference = str(input.reference, 300);
  if (!reference) return { error: 'Name the decision that resolves it (court, tribunal or body, reference, date): the platform does not decide disputes' };
  const note = str(input.note, 1000);
  d.resolution = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), outcome, reference, ...(note ? { note } : {}) };
  const reviewOfActive = p.status === 'suspended_pending_review';
  const to: ProfileStatus = outcome === 'upheld' ? d.statusBefore : 'set_aside';
  event(p, 'resolved', actorOf(actor), to, now, { outcome, reference, ...(note ? { note } : {}) });
  if (reviewOfActive && outcome === 'set-aside' && p.previous) {
    const prev = find(p.previous.id);
    if (prev && prev.status === 'superseded' && prev.supersededBy === p.id) {
      delete prev.supersededAt; delete prev.supersededBy;
      event(prev, 'reinstated', actorOf(actor), 'active', now, { reference, note: `Version ${p.version} set aside; parts changed since go back through their own change process` });
    }
  }
  if (outcome === 'upheld') activateDue(now);
  return out(find(id)!);
}

// ── The nation's own steps (a country rule set, lib/law/policy-change.ts) ──

const describeProcess = (v: ProfileProcessValues) => `consultation ${v.consultation} · ${v.approvals} approvals${v.legalReviewInstitution ? ` · legal review by ${getMinistry(v.legalReviewInstitution)?.name ?? v.legalReviewInstitution}` : ''}`;
const checkProcess = (v: ProfileProcessValues): string | null => {
  if (v.consultation !== 'optional' && v.consultation !== 'required') return 'Consultation is optional or required';
  if (!Number.isInteger(v.approvals) || v.approvals < 2 || v.approvals > 9) return 'Approvals are a whole number from 2 (the platform minimum) to 9';
  if (v.legalReviewInstitution && getMinistry(v.legalReviewInstitution)?.status !== 'active') return 'The legal review institution must be an active institution';
  return null;
};
const processValues = (): ProfileProcessValues => { const p = profileDb().process; return { consultation: p.consultation, approvals: p.approvals, ...(p.legalReviewInstitution ? { legalReviewInstitution: p.legalReviewInstitution } : {}) }; };

/** One administrator proposes the nation's steps for a profile, citing the law; values left out keep their setting. */
export function proposeProcess(input: { consultation?: unknown; approvals?: unknown; legalReviewInstitution?: unknown; legalBasis?: unknown }, actor: { by: string; byId?: string }, now = new Date()) {
  const change: Partial<ProfileProcessValues> = {
    ...(input.consultation !== undefined ? { consultation: input.consultation as ProfileProcessValues['consultation'] } : {}),
    ...(input.approvals !== undefined ? { approvals: Number(input.approvals) } : {}),
    ...(input.legalReviewInstitution !== undefined ? { legalReviewInstitution: typeof input.legalReviewInstitution === 'string' && input.legalReviewInstitution ? input.legalReviewInstitution : undefined } : {}),
  };
  const d = profileDb();
  const current = processValues();
  // An institution un-named on purpose ('' or null) is dropped; one left out is kept.
  const values = 'legalReviewInstitution' in change && change.legalReviewInstitution === undefined ? (() => { const { legalReviewInstitution: _x, ...rest } = current; return rest as ProfileProcessValues; })() : current;
  return proposePolicy(d.process.changes ??= {}, values, change, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: PROCESS_AUDIT,
    context: 'Steps for changing the constitutional profile', check: checkProcess, describe: describeProcess,
  });
}

/** A different official confirms the nation's steps: they apply to steps taken from now. */
export function confirmProcess(actor: { by: string; byId?: string }, now = new Date()) {
  const d = profileDb();
  return confirmPolicy(d.process.changes ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: PROCESS_AUDIT, describe: describeProcess,
    adopt: (v: PolicyVersion<ProfileProcessValues>) => {
      d.process.consultation = v.values.consultation; d.process.approvals = v.values.approvals; d.process.adopted = true;
      if (v.values.legalReviewInstitution) d.process.legalReviewInstitution = v.values.legalReviewInstitution; else delete d.process.legalReviewInstitution;
    },
  });
}
export const withdrawProcess = (by: string, reason?: string) => withdrawPolicy(profileDb().process.changes ??= {}, { by, ...(reason ? { reason } : {}), audit: PROCESS_AUDIT });
export const lapseProcess = (now = new Date()) => lapsePolicy(profileDb().process.changes ??= {}, now, PROCESS_AUDIT);
