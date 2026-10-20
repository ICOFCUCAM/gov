import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { NextRequest } from 'next/server';
import { registerIntegration, proposeGrant, setGrantStatus, listAudit } from '@/lib/data/store';
import { resetRateLimits } from './rate-limit';
import { resetExchangeLog, listExchanges } from './log';
import { resetPartnerCerts, fingerprintOf, normaliseFingerprint, checkPartnerCertificate, clientIdentity } from './mtls';
import { federationTls, requestPartnerExchange } from './federation-client';
import { POST as federationPost } from '@/app/api/federation/exchange/route';
import { GET as certGet, PUT as certPut, DELETE as certDelete } from '@/app/api/federation/grants/[id]/certificate/route';
import { GET as mtlsGet } from '@/app/api/federation/mtls/route';
import { FED_CA_PEM, SERVER_CERT_PEM, SERVER_KEY_PEM, CLIENT_CERT_PEM, CLIENT_KEY_PEM, OTHER_CERT_PEM } from './mtls.fixture';

const ENV = ['CIVICOS_TRUST_PROXY_CLIENT_CERT', 'CIVICOS_FEDERATION_HOST', 'CIVICOS_FEDERATION_CERT', 'CIVICOS_FEDERATION_KEY', 'CIVICOS_FEDERATION_CA'];
afterEach(() => { for (const k of ENV) delete process.env[k]; });

/** Headers as ingress-nginx passes them on after verifying a client certificate. */
const ingress = (pem: string, extra: Record<string, string> = {}) => ({
  'ssl-client-verify': 'SUCCESS',
  'ssl-client-subject-dn': 'CN=exchange.partner.example,O=Partner Republic',
  'ssl-client-cert': encodeURIComponent(pem),
  ...extra,
});

describe('mutual TLS on the federation exchange', () => {
  let apiKey = '';
  let grantId = '';
  let tenant = '';
  beforeEach(() => {
    resetPartnerCerts(); resetExchangeLog(); resetRateLimits();
    const reg = registerIntegration({ kind: 'integration', name: `mtls-${Date.now()}`, ownerOrg: 'Partner Republic', contact: 'x@y', scopes: ['federation:exchange'] });
    if ('error' in reg) throw new Error(reg.error);
    approveIntegration(reg.id);
    apiKey = reg.apiKey;
    tenant = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const g = proposeGrant({ toTenant: tenant, scopes: ['permit:read'], reason: 'Cross-border permits', policy: { purposes: ['oversight'], retentionDays: 30, onwardSharing: false } });
    if ('error' in g) throw new Error(g.error);
    setGrantStatus(g.id, 'approved', 'Official');
    grantId = g.id;
  });

  const call = (headers: Record<string, string> = {}, host = 'localhost') => federationPost(new NextRequest(`http://${host}/api/federation/exchange`, {
    method: 'POST', headers: { authorization: `Bearer ${apiKey}`, ...headers }, body: JSON.stringify({ tenant, scope: 'permit:read', purpose: 'oversight' }),
  }));
  const put = (body: unknown) => certPut(new NextRequest(`http://localhost/api/federation/grants/${grantId}/certificate`, { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ id: grantId }) });

  it('changes nothing for a grant that names no certificate', async () => {
    expect((await call()).status).toBe(200);
  });

  it('registers the partner\'s certificate on the grant (audited) and then requires it', async () => {
    const r = await put({ certificate: CLIENT_CERT_PEM, by: 'Director of Interoperability' });
    expect(r.status).toBe(200);
    const fp = fingerprintOf(CLIENT_CERT_PEM).sha256;
    expect((await r.json()).certificate).toMatchObject({ sha256: fp, by: 'Director of Interoperability' });
    expect(listAudit()[0]).toMatchObject({ action: 'federation.certificate.register', resource: `Grant:${grantId}` });
    expect((await (await certGet(new NextRequest('http://localhost/x'), { params: Promise.resolve({ id: grantId }) })).json()).certificate.sha256).toBe(fp);

    // The integration key alone is no longer enough.
    const noTrust = await call(ingress(CLIENT_CERT_PEM));
    expect(noTrust.status).toBe(403);
    expect((await noTrust.json()).reason).toMatch(/CIVICOS_TRUST_PROXY_CLIENT_CERT/);
    expect(listAudit()[0]).toMatchObject({ action: 'federation.exchange', outcome: 'denied' });

    process.env.CIVICOS_TRUST_PROXY_CLIENT_CERT = '1';
    expect((await call()).status).toBe(403); // no certificate presented
    expect((await call({ ...ingress(CLIENT_CERT_PEM), 'ssl-client-verify': 'FAILED:unable to verify the first certificate' })).status).toBe(403);
    const wrong = await call(ingress(OTHER_CERT_PEM));
    expect(wrong.status).toBe(403);
    expect((await wrong.json()).reason).toMatch(/not the one registered/);
    const ok = await call(ingress(CLIENT_CERT_PEM));
    expect(ok.status).toBe(200);
    expect((await ok.json()).allowed).toBe(true);
    expect(listExchanges({ channel: 'federation' })[0]!.result).toMatch(new RegExp(`mTLS sha256:${fp.slice(0, 16)}`));
  });

  it('believes the ingress headers only on the federation host when one is set', async () => {
    await put({ sha256: fingerprintOf(CLIENT_CERT_PEM).sha256.toUpperCase().match(/../g)!.join(':'), subject: 'CN=exchange.partner.example,O=Partner Republic', by: 'Director' });
    process.env.CIVICOS_TRUST_PROXY_CLIENT_CERT = '1';
    process.env.CIVICOS_FEDERATION_HOST = 'federation.gov.example';
    const forged = await call(ingress(CLIENT_CERT_PEM), 'civicos.gov.example');
    expect(forged.status).toBe(403);
    expect((await forged.json()).reason).toMatch(/federation host/);
    expect((await call(ingress(CLIENT_CERT_PEM), 'federation.gov.example')).status).toBe(200);
    // A different subject for the right fingerprint is refused too.
    expect((await call(ingress(CLIENT_CERT_PEM, { 'ssl-client-subject-dn': 'CN=impostor' }), 'federation.gov.example')).status).toBe(403);
  });

  it('removes the requirement (audited), and refuses what is not a certificate or fingerprint', async () => {
    expect((await put({ certificate: '-----BEGIN CERTIFICATE-----\nnope\n-----END CERTIFICATE-----', by: 'Director' })).status).toBe(422);
    expect((await put({ sha256: 'abc', by: 'Director' })).status).toBe(422);
    await put({ certificate: CLIENT_CERT_PEM, by: 'Director' });
    const del = await certDelete(new NextRequest(`http://localhost/api/federation/grants/${grantId}/certificate`, { method: 'DELETE', body: JSON.stringify({ by: 'Director' }) }), { params: Promise.resolve({ id: grantId }) });
    expect(del.status).toBe(200);
    expect(listAudit()[0]).toMatchObject({ action: 'federation.certificate.remove' });
    expect((await call()).status).toBe(200);
  });

  it('reads fingerprints and identities', () => {
    expect(normaliseFingerprint('AB:'.repeat(31) + 'AB')).toBe('ab'.repeat(32));
    expect(clientIdentity({ get: () => null }, {} as NodeJS.ProcessEnv).trusted).toBe(false);
    expect(checkPartnerCertificate(undefined, { get: () => null })).toEqual({ ok: true, required: false });
  });
});

