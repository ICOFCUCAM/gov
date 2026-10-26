// The national security directive register (plan step I12; catalogue Part 11
// §8 "Required directive record" and "Directive safeguards"; REG-SEC-016).
//
// A security directive is a controlled legal or administrative instrument,
// never an informal message. It is kept apart from the general directives
// register (lib/data/directives.ts), whose records are listed to every
// official and mirrored to the shared database: a security directive is shown
// only to its issuer and its recipients. It reuses that register's rules:
// instructionRefusal() (lib/auth/roles.ts directiveTargetRefusal(): an
// independent institution receives a request, a communication or a referral,
// never an instruction, unless an approved `instruct` relationship covers it;
// one institution does not instruct another without one), the caretaker and
// court-ruling restrictions (lib/transitions/restrictions.ts), and the laws
// register for its authority (citeBasis()).
//
//   - Issued by the institution the nation names for the `nationalSecurity`
//     slot: drafted by one of its officials, issued by a different one who can
//     sign there (dualControlRefusal(): two people, not two accounts).
//   - It says whether it is a policy directive or a legally binding order,
//     cites its legal authority (required), carries a marking checked against
//     the installation's accreditation, its scope, recipients, effective
//     period and the route to challenge or review it.
//   - An amendment is a new version, proposed by one official and confirmed by
//     a different one; the original is kept.
//   - Acknowledgement is recorded apart from compliance; neither is agreement.
//   - An expired or ended directive never reads as current (statusOf()).
//   - AI never issues one: every step is a named, signed-in official's.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { citeBasis } from '@/lib/law/policy-change';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { roleOf, INSTRUCTION_KINDS, COMMUNICATION_KINDS, type CaseScope } from '@/lib/auth/roles';
import { instructionRefusal } from '@/lib/data/directives';
import { caretakerRefusal, judicialRefusal } from '@/lib/transitions/restrictions';
import { markingRefusal, markingLabel } from './classification';
import type { Citation } from '@/lib/law/register';

export type DirectiveForce = 'policy-directive' | 'binding-order';
export interface DirectiveTerms {
  title: string; kind: string; force: DirectiveForce;
  authority: Citation[];
  scope: string;
  recipients: string[];
  marking: string; caveats: string[];
  effectiveFrom: string; expiresOn?: string; reviewOn?: string;
  /** What each recipient must do and report. */
  compliance: string;
  /** How a recipient challenges it, asks for review or reports an unlawful directive. */
  challengeRoute: string;
}
type Who = { id?: string; name: string; institution?: string };
export interface SecurityDirective {
  ref: string;
  issuer: string;
  versions: (DirectiveTerms & { n: number; at: string; by: Who; reason: string; confirmed?: { by: Who; at: string; independence: string } })[];
  /** A version waiting for its second official (the first draft, or an amendment). */
  pending?: DirectiveTerms & { at: string; by: Who; reason: string };
  issuedAt?: string;
  acknowledgements: { institution: string; by: Who; at: string; version: number }[];
  compliance: { institution: string; by: Who; at: string; version: number; state: 'implemented' | 'partly-implemented' | 'not-implemented' | 'exception-requested'; note: string }[];
  ended?: { at: string; by: Who; reason: string };
  sample?: true;
}

interface Db { rows: SecurityDirective[]; seq: number }
const g = globalThis as unknown as { __civicosSecurityDirectives?: Db };
const db = (): Db => { const d = touch('__civicosSecurityDirectives', g.__civicosSecurityDirectives ??= { rows: [], seq: 0 }); d.rows ??= []; d.seq ??= 0; return d; };
export function resetSecurityDirectives(): void { g.__civicosSecurityDirectives = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const list = (v: unknown) => (Array.isArray(v) ? v : str(v).split(/[\n;,]/)).map(x => str(x, 120)).filter(Boolean);
type Viewer = (CaseScope & { label?: string }) | null;
const who = (s: CaseScope & { label?: string }): Who => ({ ...(s.id ? { id: s.id } : {}), name: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) });
export const DIRECTIVE_KINDS = [...INSTRUCTION_KINDS, ...COMMUNICATION_KINDS];
export const COMPLIANCE_STATES: SecurityDirective['compliance'][number]['state'][] = ['implemented', 'partly-implemented', 'not-implemented', 'exception-requested'];

