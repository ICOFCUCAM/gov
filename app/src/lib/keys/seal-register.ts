// The seal key register (owner's concern and decision, 21 October 2026): which
// keys are the institution's legitimate seals, over time, and who approved
// each one under which law.
//
// A decision record embeds the public half of the key that sealed it
// (lib/records/decisions.ts), so it verifies mathematically forever. That
// alone does not say the key was the state's: this register does. Each key is
// a batch with its own validity period:
//
//   proposed → approved → active → retired       (replaced by the next key)
//                               ↘ revoked        (reported compromised, confirmed)
//   proposed → withdrawn
//
// - The key the key provider presents (CIVICOS_DECISION_KEY, Vault, KMS) is
//   not trusted for sealing in a production installation until its SHA-256
//   fingerprint is recorded here and approved: proposed by one official,
//   citing the law from the laws register, approved by at least two other
//   officials who can sign at the institution the nation's law names (the
//   country's seal-key rules, changed only through lib/law/policy-change.ts;
//   the authority sits in the optional `trustServices` slot of who is
//   responsible, empty until the nation names one). Owner's decision: no
//   parliamentary act for every key; the law names the approving authority
//   once, two different officials always approve, and a nation whose law
//   demands it can require a legislature's enacted instrument for each key
//   (`legislatureResolution`, shipped off).
// - An approved key becomes active when the provider presents it for the
//   first seal (or at once when it already does); activation retires the
//   previous active key (its validity ends then). Retired keys seal nothing
//   and verify forever.
// - Demonstration and training installations trust a key not in the
//   register automatically, recorded as a sample.
// - Compromise: one official reports it with the time from which the key is
//   no longer trusted (the key stops sealing at once); a second, different
//   official confirms it straight away (no waiting period), and from then
//   decisions sealed after that time verify as not trusted; earlier ones stay
//   valid. The named authority reviews it afterwards (within the period the
//   rules set); a review can only move the compromise time earlier. Nothing
//   about a decision is ever changed or deleted.
// - Keys that sealed decisions before this register existed are registered
//   afterwards (historic keys, same approval), with the period they sealed in.
//
// The register is published as a trust list (GET /api/trust/keys,
// docs/SEAL_KEYS.md) so certificates can be checked outside the platform.
// It is kept as it stands by a data restore (lib/backup/state.ts
// KEPT_ON_RESTORE): a restore must never bring back trust in a revoked key.

