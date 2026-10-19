import { describe, expect, it } from 'vitest';
import { ALG_EDDSA, ALG_ES256, ALG_RS256, cborDecode, coseToKey, verifyAssertion, verifyRegistration, WebAuthnError } from './webauthn';
import { cborEncode, SoftAuthenticator } from './soft-authenticator';

// Real responses from browsers and authenticators, published with
// SimpleWebAuthn's test suite (MIT licence,
// packages/server/src/{registration,authentication}/*.test.ts): an independent
// check that this verifier reads what devices actually send.
const fromUtf8 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const DEV = { origins: ['https://dev.dontneeda.pw'], rpId: 'dev.dontneeda.pw', requireUv: false };

const attestationNone = {
  id: 'AdKXJEch1aV5Wo7bj7qLHskVY4OoNaj9qu8TPdJ7kSAgUeRxWNngXlcNIGt4gexZGKVGcqZpqqWordXb_he1izY',
  response: {
    attestationObject: 'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjFPdxHEOnAiLIp26idVjIguzn3I' +
      'pr_RlsKZWsa-5qK-KBFAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQHSlyRHIdWleVqO24-6ix7JFWODqDWo_arvEz3Se' +
      '5EgIFHkcVjZ4F5XDSBreIHsWRilRnKmaaqlqK3V2_4XtYs2pQECAyYgASFYID5PQTZQQg6haZFQWFzqfAOyQ_ENs' +
      'MH8xxQ4GRiNPsqrIlggU8IVUOV8qpgk_Jh-OTaLuZL52KdX1fTht07X4DiQPow',
    clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYUVWalkxQlhkWHBw' +
      'VURBd1NEQndOV2Q0YURKZmRUVmZVRU0wVG1WWloyUSIsIm9yaWdpbiI6Imh0dHBzOlwvXC9kZXYuZG9udG5lZWRh' +
      'LnB3IiwiYW5kcm9pZFBhY2thZ2VOYW1lIjoib3JnLm1vemlsbGEuZmlyZWZveCJ9',
  },
  type: 'public-key',
};
const attestationNoneChallenge = fromUtf8('hEccPWuziP00H0p5gxh2_u5_PC4NeYgd');

const rsaNone = {
  id: 'kGXv4RJWLeXRw8Yf3T22K3Gq_GGeDv9OKYmAHLm0Ylo',
  response: {
    attestationObject:
      'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVkBZz3cRxDpwIiyKduonVYyILs59yKa_0ZbCmVrGvuaivigRQAAAABgKLAXsdRMArSzr82vyWuyACCQZe_hElYt5dHDxh_dPbYrcar8YZ4O_04piYAcubRiWqQBAwM5AQAgWQEA8X6V649G2vwB99CSf_luwR0jj7oDg_GhA3TQSnNYIwfQJldxT5dmi9H8IjjCrTP28iNuKl29hc3Mowux1FZB0bc5AEJ2oV3JCOMGP9NZKGmOosF7iBN2GtGY7Nomcs-ruBv2mxp1nTm6mv5B8XNwh0e18uTA5AJCsl-k6lNLYB2XBIQ3fy2-TjSQ8IOMLypWQbWWBJXzLmepaJ6EWe6kf_NaxpA2chWsaekZcr8xG6OIo3iGh0Mpags_qBZtN4n2TDn0R2LheLk4yQ0R_oOAVtX963Yuw0x5NYSZyMNSMi_1RSEPTYn5AILmIzQskglDaWJYtnjKz4QLuXWCRRYyDSFDAQAB',
    clientDataJSON:
      'eyJjaGFsbGVuZ2UiOiJwWVozVlgyeWI4ZFM5eXBsTnhKQ2hpWGhQR0JrOGdaelRBeUoyaVU1eDFrIiwiY2xpZW50RXh0ZW5zaW9ucyI6e30sImhhc2hBbGdvcml0aG0iOiJTSEEtMjU2Iiwib3JpZ2luIjoiaHR0cHM6Ly9kZXYuZG9udG5lZWRhLnB3IiwidHlwZSI6IndlYmF1dGhuLmNyZWF0ZSJ9',
  },
  type: 'public-key',
};

