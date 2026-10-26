// Federation events emitted from the decisions that cause them (plan I9;
// specification Part 5 F; integration register 24.17): a sealed case decision
// publishes an envelope of references only (the case, the sealed decision, the
// law version it cites, the relationship) for each event type an approved
// exchange relationship in force covers, and none otherwise; the receiving
// institution collects it from its feed and accepts it under the same
// relationship; nothing about a person goes in; a decision that cites no law
// emits nothing and says so; a sample case's envelope never reaches the feed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry } from '@/lib/data/store/ministries';
import { listAudit } from '@/lib/data/store';
import { proposeRelationship, confirmRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { openCase, act, resetCases, registeredEffects } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { resetDecisions } from '@/lib/records/decisions';
import { institutionPublicKey, resetInstitutionKeys, INSTITUTION_KEYS_ENV } from './keys';
import { proposePeerKey, confirmPeerKey, listPublished, feedFor, receiveEnvelope, resetFederationEvents } from './events';
import { eventTypesOf } from './emit';
import '@/lib/casework/modules';
type Actor = import('@/lib/casework/engine').Actor;

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const A = { by: 'Admin A', byId: 'local:a' }, B = { by: 'Admin B', byId: 'local:b', role: 'administrator' };
let licensing = '', customs = '', lawId = '';

/** A small procedure of the licensing institution whose decision is sealed by two officials. */
function procedure(key: string) {
  ok(draftPackage({ key, version: 1, owner: licensing, title: 'Trade licence', refPrefix: 'TRL', citations: [], fields: [{ key: 'trader', label: 'Trader number', type: 'text', personalDataClass: 'administrative' }], documents: [],
    stages: [{ key: 'open', label: 'Open' }, { key: 'granted', label: 'Granted', terminal: true }],
    actions: [{ key: 'grant', label: 'Grant', from: ['open'], to: 'granted', decision: 'grant', needs: { role: 'signatory' }, requires: { reasons: true } }],
    deadlines: [], notifications: [], retention: 'trade-licences', sensitivity: 'normal', tests: [{ name: 'granted', steps: [{ action: 'grant', expect: 'granted' }] }] }, 'Author', 'author', registeredEffects()));
  ok(approvePackage(key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
}
const signer = (id: string): Actor => ({ id, name: `Official ${id}`, scope: { id, role: 'signatory', institution: licensing } });
async function decide(key: string, cite = true, source: 'entered' | 'sample' = 'entered') {
  const c = ok(openCase({ procedure: key, fields: { trader: 'ORG-2026-000014' }, source }, signer('o1')));
  const r = ok(await act(c.id, { action: 'grant', reason: 'Conditions met by Mr Example', ...(cite ? { citations: [{ instrument: lawId, eId: 'sec_9' }] } : {}) }, signer('s1')));
  return { c, d: r.decision! };
}
const relate = (types: string[]) => {
  const { relationship } = ok(proposeRelationship({ from: customs, to: licensing, type: 'exchange', scope: { recordTypes: types.map(t => `event:${t}`), purposes: ['Import controls'] }, legalBasis: [{ instrument: lawId, eId: 'sec_9' }] }, A));
  return ok(confirmRelationship(relationship.id, B, () => false)).relationship;
};

describe('events emitted from decisions', () => {
  beforeEach(() => {
    resetLaw(); resetRelationships(); resetFederationEvents(); resetInstitutionKeys(); resetCases(); resetPackages(); resetDecisions();
    const law = recordLaw({ instrument: { title: 'Trade Licensing Act', type: 'act', jurisdiction: 'x', year: 2021, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2021-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'The licensing authority informs customs of licences issued.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    licensing = mk('Licensing Authority'); customs = mk('Customs Authority');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('publishes nothing while no relationship covers the event type', async () => {
    procedure('trl.a');
    await decide('trl.a');
    expect(listPublished(licensing)).toEqual([]);
    // A relationship for permit.issued only: a decision under no permit mapping causes case.status.changed alone.
    relate(['permit.issued']);
    const { d } = await decide('trl.a');
    expect(eventTypesOf(d)).toEqual(['case.status.changed']);
    expect(listPublished(licensing)).toEqual([]);
  });

  it('publishes an envelope of references for each covered type, which the other institution collects and accepts', async () => {
    procedure('trl.b');
    const rel = relate(['case.status.changed']);
    const { c, d } = await decide('trl.b');
    const [p] = listPublished(licensing);
    expect(p!.envelope).toMatchObject({
      event_type: 'case.status.changed', source_institution_id: licensing, aggregate_reference: `Case:${c.ref}`, payload_reference: `Decision:${d.id}`, correlation_id: c.id,
      legal_context: { instrument_reference: lawId, version_reference: d.content.citations[0]!.version, relationship_reference: `${rel.id} v${rel.version}` },
    });
    expect(p!.by).toBe('Official s1');
    // References only: neither the reasons nor anyone's name.
    expect(JSON.stringify(p!.envelope)).not.toMatch(/Mr Example|Official s1|ORG-2026-000014/);
    // The other institution collects it from its feed and accepts it under the same relationship once it trusts the key.
    const feed = feedFor(customs);
    expect(feed.envelopes.map(e => e.event_id)).toEqual([p!.envelope.event_id]);
    ok(confirmPeerKey(ok(proposePeerKey({ institution: licensing, publicKeyPem: institutionPublicKey(licensing)!.publicKeyPem }, A)).id, B));
    expect(ok(receiveEnvelope(feed.envelopes[0], customs)).record).toMatchObject({ state: 'accepted', applied: false, relationship: `${rel.id} v${rel.version}` });
  });

  it('emits nothing for a decision that cites no law, and keeps a sample case\'s envelope out of the feed', async () => {
    procedure('trl.c');
    relate(['case.status.changed']);
    const { d } = await decide('trl.c', false);
    expect(listPublished(licensing)).toEqual([]);
    expect(listAudit().find(e => e.action === 'federation.event.emit')).toMatchObject({ outcome: 'denied', resource: `Decision:${d.id}`, detail: expect.stringMatching(/cites no confirmed law version/) });
    await decide('trl.c', true, 'sample');
    expect(listPublished(licensing)).toEqual([expect.objectContaining({ sample: true })]);
    expect(feedFor(customs).envelopes).toEqual([]);
  });

  it('never stops the decision when the envelope cannot be signed', async () => {
    procedure('trl.d');
    relate(['case.status.changed']);
    // The institution's key file is not an Ed25519 key: the decision stands, the envelope is refused and recorded.
    const dir = mkdtempSync(path.join(os.tmpdir(), 'inst-keys-'));
    writeFileSync(path.join(dir, `${licensing}.pem`), generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
    vi.stubEnv(INSTITUTION_KEYS_ENV, dir);
    resetInstitutionKeys();
    const c = ok(openCase({ procedure: 'trl.d', fields: { trader: 'ORG-1' } }, signer('o1')));
    const r = ok(await act(c.id, { action: 'grant', reason: 'Met', citations: [{ instrument: lawId, eId: 'sec_9' }] }, signer('s1')));
    expect(r.case.stage).toBe('granted');
    expect(r.decision).toBeDefined();
    expect(listPublished(licensing)).toEqual([]);
    expect(listAudit().find(e => e.action === 'federation.event.emit')).toMatchObject({ outcome: 'failed', detail: expect.stringMatching(/not an Ed25519 private key/) });
    rmSync(dir, { recursive: true, force: true });
  });
});
