import { describe, it, expect, vi } from 'vitest';
import {
  canonicalSignatureMaterial,
  transitionDigest,
  transitionSignature,
} from './signatures';

vi.mock('@/lib/db/webcrypto', () => ({
  // Force the FNV-1a fallback path so this test stays pure (no crypto).
  signMessage: async () => null,
}));

describe('canonicalSignatureMaterial', () => {
  it('is the pipe-separated 5-tuple in the documented order', () => {
    expect(canonicalSignatureMaterial('a', 's', 'r', 'approve', 42))
      .toBe('a|s|r|approve|42');
  });
});

describe('transitionDigest', () => {
  it('produces an 8-hex FNV-1a digest', () => {
    const out = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    expect(out.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic for identical inputs', () => {
    const a = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    const b = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    expect(a.hash).toBe(b.hash);
  });

  it('changes when any field changes', () => {
    const base = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    expect(transitionDigest({ actorId: 'b', scope: 's', ref: 'r', action: 'approve', at: 1 }).hash).not.toBe(base.hash);
    expect(transitionDigest({ actorId: 'a', scope: 'x', ref: 'r', action: 'approve', at: 1 }).hash).not.toBe(base.hash);
    expect(transitionDigest({ actorId: 'a', scope: 's', ref: 'x', action: 'approve', at: 1 }).hash).not.toBe(base.hash);
    expect(transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'reject',  at: 1 }).hash).not.toBe(base.hash);
    expect(transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 2 }).hash).not.toBe(base.hash);
  });

  it('defaults `at` to now when omitted', () => {
    const t0 = Date.now();
    const out = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve' });
    expect(out.at).toBeGreaterThanOrEqual(t0);
    expect(out.at).toBeLessThanOrEqual(Date.now() + 5);
  });
});

describe('transitionSignature', () => {
  it('returns null without an actorId', async () => {
    const out = await transitionSignature({ actorId: null, scope: 's', ref: 'r', action: 'approve' });
    expect(out).toBeNull();
  });

  it('falls back to the FNV-1a digest when WebCrypto returns null', async () => {
    const out = await transitionSignature({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    expect(out).not.toBeNull();
    expect(out!.algorithm).toBe('fnv1a');
    expect(out!.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('emits a hash that matches the canonical FNV-1a digest', async () => {
    const sig = await transitionSignature({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    const dig = transitionDigest({ actorId: 'a', scope: 's', ref: 'r', action: 'approve', at: 1 });
    expect(sig!.hash).toBe(dig.hash);
  });
});
