import { describe, it, expect, beforeEach } from 'vitest';
import { recordAudit, listAudit, verifyAuditChain, auditHashV2 } from './store';
import type { AuditEntry } from '@/lib/api/types';

const chain = () => (globalThis as unknown as { __civicos: { audit: AuditEntry[] } }).__civicos.audit;

describe('the audit chain (SHA-256, v2)', () => {
  beforeEach(() => { chain().length = 0; });

  it('hashes every field with SHA-256 and links each entry to the last', () => {
    recordAudit('Commissioner', 'site.content.publish', 'PublicSite:police/v1', 'ok', 'news');
    recordAudit('Director', 'twin.source.run', 'Twin:SRC-1/RUN-2', 'ok', '3 of 4 rows');
    const [second, first] = listAudit();
    expect(first!.alg).toBe('sha256-v2');
    expect(first!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(second!.prevHash).toBe(first!.hash);
    expect(verifyAuditChain()).toEqual({ ok: true, checked: 2 });
  });

  it('breaks when any field changes — actor, time and detail included', () => {
    for (const field of ['actor', 'at', 'detail', 'outcome'] as const) {
      chain().length = 0;
      recordAudit('Commissioner', 'site.content.publish', 'PublicSite:police/v1', 'ok', 'news');
      recordAudit('Director', 'site.content.publish', 'PublicSite:police/v2', 'ok', 'alert');
      (chain()[0] as unknown as Record<string, string>)[field] = 'forged';
      expect(verifyAuditChain(), field).toMatchObject({ ok: false, brokenAtSeq: 1 });
    }
  });

  it('still verifies entries written before v2, and refuses a fall-back after it', () => {
    const legacyHash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, '0') + '…' + (h & 0xffff).toString(16); };
    const legacy: AuditEntry = { id: 'AU-OLD', at: '2026-01-01T00:00:00Z', actor: 'system', action: 'boot', resource: 'Platform', outcome: 'ok', seq: 1, prevHash: null, hash: legacyHash('GENESIS|boot|Platform|ok|1') };
    chain().push(legacy);
    recordAudit('Director', 'twin.source.run', 'Twin:SRC-1', 'ok');
    expect(verifyAuditChain()).toEqual({ ok: true, checked: 2 });
    const e2 = chain()[1]!;
    const fallback: AuditEntry = { id: 'AU-FB', at: e2.at, actor: 'x', action: 'y', resource: 'z', outcome: 'ok', seq: 3, prevHash: e2.hash, hash: legacyHash(`${e2.hash}|y|z|ok|3`) };
    chain().push(fallback);
    expect(verifyAuditChain()).toMatchObject({ ok: false, brokenAtSeq: 3 });
    expect(auditHashV2({ ...e2 })).toBe(e2.hash);
  });
});