const assertionResponse = {
  id: 'KEbWNCc7NgaYnUyrNeFGX9_3Y-8oJ3KwzjnaiD1d1LVTxR7v3CaKfCz2Vy_g_MHSh7yJ8yL0Pxg6jo_o0hYiew',
  response: {
    authenticatorData: 'PdxHEOnAiLIp26idVjIguzn3Ipr_RlsKZWsa-5qK-KABAAAAkA==',
    clientDataJSON: 'eyJjaGFsbGVuZ2UiOiJkRzkwWVd4c2VWVnVhWEYxWlZaaGJIVmxSWFpsY25sVWFXMWwiLCJj' +
      'bGllbnRFeHRlbnNpb25zIjp7fSwiaGFzaEFsZ29yaXRobSI6IlNIQS0yNTYiLCJvcmlnaW4iOiJodHRwczovL2Rldi5k' +
      'b250bmVlZGEucHciLCJ0eXBlIjoid2ViYXV0aG4uZ2V0In0=',
    signature: 'MEUCIQDYXBOpCWSWq2Ll4558GJKD2RoWg958lvJSB_GdeokxogIgWuEVQ7ee6AswQY0OsuQ6y8Ks6jhd45bDx92wjXKs900=',
  },
  type: 'public-key',
};
const assertionCredential = {
  id: 'KEbWNCc7NgaYnUyrNeFGX9_3Y-8oJ3KwzjnaiD1d1LVTxR7v3CaKfCz2Vy_g_MHSh7yJ8yL0Pxg6jo_o0hYiew',
  publicKey: 'pQECAyYgASFYIIheFp-u6GvFT2LNGovf3ZrT0iFVBsA_76rRysxRG9A1Ilgg8WGeA6hPmnab0HAViUYVRkwTNcN77QBf_RR0dv3lIvQ',
  signCount: 143,
};
const assertionChallenge = fromUtf8('totallyUniqueValueEveryTime');

describe('WebAuthn against published device responses', () => {
  it('verifies a "none" registration (ES256) and keeps only the public key', () => {
    const c = verifyRegistration(attestationNone, { ...DEV, challenge: attestationNoneChallenge });
    expect(c.fmt).toBe('none');
    expect(c.signCount).toBe(0);
    expect(c.alg).toBe(ALG_ES256);
    expect(c.id).toBe(attestationNone.id);
    expect(c.publicKey).toBe('pQECAyYgASFYID5PQTZQQg6haZFQWFzqfAOyQ_ENsMH8xxQ4GRiNPsqrIlggU8IVUOV8qpgk_Jh-OTaLuZL52KdX1fTht07X4DiQPow');
  });

  it('verifies a "none" registration with an RSA key', () => {
    const c = verifyRegistration(rsaNone, { ...DEV, challenge: 'pYZ3VX2yb8dS9yplNxJChiXhPGBk8gZzTAyJ2iU5x1k' });
    expect(c.alg).toBe(ALG_RS256);
    expect(c.id).toBe(rsaNone.id);
  });

  it('refuses the registration for another challenge, origin or relying party', () => {
    expect(() => verifyRegistration(attestationNone, { ...DEV, challenge: fromUtf8('shouldhavebeenthisvalue') })).toThrow(/challenge/);
    expect(() => verifyRegistration(attestationNone, { ...DEV, challenge: attestationNoneChallenge, origins: ['https://different.address'] })).toThrow(/origin/);
    expect(() => verifyRegistration(attestationNone, { ...DEV, challenge: attestationNoneChallenge, rpId: 'other.example' })).toThrow(/another site/);
  });

  it('verifies a real assertion and returns the new counter', () => {
    const r = verifyAssertion(assertionResponse, { ...DEV, challenge: assertionChallenge }, assertionCredential);
    expect(r.signCount).toBe(144);
  });

  it('refuses the assertion when the counter does not move forward, or the challenge or origin differ', () => {
    expect(() => verifyAssertion(assertionResponse, { ...DEV, challenge: assertionChallenge }, { ...assertionCredential, signCount: 144 })).toThrow(/counter/);
    expect(() => verifyAssertion(assertionResponse, { ...DEV, challenge: fromUtf8('other') }, assertionCredential)).toThrow(/challenge/);
    expect(() => verifyAssertion(assertionResponse, { ...DEV, challenge: assertionChallenge, origins: ['https://evil.example'] }, assertionCredential)).toThrow(/origin/);
  });

  it('refuses a tampered signature', () => {
    const sig = Buffer.from(assertionResponse.response.signature, 'base64url');
    sig[sig.length - 1] = sig[sig.length - 1]! ^ 1;
    const bad = { ...assertionResponse, response: { ...assertionResponse.response, signature: sig.toString('base64url') } };
    expect(() => verifyAssertion(bad, { ...DEV, challenge: assertionChallenge }, assertionCredential)).toThrow(/signature/);
  });
});