import { createHash, createPublicKey } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';
import { installationMode, samplesAllowed } from '@/lib/ops/mode';
import { cite, getInstrument, type Citation } from '@/lib/law/register';
import { citeBasis, proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';
import { dualControlRefusal, independenceOf, dualControlPendingHours } from '@/lib/data/dual-control';
import { authorityFor } from '@/lib/data/store/sovereign';
import { AUTHORITIES, isAuthorityKey, type AuthorityKey } from '@/lib/nation/deployment';
import { sealKeyProposeRefusal, sealKeyApproveRefusal, sealKeyRulesRefusal, type Scope } from '@/lib/auth/roles';
import type { SigningPurpose } from './custody';

/** Purposes a seal key can be registered for. Sealing is enforced for `decision`; audit heads and exchange receipts can join. */
export type SealPurpose = Extract<SigningPurpose, 'decision' | 'audit' | 'exchange'>;
export const SEAL_PURPOSES: SealPurpose[] = ['decision', 'audit', 'exchange'];
/** Purposes whose signatures are refused in production unless the key is approved here. */
export const ENFORCED_PURPOSES: SealPurpose[] = ['decision'];
export const isSealPurpose = (v: unknown): v is SealPurpose => SEAL_PURPOSES.includes(v as SealPurpose);

export type SealKeyStatus = 'proposed' | 'approved' | 'active' | 'retired' | 'revoked' | 'withdrawn';
export type Independence = 'identity-provider' | 'accounts-only' | 'unverified';

export interface SealKeyApproval { by: string; byId?: string; institution?: string; at: string; independence: Independence }
export interface SealKeyEvent { at: string; by: string; step: string; status: SealKeyStatus; note?: string }
export interface Compromise {
  reportedAt: string; by: string; byId?: string;
  /** From when the key is no longer trusted: decisions sealed at or after it verify as not trusted. */
  compromisedFrom: string;
  reason: string;
  confirmed?: { by: string; byId?: string; at: string; independence: Independence };
  withdrawn?: { by: string; at: string; reason: string };
  /** The named authority's later review (mandatory; due by `dueBy`). */
  review?: { dueBy?: string; by?: string; byId?: string; at?: string; outcome?: 'upheld' | 'earlier'; note?: string; previousFrom?: string };
}
export interface SealKey {
  id: string;
  purpose: SealPurpose;
  /** `ed25519:<first 16 hex of the fingerprint>` as seals carry it. */
  keyId: string;
  /** SHA-256 (hex) of the public key's DER SubjectPublicKeyInfo. */
  fingerprint: string;
  publicKeyPem: string;
  status: SealKeyStatus;
  /** A key that sealed before the register existed, registered afterwards with the period it sealed in. */
  historic?: boolean;
  /** Trusted automatically in a demonstration or training installation. */
  sample?: boolean;
  /** Earliest decision this key had already sealed when it was proposed (approving it covers them). */
  coversFrom?: string;
  validFrom?: string;
  validUntil?: string;
  basis: Citation[];
  /** The legislature's enacted instrument, where the nation's rules require one. */
  resolution?: Citation;
  reason?: string;
  proposed: { by: string; byId?: string; at: string };
  approvals: SealKeyApproval[];
  /** The rules the approval was made under. */
  rules?: { version: number; authority: AuthorityKey; institution: string; approvers: number; legislatureResolution: boolean };
  approvedAt?: string;
  activated?: { at: string; by: string };
  retired?: { at: string; by: string; reason: string };
  compromise?: Compromise;
  /** Every step, oldest first: nothing is overwritten without a trace. */
  history: SealKeyEvent[];
}

export interface SealKeyRuleValues {
  /** The slot of who is responsible whose institution approves seal keys (the nation's law names it). */
  authority: AuthorityKey;
  /** Approvals needed, each by a different official (platform minimum 2). */
  approvers: number;
  /** Each key also needs an enacted instrument of the legislature, cited from the laws register. Shipped off. */
  legislatureResolution: boolean;
  /** Days within which the authority reviews a confirmed compromise. */
  reviewWithinDays: number;
}
export interface SealKeyRules extends SealKeyRuleValues {
  /** False while these are the platform's defaults, not the country's adopted rules. */
  adopted: boolean;
  by?: string; at?: string; confirmedBy?: string;
  citations?: Citation[];
  changes?: PolicyChanges<SealKeyRuleValues>;
}
export const PLATFORM_MIN_APPROVERS = 2;
export const DEFAULT_SEAL_KEY_RULES: SealKeyRules = { authority: 'trustServices', approvers: PLATFORM_MIN_APPROVERS, legislatureResolution: false, reviewWithinDays: 30, adopted: false };

interface Db {
  keys: SealKey[];
  rules: SealKeyRules;
  /** When the register started, per purpose: unregistered keys seal nothing after it. */
  since: Partial<Record<SealPurpose, string>>;
}
const g = globalThis as unknown as { __civicosSealKeys?: Db };
const db = (): Db => {
  const d = touch('__civicosSealKeys', g.__civicosSealKeys ??= { keys: [], rules: { ...DEFAULT_SEAL_KEY_RULES }, since: {} });
  d.keys ??= []; d.since ??= {};
  d.rules ??= { ...DEFAULT_SEAL_KEY_RULES };
  d.rules.authority ??= 'trustServices'; d.rules.approvers ??= PLATFORM_MIN_APPROVERS; d.rules.legislatureResolution ??= false; d.rules.reviewWithinDays ??= 30; d.rules.adopted ??= false;
  return d;
};
export function resetSealKeys(): void { g.__civicosSealKeys = undefined; }

// ── Fingerprints ──────────────────────────────────────────────────────

/** SHA-256 (hex) of the DER SubjectPublicKeyInfo, with the key id seals carry; null when it is not an Ed25519 public key. */
export function fingerprintOf(publicKeyPem: string): { fingerprint: string; keyId: string; pem: string } | null {
  try {
    const k = createPublicKey(publicKeyPem);
    if (k.asymmetricKeyType !== 'ed25519') return null;
    const der = k.export({ type: 'spki', format: 'der' });
    const fingerprint = createHash('sha256').update(der).digest('hex');
    return { fingerprint, keyId: `ed25519:${fingerprint.slice(0, 16)}`, pem: k.export({ type: 'spki', format: 'pem' }).toString() };
  } catch { return null; }
}

// ── What sealed decisions say about a key (registered by lib/records/decisions.ts) ──

export interface SealHistory { count: number; first?: string; last?: string }
const gh = globalThis as unknown as { __sealHistory?: (purpose: SealPurpose, keyId: string) => SealHistory };
export function registerSealHistory(fn: (purpose: SealPurpose, keyId: string) => SealHistory): void { gh.__sealHistory = fn; }
const sealHistory = (purpose: SealPurpose, keyId: string): SealHistory => gh.__sealHistory?.(purpose, keyId) ?? { count: 0 };

// ── Reading ───────────────────────────────────────────────────────────

const clone = <T,>(v: T): T => structuredClone(v);
export const listSealKeys = (purpose?: SealPurpose): SealKey[] => db().keys.filter(k => !purpose || k.purpose === purpose).map(clone);
export const getSealKey = (id: string): SealKey | undefined => { const k = db().keys.find(x => x.id === id); return k ? clone(k) : undefined; };
export const sealKeyRules = (): SealKeyRules => clone(db().rules);
export const registerSince = (purpose: SealPurpose): string | undefined => db().since[purpose];
/** The institution that approves seal keys now (named in who is responsible for the rules' slot), or undefined. */
export const sealKeyAuthority = (): string | undefined => authorityFor(db().rules.authority);
export const activeSealKey = (purpose: SealPurpose): SealKey | undefined => { const k = db().keys.find(x => x.purpose === purpose && x.status === 'active'); return k ? clone(k) : undefined; };
const compromiseOpen = (k: SealKey) => !!k.compromise && !k.compromise.withdrawn;
const compromiseConfirmed = (k: SealKey) => !!k.compromise?.confirmed && !k.compromise.withdrawn;

/** Waiting steps for the onboarding hub and the screen: proposals, unconfirmed compromise reports, reviews due. */
export function waitingSealKeys(now = new Date()): { what: string; by: string; at: string; overdue?: boolean }[] {
  const out: { what: string; by: string; at: string; overdue?: boolean }[] = [];
  const need = db().rules.approvers;
  for (const k of db().keys) {
    if (k.status === 'proposed') out.push({ what: `Seal key ${k.keyId} (${k.purpose}${k.historic ? ', historic' : ''}): ${k.approvals.length} of ${need} approvals`, by: k.proposed.by, at: k.proposed.at });
    if (k.compromise && !k.compromise.withdrawn && !k.compromise.confirmed) out.push({ what: `Seal key ${k.keyId} reported compromised: a second official confirms it`, by: k.compromise.by, at: k.compromise.reportedAt });
    if (compromiseConfirmed(k) && !k.compromise!.review?.at) out.push({ what: `Seal key ${k.keyId}: the seal keys authority reviews the compromise (due ${k.compromise!.review?.dueBy?.slice(0, 10) ?? 'now'})`, by: k.compromise!.by, at: k.compromise!.confirmed!.at, ...(k.compromise!.review?.dueBy && Date.parse(k.compromise!.review.dueBy) < now.getTime() ? { overdue: true } : {}) });
  }
  const p = db().rules.changes?.pending;
  if (p) out.push({ what: 'Seal-key rules: a change waiting for a second official', by: p.by, at: p.at });
  return out;
}

// ── Who acts ──────────────────────────────────────────────────────────

/** Who acts: the verified official with their scope, or (sign-in not enforced, never production) a declared name. */
export interface SealActor { by: string; byId?: string; scope?: (Scope & { institution?: string }) | null }

function actorRefusal(a: SealActor, rule: (s: Scope) => string | null): string | null {
  if (a.scope) return rule(a.scope);
  return installationMode() === 'production' ? 'Sign in: seal keys are proposed and approved only by verified officials' : null;
}

const event = (k: SealKey, by: string, step: string, at: string, note?: string) => { k.history.push({ at, by, step, status: k.status, ...(note ? { note: note.slice(0, 300) } : {}) }); };
const today = (now: Date) => now.toISOString().slice(0, 10);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const iso = (v: unknown): string | null => { if (typeof v !== 'string' || !v.trim()) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : new Date(t).toISOString(); };

/** Resolve the legislature's enacted instrument: cited from the laws register, a version that entered from the legislature's certified record. */
function enactedCitation(input: unknown, on: string): Citation | { error: string } {
  const x = (input ?? {}) as { instrument?: unknown; eId?: unknown };
  const instrument = str(x.instrument, 300), eId = str(x.eId, 200);
  if (!instrument || !eId) return { error: 'The nation\'s rules require an enacted instrument of the legislature for each seal key: cite it as { instrument, eId } from the laws register' };
  const c = cite(instrument, eId, on, 'Legislature\'s approval of a seal key');
  if ('error' in c) return { error: `Legislature's instrument: ${c.error}` };
  const v = getInstrument(instrument)?.versions.find(y => y.id === c.version);
  if (v?.source.kind !== 'legislature') return { error: 'The instrument cited must be enacted by the legislature: a version that entered the laws register from the legislature\'s certified record' };
  return c;
}

// ── Proposing ─────────────────────────────────────────────────────────

export interface ProposeInput {
  purpose?: unknown;
  /** The public key (SPKI PEM). Left out: the key the provider presents now for the purpose (`presented`). */
  publicKeyPem?: unknown;
  /** A key that sealed before the register existed: the period it sealed in (defaults from the decisions it sealed). */
  historic?: unknown;
  validFrom?: unknown; validUntil?: unknown;
  legalBasis?: unknown;
  resolution?: unknown;
  reason?: unknown;
}

/** One official proposes a key, citing the law. `presented` is the public half the provider presents now (the route reads it from key custody). */
export function proposeSealKey(input: ProposeInput, actor: SealActor, presented?: string, now = new Date()): SealKey | { error: string } {
  const d = db();
  const why = actorRefusal(actor, s => sealKeyProposeRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  const purpose = input.purpose === undefined ? 'decision' : input.purpose;
  if (!isSealPurpose(purpose)) return { error: `The purpose is one of ${SEAL_PURPOSES.join(', ')}` };
  const pem = typeof input.publicKeyPem === 'string' && input.publicKeyPem.trim() ? input.publicKeyPem.trim().replace(/\\n/g, '\n') : presented;
  if (!pem) return { error: 'Give the public key (PEM), or leave it out to propose the key the key provider presents now' };
  const fp = fingerprintOf(pem);
  if (!fp) return { error: 'The public key must be an Ed25519 public key in PEM form' };
  const live = d.keys.find(k => k.purpose === purpose && k.fingerprint === fp.fingerprint && ['proposed', 'approved', 'active'].includes(k.status));
  if (live) return { error: `This key is already in the register (${live.status})` };
  const revoked = d.keys.find(k => k.purpose === purpose && k.fingerprint === fp.fingerprint && (k.status === 'revoked' || compromiseOpen(k)));
  if (revoked) return { error: 'This key was reported compromised: it can never be approved again' };
  const basis = citeBasis(input.legalBasis, today(now), 'Approval of a seal key');
  if ('error' in basis) return basis;
  let resolution: Citation | undefined;
  if (input.resolution !== undefined && input.resolution !== null && input.resolution !== '') {
    const r = enactedCitation(input.resolution, today(now));
    if ('error' in r) return r;
    resolution = r;
  }
  const historic = input.historic === true;
  const seen = sealHistory(purpose, fp.keyId);
  let validFrom: string | undefined, validUntil: string | undefined;
  if (historic) {
    validFrom = iso(input.validFrom) ?? seen.first;
    validUntil = iso(input.validUntil) ?? seen.last;
    if (!validFrom || !validUntil) return { error: 'A historic key needs the period it sealed in (validFrom, validUntil); no sealed decision shows it' };
    if (Date.parse(validFrom) > Date.parse(validUntil)) return { error: 'The period starts after it ends' };
    if (Date.parse(validUntil) > now.getTime()) return { error: 'A historic key\'s period ends in the past; a key in use now is proposed without "historic"' };
  }
  const at = now.toISOString();
  const k: SealKey = {
    id: uuid7(), purpose, keyId: fp.keyId, fingerprint: fp.fingerprint, publicKeyPem: fp.pem, status: 'proposed',
    ...(historic ? { historic: true, validFrom, validUntil } : seen.first ? { coversFrom: seen.first } : {}),
    basis, ...(resolution ? { resolution } : {}), ...(str(input.reason, 500) ? { reason: str(input.reason, 500) } : {}),
    proposed: { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at }, approvals: [], history: [],
  };
  event(k, actor.by, 'propose', at, `${historic ? `historic ${validFrom} – ${validUntil}` : seen.count ? `has already sealed ${seen.count} decision(s) since ${seen.first}` : 'new key'}`);
  d.keys.push(k);
  if (!historic) d.since[purpose] ??= at;
  recordAudit(actor.by, 'seal-key.propose', `SealKey:${k.id}`, 'ok', `${purpose} key ${k.keyId} · fingerprint ${k.fingerprint.slice(0, 16)}…${historic ? ' · historic' : ''} · basis ${basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ').slice(0, 160)} · awaiting ${d.rules.approvers} approvals`);
  return clone(k);
}

// ── Approving and activating ─────────────────────────────────────────

/** Retire the active key of a purpose (validity ends `at`) and make `k` active. */
function activate(k: SealKey, at: string, by: string): void {
  const d = db();
  for (const prev of d.keys.filter(x => x.purpose === k.purpose && x.status === 'active' && x.id !== k.id)) {
    prev.status = 'retired';
    prev.validUntil = at;
    prev.retired = { at, by, reason: `Replaced by ${k.keyId}` };
    event(prev, by, 'retire', at, `replaced by ${k.keyId}`);
    recordAudit(by, 'seal-key.retire', `SealKey:${prev.id}`, 'ok', `${prev.purpose} key ${prev.keyId} retired: replaced by ${k.keyId}; it seals nothing more and verifies what it sealed`);
  }
  k.status = 'active';
  k.validFrom = k.coversFrom && Date.parse(k.coversFrom) < Date.parse(at) ? k.coversFrom : at;
  k.activated = { at, by };
  event(k, by, 'activate', at, k.validFrom !== at ? `valid from ${k.validFrom} (covers what it had sealed before it was registered)` : undefined);
  recordAudit(by, 'seal-key.activate', `SealKey:${k.id}`, 'ok', `${k.purpose} key ${k.keyId} active from ${k.validFrom}${k.sample ? ' · sample (demonstration or training installation)' : ''}`);
  d.since[k.purpose] ??= at;
}

/**
 * An official who can sign at the seal keys authority approves (a different
 * person from the proposer and from every earlier approver). With the number
 * of approvals the rules ask for, the key is approved: a historic key is
 * recorded as retired with its period; a key the provider presents now
 * (`presented`) becomes active at once, otherwise when it is first presented.
 */
export function approveSealKey(id: string, input: { resolution?: unknown }, actor: SealActor, presented?: string, now = new Date()): SealKey | { error: string } {
  const d = db();
  const k = d.keys.find(x => x.id === id);
  if (!k) return { error: 'No such seal key' };
  if (k.status !== 'proposed') return { error: `This key is ${k.status}: only a proposed key is approved` };
  const institution = sealKeyAuthority();
  const why = actorRefusal(actor, s => sealKeyApproveRefusal(s, institution));
  if (why) return { error: why };
  if (!institution && installationMode() === 'production') return { error: sealKeyApproveRefusal({ role: 'signatory' }, undefined)! };
  const me = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) };
  for (const earlier of [k.proposed, ...k.approvals]) {
    const dup = dualControlRefusal({ by: earlier.by, ...(earlier.byId ? { byId: earlier.byId } : {}) }, me);
    if (dup) return { error: earlier === k.proposed ? `The proposer cannot approve the key: ${dup}` : `Each approval is by a different person: ${dup}` };
  }
  const rules = d.rules;
  const at = now.toISOString();
  if (input.resolution !== undefined && input.resolution !== null && input.resolution !== '') {
    const r = enactedCitation(input.resolution, today(now));
    if ('error' in r) return r;
    k.resolution = r;
  }
  const last = k.approvals.length + 1 >= rules.approvers;
  if (last && rules.legislatureResolution && !k.resolution) return { error: 'The nation\'s rules require an enacted instrument of the legislature for each seal key: cite it (resolution: { instrument, eId }) with this approval' };
  k.approvals.push({ ...me, ...(actor.scope?.institution ? { institution: actor.scope.institution } : {}), at, independence: independenceOf(k.proposed.byId, actor.byId) });
  event(k, actor.by, 'approve', at, `${k.approvals.length} of ${rules.approvers}`);
  recordAudit(actor.by, 'seal-key.approve', `SealKey:${k.id}`, 'ok', `${k.purpose} key ${k.keyId} · approval ${k.approvals.length} of ${rules.approvers}`);
  if (!last) return clone(k);
  k.status = 'approved';
  k.approvedAt = at;
  k.rules = { version: (rules.changes?.history ?? []).filter(h => h.outcome === 'adopted').length, authority: rules.authority, institution: institution ?? '', approvers: rules.approvers, legislatureResolution: rules.legislatureResolution };
  event(k, actor.by, 'approved', at, `under ${k.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}`);
  recordAudit(actor.by, 'seal-key.approved', `SealKey:${k.id}`, 'ok', `${k.purpose} key ${k.keyId} approved by ${k.approvals.map(a => a.by).join(', ')} (proposed by ${k.proposed.by})${k.resolution ? ` · legislature ${k.resolution.title ?? k.resolution.instrument}` : ''}`);
  if (k.historic) {
    k.status = 'retired';
    k.retired = { at, by: actor.by, reason: 'Historic key: sealed before the register existed' };
    event(k, actor.by, 'historic', at, `valid ${k.validFrom} – ${k.validUntil}`);
  } else if (presented && fingerprintOf(presented)?.fingerprint === k.fingerprint) {
    activate(k, at, actor.by);
  }
  return clone(k);
}

