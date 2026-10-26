// Federation events between institutions (plan I9; specification Part 5 E
// "Federation rules" and F "Reliable delivery"): what this installation
// publishes for other institutions, whose keys it trusts, and what it does
// with what it receives.
//
// Published (the federation outbox): an official of the source institution
// publishes an envelope about its own record (lib/federation/envelope.ts),
// signed with its own key; another institution's installation collects it
// (GET /api/exchange/events/feed, its integration key) only while an approved
// `exchange` relationship lets its institution receive that event type from
// the source (`event:<type>` in the relationship's scope). Envelopes carry
// references only: no actor name, no free text.
//
// Trusted keys (peers): the public key another installation's institution
// signs with is proposed by one administrator and confirmed by a different
// official (dualControlRefusal()); revoking one is a single official's act
// (it only takes trust away), audited, and stops the next envelope at once.
// A newer approved key retires the earlier one, which still verifies what it
// signed. The institution is identified by its stable id in the register,
// the same in every installation (a federation keeps identifiers).
//
// Received (the receiver, in the order Part 5 F lists): (1) the sender's
// credential, when it came through an integration, must be the source
// institution's; (2) the envelope's structure and schema version, then its
// signature by a trusted key of the source; (3) the receiving institution's
// authority: an approved `exchange` relationship in force from it to the
// source covering the event type; (4) duplicates by event id: the same
// envelope again is the same record (counted, nothing new), a different
// envelope under a used id is rejected; (5) every envelope is recorded as
// accepted, rejected or pending, with reasons; (6) nothing is applied to a
// register or case: the receiving institution acts in its own procedures;
// (7) source, event id and correlation id are kept for reconciliation.
// Pending means a check could not be made here (no relationship recorded
// yet, or the law version cited is not in this installation's laws
// register); an official of the receiving institution who can sign decides
// it with reasons, accepting only while a relationship is in force.

import { createHash, randomUUID } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { getMinistry } from '@/lib/data/store/ministries';
import { getInstrument } from '@/lib/law/register';
import { relationshipGrants, relationshipsCovering } from '@/lib/data/store/relationships';
import { integrationInstitution } from '@/lib/data/store/federation';
import { dualControlRefusal, independenceOf, dualControlPendingHours } from '@/lib/data/dual-control';
import { keyIdOfPem } from '@/lib/crypto/signing-key';
import { buildEnvelope, envelopeProblems, envelopeSignatureValid, canonical, type EnvelopeInput, type EventEnvelope } from './envelope';

export interface PeerKey {
  id: string;
  institution: string;
  keyId: string;
  publicKeyPem: string;
  /** Where that installation publishes (its feed), for officials; never fetched by the platform on its own. */
  endpoint?: string;
  note?: string;
  state: 'proposed' | 'approved' | 'retired' | 'revoked' | 'withdrawn' | 'lapsed';
  proposed: { by: string; byId?: string; at: string };
  confirmed?: { by: string; byId?: string; at: string; independence: ReturnType<typeof independenceOf> };
  retiredAt?: string;
  revoked?: { by: string; at: string; reason: string };
}

export interface PublishedEvent { envelope: EventEnvelope; by: string; at: string; keySource: string; production: boolean; sample?: boolean }

export type InboundState = 'accepted' | 'rejected' | 'pending';
export interface InboundRecord {
  id: string;
  eventId: string;
  digest: string;
  type: string;
  source: string;
  recipient: string;
  aggregate: string;
  correlationId?: string;
  receivedAt: string;
  state: InboundState;
  reasons: string[];
  relationship?: string;
  keyId?: string;
  /** Through which credential it came (an integration id), when it did. */
  via?: string;
  /** Retries of the same envelope, recognised and not recorded again. */
  duplicates: number;
  /** Nothing is ever applied automatically: the receiving institution acts in its own procedures. */
  applied: false;
  decided?: { outcome: 'accepted' | 'rejected'; by: string; byId?: string; at: string; reason: string };
  /** The envelope as received (references only, by construction). */
  envelope?: EventEnvelope;
}

