// Delegations (docs/GOVERNMENT_OPERATING_MODEL.md §10.2, directions 8.6):
// who may act for whom, for which procedures, until when. A parent for a
// child, a director for a company, a lawyer for a client. Signing in proves
// who someone is; a delegation decides whether they may act for another. A
// case records the delegation it relied on. Granted by the official who
// verified it (or, later, by the represented person themselves), revocable,
// expiring, every change audited without the parties' names. Held in
// platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export interface Principal { kind: 'person' | 'organisation'; id: string; name: string }
export interface Agent { kind: 'citizen' | 'person'; id: string; name: string }

export interface Delegation {
  id: string;
  /** The one represented. */
  principal: Principal;
  /** The one who may act for them: a signed-in citizen (provider subject) or a person of the register. */
  agent: Agent;
  /** The procedures it covers ('*' for all), e.g. civil.birth. */
  procedures: string[];
  basis: string;
  validFrom: string;
  validUntil?: string;
  grantedBy: string;
  grantedAt: string;
  revoked?: { by: string; at: string; reason: string };
}

/**
 * A delegation of authority between officials (plan I2, transparent
 * delegation; form ADM-GOV-039; spec Part 4 B "any lawful delegation or
 * temporary appointment has a recorded scope, source and effective period"):
 * an official who can sign at an institution lets another official of the
 * same institution take the listed decision steps, for a period, resting on
 * the law cited from the laws register. Recorded only by the decision of the
 * institution's own delegation procedure (lib/administration/procedures.ts,
 * adm.delegation: proposed by one official, approved by a different one),
 * revocable the same way, every version kept. Read at each request into the
 * official's scope (lib/auth/official.ts) and honoured by caseActRefusal()
 * only for steps the procedure marks delegable; a delegated act records both
 * the delegate and the delegator.
 */
export interface AuthorityDelegation {
  id: string;
  institution: string;
  delegator: { id: string; name: string };
  delegate: { id: string; name: string };
  /** Procedure keys (or '*' for every procedure of the institution). */
  procedures: string[];
  /** Action keys or task ids (lib/auth/roles.ts TASK_PERMISSIONS) it covers. */
  actions: string[];
  /** The law that allows it, cited from the laws register (instrument, provision, version). */
  basis: { instrument: string; eId: string; version?: string; title?: string }[];
  restrictions: string[];
  validFrom: string;
  validUntil?: string;
  /** The case and decision that recorded it. */
  approval: { case: string; decision?: string; by: string; confirmedBy?: string; at: string };
  revoked?: { by: string; at: string; reason: string; case?: string };
}

interface DelegationDb { delegations: Delegation[]; authority: AuthorityDelegation[] }
const g = globalThis as unknown as { __civicosDelegations?: DelegationDb };
const db = (): DelegationDb => { const d = touch('__civicosDelegations', g.__civicosDelegations ??= { delegations: [], authority: [] }); d.authority ??= []; return d; };
export function resetDelegations(): void { g.__civicosDelegations = undefined; }

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function grantDelegation(input: Omit<Delegation, 'id' | 'grantedBy' | 'grantedAt' | 'revoked'>, by: string, now = new Date()): Delegation | { error: string } {
  if (!input.principal?.id || !input.principal.name) return { error: 'Name who is represented' };
  if (!input.agent?.id || !input.agent.name) return { error: 'Name who may act for them' };
  if (input.principal.kind === 'person' && input.agent.kind === 'person' && input.principal.id === input.agent.id) return { error: 'A person does not need a delegation to act for themselves' };
  if (!input.procedures?.length || input.procedures.some(p => p !== '*' && !/^[a-z][a-z0-9.-]{1,60}$/.test(p))) return { error: 'Name the procedures it covers (or * for all)' };
  if (!input.basis?.trim()) return { error: 'State the basis (parental responsibility, company resolution, power of attorney…)' };
  if (!ISO.test(input.validFrom) || (input.validUntil && (!ISO.test(input.validUntil) || input.validUntil <= input.validFrom))) return { error: 'Valid from a date, and until a later date if it ends' };
  const d: Delegation = { ...structuredClone(input), basis: input.basis.trim().slice(0, 300), id: uuid7(), grantedBy: by, grantedAt: now.toISOString() };
  db().delegations.push(d);
  recordAudit(by, 'delegation.grant', `Delegation:${d.id}`, 'ok', `${d.principal.kind} represented by ${d.agent.kind} · ${d.procedures.join(', ')} · until ${d.validUntil ?? 'revoked'}`);
  return structuredClone(d);
}

export function revokeDelegation(id: string, reason: string, by: string, now = new Date()): Delegation | { error: string } {
  const d = db().delegations.find(x => x.id === id);
  if (!d) return { error: 'No such delegation' };
  if (d.revoked) return { error: 'Already revoked' };
  if (!reason?.trim()) return { error: 'Say why it is revoked' };
  d.revoked = { by, at: now.toISOString(), reason: reason.trim().slice(0, 300) };
  recordAudit(by, 'delegation.revoke', `Delegation:${d.id}`, 'ok', reason.trim().slice(0, 200));
  return structuredClone(d);
}