/** Officials of the national security body only (never an auditor or an administrator by role). */
function issuerRefusal(s: Viewer, sign: boolean): string | null {
  const body = authorityFor('nationalSecurity');
  if (!body) return 'No institution is named for national security directives under Who is responsible';
  if (!s) return 'Sign in: a security directive is drafted and issued by named officials';
  if (s.institution !== body) return 'Security directives are drafted and issued only by officials of the institution named for them';
  const role = roleOf(s);
  if (role === 'auditor' || role === 'administrator') return 'Auditors and administrators do not draft or issue security directives';
  if (sign && role !== 'signatory') return 'Issuing a security directive needs an official who can sign there';
  return null;
}

function termsOf(input: Record<string, unknown>, issuer: string, now: Date): DirectiveTerms | { error: string } {
  const title = str(input.title, 300);
  if (!title) return { error: 'Give the directive a title' };
  const kind = str(input.kind, 40) || 'instruction';
  if (!DIRECTIVE_KINDS.includes(kind)) return { error: `The kind is one of ${DIRECTIVE_KINDS.join(', ')}` };
  const force = str(input.force, 40) as DirectiveForce;
  if (!['policy-directive', 'binding-order'].includes(force)) return { error: 'Say whether it is a policy directive or a legally binding order (policy-directive, binding-order)' };
  if (force === 'binding-order' && COMMUNICATION_KINDS.includes(kind)) return { error: 'A request, a communication or a referral is never a binding order' };
  const recipients = [...new Set(list(input.recipients))];
  if (!recipients.length) return { error: 'Name the recipient institutions' };
  for (const r of recipients) if (!getMinistry(r)) return { error: `${r} is not a registered institution` };
  // An independent institution receives a request, never an instruction; one institution does not instruct another
  // without an approved instruct relationship (the general directives register's rule).
  const refused = instructionRefusal(issuer, kind, recipients, now);
  if (refused) return { error: refused };
  const authority = citeBasis(input.authority, now.toISOString().slice(0, 10), 'national security directive');
  if ('error' in authority) return { error: `A security directive cites its legal authority: ${authority.error}` };
  const transition = caretakerRefusal({ institution: issuer, directive: kind }, now) ?? judicialRefusal(authority, now);
  if (transition) return { error: transition };
  const marking = str(input.marking, 40).toLowerCase();
  const caveats = list(input.caveats);
  const marked = markingRefusal(marking, caveats);
  if (marked) return { error: marked };
  const scope = str(input.scope, 4000), compliance = str(input.compliance, 4000), challengeRoute = str(input.challengeRoute, 2000);
  if (!scope) return { error: 'Give its scope: institutions, subjects, actions and jurisdictions covered' };
  if (!compliance) return { error: 'Say what each recipient must do and report' };
  if (!challengeRoute) return { error: 'Give the route to challenge it, ask for its review or report it as unlawful' };
  const effectiveFrom = str(input.effectiveFrom, 10);
  if (!DATE.test(effectiveFrom)) return { error: 'Give the date it takes effect' };
  const expiresOn = str(input.expiresOn, 10), reviewOn = str(input.reviewOn, 10);
  for (const d of [expiresOn, reviewOn]) if (d && !DATE.test(d)) return { error: 'Dates are YYYY-MM-DD' };
  if (expiresOn && expiresOn <= effectiveFrom) return { error: 'It expires after it takes effect' };
  return { title, kind, force, authority, scope, recipients, marking, caveats, effectiveFrom, ...(expiresOn ? { expiresOn } : {}), ...(reviewOn ? { reviewOn } : {}), compliance, challengeRoute };
}