/** The proposer or an administrator withdraws a proposal (kept). */
export function withdrawSealKey(id: string, reason: string, actor: SealActor, now = new Date()): SealKey | { error: string } {
  const k = db().keys.find(x => x.id === id);
  if (!k) return { error: 'No such seal key' };
  if (k.status !== 'proposed') return { error: 'Only a proposal waiting for approval is withdrawn' };
  const why = actorRefusal(actor, s => sealKeyProposeRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  k.status = 'withdrawn';
  event(k, actor.by, 'withdraw', now.toISOString(), reason || 'Withdrawn');
  recordAudit(actor.by, 'seal-key.withdraw', `SealKey:${k.id}`, 'ok', (reason || 'Withdrawn').slice(0, 200));
  return clone(k);
}

// ── Sealing: is the presented key trusted? ───────────────────────────

/**
 * Before a seal is kept (lib/records/decisions.ts): null when the key that
 * made it may seal now, otherwise the reason. An approved key the provider
 * presents becomes active here (retiring the previous one). In a
 * demonstration or training installation a key not in the register is
 * trusted automatically, recorded as a sample. Never in production.
 */
export function sealKeyRefusal(purpose: SealPurpose, publicKeyPem: string, now = new Date()): string | null {
  const fp = fingerprintOf(publicKeyPem);
  if (!fp) return 'The seal key is not an Ed25519 key';
  const d = db();
  const mine = d.keys.filter(k => k.purpose === purpose && k.fingerprint === fp.fingerprint);
  const screen = 'National settings → Seal keys (/gov/configuration/seal-keys)';
  const reported = mine.find(compromiseOpen);
  if (reported) return `The ${purpose} key ${fp.keyId} was reported compromised on ${reported.compromise!.reportedAt.slice(0, 10)}: it seals nothing. Present a new key and have it approved (${screen})`;
  if (mine.some(k => k.status === 'active')) return null;
  const approved = mine.find(k => k.status === 'approved');
  if (approved) { activate(approved, now.toISOString(), 'system (seal key register)'); return null; }
  if (!ENFORCED_PURPOSES.includes(purpose)) return null;
  const sampleOnly = mine.every(k => k.sample && k.status === 'retired');
  if (samplesAllowed() && installationMode() !== 'production' && sampleOnly) {
    const at = now.toISOString();
    const k: SealKey = {
      id: uuid7(), purpose, keyId: fp.keyId, fingerprint: fp.fingerprint, publicKeyPem: fp.pem, status: 'proposed', sample: true, basis: [],
      reason: 'Sample: trusted automatically in a demonstration or training installation; a production installation approves every key',
      proposed: { by: 'system (sample installation)', at }, approvals: [], history: [],
    };
    event(k, k.proposed.by, 'sample-trust', at, k.reason);
    d.keys.push(k);
    activate(k, at, k.proposed.by);
    return null;
  }
  const proposed = mine.find(k => k.status === 'proposed');
  if (proposed) return `The ${purpose} key ${fp.keyId} is waiting for approval (${proposed.approvals.length} of ${d.rules.approvers}): nothing is sealed with it until the seal keys authority approves it (${screen})`;
  const retired = mine.find(k => k.status === 'retired');
  if (retired) return `The ${purpose} key ${fp.keyId} was retired on ${(retired.validUntil ?? retired.retired?.at ?? '').slice(0, 10)}: a retired key seals nothing. Present the active key, or propose a new one (${screen})`;
  return `The ${purpose} key this installation presents (${fp.keyId}) is not in the seal key register: an official proposes it and the seal keys authority approves it before anything is sealed with it (${screen})`;
}

/** Where the key the provider presents stands, without changing anything (the screen and the onboarding hub). */
export function presentedStanding(purpose: SealPurpose, publicKeyPem: string): { keyId: string; fingerprint: string; state: SealKeyStatus | 'compromise-reported' | 'unregistered'; id?: string; seals: boolean } | null {
  const fp = fingerprintOf(publicKeyPem);
  if (!fp) return null;
  const mine = db().keys.filter(k => k.purpose === purpose && k.fingerprint === fp.fingerprint);
  const pick = mine.find(compromiseOpen) ?? mine.find(k => k.status === 'active') ?? mine.find(k => k.status === 'approved') ?? mine.find(k => k.status === 'proposed') ?? mine.find(k => k.status === 'retired') ?? mine.find(k => k.status === 'revoked');
  const state = !pick ? 'unregistered' : compromiseOpen(pick) && pick.status !== 'revoked' ? 'compromise-reported' : pick.status;
  const sampleable = installationMode() !== 'production' && mine.every(k => k.sample && k.status === 'retired');
  return { keyId: fp.keyId, fingerprint: fp.fingerprint, state, ...(pick ? { id: pick.id } : {}), seals: state === 'active' || state === 'approved' || sampleable || !ENFORCED_PURPOSES.includes(purpose) };
}

// ── Verification ─────────────────────────────────────────────────────

export type SealState = 'trusted' | 'before-registration' | 'unregistered' | 'outside-validity' | 'after-compromise' | 'not-approved' | 'no-audit-record';
export interface SealStanding {
  state: SealState;
  /** False when the seal must not be relied on (whatever its mathematics). */
  trusted: boolean;
  keyId: string;
  fingerprint?: string;
  /** The register's record that covers it. */
  key?: { id: string; status: SealKeyStatus; validFrom?: string; validUntil?: string; basis: string[]; approvedBy: string[]; sample?: boolean; historic?: boolean; compromisedFrom?: string };
  note: string;
}

const basisText = (k: SealKey) => k.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`);
const covers = (k: SealKey, t: number) => !!k.validFrom && Date.parse(k.validFrom) <= t && (!k.validUntil || t <= Date.parse(k.validUntil));

/**
 * What the register says about a seal made with `publicKeyPem` at `sealedAt`
 * (the mathematics are checked by the caller). `sealedAt` must be a
 * tamper-evident time: the audit chain's entry for the seal (`audited`). A
 * time the record states for itself (`seal.at`, `content.at`) proves nothing,
 * since whoever holds a stolen key can write any time into what they sign:
 * without an audit entry a seal is not trusted, except, as before the
 * register, one made with a key the register has never held, dated before the
 * register started.
 */
export function sealStanding(purpose: SealPurpose, publicKeyPem: string, sealedAt: string, audited = true): SealStanding {
  const fp = fingerprintOf(publicKeyPem);
  if (!fp) return { state: 'unregistered', trusted: false, keyId: 'unknown', note: 'The seal\'s key is not an Ed25519 public key' };
  const d = db();
  const t = Date.parse(sealedAt);
  const since = d.since[purpose];
  const before = !since || t < Date.parse(since);
  const mine = d.keys.filter(k => k.purpose === purpose && k.fingerprint === fp.fingerprint);
  const base = { keyId: fp.keyId, fingerprint: fp.fingerprint };
  const view = (k: SealKey): SealStanding['key'] => ({ id: k.id, status: k.status, ...(k.validFrom ? { validFrom: k.validFrom } : {}), ...(k.validUntil ? { validUntil: k.validUntil } : {}), basis: basisText(k), approvedBy: k.approvals.map(a => a.by),
    ...(k.sample ? { sample: true } : {}), ...(k.historic ? { historic: true } : {}), ...(compromiseConfirmed(k) ? { compromisedFrom: k.compromise!.compromisedFrom } : {}) });
  if (!audited) {
    if (!mine.length && before) return { ...base, state: 'before-registration', trusted: true, note: 'Key not in the register (sealed before key registration); no audit-chain record of this seal' };
    return { ...base, state: 'no-audit-record', trusted: false, ...(mine[0] ? { key: view(mine[0]) } : {}), note: 'Not trusted: no audit-chain record of this seal' };
  }
  const approved = mine.filter(k => ['active', 'retired', 'revoked'].includes(k.status) && k.validFrom);
  const hit = approved.find(k => covers(k, t));
  if (hit) {
    if (compromiseConfirmed(hit) && t >= Date.parse(hit.compromise!.compromisedFrom)) {
      return { ...base, state: 'after-compromise', trusted: false, key: view(hit), note: `Sealed after the key was reported compromised (from ${hit.compromise!.compromisedFrom}): not trusted` };
    }
    const period = `valid from ${hit.validFrom!.slice(0, 10)}${hit.validUntil ? ` until ${hit.validUntil.slice(0, 10)}` : ''}`;
    const under = hit.sample ? 'a sample key of a demonstration or training installation' : `approved under ${basisText(hit).join('; ') || 'the nation\'s rules'}`;
    const later = compromiseConfirmed(hit) ? `; the key was later reported compromised from ${hit.compromise!.compromisedFrom.slice(0, 10)}, after this seal` : '';
    return { ...base, state: 'trusted', trusted: true, key: view(hit), note: `Sealed by key ${fp.keyId} (${under}, ${period})${later}` };
  }
  if (before) return { ...base, state: 'before-registration', trusted: true, ...(mine[0] ? { key: view(mine[0]) } : {}), note: 'Key not in the register (sealed before key registration)' };
  if (approved.length) return { ...base, state: 'outside-validity', trusted: false, key: view(approved[0]!), note: `Sealed outside the key's validity (${approved.map(k => `${k.validFrom?.slice(0, 10)} – ${k.validUntil?.slice(0, 10) ?? 'now'}`).join(', ')}): not trusted` };
  if (mine.length) return { ...base, state: 'not-approved', trusted: false, key: view(mine[0]!), note: 'Sealed with a key the register does not approve: not trusted' };
  return { ...base, state: 'unregistered', trusted: false, note: 'Sealed with a key that is not in the register of seal keys: not trusted' };
}

