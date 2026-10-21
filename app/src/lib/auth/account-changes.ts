// Account changes that wait for an independent institution (plan phase 2,
// audit D; docs/CONSTITUTIONAL_ARCHITECTURE.md §5.1: "independent bodies
// retain their own user administration", §5.3). An administrator serving the
// whole government who creates, re-roles, resets or disables an account of
// an independent institution (the legislature, a court, the head of state's
// office, an independent body), or moves an account into one, does not do it
// alone: the change waits here until an official who can sign at that
// institution (or its own administrator) confirms it, a different person
// (lib/data/dual-control.ts, personOf()). The rule itself is
// accountChangeRule() in lib/auth/roles.ts; the institution's own
// administrators act directly.
//
// Nothing secret is kept while a change waits: a new account is created only
// on confirmation, with no usable password, and the one-time reset code is
// given to the confirming official, who hands it over in person; a reset code
// asked for is likewise issued to the confirming official. Every step is
// audited; a change not confirmed in the waiting period lapses and is kept.

import { randomBytes, randomUUID } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { dualControlRefusal, dualControlPendingHours } from '@/lib/data/dual-control';
import { createAccount, setRole, setDisabled, removeTwoStep, issueReset, setSubstrateAssignment, accountById } from './officials';

export type AccountChangeKind = 'create' | 'role' | 'disable' | 'enable' | 'reset-two-step' | 'issue-reset' | 'substrate';
export interface AccountChange {
  id: string;
  kind: AccountChangeKind;
  /** The platform account changed (absent for a new one until it is created). */
  accountId?: string;
  /** A substrate officer's id, for an assignment. */
  officerId?: string;
  /** What is to be done, never a password. */
  input: { email?: string; name?: string; office?: string; role?: string | null; institution?: string | null };
  /** In plain words, for the screens and the audit chain. */
  summary: string;
  /** The independent institutions that must confirm, each by one of its officials who can sign. */
  confirmFrom: string[];
  confirmations: { institution: string; by: string; byId?: string; at: string }[];
  by: string; byId?: string; at: string; expiresAt: string;
  state: 'waiting' | 'done' | 'lapsed' | 'withdrawn' | 'failed';
  result?: string;
  doneAt?: string;
}

interface Db { changes: AccountChange[] }
const g = globalThis as unknown as { __civicosAccountChanges?: Db };
const db = (): Db => touch('__civicosAccountChanges', g.__civicosAccountChanges ??= { changes: [] });
export function resetAccountChanges(): void { g.__civicosAccountChanges = undefined; }

const nameOf = (id: string) => getMinistry(id)?.name ?? id;
const clean = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

function lapse(now: number): void {
  for (const c of db().changes) {
    if (c.state === 'waiting' && Date.parse(c.expiresAt) < now) {
      c.state = 'lapsed';
      recordAudit('System (deadlines)', 'auth.account-change.lapse', `AccountChange:${c.id}`, 'ok', `${c.summary} · not confirmed within the waiting period`);
    }
  }
}

/** Every account change, newest first (the waiting ones lapse first when their time has passed). */
export function listAccountChanges(now = Date.now()): AccountChange[] {
  lapse(now);
  return structuredClone(db().changes).reverse();
}

/** Record a change to wait for the institutions in `confirmFrom`. */
export function proposeAccountChange(input: { kind: AccountChangeKind; accountId?: string; officerId?: string; details: { email?: unknown; name?: unknown; office?: unknown; role?: unknown; institution?: unknown } }, confirmFrom: string[], actor: { by: string; byId?: string }, now = Date.now()): AccountChange | { error: string } {
  if (!confirmFrom.length) return { error: 'Nothing needs confirming: make the change directly' };
  const d = input.details;
  const details: AccountChange['input'] = {
    ...(clean(d.email, 200) ? { email: clean(d.email, 200)!.toLowerCase() } : {}),
    ...(clean(d.name, 120) ? { name: clean(d.name, 120) } : {}),
    ...(clean(d.office, 200) ? { office: clean(d.office, 200) } : {}),
    ...(d.role === null || typeof d.role === 'string' ? { role: d.role as string | null } : {}),
    ...(d.institution === null || typeof d.institution === 'string' ? { institution: (d.institution as string | null) || null } : {}),
  };
  if (input.kind === 'create' && (!details.email || !details.name || !details.office)) return { error: 'A new account needs an email address, a name and an office' };
  const target = input.accountId ? accountById(input.accountId) : undefined;
  if (input.accountId && !target) return { error: 'No such account' };
  const who = target ? target.name : input.officerId ? `substrate officer ${input.officerId}` : details.name ?? 'new account';
  const where = (i?: string | null) => (i ? nameOf(i) : 'the whole government');
  const summary = input.kind === 'create' ? `Create an account for ${who} (${details.role ?? 'officer'}, ${where(details.institution)})`
    : input.kind === 'role' ? `Set ${who}'s role to ${details.role ?? 'unchanged'} at ${'institution' in details ? where(details.institution) : where(target?.institution)}`
    : input.kind === 'substrate' ? `Set what ${who} may do: ${details.role ?? 'register default'} at ${where(details.institution)}`
    : input.kind === 'disable' ? `Disable ${who}'s account` : input.kind === 'enable' ? `Enable ${who}'s account`
    : input.kind === 'reset-two-step' ? `Reset ${who}'s second sign-in step` : `Issue a password reset code for ${who}`;
  const at = new Date(now).toISOString();
  const c: AccountChange = {
    id: `ACH-${randomUUID().slice(0, 8)}`, kind: input.kind, ...(input.accountId ? { accountId: input.accountId } : {}), ...(input.officerId ? { officerId: input.officerId } : {}),
    input: details, summary, confirmFrom: [...new Set(confirmFrom)], confirmations: [],
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at, expiresAt: new Date(now + dualControlPendingHours() * 3_600_000).toISOString(), state: 'waiting',
  };
  db().changes.push(c);
  if (db().changes.length > 1000) db().changes.splice(0, db().changes.length - 1000);
  recordAudit(actor.by, 'auth.account-change.propose', `AccountChange:${c.id}`, 'ok', `${summary} · waiting for ${c.confirmFrom.map(nameOf).join(', ')} to confirm`);
  return structuredClone(c);
}