interface Db { peers: PeerKey[]; published: PublishedEvent[]; inbound: InboundRecord[] }
const g = globalThis as unknown as { __civicosFederationEvents?: Db };
const db = (): Db => { const d = touch('__civicosFederationEvents', g.__civicosFederationEvents ??= { peers: [], published: [], inbound: [] }); d.peers ??= []; d.published ??= []; d.inbound ??= []; return d; };
export function resetFederationEvents(): void { g.__civicosFederationEvents = undefined; }
const MAX = 5000;
const fail = (error: string) => ({ error });
const nameOf = (id: string) => getMinistry(id)?.name ?? id;
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
export interface FedActor { by: string; byId?: string; institution?: string; role?: string }

// ── Trusted keys of other installations' institutions ────────────────────────

function lapsePeers(now: Date): void {
  for (const p of db().peers) if (p.state === 'proposed' && now.getTime() - Date.parse(p.proposed.at) > dualControlPendingHours() * 3_600_000) {
    p.state = 'lapsed';
    recordAudit('System (dual control)', 'federation.peer.lapse', `PeerKey:${p.id}`, 'ok', `${p.institution} ${p.keyId}: not confirmed in time`);
  }
}
export function listPeers(now = new Date()): PeerKey[] { lapsePeers(now); return db().peers.map(p => structuredClone(p)).reverse(); }

/** One administrator proposes trusting a key for an institution of the register (another installation's). */
export function proposePeerKey(input: { institution?: unknown; publicKeyPem?: unknown; endpoint?: unknown; note?: unknown }, actor: FedActor, now = new Date()): PeerKey | { error: string } {
  lapsePeers(now);
  const institution = typeof input.institution === 'string' ? input.institution.trim() : '';
  if (!getMinistry(institution)) return fail('Name the institution by its id in the register: a federation identifies institutions by their stable id, the same in every installation');
  const pem = typeof input.publicKeyPem === 'string' ? input.publicKeyPem.trim() : '';
  const keyId = pem ? keyIdOfPem(pem) : null;
  if (!keyId) return fail('Send the institution\'s public key as an Ed25519 SPKI PEM (-----BEGIN PUBLIC KEY-----)');
  if (db().peers.some(p => p.institution === institution && p.keyId === keyId && ['proposed', 'approved'].includes(p.state))) return fail('This key is already trusted or waiting for confirmation');
  const endpoint = typeof input.endpoint === 'string' && input.endpoint.trim() ? input.endpoint.trim().slice(0, 300) : undefined;
  if (endpoint && !/^https:\/\/[^\s]+$/.test(endpoint)) return fail('The endpoint is an https address');
  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 300) : undefined;
  const p: PeerKey = { id: `PK-${randomUUID().slice(0, 8)}`, institution, keyId, publicKeyPem: pem, ...(endpoint ? { endpoint } : {}), ...(note ? { note } : {}), state: 'proposed', proposed: { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString() } };
  db().peers.push(p);
  recordAudit(actor.by, 'federation.peer.propose', `PeerKey:${p.id}`, 'ok', `${nameOf(institution)} · ${keyId} · waiting for a different official`);
  return structuredClone(p);
}

/** A different official confirms: the key is trusted from now; an earlier approved key of the institution is retired (it still verifies what it signed). */
export function confirmPeerKey(id: string, actor: FedActor, now = new Date()): PeerKey | { error: string } {
  lapsePeers(now);
  const p = db().peers.find(x => x.id === id);
  if (!p || p.state !== 'proposed') return fail('No key with that number is waiting (a proposal lapses after the waiting period)');
  const same = dualControlRefusal(p.proposed, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (same) return fail(same);
  for (const o of db().peers) if (o.institution === p.institution && o.state === 'approved') { o.state = 'retired'; o.retiredAt = now.toISOString(); }
  p.state = 'approved';
  p.confirmed = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), independence: independenceOf(p.proposed.byId, actor.byId) };
  recordAudit(actor.by, 'federation.peer.approve', `PeerKey:${p.id}`, 'ok', `${nameOf(p.institution)} · ${p.keyId} · proposed by ${p.proposed.by}, confirmed by ${actor.by} (${p.confirmed.independence})`);
  return structuredClone(p);
}

