import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import { resetExchangeLog, listExchanges, verifyReceipt, exchangePublicKey, RECEIPT_HEADER, type ExchangeReceipt } from './log';
import { contentDigest, signRequest } from './http-signatures';
import { registerFeedKey, resetFeedKeys } from './feed-keys';
import { issueFeed } from '@/lib/data/case-import';
import { listMinistries, registerIntegration, setIntegrationStatus, proposeGrant, setGrantStatus, listAudit } from '@/lib/data/store';
import { resetRateLimits } from './rate-limit';
import { POST as casePost } from '@/app/api/org/ministries/[id]/queue/feed/route';
import { POST as federationPost } from '@/app/api/federation/exchange/route';
import { GET as logGet } from '@/app/api/exchange/log/route';

const M = listMinistries().find(m => m.status === 'active')!.id;
const decode = (h: string | null) => JSON.parse(Buffer.from(h!, 'base64url').toString('utf8')) as ExchangeReceipt;

describe('the exchange log and signed receipts', () => {
  beforeEach(() => { resetExchangeLog(); resetFeedKeys(); resetRateLimits(); });

  it('records every feed call (digest, key id, time, result) and returns a signed receipt', async () => {
    const r = issueFeed(M, `Logged feed ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const url = `http://localhost/api/org/ministries/${M}/queue/feed`;
    const ctx = { params: { id: M } };
    const k = generateKeyPairSync('ed25519');
    const reg = registerFeedKey('case', M, r.feed.id, { publicKey: k.publicKey.export({ type: 'spki', format: 'pem' }).toString(), by: 'PS' });
    if ('error' in reg) throw new Error(reg.error);
    const body = JSON.stringify({ cases: [{ reference: `LG-${Date.now()}`, subject: 'Logged', received: '2026-10-01' }] });
    const headers = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: reg.keyId, headers: { authorization: `Bearer ${r.key}` } });
    const res = await casePost(new NextRequest(url, { method: 'POST', headers, body }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    const receipt = json.receipt as ExchangeReceipt;
    expect(decode(res.headers.get(RECEIPT_HEADER))).toEqual(receipt);
    expect(receipt).toMatchObject({ channel: 'case-feed', feedId: r.feed.id, method: 'POST', requestDigest: contentDigest(body), signatureKeyId: reg.keyId, status: 200, result: '1 added, 0 updated, 0 unchanged, 0 refused' });
    expect(verifyReceipt(receipt)).toBe(true);
    expect(verifyReceipt({ ...receipt, status: 201 })).toBe(false);
    expect(verifyReceipt(receipt, generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString())).toBe(false);
    expect(receipt.platformKeyId).toBe(exchangePublicKey().keyId);

    // A refused (unsigned) call is logged and receipted too.
    const unsigned = await casePost(new NextRequest(url, { method: 'POST', headers: { authorization: `Bearer ${r.key}` }, body }), ctx);
    expect(unsigned.status).toBe(401);
    expect((await unsigned.json()).receipt).toMatchObject({ status: 401, result: expect.stringMatching(/signature refused/) });

    const log = listExchanges({ channel: 'case-feed', feedId: r.feed.id });
    expect(log.map(e => [e.status, e.signature])).toEqual([[401, 'refused'], [200, 'verified']]);
    expect(log[1]).toMatchObject({ requestDigest: contentDigest(body), signatureKeyId: reg.keyId, receiptId: receipt.id, ministryId: M });

    const listed = await (await logGet(new NextRequest(`http://localhost/api/exchange/log?channel=case-feed&feedId=${r.feed.id}`))).json();
    expect(listed.exchanges).toHaveLength(2);
  });

  it('logs unknown callers without naming a feed', async () => {
    const res = await casePost(new NextRequest(`http://localhost/api/org/ministries/${M}/queue/feed`, { method: 'POST', body: '{}' }), { params: { id: M } });
    expect(res.status).toBe(401);
    expect(listExchanges()[0]).toMatchObject({ feedId: '?', status: 401, result: 'unknown key' });
  });

  it('decides federation exchanges by grant, logs them and returns a receipt', async () => {
    const reg = registerIntegration({ kind: 'integration', name: `partner-${Date.now()}`, ownerOrg: 'Ministry of Health (partner)', contact: 'x@y', scopes: ['federation:exchange'] });
    if ('error' in reg) throw new Error(reg.error);
    setIntegrationStatus(reg.id, 'approved', 'Official');
    const tenant = `partner-${Date.now()}`;
    const call = (body: unknown, key = reg.apiKey) => federationPost(new NextRequest('http://localhost/api/federation/exchange', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: JSON.stringify(body) }));

    const denied = await call({ tenant, scope: 'permit:read' });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ allowed: false, reason: 'no grant (default deny)', receipt: { channel: 'federation', status: 403 } });

    const g = proposeGrant({ toTenant: tenant, scopes: ['permit:read'], reason: 'Cross-border permits' });
    if ('error' in g) throw new Error(g.error);
    setGrantStatus(g.id, 'approved', 'Official');
    const ok = await call({ tenant, scope: 'permit:read' });
    expect(ok.status).toBe(200);
    const j = await ok.json();
    expect(j).toMatchObject({ allowed: true, grant: g.id });
    expect(verifyReceipt(j.receipt)).toBe(true);
    expect(listAudit()[0]).toMatchObject({ action: 'federation.exchange', resource: `Grant:${g.id}`, outcome: 'ok' });
    expect(listExchanges({ channel: 'federation' })[0]).toMatchObject({ tenant, grantId: g.id, feedId: reg.id, status: 200 });

    expect((await call({ tenant, scope: 'permit:read' }, 'civ_00000000_' + 'A'.repeat(43))).status).toBe(401);
  });
});
