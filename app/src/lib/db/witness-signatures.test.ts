import { describe, it, expect } from 'vitest';
import {
  canonicalWitnessMaterial, signWitnessAttestation, verifyWitnessAttestation,
} from './signatures';

describe('canonicalWitnessMaterial', () => {
  it('formats as <scope>|<seq>|<hash>|<label> in stable order', () => {
    expect(canonicalWitnessMaterial('substrate:self', 42, 'abc', 'auditor-1'))
      .toBe('substrate:self|42|abc|auditor-1');
  });

  it('is deterministic for identical input', () => {
    const a = canonicalWitnessMaterial('x', 1, 'h', 'l');
    const b = canonicalWitnessMaterial('x', 1, 'h', 'l');
    expect(a).toBe(b);
  });

  it('differs when any field changes', () => {
    const base = canonicalWitnessMaterial('x', 1, 'h', 'l');
    expect(canonicalWitnessMaterial('y', 1, 'h', 'l')).not.toBe(base);
    expect(canonicalWitnessMaterial('x', 2, 'h', 'l')).not.toBe(base);
    expect(canonicalWitnessMaterial('x', 1, 'h2', 'l')).not.toBe(base);
    expect(canonicalWitnessMaterial('x', 1, 'h', 'l2')).not.toBe(base);
  });
});

describe('signWitnessAttestation', () => {
  it('returns null on a Node-only environment (WebCrypto unavailable)', async () => {
    const out = await signWitnessAttestation({
      scope: 'x', observedSeq: 1, observedHash: 'h', witnessLabel: 'l',
    });
    expect(out).toBeNull();
  });
});

describe('verifyWitnessAttestation', () => {
  it('returns null on a Node-only environment (WebCrypto unavailable)', async () => {
    const out = await verifyWitnessAttestation({
      scope: 'x', observedSeq: 1, observedHash: 'h', witnessLabel: 'l',
      jwk: {} as JsonWebKey, hexSignature: 'aa',
    });
    expect(out).toBeNull();
  });
});
