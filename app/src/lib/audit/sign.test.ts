import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordAudit, verifyAuditChain, auditHead } from '@/lib/data/store';
import { resetAuditHeads, listSignedHeads, signHead, headPayload, lastSignedHead } from './sign';
import { resetSigningKeys, verifyBytes } from '@/lib/crypto/signing-key';
import type { AuditEntry } from '@/lib/api/types';

const chain = () => (globalThis as unknown as { __civicos: { audit: AuditEntry[] } }).__civicos.audit;
const pem = () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('signed audit heads', () => {
  beforeEach(() => {
    chain().length = 0; resetAuditHeads(); resetSigningKeys();
    process.env.CIVICOS_AUDIT_SIGN_EVERY = '3';
    delete process.env.CIVICOS_AUDIT_KEY;
  });
  afterEach(() => { delete process.env.CIVICOS_AUDIT_SIGN_EVERY; delete process.env.CIVICOS_AUDIT_SIGN_MINUTES; delete process.env.CIVICOS_AUDIT_KEY; });

  it('signs the head every N entries with the configured Ed25519 key, in an append-only store', () => {
    process.env.CIVICOS_AUDIT_KEY = pem();
    for (let i = 0; i < 7; i++) recordAudit('Director', 'test.step', `T:${i}`, 'ok');
    const heads = listSignedHeads();
    expect(heads.map(h => h.seq)).toEqual([3, 6]);
    const h = heads[1]!;
    expect(h.production).toBe(true);
    expect(h.hash).toBe(chain()[5]!.hash);
    expect(verifyBytes(h.publicKeyPem, headPayload(h.seq, h.hash, h.at), h.signature)).toBe(true);
    const v = verifyAuditChain();
    expect(v).toMatchObject({ ok: true, signed: { ok: true, signedHeads: 2, currentKey: true, head: { seq: 6, production: true } } });
  });

  it('reads the key from a file path (air-gapped key file)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'audit-key-'));
    writeFileSync(join(dir, 'audit.pem'), pem());
    process.env.CIVICOS_AUDIT_KEY = join(dir, 'audit.pem');
    recordAudit('A', 'x', 'y', 'ok');
    expect(signHead(auditHead()!).production).toBe(true);
  });

  it('signs after T minutes even below N entries', () => {
    process.env.CIVICOS_AUDIT_SIGN_EVERY = '1000';
    process.env.CIVICOS_AUDIT_SIGN_MINUTES = '15';
    recordAudit('A', 'x', 'y', 'ok');
    signHead(auditHead()!, Date.now() - 16 * 60_000);
    recordAudit('A', 'x', 'y2', 'ok');
    expect(lastSignedHead()!.seq).toBe(2);
  });

  it('marks heads from the development key as not production', () => {
    for (let i = 0; i < 3; i++) recordAudit('A', 'x', `y${i}`, 'ok');
    expect(lastSignedHead()).toMatchObject({ seq: 3, production: false });
    expect(verifyAuditChain().signed).toMatchObject({ ok: true, head: { production: false } });
  });

  it('fails verification when the tail is rewritten after a head was signed', () => {
    for (let i = 0; i < 3; i++) recordAudit('A', 'x', `y${i}`, 'ok');
    // Whoever holds the state drops the signed tail and rebuilds the chain consistently.
    chain().length = 2;
    recordAudit('Forger', 'x', 'other', 'ok');
    const v = verifyAuditChain();
    expect(v.ok).toBe(false);
    expect(v.signed?.problem).toMatch(/no longer matches signed head 3/);
  });

  it('fails verification when a signed head is altered', () => {
    for (let i = 0; i < 3; i++) recordAudit('A', 'x', `y${i}`, 'ok');
    (globalThis as unknown as { __civicosAuditHeads: { heads: { at: string }[] } }).__civicosAuditHeads.heads[0]!.at = '2020-01-01T00:00:00.000Z';
    expect(verifyAuditChain().signed?.problem).toMatch(/bad signature/);
  });
});
