// The provider adapters against servers on this machine: an SMTP relay
// (smtp-server, STARTTLS and implicit TLS with a test certificate) and an
// HTTPS API (node:https), both reached by name through the pinned address.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import { FEED_CERT_PEM, FEED_KEY_PEM } from '@/lib/net/egress.fixture';
import { sendSmtp } from './adapters/smtp';
import { sendHttp, fillTemplate } from './adapters/http';
import type { ProviderConfig, RenderedMessage } from './types';

const HOST = 'feed.example.gov'; // the name in the test certificate
const resolve = async () => ['127.0.0.1'];
const msg = (over: Partial<RenderedMessage> = {}): RenderedMessage => ({
  key: 'site:police:SUB-1:update:abc', channel: 'email', to: 'amina@example.org', subject: 'Clinics open', text: 'Body\n\nhttps://gov.example/subscriptions?token=t',
  headers: { 'List-Unsubscribe': '<https://gov.example/api/subscriptions?token=t&action=unsubscribe>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }, ...over,
});
const base = { nationId: 'home', enabled: true, priority: 1, perMinute: 60, createdAt: '', createdBy: 'x', updatedAt: '', updatedBy: 'x' };

interface Received { from?: string; to: string[]; data: string; auth?: string; secure: boolean }
async function relay(opts: Partial<SMTPServerOptions>): Promise<{ port: number; got: Received[]; close: () => Promise<void> }> {
  const got: Received[] = [];
  const server = new SMTPServer({
    key: FEED_KEY_PEM, cert: FEED_CERT_PEM, authOptional: true, logger: false,
    onAuth(auth, _s, cb) { return auth.username === 'relay-user' && auth.password === 'relay-pass' ? cb(null, { user: auth.username }) : cb(new Error('Invalid username or password')); },
    onData(stream, session, cb) {
      let data = '';
      stream.on('data', (c: Buffer) => { data += c.toString(); });
      stream.on('end', () => { got.push({ from: session.envelope.mailFrom ? session.envelope.mailFrom.address : undefined, to: session.envelope.rcptTo.map(r => r.address), data, auth: session.user as string | undefined, secure: session.secure }); cb(); });
    },
    ...opts,
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.server.address() as AddressInfo).port;
  return { port, got, close: () => new Promise(r => server.close(() => r())) };
}
const smtpProvider = (port: number, over: Partial<ProviderConfig> = {}): ProviderConfig => ({
  ...base, id: 'MP-1', kind: 'smtp', channel: 'email', name: 'Relay', from: 'updates@gov.example', host: HOST, port, security: 'starttls', username: 'relay-user', caPem: FEED_CERT_PEM, ...over,
});

describe('SMTP relay', () => {
  it('sends over STARTTLS with authentication, the List-Unsubscribe headers and the key as Message-ID', async () => {
    const r = await relay({});
    try {
      const res = await sendSmtp(smtpProvider(r.port), msg(), 'relay-pass', { allowPrivate: true, net: { resolve } });
      expect(res).toMatchObject({ ok: true });
      expect(r.got).toHaveLength(1);
      expect(r.got[0]).toMatchObject({ from: 'updates@gov.example', to: ['amina@example.org'], auth: 'relay-user', secure: true });
      expect(r.got[0]!.data).toMatch(/^List-Unsubscribe:\s+<https:\/\/gov\.example\/api\/subscriptions\?token=t&action=unsubscribe>/m);
      expect(r.got[0]!.data).toMatch(/^List-Unsubscribe-Post: List-Unsubscribe=One-Click/m);
      expect(r.got[0]!.data).toMatch(/^Message-ID: <[0-9a-f]{32}@gov\.example>/m);
    } finally { await r.close(); }
  });

  it('sends over implicit TLS', async () => {
    const r = await relay({ secure: true });
    try {
      expect(await sendSmtp(smtpProvider(r.port, { security: 'tls' }), msg(), 'relay-pass', { allowPrivate: true, net: { resolve } })).toMatchObject({ ok: true });
      expect(r.got[0]!.secure).toBe(true);
    } finally { await r.close(); }
  });

  it('never sends without TLS: a relay that does not offer STARTTLS gets nothing', async () => {
    const r = await relay({ disabledCommands: ['STARTTLS'] });
    try {
      const res = await sendSmtp(smtpProvider(r.port), msg(), 'relay-pass', { allowPrivate: true, net: { resolve } });
      expect(res).toMatchObject({ ok: false, permanent: false });
      expect(r.got).toHaveLength(0);
    } finally { await r.close(); }
  });

  it('checks the certificate: a relay whose certificate is not trusted gets nothing', async () => {
    const r = await relay({});
    try {
      const res = await sendSmtp(smtpProvider(r.port, { caPem: undefined }), msg(), 'relay-pass', { allowPrivate: true, net: { resolve } });
      expect(res.ok).toBe(false);
      expect(r.got).toHaveLength(0);
    } finally { await r.close(); }
  });

  it('a refused recipient is permanent, a refused password is not; neither keeps the address', async () => {
    const r = await relay({ onRcptTo(addr, _s, cb) { const e = new Error(`<${addr.address}> unknown user`) as Error & { responseCode: number }; e.responseCode = 550; cb(e); } });
    try {
      const res = await sendSmtp(smtpProvider(r.port), msg(), 'relay-pass', { allowPrivate: true, net: { resolve } });
      expect(res).toMatchObject({ ok: false, permanent: true });
      expect(JSON.stringify(res)).not.toContain('amina@example.org');
      const auth = await sendSmtp(smtpProvider(r.port), msg(), 'wrong', { allowPrivate: true, net: { resolve } });
      expect(auth).toMatchObject({ ok: false, permanent: false });
    } finally { await r.close(); }
  });

  it('refuses a relay on a private network unless the nation allows it', async () => {
    const res = await sendSmtp(smtpProvider(25), msg(), 'x', { allowPrivate: false, net: { resolve } });
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/private network/) });
  });
});