/** The delegation that lets `agent` act for `principal` in `procedure` on `on`, if any. */
export function delegationFor(agent: Pick<Agent, 'kind' | 'id'>, principal: Pick<Principal, 'kind' | 'id'>, procedure: string, on = new Date().toISOString().slice(0, 10)): Delegation | undefined {
  const d = db().delegations.find(x => !x.revoked && x.agent.kind === agent.kind && x.agent.id === agent.id && x.principal.kind === principal.kind && x.principal.id === principal.id
    && (x.procedures.includes('*') || x.procedures.includes(procedure)) && x.validFrom <= on && (!x.validUntil || on < x.validUntil));
  return d ? structuredClone(d) : undefined;
}

export const delegationsOf = (agent: Pick<Agent, 'kind' | 'id'>): Delegation[] => db().delegations.filter(x => x.agent.kind === agent.kind && x.agent.id === agent.id).map(x => structuredClone(x));

// ── Delegations of authority (plan I2) ─────────────────────────────────────

/** Record a delegation of authority: only the adm.delegation procedure's decision calls this (lib/administration/procedures.ts). */
export function recordAuthorityDelegation(input: Omit<AuthorityDelegation, 'id' | 'revoked'>, by: string): AuthorityDelegation | { error: string } {
  if (!input.institution) return { error: 'Name the institution' };
  if (!input.delegator?.id || !input.delegate?.id) return { error: 'Name the official who delegates and the official who receives it' };
  if (input.delegator.id === input.delegate.id) return { error: 'An official does not delegate to themselves' };
  if (!input.actions.length) return { error: 'Name the steps it covers' };
  if (!input.basis.length) return { error: 'Cite the law that allows the delegation (laws register)' };
  if (!ISO.test(input.validFrom) || (input.validUntil && (!ISO.test(input.validUntil) || input.validUntil <= input.validFrom))) return { error: 'Valid from a date, and until a later date if it ends' };
  const d: AuthorityDelegation = { ...structuredClone(input), id: uuid7() };
  db().authority.push(d);
  recordAudit(by, 'delegation.authority.record', `Delegation:${d.id}`, 'ok', `${d.institution} · ${d.delegator.name} to ${d.delegate.name} · ${d.actions.join(', ')} · ${d.validFrom} until ${d.validUntil ?? 'revoked'} · case ${d.approval.case}`.slice(0, 400));
  return structuredClone(d);
}

/** Revoke a delegation of authority: only the adm.delegation procedure's revocation step calls this. Kept, never deleted. */
export function revokeAuthorityDelegation(id: string, reason: string, by: string, caseRef?: string, now = new Date()): AuthorityDelegation | { error: string } {
  const d = db().authority.find(x => x.id === id);
  if (!d) return { error: 'No such delegation' };
  if (d.revoked) return { error: 'Already revoked' };
  if (!reason?.trim()) return { error: 'Say why it is revoked' };
  d.revoked = { by, at: now.toISOString(), reason: reason.trim().slice(0, 300), ...(caseRef ? { case: caseRef } : {}) };
  recordAudit(by, 'delegation.authority.revoke', `Delegation:${d.id}`, 'ok', reason.trim().slice(0, 200));
  return structuredClone(d);
}

/** The delegation of authority a case recorded (its approval case), if any. */
export const authorityDelegationOfCase = (caseRef: string): AuthorityDelegation | undefined => { const d = db().authority.find(x => x.approval.case === caseRef); return d ? structuredClone(d) : undefined; };

/** Delegations of authority of one institution, every one kept (in force, ended or revoked). */
export const authorityDelegationsOf = (institution: string): AuthorityDelegation[] => db().authority.filter(x => x.institution === institution).map(x => structuredClone(x));

/**
 * The delegations of authority in force today for one official, as the
 * authorisation rules read them (lib/auth/roles.ts DelegationGrant).
 */
export function authorityGrantsFor(accountId: string, on = new Date().toISOString().slice(0, 10)): { id: string; delegator: { id: string; name: string }; institution: string; procedures: string[]; actions: string[]; from: string; until?: string; basis: string }[] {
  return db().authority.filter(x => !x.revoked && x.delegate.id === accountId && x.validFrom <= on && (!x.validUntil || on < x.validUntil))
    .map(x => ({ id: x.id, delegator: { ...x.delegator }, institution: x.institution, procedures: [...x.procedures], actions: [...x.actions], from: x.validFrom, ...(x.validUntil ? { until: x.validUntil } : {}),
      basis: x.basis.map(b => `${b.title ?? b.instrument} ${b.eId}`).join('; ') }));
}
