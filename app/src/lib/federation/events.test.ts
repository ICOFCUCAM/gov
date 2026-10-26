// Federation events (plan I9; specification Part 5 E and F; acceptance P5-04,
// P5-05): the envelope (schema version, source institution, legal context,
// a signature by the institution's own key through key custody, references
// only), the receiver (sender, schema and signature, authority under the
// relationship register, duplicates, accepted / rejected / pending kept, never
// applied to a register), and trusted keys approved by two officials.
// Mechanism tests: institutions, laws and relationships are illustrative.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry } from '@/lib/data/store/ministries';
import { listAudit, registerIntegration } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { proposeRelationship, confirmRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { buildEnvelope, envelopeProblems, envelopeSignatureValid, signedBytes, type EventEnvelope } from './envelope';
import { institutionPublicKey, resetInstitutionKeys, INSTITUTION_KEYS_ENV } from './keys';
import {
  proposePeerKey, confirmPeerKey, revokePeerKey, publishEvent, receiveEnvelope, decidePending, listInbound, feedFor, resetFederationEvents,
} from './events';

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === "object" && "error" in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const A = { by: 'Admin A', byId: 'local:a' };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' };
let licensing: string, customs: string, legal: { instrument_reference: string; version_reference: string }, basis: { instrument: string; eId: string }[];

beforeEach(() => {
  resetLaw(); resetRelationships(); resetFederationEvents(); resetInstitutionKeys();
  const law = recordLaw({ instrument: { title: 'Trade Licensing Act', type: 'act', jurisdiction: 'x', year: 2021, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2021-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'The licensing authority informs customs of licences issued.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  legal = { instrument_reference: law.instrument.id, version_reference: law.version.id };
  basis = [{ instrument: law.instrument.id, eId: 'sec_9' }];
  licensing = mk('Licensing Authority'); customs = mk('Customs Authority');
});
afterEach(() => { vi.unstubAllEnvs(); resetInstitutionKeys(); });

const issued = (aggregate = 'Permit:P-77') => ({ type: 'permit.issued', source: licensing, aggregate, legal, payloadReference: 'service:organisation.standing' });
const trustLicensing = () => { const p = ok(proposePeerKey({ institution: licensing, publicKeyPem: institutionPublicKey(licensing)!.publicKeyPem }, A)); return ok(confirmPeerKey(p.id, B)); };
const relate = (extra: Record<string, unknown> = {}) => {
  const { relationship } = ok(proposeRelationship({ from: customs, to: licensing, type: 'exchange', scope: { recordTypes: ['event:permit.issued'], purposes: ['Import controls'] }, legalBasis: basis, ...extra }, A));
  return ok(confirmRelationship(relationship.id, B, () => false)).relationship;
};

describe('the federation event envelope', () => {
  it('carries schema version, source institution and legal context, signed by the institution\'s own key; references only, no free text', async () => {
    const { envelope: e } = ok(await buildEnvelope(issued()));
    expect(e).toMatchObject({ event_type: 'permit.issued', schema_version: '1.0', source_institution_id: licensing, aggregate_reference: 'Permit:P-77', legal_context: legal, integrity: { alg: 'ed25519' } });
    expect(Object.keys(e).sort()).toEqual(['aggregate_reference', 'event_id', 'event_type', 'integrity', 'legal_context', 'occurred_at', 'payload_reference', 'published_at', 'schema_version', 'source_institution_id']);
    expect(envelopeSignatureValid(e, institutionPublicKey(licensing)!.publicKeyPem)).toBe(true);
    expect(envelopeSignatureValid({ ...e, aggregate_reference: 'Permit:P-78' }, institutionPublicKey(licensing)!.publicKeyPem)).toBe(false);
    // A name or a sentence is not a reference; unknown fields and versions are refused.
    expect(await buildEnvelope(issued('Issued to Kofi Mensah'))).toMatchObject({ error: expect.stringMatching(/aggregate_reference is a reference/) });
    expect(envelopeProblems({ ...e, actor: 'Registrar' })).toEqual([expect.stringMatching(/Unknown field actor/)]);
    expect(envelopeProblems({ ...e, schema_version: '2.0' })).toEqual([expect.stringMatching(/schema_version 2.0 is not supported/)]);
    expect(envelopeProblems({ ...e, event_type: 'permit.gossip' })[0]).toMatch(/event_type is one of/);
    expect(signedBytes(e)).not.toContain('integrity');
  });

  it('a production installation refuses a development key; an institution\'s own key file signs, and its first use is audited', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await buildEnvelope(issued())).toMatchObject({ error: expect.stringMatching(/no signing key for .*development key generated for this process signs nothing/) });
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-inst-keys-'));
    try {
      writeFileSync(path.join(dir, `${licensing}.pem`), generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
      vi.stubEnv(INSTITUTION_KEYS_ENV, dir);
      resetInstitutionKeys();
      const built = ok(await buildEnvelope(issued()));
      expect(built).toMatchObject({ production: true, keySource: 'file' });
      expect(listAudit()[0]).toMatchObject({ action: 'federation.key.register', resource: `InstitutionKey:${licensing}/${built.envelope.integrity.key_id}` });
      expect(listAudit()[0]!.detail).not.toMatch(/PRIVATE|BEGIN/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('the federation receiver', () => {
  it('trusts another institution\'s key only once a different official confirms it', () => {
    const p = ok(proposePeerKey({ institution: licensing, publicKeyPem: institutionPublicKey(licensing)!.publicKeyPem }, A));
    expect(confirmPeerKey(p.id, { by: 'Admin A', byId: 'local:a' })).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(ok(confirmPeerKey(p.id, B)).state).toBe('approved');
    expect(proposePeerKey({ institution: 'Licensing Authority', publicKeyPem: 'x' }, A)).toMatchObject({ error: expect.stringMatching(/stable id/) });
  });

  it('accepts a signed envelope under a relationship; a retry is recognised, never a second record; a changed envelope under the same id is rejected (P5-04)', async () => {
    trustLicensing(); const rel = relate();
    const { envelope: e } = ok(await publishEvent(issued(), { by: 'Licensing officer', institution: licensing }));
    const first = ok(receiveEnvelope(e, customs));
    expect(first).toMatchObject({ duplicate: false, record: { state: 'accepted', relationship: `${rel.id} v1`, applied: false, source: licensing, eventId: e.event_id } });
    const again = ok(receiveEnvelope(structuredClone(e), customs));
    expect(again).toMatchObject({ duplicate: true, record: { id: first.record.id, duplicates: 1 } });
    expect(listInbound(customs)).toHaveLength(1);
    const changed = ok(receiveEnvelope({ ...e, aggregate_reference: 'Permit:P-99' }, customs));
    expect(changed.record).toMatchObject({ state: 'rejected', reasons: [expect.stringMatching(/received before with different content/)] });
    expect(listInbound(customs).filter(r => r.state === 'accepted')).toHaveLength(1);
  });

  it('rejects an unknown or revoked key, a bad signature and a credential that is not the source\'s; keeps every record', async () => {
    relate();
    const { envelope: e } = ok(await buildEnvelope(issued()));
    expect(ok(receiveEnvelope(e, customs)).record).toMatchObject({ state: 'rejected', reasons: [expect.stringMatching(/No trusted key/)] });
    const peer = trustLicensing();
    const { envelope: forged } = ok(await buildEnvelope(issued('Permit:P-1')));
    const tampered: EventEnvelope = { ...forged, integrity: { ...forged.integrity, signature: e.integrity.signature } };
    expect(ok(receiveEnvelope(tampered, customs)).record).toMatchObject({ state: 'rejected', reasons: [expect.stringMatching(/signature does not verify/)] });
    // Through an integration that acts for another institution.
    const reg = registerIntegration({ kind: 'integration', name: `Other installation ${Date.now()}`, ownerOrg: 'x', contact: 'ops@example.gov', scopes: ['events:inbound'] });
    if ('error' in reg) throw new Error(reg.error);
    ok(approveIntegration(reg.id, { institution: customs }));
    const { envelope: e2 } = ok(await buildEnvelope(issued('Permit:P-2')));
    expect(ok(receiveEnvelope(e2, customs, { via: reg.id })).record.reasons[0]).toMatch(/acts for .*not for the source/);
    // Revoked by one official, at once.
    ok(revokePeerKey(peer.id, 'Key reported compromised', A));
    const { envelope: e3 } = ok(await buildEnvelope(issued('Permit:P-3')));
    expect(ok(receiveEnvelope(e3, customs)).record).toMatchObject({ state: 'rejected', reasons: [expect.stringMatching(/revoked key is no longer trusted/)] });
    expect(listInbound(customs).length).toBe(4);
    expect(listInbound(customs).every(r => r.applied === false)).toBe(true);
  });

  it('holds an envelope pending when authority cannot be established here; an official accepts it only under a relationship in force', async () => {
    trustLicensing();
    const { envelope: e } = ok(await buildEnvelope(issued()));
    const r = ok(receiveEnvelope(e, customs)).record;
    expect(r).toMatchObject({ state: 'pending', reasons: [expect.stringMatching(/No relationship is recorded/)] });
    expect(decidePending(r.id, { outcome: 'accept', reason: 'Expected licence notice' }, { by: 'Customs signatory', institution: customs, role: 'signatory' })).toMatchObject({ error: expect.stringMatching(/approved relationship in force/) });
    expect(decidePending(r.id, { outcome: 'accept', reason: 'x' }, { by: 'Licensing signatory', institution: licensing, role: 'signatory' })).toMatchObject({ error: expect.stringMatching(/which received it/) });
    relate();
    expect(ok(decidePending(r.id, { outcome: 'accept', reason: 'Relationship now recorded' }, { by: 'Customs signatory', institution: customs, role: 'signatory' }))).toMatchObject({ state: 'accepted', decided: { by: 'Customs signatory' } });
    // A law version this installation does not hold: pending, never assumed valid.
    const { envelope: e2 } = ok(await buildEnvelope({ ...issued('Permit:P-5'), legal: { instrument_reference: '/eli/y/act/1999/1', version_reference: 'v-unknown' } }));
    expect(ok(receiveEnvelope(e2, customs)).record).toMatchObject({ state: 'pending', reasons: [expect.stringMatching(/not confirmed in this installation's laws register/)] });
  });

  it('a suspended relationship stops the next envelope; the feed carries envelopes only of the types a relationship covers', async () => {
    trustLicensing(); const rel = relate();
    const { envelope: e } = ok(await publishEvent(issued(), { by: 'Registrar Amina Okafor', institution: licensing }));
    ok(await publishEvent({ ...issued('Permit:P-8'), type: 'permit.revoked' }, { by: 'Registrar Amina Okafor', institution: licensing }));
    const feed = feedFor(customs);
    expect(feed.envelopes.map(x => x.event_type)).toEqual(['permit.issued']);
    expect(JSON.stringify(feed)).not.toMatch(/Amina|Okafor|Registrar/);
    expect(feedFor(licensing).envelopes).toEqual([]);
    expect(ok(receiveEnvelope(e, customs)).record.state).toBe('accepted');
    ok(proposeRelationship({ id: rel.id, status: 'suspended', legalBasis: basis }, A));
    ok(confirmRelationship(rel.id, B, () => false));
    const { envelope: next } = ok(await buildEnvelope(issued('Permit:P-9')));
    expect(ok(receiveEnvelope(next, customs)).record).toMatchObject({ state: 'rejected', reasons: [expect.stringMatching(/no longer lets .* \(suspended\)/)] });
    expect(feedFor(customs).envelopes).toEqual([]);
    // The earlier acceptance is kept.
    expect(listInbound(customs).find(x => x.eventId === e.event_id)?.state).toBe('accepted');
    // An official publishes only for their own institution.
    expect(await publishEvent(issued(), { by: 'Customs officer', institution: customs })).toMatchObject({ error: expect.stringMatching(/its own records/) });
  });
});
