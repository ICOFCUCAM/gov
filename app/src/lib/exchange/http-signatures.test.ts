import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { NextRequest } from 'next/server';
import { signRequest, verifyRequestSignature, checkContentDigest, contentDigest, parseSignatureInput } from './http-signatures';
import { registerFeedKey, removeFeedKey, resetFeedKeys, feedSigningKey } from './feed-keys';
import { issueFeed } from '@/lib/data/case-import';
import { issueSiteFeed } from '@/lib/data/facilities';
import { listMinistries, listAudit } from '@/lib/data/store';
import { POST as casePost, GET as caseGet } from '@/app/api/org/ministries/[id]/queue/feed/route';
import { POST as sitePost } from '@/app/api/org/ministries/[id]/facilities/feed/route';

const pair = () => generateKeyPairSync('ed25519');
const pem = (k: ReturnType<typeof pair>) => k.publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('RFC 9421 signatures (Ed25519) and RFC 9530 digests', () => {
  const k = pair();
  const key = { publicKeyPem: pem(k), keyId: 'ministry-key-1' };
  const url = 'https://gov.example/api/org/ministries/m/queue/feed';
  const body = '{"cases":[]}';
  const req = (h: Record<string, string>, method = 'POST', u = url) => ({ method, url: u, headers: new Headers(h) });

  it('verifies a signature over method, target and content-digest', () => {
    const h = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: key.keyId, headers: { 'content-type': 'application/json' } });
    expect(h['content-digest']).toBe(contentDigest(body));
    expect(parseSignatureInput(h['signature-input']!)[0]).toMatchObject({ label: 'sig1', components: ['@method', '@target-uri', 'content-digest'], params: Promise.resolve({ keyid: 'ministry-key-1', alg: 'ed25519' }) });
    expect(verifyRequestSignature(req(h), body, key)).toMatchObject({ ok: true, keyId: 'ministry-key-1' });
  });

  it('refuses a changed body, method, address, key, old signature or missing digest coverage', () => {
    const h = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: key.keyId });
    expect(verifyRequestSignature(req(h), '{"cases":[1]}', key)).toMatchObject({ ok: false, reason: expect.stringMatching(/Content-Digest does not match/) });
    expect(verifyRequestSignature(req(h, 'PUT'), body, key)).toMatchObject({ ok: false, reason: expect.stringMatching(/does not verify/) });
    expect(verifyRequestSignature(req(h, 'POST', url + '?x=1'), body, key)).toMatchObject({ ok: false });
    expect(verifyRequestSignature(req(h), body, { ...key, publicKeyPem: pem(pair()) })).toMatchObject({ ok: false });
    const old = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: key.keyId, created: Math.floor(Date.now() / 1000) - 900 });
    expect(verifyRequestSignature(req(old), body, key)).toMatchObject({ ok: false, reason: expect.stringMatching(/five minutes/) });
    const noDigest = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: key.keyId, components: ['@method', '@target-uri'] });
    expect(verifyRequestSignature(req(noDigest), body, key)).toMatchObject({ ok: false, reason: expect.stringMatching(/content-digest/) });
    expect(verifyRequestSignature(req({}), body, key)).toMatchObject({ ok: false, reason: expect.stringMatching(/requires signed requests/) });
    const other = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: 'someone-else' });
    expect(verifyRequestSignature(req(other), body, key)).toMatchObject({ ok: false, reason: expect.stringMatching(/registered key/) });
  });

  it('checks Content-Digest values', () => {
    expect(checkContentDigest(contentDigest('abc'), 'abc')).toBeNull();
    expect(checkContentDigest('sha-256=:AAAA:', 'abc')).toMatch(/does not match/);
    expect(checkContentDigest('md5=:AAAA:', 'abc')).toMatch(/sha-256/);
    expect(checkContentDigest(null, 'abc')).toMatch(/Send a Content-Digest/);
  });
});

describe('signed feeds', () => {
  const M = listMinistries().find(m => m.status === 'active')!.id;
  beforeEach(() => resetFeedKeys());

  it('refuses unsigned or badly signed case-feed calls once a key is registered', async () => {
    const r = issueFeed(M, `Signed feed ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const url = `http://localhost/api/org/ministries/${M}/queue/feed`;
    const ctx = { params: Promise.resolve({ id: M }) };
    const auth = { authorization: `Bearer ${r.key}` };
    const body = JSON.stringify({ cases: [{ reference: `SG-${Date.now()}`, subject: 'Signed', received: '2026-10-01' }] });
    expect((await casePost(new NextRequest(url, { method: 'POST', headers: auth, body: '{"cases":[]}' }), ctx)).status).toBe(200);

    const k = pair();
    expect(registerFeedKey('case', M, r.feed.id, { publicKey: 'nope', by: 'PS' })).toEqual({ error: expect.stringMatching(/Ed25519/) });
    const reg = registerFeedKey('case', M, r.feed.id, { publicKey: pem(k), by: 'PS' });
    if ('error' in reg) throw new Error(reg.error);
    expect(reg.keyId).toMatch(/^ed25519:[0-9a-f]{16}$/);

    const unsigned = await casePost(new NextRequest(url, { method: 'POST', headers: auth, body }), ctx);
    expect(unsigned.status).toBe(401);
    expect((await unsigned.json()).error).toMatch(/signed requests/);
    expect(listAudit()[0]).toMatchObject({ action: 'exchange.signature', outcome: 'denied', resource: `CaseFeed:${r.feed.id}` });

    const forged = signRequest({ method: 'POST', url, body, privateKey: pair().privateKey, keyId: reg.keyId, headers: auth });
    expect((await casePost(new NextRequest(url, { method: 'POST', headers: forged, body }), ctx)).status).toBe(401);

    const signed = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: reg.keyId, headers: auth });
    const ok = await casePost(new NextRequest(url, { method: 'POST', headers: signed, body }), ctx);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ added: 1 });

    expect((await caseGet(new NextRequest(url, { headers: auth }), ctx)).status).toBe(401);
    const getSigned = signRequest({ method: 'GET', url, privateKey: k.privateKey, keyId: reg.keyId, headers: auth });
    expect((await caseGet(new NextRequest(url, { headers: getSigned }), ctx)).status).toBe(200);

    expect(removeFeedKey('case', r.feed.id, 'PS')).toEqual({ removed: true });
    expect(feedSigningKey('case', r.feed.id)).toBeUndefined();
    expect((await caseGet(new NextRequest(url, { headers: auth }), ctx)).status).toBe(200);
  });

  it('applies the same rule to the site feed', async () => {
    const r = issueSiteFeed(M, `Signed sites ${Date.now()}`, 'PS');
    if ('error' in r) throw new Error(r.error);
    const url = `http://localhost/api/org/ministries/${M}/facilities/feed`;
    const ctx = { params: Promise.resolve({ id: M }) };
    const auth = { authorization: `Bearer ${r.key}` };
    const k = pair();
    const reg = registerFeedKey('site', M, r.feed.id, { publicKey: pem(k), keyId: 'mfl-2026', by: 'PS' });
    if ('error' in reg) throw new Error(reg.error);
    const body = JSON.stringify({ sites: [] });
    expect((await sitePost(new NextRequest(url, { method: 'POST', headers: auth, body }), ctx)).status).toBe(401);
    const signed = signRequest({ method: 'POST', url, body, privateKey: k.privateKey, keyId: 'mfl-2026', headers: auth });
    const res = await sitePost(new NextRequest(url, { method: 'POST', headers: signed, body }), ctx);
    expect(res.status).not.toBe(401);
  });
});
