import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createCipheriv, createDecipheriv, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { initKeyCustody, keyCustodyStatus, resetKeyCustody, signer, providerKind, rotateDataKey } from './custody';
import { seal, open, encryptionAtRest } from '@/lib/crypto/envelope';
import { resetAuditHeads, signHead, settledHead, listSignedHeads, verifySignedHeads, headPayload } from '@/lib/audit/sign';
import { logExchange, verifyReceipt, resetExchangeLog } from '@/lib/exchange/log';
import { verifyBytes } from '@/lib/crypto/signing-key';

// ── A mocked Vault Transit API (the only holder of the keys) ─────────
interface MockKey { versions: KeyObject[] }
const vault = {
  token: 's.initial',
  approle: { role_id: 'role-1', secret_id: 'secret-1' },
  issued: [] as string[],
  keys: new Map<string, MockKey>(),
  kek: randomBytes(32),
  calls: [] as string[],
  refuseNext: false,
};
const edKey = () => generateKeyPairSync('ed25519').privateKey;
function wrap(plain: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', vault.kek, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return `vault:v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}`;
}
function unwrap(w: string): Buffer {
  const b = Buffer.from(w.replace(/^vault:v1:/, ''), 'base64');
  const d = createDecipheriv('aes-256-gcm', vault.kek, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]);
}
const rawPublic = (k: KeyObject) => {
  const der = (k.asymmetricKeyType ? (k.type === 'private' ? (require('node:crypto') as typeof import('node:crypto')).createPublicKey(k) : k) : k).export({ type: 'spki', format: 'der' });
  return Buffer.from(der).subarray(-32).toString('base64');
};

let server: http.Server;
let addr = '';
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const send = (status: number, json: unknown) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(json)); };
      const url = req.url ?? '';
      vault.calls.push(`${req.method} ${url}`);
      const b = body ? JSON.parse(body) : {};
      if (url === '/v1/auth/approle/login') {
        if (b.role_id !== vault.approle.role_id || b.secret_id !== vault.approle.secret_id) return send(400, { errors: ['invalid role or secret id'] });
        vault.token = `s.${randomBytes(6).toString('hex')}`;
        vault.issued.push(vault.token);
        return send(200, { auth: { client_token: vault.token, lease_duration: 3600 } });
      }
      if (req.headers['x-vault-token'] !== vault.token || vault.refuseNext) { vault.refuseNext = false; return send(403, { errors: ['permission denied'] }); }
      let m = /^\/v1\/transit\/sign\/([\w-]+)$/.exec(url);
      if (m) {
        const k = vault.keys.get(m[1]!);
        if (!k) return send(404, { errors: ['no key'] });
        const v = k.versions.length;
        const sig = sign(null, Buffer.from(b.input, 'base64'), k.versions[v - 1]!).toString('base64');
        return send(200, { data: { signature: `vault:v${v}:${sig}`, key_version: v } });
      }
      m = /^\/v1\/transit\/keys\/([\w-]+)$/.exec(url);
      if (m) {
        const k = vault.keys.get(m[1]!);
        if (!k) return send(404, { errors: ['no key'] });
        return send(200, { data: { type: 'ed25519', latest_version: k.versions.length, keys: Object.fromEntries(k.versions.map((p, i) => [String(i + 1), { public_key: rawPublic(p) }])) } });
      }
      m = /^\/v1\/transit\/datakey\/plaintext\/([\w-]+)$/.exec(url);
      if (m) {
        const dk = randomBytes(b.bits / 8);
        return send(200, { data: { plaintext: dk.toString('base64'), ciphertext: wrap(dk) } });
      }
      m = /^\/v1\/transit\/decrypt\/([\w-]+)$/.exec(url);
      if (m) {
        try { return send(200, { data: { plaintext: unwrap(b.ciphertext).toString('base64') } }); } catch { return send(400, { errors: ['cipher: message authentication failed'] }); }
      }
      return send(404, { errors: [`no handler for ${url}`] });
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  addr = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); });

const ENV = ['CIVICOS_KEY_PROVIDER', 'CIVICOS_VAULT_ADDR', 'CIVICOS_VAULT_TOKEN', 'CIVICOS_VAULT_ROLE_ID', 'CIVICOS_VAULT_SECRET_ID', 'CIVICOS_KMS_URL', 'CIVICOS_KMS_TOKEN', 'CIVICOS_DATA_KEK'];
beforeEach(() => {
  resetKeyCustody(); resetAuditHeads(); resetExchangeLog();
  vault.keys.set('civicos-audit', { versions: [edKey()] });
  vault.keys.set('civicos-exchange', { versions: [edKey()] });
  vault.calls = [];
  process.env.CIVICOS_KEY_PROVIDER = 'vault';
  process.env.CIVICOS_VAULT_ADDR = addr;
  process.env.CIVICOS_VAULT_ROLE_ID = vault.approle.role_id;
  process.env.CIVICOS_VAULT_SECRET_ID = vault.approle.secret_id;
});
afterEach(() => { for (const k of ENV) delete process.env[k]; resetKeyCustody(); });