/** Carry out a confirmed change. Returns what the confirming official needs to hand over (a reset code), or an error. */
async function carryOut(c: AccountChange, by: string): Promise<{ code?: string; expiresAt?: string } | { error: string }> {
  const i = c.input;
  if (c.kind === 'create') {
    // No usable password: the official sets their own with the reset code the confirmer hands over.
    const a = await createAccount({ email: i.email, name: i.name, office: i.office, role: i.role ?? undefined, institution: i.institution ?? undefined, password: randomBytes(24).toString('base64url') }, by);
    if ('error' in a) return a;
    c.accountId = a.id;
    const r = issueReset(a.id, by);
    return 'error' in r ? r : { code: r.code, expiresAt: r.expiresAt };
  }
  const id = c.accountId ?? '';
  if (c.kind === 'role') { const r = setRole(id, { ...(i.role !== undefined && i.role !== null ? { role: i.role } : {}), ...('institution' in i ? { institution: i.institution } : {}) }, by); return 'error' in r ? r : {}; }
  if (c.kind === 'disable' || c.kind === 'enable') { const r = setDisabled(id, c.kind === 'disable', by); return 'error' in r ? r : {}; }
  if (c.kind === 'reset-two-step') { const r = removeTwoStep(id, { by, reset: true }); return 'error' in r ? r : {}; }
  if (c.kind === 'issue-reset') { const r = issueReset(id, by); return 'error' in r ? r : { code: r.code, expiresAt: r.expiresAt }; }
  const r = setSubstrateAssignment(c.officerId ?? '', { role: i.role ?? null, institution: i.institution ?? null }, by);
  return 'error' in r ? r : {};
}

/**
 * An official of an institution in `confirmFrom` confirms (the route checks
 * they can sign there, canConfirmAccountChange()); a different person from
 * the proposer. When every institution has confirmed, the change is carried
 * out and recorded under both names.
 */
export async function confirmAccountChange(id: string, actor: { by: string; byId?: string; institution?: string }, now = Date.now()): Promise<{ change: AccountChange; code?: string; expiresAt?: string } | { error: string }> {
  lapse(now);
  const c = db().changes.find(x => x.id === id);
  if (!c) return { error: 'No such account change' };
  if (c.state !== 'waiting') return { error: `This change is ${c.state}` };
  const inst = actor.institution;
  if (!inst || !c.confirmFrom.includes(inst)) return { error: `This change waits for ${c.confirmFrom.map(nameOf).join(', ')}: an official who can sign there confirms it` };
  if (c.confirmations.some(x => x.institution === inst)) return { error: `${nameOf(inst)} has already confirmed this change` };
  const why = dualControlRefusal({ by: c.by, ...(c.byId ? { byId: c.byId } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (why) return { error: why };
  if (c.accountId && actor.byId === `local:${c.accountId}`) return { error: 'A change to your own account is confirmed by someone else' };
  const at = new Date(now).toISOString();
  c.confirmations.push({ institution: inst, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at });
  recordAudit(actor.by, 'auth.account-change.confirm', `AccountChange:${c.id}`, 'ok', `${c.summary} · confirmed for ${nameOf(inst)}`);
  if (c.confirmFrom.some(x => !c.confirmations.some(y => y.institution === x))) return { change: structuredClone(c) };
  const r = await carryOut(c, `${c.by} (confirmed by ${actor.by})`);
  c.doneAt = at;
  if ('error' in r) {
    c.state = 'failed'; c.result = r.error;
    recordAudit(actor.by, 'auth.account-change.fail', `AccountChange:${c.id}`, 'denied', `${c.summary} · ${r.error}`);
    return { error: r.error };
  }
  c.state = 'done';
  c.result = r.code ? 'Done: the reset code was given to the confirming official to hand over in person' : 'Done';
  return { change: structuredClone(c), ...(r.code ? { code: r.code, expiresAt: r.expiresAt } : {}) };
}

/** The proposer or an administrator withdraws a waiting change; it is kept. */
export function withdrawAccountChange(id: string, actor: { by: string; byId?: string; administrator: boolean }, reason?: string): AccountChange | { error: string } {
  const c = db().changes.find(x => x.id === id);
  if (!c) return { error: 'No such account change' };
  if (c.state !== 'waiting') return { error: `This change is ${c.state}` };
  if (!actor.administrator && !(c.byId && c.byId === actor.byId)) return { error: 'The proposer or an administrator withdraws a waiting change' };
  c.state = 'withdrawn';
  c.doneAt = new Date().toISOString();
  c.result = (reason ?? '').slice(0, 200) || 'Withdrawn';
  recordAudit(actor.by, 'auth.account-change.withdraw', `AccountChange:${c.id}`, 'ok', `${c.summary} · ${c.result}`);
  return structuredClone(c);
}

/** Changes waiting for confirmation (the onboarding hub's waiting list). */
export const waitingAccountChanges = (now = Date.now()) => listAccountChanges(now).filter(c => c.state === 'waiting');