/** Withdraw a waiting proposal, or revoke a trusted key (one official: it only takes trust away). */
export function revokePeerKey(id: string, reason: string, actor: FedActor, now = new Date()): PeerKey | { error: string } {
  const p = db().peers.find(x => x.id === id);
  if (!p) return fail('No such key');
  const why = reason.trim().slice(0, 300);
  if (!why) return fail('Say why the key is no longer trusted');
  if (p.state === 'proposed') { p.state = 'withdrawn'; recordAudit(actor.by, 'federation.peer.withdraw', `PeerKey:${p.id}`, 'ok', why); return structuredClone(p); }
  if (p.state !== 'approved' && p.state !== 'retired') return fail(`The key is ${p.state}`);
  p.state = 'revoked';
  p.revoked = { by: actor.by, at: now.toISOString(), reason: why };
  recordAudit(actor.by, 'federation.peer.revoke', `PeerKey:${p.id}`, 'ok', `${nameOf(p.institution)} · ${p.keyId} · ${why}`);
  return structuredClone(p);
}

/** A trusted key (approved, or retired for envelopes published before its successor) of an institution with this id. */
function trustedKey(institution: string, keyId: string, publishedAt: string): PeerKey | undefined {
  return db().peers.find(p => p.institution === institution && p.keyId === keyId && (p.state === 'approved' || (p.state === 'retired' && !!p.retiredAt && publishedAt <= p.retiredAt)));
}

// ── Publishing ───────────────────────────────────────────────────────────────

/** The law version an envelope cites, when this installation's laws register holds it confirmed. */
export function legalKnown(l: { instrument_reference: string; version_reference: string }): boolean {
  const i = getInstrument(l.instrument_reference);
  return !!i?.versions.some(v => v.id === l.version_reference && v.state === 'confirmed');
}

/** Publish an envelope about the source institution's own record, signed with its own key. Its officials only (the route checks). */
export async function publishEvent(input: EnvelopeInput, actor: FedActor, opts: { sample?: boolean } = {}, now = new Date()): Promise<PublishedEvent | { error: string }> {
  if (actor.institution && actor.institution !== input.source) return fail(`An institution publishes events about its own records: you act for ${nameOf(actor.institution)}`);
  if (!legalKnown(input.legal)) return fail('Cite a confirmed version from the laws register (instrument and version) as the event\'s legal context');
  const built = await buildEnvelope(input, now);
  if ('error' in built) return built;
  const rec: PublishedEvent = { envelope: built.envelope, by: actor.by, at: now.toISOString(), keySource: built.keySource, production: built.production, ...(opts.sample ? { sample: true } : {}) };
  const d = db();
  d.published.push(rec);
  if (d.published.length > MAX) d.published.splice(0, d.published.length - MAX);
  recordAudit(actor.by, 'federation.event.publish', `FederationEvent:${built.envelope.event_id}`, 'ok', `${built.envelope.event_type} · ${nameOf(input.source)} · ${built.envelope.aggregate_reference} · key ${built.envelope.integrity.key_id}`);
  return structuredClone(rec);
}

/** Envelopes published here (newest first), optionally one institution's. */
export const listPublished = (institution?: string, limit = 100): PublishedEvent[] =>
  db().published.filter(p => !institution || p.envelope.source_institution_id === institution).slice(-limit).reverse().map(p => structuredClone(p));

/**
 * What another institution collects (its installation, through an integration
 * linked to it): the envelopes of types an approved exchange relationship in
 * force lets it receive from each source, after a cursor (event ids are
 * unique; `after` is the published_at of the last one held). Envelopes only.
 */