// ── Compromise ───────────────────────────────────────────────────────

/** One official reports a key compromised, with the time from which it is no longer trusted. It stops sealing at once. */
export function reportCompromise(id: string, input: { compromisedFrom?: unknown; reason?: unknown }, actor: SealActor, now = new Date()): SealKey | { error: string } {
  const k = db().keys.find(x => x.id === id);
  if (!k) return { error: 'No such seal key' };
  if (k.status === 'withdrawn') return { error: 'A withdrawn proposal was never trusted' };
  if (compromiseOpen(k)) return { error: 'This key is already reported compromised' };
  const why = actorRefusal(actor, s => sealKeyProposeRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  const reason = str(input.reason, 500);
  if (!reason) return { error: 'Say what happened' };
  const from = iso(input.compromisedFrom) ?? now.toISOString();
  if (Date.parse(from) > now.getTime()) return { error: 'The compromise time cannot be in the future' };
  const at = now.toISOString();
  k.compromise = { reportedAt: at, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), compromisedFrom: from, reason };
  event(k, actor.by, 'report-compromise', at, `from ${from}: ${reason}`);
  recordAudit(actor.by, 'seal-key.compromise.report', `SealKey:${k.id}`, 'ok', `${k.purpose} key ${k.keyId} reported compromised from ${from} · seals nothing from now · a second official confirms · ${reason.slice(0, 160)}`);
  return clone(k);
}