/** Draft a directive (one official of the national security body); a different one issues it. */
export function draftSecurityDirective(input: Record<string, unknown>, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const why = issuerRefusal(s, false);
  if (why) return { error: why };
  const issuer = s!.institution!;
  const t = termsOf(input, issuer, now);
  if ('error' in t) return t;
  const d = db();
  d.seq += 1;
  const row: SecurityDirective = { ref: `SDR-${now.getUTCFullYear()}-${String(d.seq).padStart(6, '0')}`, issuer, versions: [], pending: { ...t, at: now.toISOString(), by: who(s!), reason: str(input.reason, 1000) || 'First version' }, acknowledgements: [], compliance: [] };
  d.rows.push(row);
  recordAudit(who(s!).name, 'security.directive.draft', `SecurityDirective:${row.ref}`, 'ok', `${t.kind} · ${t.force} · ${t.recipients.length} recipient(s) · ${t.marking ? 'marked' : 'not classified'}`);
  return clone(row);
}

/** Propose an amendment: a new version waiting for a second official; the issued version stays in force until then. */
export function amendSecurityDirective(ref: string, input: Record<string, unknown>, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const why = issuerRefusal(s, false);
  if (why) return { error: why };
  const row = db().rows.find(x => x.ref === ref && x.issuer === s!.institution);
  if (!row) return { error: 'No such directive of your institution' };
  if (row.ended) return { error: 'An ended directive is not amended; issue a new one' };
  if (row.pending) return { error: 'A version is already waiting for its second official' };
  const cur = row.versions.at(-1);
  const t = termsOf({ ...(cur ?? {}), authority: (cur?.authority ?? []).map(c => ({ instrument: c.instrument, eId: c.eId })), ...input }, row.issuer, now);
  if ('error' in t) return t;
  const reason = str(input.reason, 1000);
  if (!reason) return { error: 'Say why it is amended' };
  row.pending = { ...t, at: now.toISOString(), by: who(s!), reason };
  recordAudit(who(s!).name, 'security.directive.amend', `SecurityDirective:${ref}`, 'ok', `version ${row.versions.length + 1} proposed: ${reason.slice(0, 160)}`);
  return clone(row);
}

/** Issue the waiting version: a different person who can sign at the national security body. Checked again now (a relationship or a caretaker period may have changed). */
export function issueSecurityDirective(ref: string, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const why = issuerRefusal(s, true);
  if (why) return { error: why };
  const row = db().rows.find(x => x.ref === ref && x.issuer === s!.institution);
  if (!row?.pending) return { error: 'Nothing is waiting to be issued' };
  const p = row.pending;
  const same = dualControlRefusal({ by: p.by.name, ...(p.by.id ? { byId: p.by.id } : {}) }, { by: who(s!).name, ...(s!.id ? { byId: s!.id } : {}) });
  if (same) return { error: same };
  const again = instructionRefusal(row.issuer, p.kind, p.recipients, now) ?? caretakerRefusal({ institution: row.issuer, directive: p.kind }, now) ?? judicialRefusal(p.authority, now) ?? markingRefusal(p.marking, p.caveats);
  if (again) return { error: again };
  const { at, by, reason, ...terms } = p;
  row.versions.push({ ...terms, n: row.versions.length + 1, at, by, reason, confirmed: { by: who(s!), at: now.toISOString(), independence: independenceOf(p.by.id, s!.id) } });
  row.pending = undefined;
  row.issuedAt ??= now.toISOString();
  recordAudit(who(s!).name, 'security.directive.issue', `SecurityDirective:${ref}`, 'ok', `version ${row.versions.length} · drafted by ${by.name}, issued by ${who(s!).name}`);
  return clone(row);
}

/** End it (an official who can sign at the issuer), with reasons; it is kept, never deleted. */
export function endSecurityDirective(ref: string, reason: unknown, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const why = issuerRefusal(s, true);
  if (why) return { error: why };
  const row = db().rows.find(x => x.ref === ref && x.issuer === s!.institution);
  if (!row) return { error: 'No such directive of your institution' };
  if (row.ended) return { error: 'Already ended' };
  const r = str(reason, 1000);
  if (!r) return { error: 'Say why it ends' };
  row.ended = { at: now.toISOString(), by: who(s!), reason: r };
  row.pending = undefined;
  recordAudit(who(s!).name, 'security.directive.end', `SecurityDirective:${ref}`, 'ok', r.slice(0, 160));
  return clone(row);
}