export function feedFor(recipient: string, after?: string, now = new Date()): { envelopes: EventEnvelope[]; covered: { source: string; types: string[]; relationship: string }[] } {
  const grants = relationshipGrants(now).filter(g => g.type === 'exchange' && g.from === recipient);
  const covered = grants.map(g => ({ source: g.to, types: g.recordTypes.filter(t => t.startsWith('event:')).map(t => t.slice(6)), relationship: `${g.id} v${g.version}` })).filter(c => c.types.length);
  const envelopes = db().published.filter(p => (!after || p.envelope.published_at > after) && !p.sample
    && covered.some(c => c.source === p.envelope.source_institution_id && c.types.includes(p.envelope.event_type))).map(p => structuredClone(p.envelope));
  return { envelopes: envelopes.slice(0, 200), covered };
}

// ── Receiving ────────────────────────────────────────────────────────────────

function record(r: Omit<InboundRecord, 'id' | 'duplicates' | 'applied'>, actorName: string): InboundRecord {
  const rec: InboundRecord = { ...r, id: `FIN-${randomUUID().slice(0, 12)}`, duplicates: 0, applied: false };
  const d = db();
  d.inbound.push(rec);
  if (d.inbound.length > MAX) d.inbound.splice(0, d.inbound.length - MAX);
  recordAudit(actorName, `federation.event.${rec.state === 'accepted' ? 'accept' : rec.state === 'rejected' ? 'reject' : 'pending'}`, `FederationInbound:${rec.id}`, 'ok',
    `${rec.type || '?'} from ${rec.source || '?'} for ${rec.recipient} · event ${rec.eventId.slice(0, 60)}${rec.reasons.length ? ` · ${rec.reasons.join('; ').slice(0, 300)}` : ''}`);
  return structuredClone(rec);
}

/**
 * Receive one envelope for a registered institution of this installation.
 * `via` is the integration it came through (its credential), when it did.
 */
export function receiveEnvelope(raw: unknown, recipient: string, opts: { via?: string } = {}, now = new Date()): { record: InboundRecord; duplicate: boolean } | { error: string } {
  if (!getMinistry(recipient)) return fail('Name the receiving institution by its id in the register');
  const e = raw as EventEnvelope;
  const eventId = typeof e?.event_id === 'string' ? e.event_id.slice(0, 120) : '?';
  const source = typeof e?.source_institution_id === 'string' ? e.source_institution_id.slice(0, 120) : '';
  const base = { eventId, digest: sha(canonical(raw ?? null)), type: typeof e?.event_type === 'string' ? e.event_type.slice(0, 60) : '', source, recipient,
    aggregate: typeof e?.aggregate_reference === 'string' ? e.aggregate_reference.slice(0, 160) : '', receivedAt: now.toISOString(),
    ...(typeof e?.correlation_id === 'string' ? { correlationId: e.correlation_id.slice(0, 160) } : {}), ...(opts.via ? { via: opts.via } : {}) };
  const who = 'system (federation receiver)';
  // (2) Structure and schema version first: a malformed envelope is rejected and kept without its content.
  const problems = envelopeProblems(raw);
  if (problems.length) return { record: record({ ...base, state: 'rejected', reasons: problems.slice(0, 6) }, who), duplicate: false };
  // (4) Duplicates: the same envelope again is the same record; a different one under a used id is refused.
  const earlier = db().inbound.find(r => r.source === source && r.eventId === eventId && r.recipient === recipient && r.state !== 'rejected');
  if (earlier) {
    if (earlier.digest === base.digest) { earlier.duplicates++; return { record: structuredClone(earlier), duplicate: true }; }
    return { record: record({ ...base, state: 'rejected', reasons: [`Event id ${eventId} was received before with different content (record ${earlier.id}): a retry never changes an event`] }, who), duplicate: false };
  }
  // (1) The credential it came through is the source institution's.
  if (opts.via) {
    const inst = integrationInstitution(opts.via);
    if (inst !== source) return { record: record({ ...base, state: 'rejected', reasons: [`The credential it came with acts for ${inst ? nameOf(inst) : 'no institution'}, not for the source ${nameOf(source)}`] }, who), duplicate: false };
  }
  // (2) The signature, by a key this installation trusts for the source institution.
  const key = trustedKey(source, e.integrity.key_id, e.published_at);
  if (!key) return { record: record({ ...base, state: 'rejected', reasons: [`No trusted key ${e.integrity.key_id} for ${nameOf(source)}: two officials approve an institution's key first (a revoked key is no longer trusted)`] }, who), duplicate: false };
  if (!envelopeSignatureValid(e, key.publicKeyPem)) return { record: record({ ...base, state: 'rejected', keyId: key.keyId, reasons: ['The signature does not verify: the envelope was changed or not signed by that key'] }, who), duplicate: false };
  // (3) The receiving institution's authority to receive this event from the source.
  const subject = `event:${e.event_type}`;
  const grant = relationshipGrants(now).find(g => g.type === 'exchange' && g.from === recipient && g.to === source && g.recordTypes.includes(subject));
  const withKey = { ...base, keyId: key.keyId, envelope: structuredClone(e) };
  if (!grant) {
    const ever = relationshipsCovering(recipient, source, 'exchange', subject, now);
    if (ever.length) return { record: record({ ...withKey, state: 'rejected', reasons: [`Relationship ${ever[0]!.id} no longer lets ${nameOf(recipient)} receive ${e.event_type} from ${nameOf(source)} (${ever[0]!.status}): stopped; earlier records are kept`] }, who), duplicate: false };
    return { record: record({ ...withKey, state: 'pending', reasons: [`No relationship is recorded that lets ${nameOf(recipient)} receive ${e.event_type} from ${nameOf(source)}: it waits for an official of ${nameOf(recipient)} and is applied to nothing`] }, who), duplicate: false };
  }
  // The law version cited: known here, else pending (never a guess that it is valid).
  if (!legalKnown(e.legal_context)) return { record: record({ ...withKey, relationship: `${grant.id} v${grant.version}`, state: 'pending', reasons: [`The law version cited (${e.legal_context.instrument_reference} ${e.legal_context.version_reference}) is not confirmed in this installation's laws register: an official checks it`] }, who), duplicate: false };
  // (5)–(7) Accepted: recorded with its source and correlation; applied to nothing.
  return { record: record({ ...withKey, relationship: `${grant.id} v${grant.version}`, state: 'accepted', reasons: [] }, who), duplicate: false };
}

