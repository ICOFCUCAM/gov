import { describe, it, expect } from 'vitest';
import { signCitizen, verifyCitizen } from './citizen-session';
import { signClaims, verifyToken } from './session-token';

const secret = 'x'.repeat(40);

describe('citizen sessions', () => {
  it('verify as citizens and never as officials, and the reverse', async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = await signCitizen({ sub: 'abc', name: 'Ada', issuer: 'https://id.example', iat: now, exp: now + 60, assurance: 'substantial' }, secret);
    expect(await verifyCitizen(t, secret)).toEqual({ sub: 'abc', name: 'Ada', issuer: 'https://id.example', iat: now, exp: now + 60, assurance: 'substantial' });
    expect(await verifyToken(t, secret)).toBeNull();
    const official = await signClaims({ sub: 'local:1', name: 'Official', method: 'local', iat: now, exp: now + 60 }, secret);
    expect(await verifyCitizen(official, secret)).toBeNull();
    expect(await verifyCitizen(t, 'y'.repeat(40))).toBeNull();
  });
});