/** Where a directive stands today: a draft, waiting, in force, not yet in force, expired or ended. Never current once expired or ended. */
export function statusOf(d: SecurityDirective, now = new Date()): 'draft' | 'not-yet-in-force' | 'in-force' | 'expired' | 'ended' {
  if (d.ended) return 'ended';
  const v = d.versions.at(-1);
  if (!v) return 'draft';
  const day = now.toISOString().slice(0, 10);
  if (v.expiresOn && v.expiresOn < day) return 'expired';
  return v.effectiveFrom > day ? 'not-yet-in-force' : 'in-force';
}

function recipientRefusal(d: SecurityDirective, s: Viewer): string | null {
  if (!s?.institution) return 'Sign in as an official of a recipient institution';
  const v = d.versions.at(-1);
  if (!v || !v.recipients.includes(s.institution)) return 'Only a recipient institution answers this directive';
  if (roleOf(s) === 'auditor') return 'Auditors read records; they do not answer for an institution';
  return null;
}

/** A recipient acknowledges receipt of the version in force: receipt, not agreement or compliance. */
export function acknowledgeSecurityDirective(ref: string, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const row = db().rows.find(x => x.ref === ref);
  if (!row) return { error: 'No such directive' };
  const why = recipientRefusal(row, s);
  if (why) return { error: why };
  if (!['in-force', 'not-yet-in-force'].includes(statusOf(row, now))) return { error: `It is ${statusOf(row, now)}: nothing to acknowledge` };
  const version = row.versions.length;
  if (row.acknowledgements.some(a => a.institution === s!.institution && a.version === version)) return { error: 'Your institution has acknowledged this version' };
  row.acknowledgements.push({ institution: s!.institution!, by: who(s!), at: now.toISOString(), version });
  recordAudit(who(s!).name, 'security.directive.acknowledge', `SecurityDirective:${ref}`, 'ok', `${s!.institution} · version ${version} · receipt only`);
  return clone(row);
}

/** A recipient reports compliance with the version in force (a later report is kept beside the earlier). */
export function reportCompliance(ref: string, input: { state?: unknown; note?: unknown }, s: Viewer, now = new Date()): SecurityDirective | { error: string } {
  const row = db().rows.find(x => x.ref === ref);
  if (!row) return { error: 'No such directive' };
  const why = recipientRefusal(row, s);
  if (why) return { error: why };
  if (statusOf(row, now) !== 'in-force') return { error: `It is ${statusOf(row, now)}: compliance is reported while it is in force` };
  const state = str(input.state, 40) as SecurityDirective['compliance'][number]['state'];
  if (!COMPLIANCE_STATES.includes(state)) return { error: `The state is one of ${COMPLIANCE_STATES.join(', ')}` };
  const note = str(input.note, 4000);
  if (!note) return { error: 'Say what was done, or why not' };
  row.compliance.push({ institution: s!.institution!, by: who(s!), at: now.toISOString(), version: row.versions.length, state, note });
  recordAudit(who(s!).name, 'security.directive.compliance', `SecurityDirective:${ref}`, 'ok', `${s!.institution} · ${state}`);
  return clone(row);
}

/**
 * The directives an official may see: those of their own institution as
 * issuer (drafts included) and those issued to it as a recipient (issued
 * versions only). Nobody else: not the whole government, not an
 * administrator elsewhere. The marking shows as its label.
 */
export function listSecurityDirectives(s: Viewer, now = new Date()): (SecurityDirective & { status: string; markingLabel: string })[] {
  if (!s?.institution) return [];
  const mine = s.institution;
  return db().rows
    .filter(d => d.issuer === mine || (d.versions.at(-1)?.recipients.includes(mine) ?? false))
    .map(d => {
      const out = d.issuer === mine ? clone(d) : { ...clone(d), pending: undefined };
      return { ...out, status: statusOf(d, now), markingLabel: markingLabel((d.versions.at(-1) ?? d.pending)?.marking) };
    });
}

export const securityDirectiveCounts = (): { total: number; inForce: number } => ({ total: db().rows.length, inForce: db().rows.filter(d => statusOf(d) === 'in-force').length });