/** An official of the receiving institution who can sign decides a pending envelope, with reasons. */
export function decidePending(id: string, input: { outcome?: unknown; reason?: unknown }, actor: FedActor, now = new Date()): InboundRecord | { error: string } {
  const r = db().inbound.find(x => x.id === id);
  if (!r || r.state !== 'pending') return fail('No pending envelope with that number');
  if (actor.institution && actor.institution !== r.recipient) return fail(`Only ${nameOf(r.recipient)}, which received it, decides it`);
  if (actor.role && !['signatory', 'administrator'].includes(actor.role)) return fail('An official who can sign decides a pending envelope');
  const outcome = input.outcome === 'accept' ? 'accepted' : input.outcome === 'reject' ? 'rejected' : null;
  if (!outcome) return fail("outcome is 'accept' or 'reject'");
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : '';
  if (!reason) return fail('Give the reasons');
  if (outcome === 'accepted') {
    const grant = relationshipGrants(now).find(g => g.type === 'exchange' && g.from === r.recipient && g.to === r.source && g.recordTypes.includes(`event:${r.type}`));
    if (!grant) return fail(`Accepted only under an approved relationship in force that lets ${nameOf(r.recipient)} receive ${r.type} from ${nameOf(r.source)}`);
    r.relationship = `${grant.id} v${grant.version}`;
  }
  r.state = outcome;
  r.decided = { outcome, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), reason };
  recordAudit(actor.by, `federation.event.${outcome === 'accepted' ? 'accept' : 'reject'}`, `FederationInbound:${r.id}`, 'ok', `decided from pending: ${reason.slice(0, 300)}`);
  return structuredClone(r);
}

/** Received envelopes (newest first), optionally for one institution. */
export const listInbound = (recipient?: string, limit = 100): InboundRecord[] =>
  db().inbound.filter(r => !recipient || r.recipient === recipient).slice(-limit).reverse().map(r => structuredClone(r));
