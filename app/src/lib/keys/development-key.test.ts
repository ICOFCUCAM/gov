// Step I0.1 (docs/reviews/2026-10-institutional-baseline-audit.md §3.4): a
// production installation never signs with the development key generated for
// one process, and signing keys are audited when registered or rotated (key
// ids only, never key material).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { developmentKeyRefusal, keyCustodyStatus, noteSigningKeys, resetKeyCustody } from './custody';
import { resetSigningKeys } from '@/lib/crypto/signing-key';
import { resetAuditHeads, signHead, maybeSignHead, listSignedHeads } from '@/lib/audit/sign';
import { logExchange, exchangeResponse, resetExchangeLog, ExchangeKeyError } from '@/lib/exchange/log';
import { listAudit } from '@/lib/data/store/audit';

const pem = () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const exchange = { channel: 'federation' as const, feedId: 'INT-1', method: 'POST', path: '/api/federation/exchange', body: '{}', signature: 'absent' as const, status: 200, result: 'allowed' };

beforeEach(() => {
  for (const k of ['CIVICOS_AUDIT_KEY', 'CIVICOS_EXCHANGE_KEY', 'CIVICOS_TOKEN_KEY', 'CIVICOS_DECISION_KEY', 'CIVICOS_KEY_PROVIDER']) vi.stubEnv(k, '');
  vi.stubEnv('CIVICOS_AUDIT_SIGN_EVERY', '1');
  resetSigningKeys(); resetKeyCustody(); resetAuditHeads(); resetExchangeLog();
});
afterEach(() => { vi.unstubAllEnvs(); resetSigningKeys(); resetKeyCustody(); resetAuditHeads(); });

describe('development keys', () => {
  it('are used in demo and training installations as before', async () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    expect(developmentKeyRefusal('audit')).toBeNull();
    expect(signHead({ seq: 1, hash: 'a'.repeat(64) })).toMatchObject({ production: false });
    expect((await logExchange(exchange)).receipt).toMatchObject({ production: false });
  });

  it('are refused in production: no audit head, no exchange receipt, said at start', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    for (const p of ['audit', 'exchange', 'token', 'decision'] as const) expect(developmentKeyRefusal(p)).toMatch(/production installation has no/);
    expect(() => signHead({ seq: 1, hash: 'a'.repeat(64) })).toThrow(/CIVICOS_AUDIT_KEY/);
    // Writing to the chain goes on; heads wait for the key.
    expect(maybeSignHead({ seq: 5, hash: 'b'.repeat(64) })).toBeNull();
    expect(listSignedHeads()).toEqual([]);
    await expect(logExchange(exchange)).rejects.toBeInstanceOf(ExchangeKeyError);
    const res = await exchangeResponse(exchange, { ok: true });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/CIVICOS_EXCHANGE_KEY/);
    expect(keyCustodyStatus().developmentInProduction).toEqual(['audit', 'exchange', 'token', 'decision']);
    expect(noteSigningKeys().development).toEqual(['audit', 'exchange', 'token', 'decision']);
  });

  it('a production installation with its own keys signs as before', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_AUDIT_KEY', pem());
    vi.stubEnv('CIVICOS_EXCHANGE_KEY', pem());
    expect(developmentKeyRefusal('audit')).toBeNull();
    expect(signHead({ seq: 1, hash: 'a'.repeat(64) })).toMatchObject({ production: true });
    expect((await logExchange(exchange)).receipt).toMatchObject({ production: true });
    expect(keyCustodyStatus().developmentInProduction).toEqual(['token', 'decision']);
  });
});

describe('signing keys are audited when registered or rotated', () => {
  it('records the key id at the first start, a rotation when it changes, nothing when it stays', () => {
    const since = () => { const m = listAudit()[0]?.seq ?? 0; return () => listAudit().filter(e => e.seq > m && e.action.startsWith('keys.signing')); };
    const first = pem();
    vi.stubEnv('CIVICOS_AUDIT_KEY', first);
    let read = since();
    expect(noteSigningKeys().recorded).toEqual(['audit']);
    const reg = read();
    expect(reg).toEqual([expect.objectContaining({ action: 'keys.signing.register', actor: 'system (key custody)', resource: expect.stringMatching(/^Key:audit\/ed25519:/) })]);
    read = since();
    expect(noteSigningKeys().recorded).toEqual([]);
    expect(read()).toEqual([]);
    vi.stubEnv('CIVICOS_AUDIT_KEY', pem());
    read = since();
    noteSigningKeys();
    const rot = read();
    expect(rot).toEqual([expect.objectContaining({ action: 'keys.signing.rotate' })]);
    expect(rot[0]!.detail).toContain(`replaces ${reg[0]!.resource.split('/')[1]}`);
    expect(JSON.stringify([...reg, ...rot])).not.toMatch(/PRIVATE KEY|BEGIN/);
    // Development keys are never recorded (they change with every process).
    expect(listAudit().some(e => e.action.startsWith('keys.signing') && e.resource.startsWith('Key:exchange'))).toBe(false);
  });
});