const keyring = () => (globalThis as unknown as { __civicosKeyring?: { dataKeys: Array<{ kid: string; wrapped: string }>; current?: string } }).__civicosKeyring;

describe('key custody: Vault / OpenBao Transit', () => {
  it('logs in with AppRole, issues a data key and loads the signing keys at start', async () => {
    const s = await initKeyCustody();
    expect(providerKind()).toBe('vault');
    expect(s).toMatchObject({ provider: 'vault', ready: true, data: { enabled: true, keys: 1, unreadable: 0 } });
    expect(s.signing.audit.keyId).toMatch(/^ed25519:/);
    expect(vault.calls[0]).toBe('POST /v1/auth/approle/login');
    // Only the wrapped data key is kept in the platform state.
    expect(keyring()!.dataKeys[0]!.wrapped).toMatch(/^vault:v1:/);
    expect(JSON.stringify(keyring())).not.toContain('PRIVATE KEY');
  });

  it('seals secrets under the envelope data key, and opens them after a restart by unwrapping it in Vault', async () => {
    await initKeyCustody();
    const sealed = seal('JBSWY3DPEHPK3PXP', 'totp:OFF-1');
    expect(sealed).toMatch(/^enc:v1:/);
    expect(encryptionAtRest()).toMatchObject({ enabled: true, provider: 'vault' });
    // A restart: the process forgets the data key; the keyring (state) survives.
    const saved = structuredClone(keyring());
    resetKeyCustody();
    (globalThis as unknown as { __civicosKeyring: unknown }).__civicosKeyring = saved;
    expect(() => seal('x', 'a')).toThrow(/not ready/);
    expect(open(sealed, 'totp:OFF-1')).toEqual({ error: expect.stringMatching(/does not hold|not set/) });
    await initKeyCustody();
    expect(vault.calls.some(c => c.startsWith('POST /v1/transit/decrypt/civicos-data'))).toBe(true);
    expect(open(sealed, 'totp:OFF-1')).toEqual({ plain: 'JBSWY3DPEHPK3PXP', reseal: false });
    expect(open(sealed, 'totp:OFF-2')).toEqual({ error: expect.any(String) });
  });

  it('re-seals values from CIVICOS_DATA_KEK under the data key (moving from env to Vault)', async () => {
    const kek = randomBytes(32).toString('base64');
    process.env.CIVICOS_KEY_PROVIDER = 'env';
    process.env.CIVICOS_DATA_KEK = kek;
    const old = seal('secret', 'webhook:WH-1');
    process.env.CIVICOS_KEY_PROVIDER = 'vault';
    await initKeyCustody();
    const r = open(old, 'webhook:WH-1');
    expect(r).toEqual({ plain: 'secret', reseal: true });
    const kid = keyring()!.current!;
    expect(seal('secret', 'webhook:WH-1').split(':')[2]).toBe(kid);
    const next = await rotateDataKey();
    expect(next).not.toBe(kid);
    expect(keyCustodyStatus().data.keys).toBe(2);
  });

  it('signs audit heads in Vault: pending at once, signed when Vault answers, and checked like any head', async () => {
    await initKeyCustody();
    const h = signHead({ seq: 3, hash: 'a'.repeat(64) }, Date.parse('2026-10-19T08:00:00Z'));
    expect(h.pending).toBe(true);
    expect(verifySignedHeads(() => ({ hash: 'a'.repeat(64) }))).toMatchObject({ ok: true, pending: 1, signedHeads: 0 });
    const done = await settledHead(h);
    expect(done.pending).toBeUndefined();
    expect(verifyBytes(done.publicKeyPem, headPayload(3, 'a'.repeat(64), done.at), done.signature)).toBe(true);
    expect(done.keyId).toBe(keyCustodyStatus().signing.audit.keyId);
    expect(verifySignedHeads(() => ({ hash: 'a'.repeat(64) }))).toMatchObject({ ok: true, signedHeads: 1, currentKey: true });
    expect(listSignedHeads()).toHaveLength(1);
  });

  it('keeps a head pending with the reason when Vault cannot sign, and signs it later', async () => {
    await initKeyCustody();
    vault.keys.delete('civicos-audit');
    const h = await settledHead(signHead({ seq: 5, hash: 'b'.repeat(64) }));
    expect(h.pending).toBe(true);
    expect(h.signError).toMatch(/Vault sign failed \(404/);
    vault.keys.set('civicos-audit', { versions: [edKey()] });
    const later = await settledHead(h);
    expect(later.pending).toBeUndefined();
    expect(later.signError).toBeUndefined();
  });

  it('names the key version that signed after a rotation in Vault', async () => {
    await initKeyCustody();
    const first = await settledHead(signHead({ seq: 1, hash: 'c'.repeat(64) }));
    vault.keys.get('civicos-audit')!.versions.push(edKey());
    const second = await settledHead(signHead({ seq: 2, hash: 'd'.repeat(64) }));
    expect(second.keyId).not.toBe(first.keyId);
    expect(verifySignedHeads(seq => ({ hash: (seq === 1 ? 'c' : 'd').repeat(64) })).ok).toBe(true);
  });

  it('signs exchange receipts in Vault', async () => {
    await initKeyCustody();
    const { receipt } = await logExchange({ channel: 'federation', feedId: 'INT-1', method: 'POST', path: '/api/federation/exchange', body: '{}', signature: 'absent', status: 200, result: 'allowed' });
    expect(receipt.production).toBe(true);
    expect(receipt.platformKeyId).toBe(keyCustodyStatus().signing.exchange.keyId);
    expect(verifyReceipt(receipt)).toBe(true);
    expect(verifyReceipt({ ...receipt, status: 403 })).toBe(false);
  });

  it('logs in again when Vault refuses the token', async () => {
    await initKeyCustody();
    const before = vault.issued.length;
    vault.refuseNext = true;
    const s = await signer('exchange').sign('hello');
    expect(s.signature).toBeTruthy();
    expect(vault.issued.length).toBe(before + 1);
  });

  it('refuses a Vault address that is not https (except a local agent)', async () => {
    process.env.CIVICOS_VAULT_ADDR = 'http://vault.gov.example:8200';
    const s = await initKeyCustody();
    expect(s.ready).toBe(false);
    expect(s.error).toMatch(/https/);
  });
});

describe('key custody: KMS over HTTP', () => {
  it('uses the generic shim with a bearer token', async () => {
    const key = edKey();
    const dks = new Map<string, Buffer>();
    const kms = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const send = (s: number, j: unknown) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
        if (req.headers.authorization !== 'Bearer kms-token') return send(401, { error: 'unauthorised' });
        const b = body ? JSON.parse(body) : {};
        if (req.url === '/kms/keys/civicos-audit/sign' || req.url === '/kms/keys/civicos-exchange/sign') return send(200, { signature: sign(null, Buffer.from(b.data, 'base64'), key).toString('base64'), version: 1 });
        if (req.url?.startsWith('/kms/keys/civicos-audit/public') || req.url?.startsWith('/kms/keys/civicos-exchange/public')) return send(200, { publicKeyPem: (require('node:crypto') as typeof import('node:crypto')).createPublicKey(key).export({ type: 'spki', format: 'pem' }), version: 1 });
        if (req.url === '/kms/keys/civicos-data/datakey') { const k = randomBytes(32); const id = randomBytes(8).toString('hex'); dks.set(id, k); return send(200, { plaintext: k.toString('base64'), ciphertext: id }); }
        if (req.url === '/kms/keys/civicos-data/decrypt') { const k = dks.get(b.ciphertext); return k ? send(200, { plaintext: k.toString('base64') }) : send(400, { error: 'unknown' }); }
        return send(404, { error: 'no route' });
      });
    });
    await new Promise<void>(r => kms.listen(0, '127.0.0.1', r));
    process.env.CIVICOS_KEY_PROVIDER = 'kms-http';
    process.env.CIVICOS_KMS_URL = `http://127.0.0.1:${(kms.address() as AddressInfo).port}/kms/`;
    process.env.CIVICOS_KMS_TOKEN = 'kms-token';
    try {
      const s = await initKeyCustody();
      expect(s).toMatchObject({ provider: 'kms-http', ready: true });
      const h = await settledHead(signHead({ seq: 1, hash: 'e'.repeat(64) }));
      expect(verifyBytes(h.publicKeyPem, headPayload(1, h.hash, h.at), h.signature)).toBe(true);
      expect(open(seal('x', 'a'), 'a')).toEqual({ plain: 'x', reseal: false });
    } finally { kms.close(); }
  });
});

describe('key custody: environment (default)', () => {
  it('keeps today\'s behaviour: local keys, synchronous signatures', async () => {
    delete process.env.CIVICOS_KEY_PROVIDER;
    const s = await initKeyCustody();
    expect(s.provider).toBe('env');
    expect(s.ready).toBe(true);
    expect(signer('audit').signSync).toBeTypeOf('function');
    const h = signHead({ seq: 1, hash: 'f'.repeat(64) });
    expect(h.pending).toBeUndefined();
    expect(h.production).toBe(false);
    expect(seal('plain', 'a')).toBe('plain'); // no CIVICOS_DATA_KEK: unchanged, as before
  });
});