describe('WebAuthn with a software authenticator', () => {
  const rp = { rpId: 'gov.example', origin: 'https://gov.example' };
  const expectFor = (challenge: string, requireUv = false) => ({ challenge, origins: [rp.origin], rpId: rp.rpId, requireUv });

  for (const alg of [ALG_ES256, ALG_EDDSA, ALG_RS256]) {
    it(`registers and signs in (alg ${alg})`, () => {
      const a = new SoftAuthenticator({ ...rp, alg });
      const cred = verifyRegistration(a.register('c1'), expectFor('c1', true));
      expect(cred.alg).toBe(alg);
      const one = verifyAssertion(a.assert('c2'), expectFor('c2', true), cred);
      expect(one.signCount).toBe(1);
      expect(one.uv).toBe(true);
      const two = verifyAssertion(a.assert('c3'), expectFor('c3'), { ...cred, signCount: one.signCount });
      expect(two.signCount).toBe(2);
    });
  }

  it('refuses a replayed assertion (same counter) and one signed by another key', () => {
    const a = new SoftAuthenticator(rp);
    const cred = verifyRegistration(a.register('r'), expectFor('r'));
    const first = a.assert('x');
    const after = verifyAssertion(first, expectFor('x'), cred);
    expect(() => verifyAssertion(first, expectFor('x'), { ...cred, signCount: after.signCount })).toThrow(/counter/);
    const other = new SoftAuthenticator(rp);
    const forged = { ...other.assert('y'), id: cred.id, rawId: cred.id };
    expect(() => verifyAssertion(forged, expectFor('y'), cred)).toThrow(/signature/);
  });

  it('refuses a registration answered as a sign-in, for another relying party, or without presence', () => {
    const a = new SoftAuthenticator(rp);
    const cred = verifyRegistration(a.register('r'), expectFor('r'));
    expect(() => verifyAssertion(a.assert('z', { type: 'webauthn.create' }), expectFor('z'), cred)).toThrow(/sign-in/);
    expect(() => verifyAssertion(a.assert('z', { rpId: 'evil.example' }), expectFor('z'), cred)).toThrow(/another site/);
    const absent = new SoftAuthenticator({ ...rp, up: false });
    expect(() => verifyRegistration(absent.register('p'), expectFor('p'))).toThrow(/present/);
    const noUv = new SoftAuthenticator({ ...rp, uv: false });
    expect(() => verifyRegistration(noUv.register('p'), expectFor('p', true))).toThrow(/verify the person/);
  });

  it('reads definite CBOR and refuses indefinite lengths and short RSA keys', () => {
    const m = new Map<number | string, number | string>([[1, 'a'], ['k', -5]]);
    const { value, end } = cborDecode(cborEncode(m as never));
    expect(end).toBe(cborEncode(m as never).length);
    expect((value as Map<unknown, unknown>).get('k')).toBe(-5);
    expect(() => cborDecode(Buffer.from([0x5f, 0x41, 0x00, 0xff]))).toThrow(WebAuthnError);
    expect(() => coseToKey(cborEncode(new Map<number, number | Buffer>([[1, 3], [3, -257], [-1, Buffer.alloc(128, 1)], [-2, Buffer.from([1, 0, 1])]]) as never))).toThrow(/2048/);
  });
});
