// A country's rule set (dual-control rules, suspension periods), changed by
// two officials and resting on the law (acceptance hardening, decision pack
// gaps): one administrator proposes the new values with their legal basis
// cited from the laws register (each citation resolved to the version in
// force, as decisions cite law); a different person confirms it within the
// dual-control waiting period, when it takes effect; a proposal not
// confirmed in time lapses. Every adopted version is kept with who proposed
// and confirmed it and how independent they were known to be. Values left
// out of a proposal keep their current setting.

import { cite, type Citation } from './register';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { recordAudit } from '@/lib/data/store/audit';

export interface PolicyVersion<T> {
  values: T;
  basis: Citation[];
  by: string; byId?: string; at: string;
  confirmed?: { by: string; byId?: string; at: string; independence: 'identity-provider' | 'accounts-only' | 'unverified' };
}
export interface PolicyChanges<T> {
  /** A proposal waiting for its second official. */
  pending?: PolicyVersion<T> & { expiresAt: string };
  /** Adopted versions, oldest first; lapsed and withdrawn proposals are kept too. */
  history?: (PolicyVersion<T> & { outcome: 'adopted' | 'lapsed' | 'withdrawn' })[];
}

/** Resolve `[{ instrument, eId }]` against the laws register on `on`: at least one, each in force. */
export function citeBasis(input: unknown, on: string, context: string): Citation[] | { error: string } {
  const list = Array.isArray(input) ? input.slice(0, 10) : [];
  if (!list.length) return { error: 'Cite the legal basis from the laws register: [{ instrument, eId }] (record and confirm the law first)' };
  const out: Citation[] = [];
  for (const l of list) {
    const x = (l ?? {}) as { instrument?: unknown; eId?: unknown };
    const c = cite(String(x.instrument ?? '').trim().slice(0, 300), String(x.eId ?? '').trim().slice(0, 200), on, context);
    if ('error' in c) return { error: `Legal basis: ${c.error}` };
    out.push(c);
  }
  return out;
}

/** A waiting proposal without its deadline, as history keeps it. */
function settled<T>(p: PolicyVersion<T> & { expiresAt: string }): PolicyVersion<T> {
  const copy: Partial<PolicyVersion<T> & { expiresAt: string }> = { ...p };
  delete copy.expiresAt;
  return copy as PolicyVersion<T>;
}

const lapse = <T,>(h: PolicyChanges<T>, now: Date, audit: string, by: string): void => {
  if (h.pending && Date.parse(h.pending.expiresAt) < now.getTime()) {
    (h.history ??= []).push({ ...settled(h.pending), outcome: 'lapsed' });
    h.pending = undefined;
    recordAudit(by, `${audit}.lapse`, audit, 'ok', 'Not confirmed within the waiting period');
  }
};

/** Propose new values: checked by `check` against the current ones (missing values kept), cited, waiting for a second official. */
export function proposePolicy<T extends object>(h: PolicyChanges<T>, current: T, input: Partial<T>, basisInput: unknown, opts: { by: string; byId?: string; now: Date; pendingHours: number; audit: string; context: string; check: (v: T) => string | null; describe: (v: T) => string }): (PolicyVersion<T> & { expiresAt: string }) | { error: string } {
  lapse(h, opts.now, opts.audit, opts.by);
  if (h.pending) return { error: `A change proposed by ${h.pending.by} is waiting for a second official: confirm or withdraw it first` };
  const values = { ...current, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) } as T;
  const why = opts.check(values);
  if (why) return { error: why };
  const basis = citeBasis(basisInput, opts.now.toISOString().slice(0, 10), opts.context);
  if ('error' in basis) return basis;
  const at = opts.now.toISOString();
  h.pending = { values, basis, by: opts.by, ...(opts.byId ? { byId: opts.byId } : {}), at, expiresAt: new Date(opts.now.getTime() + opts.pendingHours * 3_600_000).toISOString() };
  recordAudit(opts.by, `${opts.audit}.propose`, opts.audit, 'ok', `${opts.describe(values)} · basis ${basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ').slice(0, 160)} · awaiting a second official`);
  return structuredClone(h.pending);
}

/** A different official confirms the waiting proposal: `adopt` applies its values. */
export function confirmPolicy<T extends object>(h: PolicyChanges<T>, opts: { by: string; byId?: string; now: Date; audit: string; requireIdentityBinding?: boolean; describe: (v: T) => string; adopt: (v: PolicyVersion<T>) => void }): PolicyVersion<T> | { error: string } {
  lapse(h, opts.now, opts.audit, opts.by);
  const p = h.pending;
  if (!p) return { error: 'No change is waiting to be confirmed (a proposal lapses after the waiting period)' };
  const why = dualControlRefusal({ by: p.by, ...(p.byId ? { byId: p.byId } : {}) }, { by: opts.by, ...(opts.byId ? { byId: opts.byId } : {}) });
  if (why) return { error: why };
  const independence = independenceOf(p.byId, opts.byId);
  if (opts.requireIdentityBinding && independence !== 'identity-provider') return { error: 'The nation requires both officials to be linked to the national identity provider (Officials → link identity)' };
  const version: PolicyVersion<T> = { ...settled(p), confirmed: { by: opts.by, ...(opts.byId ? { byId: opts.byId } : {}), at: opts.now.toISOString(), independence } };
  (h.history ??= []).push({ ...version, outcome: 'adopted' });
  h.pending = undefined;
  opts.adopt(version);
  recordAudit(opts.by, opts.audit, opts.audit, 'ok', `${opts.describe(version.values)} · proposed by ${p.by}, confirmed by ${opts.by} · ${independence}`);
  return structuredClone(version);
}

/** The proposer (or any administrator) withdraws a waiting proposal; it is kept. */
export function withdrawPolicy<T>(h: PolicyChanges<T>, opts: { by: string; reason?: string; audit: string }): { ok: true } | { error: string } {
  const p = h.pending;
  if (!p) return { error: 'No change is waiting' };
  (h.history ??= []).push({ ...settled(p), outcome: 'withdrawn' });
  h.pending = undefined;
  recordAudit(opts.by, `${opts.audit}.withdraw`, opts.audit, 'ok', (opts.reason ?? '').slice(0, 200) || 'Withdrawn');
  return { ok: true };
}

/** Lapse a waiting proposal whose time has passed (the daily job). */
export const lapsePolicy = <T,>(h: PolicyChanges<T>, now: Date, audit: string): void => lapse(h, now, audit, 'System (deadlines)');