describe('this installation presenting its client certificate', () => {
  let server: https.Server;
  let port = 0;
  const peers: { fp?: string; authorized: boolean }[] = [];
  beforeAll(async () => {
    server = https.createServer({ cert: SERVER_CERT_PEM, key: SERVER_KEY_PEM, ca: FED_CA_PEM, requestCert: true, rejectUnauthorized: false }, (req, res) => {
      const s = req.socket as TLSSocket;
      const peer = s.getPeerCertificate();
      peers.push({ fp: peer?.fingerprint256, authorized: s.authorized });
      res.writeHead(s.authorized ? 200 : 401, { 'content-type': 'application/json' });
      res.end(JSON.stringify(s.authorized ? { allowed: true, receipt: { id: 'EX-1' } } : { error: 'client certificate required' }));
    });
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => { server.close(); });

  it('presents the configured certificate through an undici Agent and checks the partner against CIVICOS_FEDERATION_CA', async () => {
    process.env.CIVICOS_FEDERATION_CERT = CLIENT_CERT_PEM;
    process.env.CIVICOS_FEDERATION_KEY = CLIENT_KEY_PEM;
    process.env.CIVICOS_FEDERATION_CA = FED_CA_PEM;
    const r = await requestPartnerExchange({ partnerUrl: `https://localhost:${port}`, apiKey: 'civ_x', request: { tenant: 'home', scope: 'permit:read' } });
    expect(r).toMatchObject({ status: 200, mutualTls: true, receipt: { id: 'EX-1' } });
    expect(normaliseFingerprint(peers.at(-1)!.fp!)).toBe(fingerprintOf(CLIENT_CERT_PEM).sha256);
    const status = await (await mtlsGet()).json();
    expect(status.client).toMatchObject({ sha256: fingerprintOf(CLIENT_CERT_PEM).sha256, ca: true });
  });

  it('without a client certificate the partner refuses; half a configuration is an error', async () => {
    process.env.CIVICOS_FEDERATION_CA = FED_CA_PEM;
    const r = await requestPartnerExchange({ partnerUrl: `https://localhost:${port}`, apiKey: 'civ_x', request: { tenant: 'home', scope: 'permit:read' } });
    expect(r.status).toBe(401);
    expect(r.mutualTls).toBe(false);
    process.env.CIVICOS_FEDERATION_CERT = CLIENT_CERT_PEM;
    expect(() => federationTls()).toThrow(/both/);
    await expect(requestPartnerExchange({ partnerUrl: 'http://partner.example', apiKey: 'k', request: { tenant: 'h', scope: 's' } })).rejects.toThrow(/https/);
  });
});