describe('HTTPS email API and SMS gateway', () => {
  const seen: { path?: string; headers: Record<string, string | string[] | undefined>; body: string }[] = [];
  let answer = { status: 200, body: '{"id":"prov-42"}' };
  const server = https.createServer({ cert: FEED_CERT_PEM, key: FEED_KEY_PEM }, (req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => { seen.push({ path: req.url, headers: req.headers, body }); res.writeHead(answer.status, { 'content-type': 'application/json' }); res.end(answer.body); });
  });
  let port = 0;
  beforeAll(async () => { await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r())); port = (server.address() as AddressInfo).port; });
  afterAll(() => new Promise<void>(r => server.close(() => r())));
  beforeEach(() => { seen.length = 0; answer = { status: 200, body: '{"id":"prov-42"}' }; });
  afterEach(() => vi.unstubAllEnvs());

  const api = (over: Partial<ProviderConfig> = {}): ProviderConfig => ({
    ...base, id: 'MP-2', kind: 'http-email', channel: 'email', name: 'Mail API', from: 'updates@gov.example', url: `https://${HOST}:${port}/v1/send`, method: 'POST', contentType: 'json',
    headers: { Authorization: 'Bearer {{secret}}' }, bodyTemplate: '{"to":"{{to}}","from":"{{from}}","subject":"{{subject}}","text":"{{text}}","ref":"{{key}}"}', caPem: FEED_CERT_PEM, ...over,
  });

  it('fills the template (JSON-escaped), authenticates, sends the idempotency key and keeps the provider id', async () => {
    const res = await sendHttp(api(), msg({ subject: 'A "quoted" title' }), 'api-key-1', { allowPrivate: true, net: { resolve } });
    expect(res).toEqual({ ok: true, id: 'prov-42' });
    expect(seen[0]!.path).toBe('/v1/send');
    expect(seen[0]!.headers.authorization).toBe('Bearer api-key-1');
    expect(seen[0]!.headers['idempotency-key']).toBe('site:police:SUB-1:update:abc');
    expect(JSON.parse(seen[0]!.body)).toMatchObject({ to: 'amina@example.org', subject: 'A "quoted" title', ref: 'site:police:SUB-1:update:abc' });
  });

  it('sends a form-encoded SMS with basic authentication', async () => {
    const sms = api({ kind: 'http-sms', channel: 'sms', from: 'GOV', username: 'acct', contentType: 'form', headers: { Authorization: 'Basic {{basic}}' }, bodyTemplate: 'To={{to}}&From={{from}}&Body={{text}}' });
    expect(await sendHttp(sms, msg({ channel: 'sms', to: '+254700000002', text: 'Update Center · Security: 1.4.2 & more' }), 'tok', { allowPrivate: true, net: { resolve } })).toMatchObject({ ok: true });
    expect(seen[0]!.headers.authorization).toBe(`Basic ${Buffer.from('acct:tok').toString('base64')}`);
    expect(Object.fromEntries(new URLSearchParams(seen[0]!.body))).toEqual({ To: '+254700000002', From: 'GOV', Body: 'Update Center · Security: 1.4.2 & more' });
  });

  it('tells permanent refusals from passing failures, without the address', async () => {
    answer = { status: 422, body: '{"error":"invalid recipient amina@example.org"}' };
    expect(await sendHttp(api(), msg(), 'k', { allowPrivate: true, net: { resolve } })).toMatchObject({ ok: false, permanent: true });
    answer = { status: 503, body: 'busy' };
    const r = await sendHttp(api(), msg(), 'k', { allowPrivate: true, net: { resolve } });
    expect(r).toMatchObject({ ok: false, permanent: false });
    answer = { status: 429, body: 'slow down' };
    expect(await sendHttp(api(), msg(), 'k', { allowPrivate: true, net: { resolve } })).toMatchObject({ ok: false, permanent: false });
  });

  it('refuses a private address unless the nation allows it, and an untrusted certificate', async () => {
    expect(await sendHttp(api(), msg(), 'k', { allowPrivate: false, net: { resolve } })).toMatchObject({ ok: false });
    expect(await sendHttp(api({ caPem: undefined }), msg(), 'k', { allowPrivate: true, net: { resolve } })).toMatchObject({ ok: false, permanent: false });
    expect(seen).toHaveLength(0);
  });

  it('escapes values for JSON and forms, and keeps header values on one line', () => {
    const v = { to: 'a"b', from: 'f', subject: 's', text: 'x\ny', key: 'k', secret: 's', username: 'u', basic: 'b', unsubscribe: '' };
    expect(JSON.parse(fillTemplate('{"t":"{{to}}","x":"{{text}}"}', v, 'json'))).toEqual({ t: 'a"b', x: 'x\ny' });
    expect(fillTemplate('a={{text}}', v, 'form')).toBe('a=x%0Ay');
    expect(fillTemplate('{{text}}', v, 'header')).toBe('x y');
    expect(fillTemplate('{{unknown}}', v, 'json')).toBe('{{unknown}}');
  });
});
