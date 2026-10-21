// Decision records (docs/GOVERNMENT_OPERATING_MODEL.md §7.2, directions 9.1,
// 9.3): every legal decision (register a birth, grant a licence, refuse a
// visa) becomes a canonical record (the case or register record, the
// procedure version, the decision, its reasons, the laws cited with their
// exact versions and digests, the officials, the time) and its SHA-256,
// signed with the installation's decision key (key custody, purpose
// `decision`, Ed25519; CIVICOS_DECISION_KEY or the key provider). The key is
// the institution's seal; the officials are named inside what it signs. A
// signature proves who sealed what; the audit chain records that it
// happened: both are kept. Under the national signature framework a
// qualified signature service adds its own signature later (integration
// register). Held in platform state; nothing here is ever changed, a
// correction is a new decision that supersedes.
//
// Each decision records the constitutional profile version in force when it
// was made (`profile`: id, version, digest; plan phase 5, guidance §7), inside
// what the seal covers; absent while the nation has approved none, and on
// decisions sealed before (which verify as they always did).
//
// The key that seals must be in the seal key register (lib/keys/seal-register.ts):
// in a production installation a key not approved there seals nothing, and a
// check reports whether the register trusted the key when the seal was made
// (`seal.at`, the time the platform sealed it; decisions sealed before carry
// only `content.at`). Old decisions verify forever: replacing the key never
// invalidates them, and only a confirmed compromise flags those sealed after it.

import { createHash } from 'node:crypto';
import { canonicalJson } from '@/lib/data/store/shared';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { signer, type Signature } from '@/lib/keys/custody';
import { verifyBytes } from '@/lib/crypto/signing-key';
import type { Citation } from '@/lib/law/register';
import { installationMode } from '@/lib/ops/mode';
import { profileRef, type ProfileRef } from '@/lib/constitution/profile-state';
import { sealKeyRefusal, sealStanding, registerSealHistory, type SealStanding } from '@/lib/keys/seal-register';

export interface DecisionContent {
  /** What was decided: the case (and its procedure version) or the register record. */
  subject: { kind: 'case' | 'register'; id: string; ref?: string; procedure?: { key: string; version: number } };
  institution: { id: string; name: string };
  decision: string;
  reasons: string;
  citations: Citation[];
  /** The officials: who decided, and who confirmed it where the procedure needs two. */
  officials: { role: 'decided' | 'confirmed'; name: string; id?: string }[];
  /** Facts the decision fixes (registration number, validity, conditions), as the procedure names them. */
  facts?: Record<string, string | number | boolean>;
  /** Where the authority came from when it was made: the exact approved authority-mapping version, or the deployment profile (lib/permits/decisions.ts). */
  authority?: import('@/lib/casework/engine').DecisionAuthority;
  /** The exact operational rule versions it calculated with (lib/law/rules.ts). */
  rules?: import('@/lib/casework/engine').RuleRef[];
  /** For a two-official decision: whether the two are known to be different people at the identity provider, or only different accounts. */
  independence?: 'identity-provider' | 'accounts-only' | 'unverified';
  /** The constitutional profile version in force when it was made (lib/constitution/profile-state.ts); filled by recordDecision(). */
  profile?: ProfileRef;
  at: string;
  supersedes?: string;
}

export interface SignedDecision {
  id: string;
  content: DecisionContent;
  /** SHA-256 of the canonical JSON of { id, content }. */
  sha256: string;
  seal: Signature & { framework: 'platform'; /** When the platform sealed it (absent on decisions sealed before the seal key register). */ at?: string };
  /** A qualified signature added under the nation's own framework, when connected. */
  qualified?: { service: string; signature: string; at: string };
  /** Set when a later decision supersedes this one. */
  supersededBy?: string;
}

interface DecisionDb { decisions: SignedDecision[] }
const g = globalThis as unknown as { __civicosDecisions?: DecisionDb };
const db = (): DecisionDb => touch('__civicosDecisions', g.__civicosDecisions ??= { decisions: [] });
export function resetDecisions(): void { g.__civicosDecisions = undefined; }

/** The bytes the seal covers. */
export const decisionMaterial = (id: string, content: DecisionContent): string => canonicalJson({ type: 'civicos.decision', v: 1, id, content });

