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

interface DelegationDb { delegations: Delegation[] }
const g = globalThis as unknown as { __civicosDelegations?: DelegationDb };
const db = (): DelegationDb => touch('__civicosDelegations', g.__civicosDelegations ??= { delegations: [] });
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
