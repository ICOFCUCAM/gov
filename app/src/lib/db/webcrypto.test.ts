import { describe, it, expect } from 'vitest';
import { ensureSigningKey, publicSigningJwk, signMessage, verifyMessage } from './webcrypto';

// vitest's default environment is 'node' — `window` is undefined, so every
// SSR-safe helper should return null and never throw.

describe('webcrypto on the server (no window)', () => {
  it('ensureSigningKey returns null', async () => {
    expect(await ensureSigningKey()).toBeNull();
  });

  it('publicSigningJwk returns null', async () => {
    expect(await publicSigningJwk()).toBeNull();
  });

  it('signMessage returns null', async () => {
    expect(await signMessage('anything')).toBeNull();
  });

  it('verifyMessage returns null', async () => {
    expect(await verifyMessage({} as JsonWebKey, 'm', '00')).toBeNull();
  });
});
