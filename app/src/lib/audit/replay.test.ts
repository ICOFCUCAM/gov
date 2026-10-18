import { describe, it, expect } from 'vitest';
import {
  fnv1aHex, recomputeEntryHash, replayScope, replayWitnesses, replayDump,
  type RawAuditEntry,
} from './replay';

describe('fnv1aHex', () => {
  it('matches the documented FNV-1a 32-bit seed', () => {
    // Empty string maps to the offset basis.
    expect(fnv1aHex('')).toBe('811c9dc5');
  });

  it('is deterministic and 8-hex wide', () => {
    expect(fnv1aHex('hello')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex('hello')).toBe(fnv1aHex('hello'));
  });

  it('changes when any byte changes', () => {
    expect(fnv1aHex('a')).not.toBe(fnv1aHex('b'));
  });
});

function makeEntry(seq: number, scope: string, prevHash: string): RawAuditEntry {
  const partial = { seq, scope, actor: 'a', action: 'x', subject: 's', detail: 'd', prev_hash: prevHash } as Omit<RawAuditEntry, 'hash'>;
  const hash = recomputeEntryHash(partial as RawAuditEntry, prevHash);
  return { ...partial, hash };
}

describe('replayScope', () => {
  it('reports chainOk for a well-formed chain', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const e2 = makeEntry(2, 'X', e1.hash);
    const e3 = makeEntry(3, 'X', e2.hash);
    const r = replayScope('X', [e1, e2, e3]);
    expect(r.chainOk).toBe(true);
    expect(r.entries).toBe(3);
    expect(r.brokenAtSeq).toBeNull();
  });

  it('detects a hash mutation', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const tampered = { ...e1, hash: 'deadbeef' };
    const r = replayScope('X', [tampered]);
    expect(r.chainOk).toBe(false);
    expect(r.brokenAtSeq).toBe(1);
    expect(r.reason).toMatch(/hash mismatch/);
  });

  it('detects a prev_hash mutation', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const e2 = makeEntry(2, 'X', e1.hash);
    // Rewrite e2.prev_hash to a rogue value.
    const tampered = { ...e2, prev_hash: 'ROGUE' };
    const r = replayScope('X', [e1, tampered]);
    expect(r.chainOk).toBe(false);
    expect(r.brokenAtSeq).toBe(2);
    expect(r.reason).toMatch(/prev_hash mismatch/);
  });

  it('treats out-of-order input by sorting by seq', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const e2 = makeEntry(2, 'X', e1.hash);
    const r = replayScope('X', [e2, e1]);
    expect(r.chainOk).toBe(true);
  });
});

describe('replayWitnesses', () => {
  it('reports matched=0 and no divergence when no witnesses', () => {
    const r = replayWitnesses([], new Map());
    expect(r.attestations).toBe(0);
    expect(r.divergent).toEqual([]);
  });

  it('matches a witness whose attested hash equals the live hash', () => {
    const r = replayWitnesses(
      [{ id: 'w-1', scope: 'X', observed_seq: 5, observed_hash: 'abcd', witness_label: 'l' }],
      new Map([['X|5', 'abcd']]),
    );
    expect(r.matched).toBe(1);
    expect(r.divergent).toEqual([]);
  });

  it('reports divergence when the attested hash differs', () => {
    const r = replayWitnesses(
      [{ id: 'w-1', scope: 'X', observed_seq: 5, observed_hash: 'abcd', witness_label: 'l' }],
      new Map([['X|5', 'ROGUE']]),
    );
    expect(r.divergent).toHaveLength(1);
    expect(r.divergent[0]!.live_hash).toBe('ROGUE');
  });

  it('reports divergence when the live seq is missing', () => {
    const r = replayWitnesses(
      [{ id: 'w-1', scope: 'X', observed_seq: 5, observed_hash: 'abcd', witness_label: 'l' }],
      new Map(),
    );
    expect(r.divergent).toHaveLength(1);
    expect(r.divergent[0]!.live_hash).toBeNull();
  });
});

describe('replayDump', () => {
  it('rejects non-object input', () => {
    expect(replayDump('not an object')).toEqual({ error: 'input is not an object' });
    expect(replayDump(null)).toEqual({ error: 'input is not an object' });
  });

  it('rejects input without tables', () => {
    expect(replayDump({})).toEqual({ error: 'input.tables missing' });
  });

  it('reports ok:true for a well-formed dump with no witness divergence', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const e2 = makeEntry(2, 'X', e1.hash);
    const out = replayDump({
      tables: {
        audit_entries: { rows: [e1, e2] },
        audit_witnesses: { rows: [
          { id: 'w', scope: 'X', observed_seq: 2, observed_hash: e2.hash, witness_label: 'auditor' },
        ] },
      },
    });
    expect('error' in out).toBe(false);
    if ('error' in out) return;
    expect(out.ok).toBe(true);
    expect(out.scopes_checked).toBe(1);
    expect(out.witnesses.matched).toBe(1);
  });

  it('reports ok:false when the chain is tampered', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const tampered = { ...e1, detail: 'rogue' }; // hash no longer matches
    const out = replayDump({
      tables: { audit_entries: { rows: [tampered] }, audit_witnesses: { rows: [] } },
    });
    if ('error' in out) return;
    expect(out.ok).toBe(false);
    expect(out.chains[0]!.chainOk).toBe(false);
  });

  it('reports ok:false when a witness attestation diverges from the live chain', () => {
    const e1 = makeEntry(1, 'X', '00000000');
    const out = replayDump({
      tables: {
        audit_entries: { rows: [e1] },
        audit_witnesses: { rows: [
          { id: 'w', scope: 'X', observed_seq: 1, observed_hash: 'ROGUE', witness_label: 'auditor' },
        ] },
      },
    });
    if ('error' in out) return;
    expect(out.ok).toBe(false);
    expect(out.witnesses.divergent).toHaveLength(1);
  });
});

describe('SHA-256 chains (v2)', () => {
  it('matches the standard SHA-256', async () => {
    const { sha256Hex } = await import('./sha256');
    const { createHash } = await import('node:crypto');
    for (const s of ['', 'abc', 'Mombasa · Nairobi City', 'ع'.repeat(100), 'x'.repeat(1000)]) {
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s, 'utf8').digest('hex'));
    }
  });

  it('verifies a chain that moves from FNV-1a to SHA-256, and refuses a fall-back', async () => {
    const { canonicalV2 } = await import('./replay');
    const { sha256Hex } = await import('./sha256');
    const a: RawAuditEntry = { seq: 1, scope: 'X', actor: 'a', action: 'boot', subject: 's', detail: '', prev_hash: '00000000', hash: '' };
    a.hash = recomputeEntryHash(a, '00000000');
    const b: RawAuditEntry = { seq: 2, scope: 'X', actor: 'b', action: 'publish', subject: 's|x', detail: 'd;1', at_ms: 1760745600000, prev_hash: a.hash, hash: '', hash_alg: 'sha256-v2' };
    b.hash = sha256Hex(canonicalV2(b, a.hash));
    expect(b.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(replayScope('X', [a, b]).chainOk).toBe(true);
    expect(replayScope('X', [a, { ...b, at_ms: 1 }]).chainOk).toBe(false);
    const c: RawAuditEntry = { seq: 3, scope: 'X', actor: 'c', action: 'x', subject: 's', detail: '', prev_hash: b.hash, hash: '' };
    c.hash = recomputeEntryHash(c, b.hash);
    expect(replayScope('X', [a, b, c])).toMatchObject({ chainOk: false, brokenAtSeq: 3 });
  });
});