/** Seal and keep a decision. */
export async function recordDecision(content: DecisionContent): Promise<SignedDecision | { error: string }> {
  if (!content.reasons?.trim()) return { error: 'A decision states its reasons' };
  if (!content.officials.some(o => o.role === 'decided')) return { error: 'A decision names the official who made it' };
  const prev = content.supersedes ? db().decisions.find(d => d.id === content.supersedes) : undefined;
  if (content.supersedes && !prev) return { error: 'The decision it supersedes does not exist' };
  if (prev?.supersededBy) return { error: 'That decision is already superseded' };
  const id = uuid7();
  if (!content.profile) { const ref = profileRef(new Date(content.at)); if (ref) content = { ...content, profile: ref }; }
  const material = decisionMaterial(id, content);
  const sha256 = createHash('sha256').update(material, 'utf8').digest('hex');
  const s = signer('decision');
  if (!s.production && installationMode() === 'production') return { error: 'Decisions are sealed with the installation\'s decision key: set CIVICOS_DECISION_KEY (or the key provider) first' };
  let seal: Signature;
  try { seal = await s.sign(material); } catch (e) { return { error: `The decision could not be sealed: ${(e as Error).message}` }; }
  // Only a key the seal key register trusts keeps a seal (an approved key becomes active here; demo and training trust a new key as a sample).
  const untrusted = sealKeyRefusal('decision', seal.publicKeyPem);
  if (untrusted) return { error: untrusted };
  const d: SignedDecision = { id, content: structuredClone(content), sha256, seal: { ...seal, framework: 'platform', at: new Date().toISOString() } };
  db().decisions.push(d);
  if (prev) prev.supersededBy = id;
  const decided = content.officials.find(o => o.role === 'decided')!.name;
  recordAudit(decided, 'decision.seal', `Decision:${id}`, 'ok', `${content.decision} · ${content.subject.kind} ${content.subject.ref ?? content.subject.id} · ${sha256.slice(0, 12)} · key ${seal.keyId}`);
  return structuredClone(d);
}

/** When a decision was sealed: the platform's sealing time, else (sealed before it was kept) the decision's own time. */
export const sealedAt = (d: Pick<SignedDecision, 'content' | 'seal'>): string => d.seal.at ?? d.content.at;

/**
 * Check a decision: its hash, its seal, and that the seal key register
 * trusted the key when it sealed (a key outside its validity, not in the
 * register after the register started, or sealing after a confirmed
 * compromise is not trusted). A key not in the register that sealed before
 * the register started verifies as before (sealReport() says so).
 */
export function verifyDecision(d: Pick<SignedDecision, 'id' | 'content' | 'sha256' | 'seal'>): { ok: boolean; problem?: string } {
  const material = decisionMaterial(d.id, d.content);
  if (createHash('sha256').update(material, 'utf8').digest('hex') !== d.sha256) return { ok: false, problem: 'The record does not match its hash' };
  if (!verifyBytes(d.seal.publicKeyPem, material, d.seal.signature)) return { ok: false, problem: 'The seal does not verify' };
  const k = sealStanding('decision', d.seal.publicKeyPem, sealedAt(d));
  if (!k.trusted) return { ok: false, problem: k.note };
  return { ok: true };
}

/** The full check with what the register says about the seal's key (for /verify and the console). */
export function sealReport(d: Pick<SignedDecision, 'id' | 'content' | 'sha256' | 'seal'>): { ok: boolean; problem?: string; key: SealStanding; sealedAt: string } {
  return { ...verifyDecision(d), key: sealStanding('decision', d.seal.publicKeyPem, sealedAt(d)), sealedAt: sealedAt(d) };
}

export const getDecision = (id: string): SignedDecision | undefined => { const d = db().decisions.find(x => x.id === id); return d ? structuredClone(d) : undefined; };
export const decisionsFor = (kind: 'case' | 'register', id: string): SignedDecision[] =>
  db().decisions.filter(d => d.content.subject.kind === kind && d.content.subject.id === id).map(d => structuredClone(d));
/** Every sealed decision, oldest first (read only: a court's ruling flags the ones it touches, lib/transitions/events.ts). */
export const listDecisions = (): SignedDecision[] => db().decisions.map(d => structuredClone(d));

// What the decisions already sealed say about a key (the seal key register reads it when a key is proposed).
registerSealHistory((purpose, keyId) => {
  if (purpose !== 'decision') return { count: 0 };
  const times = db().decisions.filter(d => d.seal.keyId === keyId).map(d => sealedAt(d)).sort();
  return { count: times.length, ...(times.length ? { first: times[0], last: times[times.length - 1] } : {}) };
});