/** A different official confirms the report at once (emergency: no waiting period): the key is revoked; seals after the compromise time verify as not trusted. */
export function confirmCompromise(id: string, actor: SealActor, now = new Date()): SealKey | { error: string } {
  const d = db();
  const k = d.keys.find(x => x.id === id);
  if (!k?.compromise || k.compromise.withdrawn) return { error: 'No compromise report is waiting for this key' };
  if (k.compromise.confirmed) return { error: 'Already confirmed' };
  const why = actorRefusal(actor, s => sealKeyProposeRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  const dup = dualControlRefusal({ by: k.compromise.by, ...(k.compromise.byId ? { byId: k.compromise.byId } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (dup) return { error: dup };
  const at = now.toISOString();
  k.compromise.confirmed = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at, independence: independenceOf(k.compromise.byId, actor.byId) };
  const dueBy = new Date(now.getTime() + d.rules.reviewWithinDays * 86_400_000).toISOString();
  k.compromise.review = { dueBy };
  const was = k.status;
  k.status = 'revoked';
  if (was === 'active' || !k.validUntil) k.validUntil = at;
  event(k, actor.by, 'revoke', at, `confirmed; compromised from ${k.compromise.compromisedFrom}; review due ${dueBy}`);
  recordAudit(actor.by, 'seal-key.revoke', `SealKey:${k.id}`, 'ok', `${k.purpose} key ${k.keyId} revoked: compromised from ${k.compromise.compromisedFrom} · reported by ${k.compromise.by}, confirmed by ${actor.by} · review by the seal keys authority due ${dueBy.slice(0, 10)}`);
  return clone(k);
}

/** The reporter or an administrator withdraws an unconfirmed report (a mistaken report); kept. */
export function withdrawCompromise(id: string, reason: string, actor: SealActor, now = new Date()): SealKey | { error: string } {
  const k = db().keys.find(x => x.id === id);
  if (!k?.compromise || k.compromise.withdrawn) return { error: 'No compromise report is waiting for this key' };
  if (k.compromise.confirmed) return { error: 'A confirmed revocation is never withdrawn' };
  const why = actorRefusal(actor, s => sealKeyProposeRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  if (!reason.trim()) return { error: 'Say why the report is withdrawn' };
  const at = now.toISOString();
  k.compromise.withdrawn = { by: actor.by, at, reason: reason.trim().slice(0, 300) };
  event(k, actor.by, 'withdraw-compromise', at, reason);
  recordAudit(actor.by, 'seal-key.compromise.withdraw', `SealKey:${k.id}`, 'ok', reason.trim().slice(0, 200));
  return clone(k);
}

/** The named authority reviews a confirmed compromise afterwards: upheld, or the compromise moved earlier (never later). */
export function reviewCompromise(id: string, input: { outcome?: unknown; compromisedFrom?: unknown; note?: unknown }, actor: SealActor, now = new Date()): SealKey | { error: string } {
  const k = db().keys.find(x => x.id === id);
  if (!k || !compromiseConfirmed(k)) return { error: 'No confirmed compromise to review for this key' };
  if (k.compromise!.review?.at) return { error: 'Already reviewed' };
  const why = actorRefusal(actor, s => sealKeyApproveRefusal(s, sealKeyAuthority()));
  if (why) return { error: why };
  const note = str(input.note, 1000);
  if (!note) return { error: 'Record the review\'s findings' };
  const outcome = input.outcome === 'earlier' ? 'earlier' : input.outcome === 'upheld' ? 'upheld' : null;
  if (!outcome) return { error: 'The outcome is upheld or earlier (the compromise began earlier than reported)' };
  const c = k.compromise!;
  const at = now.toISOString();
  let previousFrom: string | undefined;
  if (outcome === 'earlier') {
    const from = iso(input.compromisedFrom);
    if (!from || Date.parse(from) >= Date.parse(c.compromisedFrom)) return { error: 'A review moves the compromise time only earlier than reported, never later' };
    previousFrom = c.compromisedFrom;
    c.compromisedFrom = from;
  }
  c.review = { ...c.review, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at, outcome, note, ...(previousFrom ? { previousFrom } : {}) };
  event(k, actor.by, 'review', at, `${outcome}${previousFrom ? `: compromised from ${c.compromisedFrom} (was ${previousFrom})` : ''} · ${note}`);
  recordAudit(actor.by, 'seal-key.compromise.review', `SealKey:${k.id}`, 'ok', `${outcome}${previousFrom ? ` · compromised from ${c.compromisedFrom} (was ${previousFrom})` : ''} · ${note.slice(0, 160)}`);
  return clone(k);
}

// ── The country's seal-key rules (lib/law/policy-change.ts) ──────────

export const SEAL_KEY_RULES_AUDIT = 'seal-key.rules';
const ruleValues = (r: SealKeyRules): SealKeyRuleValues => ({ authority: r.authority, approvers: r.approvers, legislatureResolution: r.legislatureResolution, reviewWithinDays: r.reviewWithinDays });
const slotLabel = (k: AuthorityKey) => AUTHORITIES.find(a => a.key === k)?.label ?? k;
export const describeSealKeyRules = (v: SealKeyRuleValues) => `approved by ${v.approvers} officials who can sign at the ${slotLabel(v.authority)}${v.legislatureResolution ? ' · each key also needs an enacted instrument of the legislature' : ''} · compromise reviewed within ${v.reviewWithinDays} d`;
const checkRules = (v: SealKeyRuleValues): string | null => {
  if (!isAuthorityKey(v.authority)) return 'The approving authority is a slot of Who is responsible';
  if (!Number.isInteger(v.approvers) || v.approvers < PLATFORM_MIN_APPROVERS || v.approvers > 9) return `Approvals: a whole number from ${PLATFORM_MIN_APPROVERS} (the platform's minimum) to 9`;
  if (typeof v.legislatureResolution !== 'boolean') return 'Legislature resolution is true or false';
  if (!Number.isInteger(v.reviewWithinDays) || v.reviewWithinDays < 1 || v.reviewWithinDays > 365) return 'Review within a whole number of days from 1 to 365';
  return null;
};

/** An administrator proposes the country's seal-key rules, citing the law that names the approving authority; values left out keep their setting. */
export function proposeSealKeyRules(input: { authority?: unknown; approvers?: unknown; legislatureResolution?: unknown; reviewWithinDays?: unknown; legalBasis?: unknown }, actor: SealActor, now = new Date()) {
  const why = actorRefusal(actor, s => sealKeyRulesRefusal(s, sealKeyAuthority(), 'propose'));
  if (why) return { error: why };
  const r = db().rules;
  const change: Partial<SealKeyRuleValues> = {
    ...(input.authority !== undefined ? { authority: input.authority as AuthorityKey } : {}),
    ...(input.approvers !== undefined ? { approvers: Number(input.approvers) } : {}),
    ...(input.legislatureResolution !== undefined ? { legislatureResolution: input.legislatureResolution === true } : {}),
    ...(input.reviewWithinDays !== undefined ? { reviewWithinDays: Number(input.reviewWithinDays) } : {}),
  };
  return proposePolicy(r.changes ??= {}, ruleValues(r), change, input.legalBasis, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: SEAL_KEY_RULES_AUDIT, context: 'Approval of the state\'s seal keys', check: checkRules, describe: describeSealKeyRules });
}

/** A different official confirms: the rules apply to approvals made from now. */
export function confirmSealKeyRules(actor: SealActor, now = new Date()) {
  const why = actorRefusal(actor, s => sealKeyRulesRefusal(s, sealKeyAuthority(), 'confirm'));
  if (why) return { error: why };
  const r = db().rules;
  return confirmPolicy(r.changes ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: SEAL_KEY_RULES_AUDIT, describe: describeSealKeyRules,
    adopt: (v: PolicyVersion<SealKeyRuleValues>) => Object.assign(r, v.values, { adopted: true, by: v.by, at: v.confirmed!.at, confirmedBy: v.confirmed!.by, citations: v.basis }),
  });
}
export function withdrawSealKeyRules(actor: SealActor, reason?: string) {
  const why = actorRefusal(actor, s => sealKeyRulesRefusal(s, sealKeyAuthority(), 'propose'));
  if (why) return { error: why };
  return withdrawPolicy(db().rules.changes ??= {}, { by: actor.by, ...(reason ? { reason } : {}), audit: SEAL_KEY_RULES_AUDIT });
}
export const lapseSealKeyRules = (now = new Date()) => lapsePolicy(db().rules.changes ??= {}, now, SEAL_KEY_RULES_AUDIT);

// ── The public trust list ────────────────────────────────────────────

export interface TrustListEntry {
  purpose: SealPurpose; keyId: string; fingerprint: string; publicKeyPem: string;
  status: SealKeyStatus; validFrom: string | null; validUntil: string | null;
  compromisedFrom: string | null; compromiseReported: boolean;
  historic: boolean; sample: boolean;
  approvedAt: string | null; legalBasis: { instrument: string; eId: string; version: string; title?: string; num?: string }[];
}

/** Every key ever recorded except withdrawn proposals: fingerprint, purpose, status and validity (no names of officials). */
export function trustList(now = new Date()): { format: 'civicos.trust-list'; version: 1; generatedAt: string; since: Partial<Record<SealPurpose, string>>; keys: TrustListEntry[] } {
  const d = db();
  return {
    format: 'civicos.trust-list', version: 1, generatedAt: now.toISOString(), since: { ...d.since },
    keys: d.keys.filter(k => k.status !== 'withdrawn').map(k => ({
      purpose: k.purpose, keyId: k.keyId, fingerprint: k.fingerprint, publicKeyPem: k.publicKeyPem, status: k.status,
      validFrom: k.validFrom ?? null, validUntil: k.validUntil ?? null,
      compromisedFrom: compromiseConfirmed(k) ? k.compromise!.compromisedFrom : null, compromiseReported: compromiseOpen(k),
      historic: !!k.historic, sample: !!k.sample, approvedAt: k.approvedAt ?? null,
      legalBasis: k.basis.map(c => ({ instrument: c.instrument, eId: c.eId, version: c.version, ...(c.title ? { title: c.title } : {}), ...(c.num ? { num: c.num } : {}) })),
    })),
  };
}
