// POST /api/federation/inbound (plan I9): another institution's installation
// sends an envelope with its integration key; the answer carries the record
// (accepted, rejected or pending) and a signed receipt; a retry is recognised.
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry } from '@/lib/data/store/ministries';
import { registerIntegration } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { proposeRelationship, confirmRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { buildEnvelope } from '@/lib/federation/envelope';
import { institutionPublicKey, resetInstitutionKeys } from '@/lib/federation/keys';
import { proposePeerKey, confirmPeerKey, resetFederationEvents } from '@/lib/federation/events';
import { RECEIPT_HEADER, verifyReceipt } from '@/lib/exchange/log';
import { POST } from './route';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mk = (name: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` }); if ('error' in m) throw new Error(m.error); return m.id; };
const post = (body: unknown, key?: string) => new NextRequest('http://x/api/federation/inbound', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) } });

describe('POST /api/federation/inbound', () => {
  beforeEach(() => { resetLaw(); resetRelationships(); resetFederationEvents(); resetInstitutionKeys(); });

  it('needs the source installation\'s integration key; records, receipts and recognises a retry', async () => {
    const law = recordLaw({ instrument: { title: 'Licensing Act', type: 'act', jurisdiction: 'x', year: 2022, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2022-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'Notices.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    const source = mk('Licensing Authority'), recipient = mk('Customs Authority');
    const reg = registerIntegration({ kind: 'integration', name: `Licensing installation ${Date.now()}`, ownerOrg: 'Licensing Authority', contact: 'ops@example.gov', scopes: ['events:inbound'] });
    if ('error' in reg) throw new Error(reg.error);
    ok(approveIntegration(reg.id, { scopes: ['events:inbound'], institution: source }));
    ok(confirmPeerKey(ok(proposePeerKey({ institution: source, publicKeyPem: institutionPublicKey(source)!.publicKeyPem }, { by: 'A', byId: 'local:a' })).id, { by: 'B', byId: 'local:b' }));
    const { relationship } = ok(proposeRelationship({ from: recipient, to: source, type: 'exchange', scope: { recordTypes: ['event:permit.issued'], purposes: ['Import controls'] }, legalBasis: [{ instrument: law.instrument.id, eId: 'sec_1' }] }, { by: 'A', byId: 'local:a' }));
    ok(confirmRelationship(relationship.id, { by: 'B', byId: 'local:b', role: 'administrator' }, () => false));
    const { envelope } = ok(await buildEnvelope({ type: 'permit.issued', source, aggregate: 'Permit:P-1', legal: { instrument_reference: law.instrument.id, version_reference: law.version.id } }));

    expect((await POST(post({ recipient, envelope }))).status).toBe(401);
    const r = await POST(post({ recipient, envelope }, reg.apiKey));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.record).toMatchObject({ state: 'accepted', duplicate: false });
    const receipt = JSON.parse(Buffer.from(r.headers.get(RECEIPT_HEADER)!, 'base64').toString('utf8'));
    expect(verifyReceipt(receipt)).toBe(true);
    const again = await (await POST(post({ recipient, envelope }, reg.apiKey))).json();
    expect(again.record).toMatchObject({ id: j.record.id, duplicate: true });
  });
});
