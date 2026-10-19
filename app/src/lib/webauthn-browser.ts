'use client';

// The browser's half of passkeys: turn the server's options (JSON, binary
// fields in base64url) into what navigator.credentials expects, and the
// authenticator's answer back into JSON for the server
// (/api/auth/passkeys, /api/auth/official). The server checks everything
// (lib/auth/webauthn.ts); nothing here is trusted.

const toBytes = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};
const toB64u = (buf: ArrayBuffer | null) => {
  if (!buf) return null;
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const passkeysSupported = (): boolean => typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;

type Desc = { type: 'public-key'; id: string; transports?: string[] };
const descs = (l: Desc[] | undefined) => (l ?? []).map(d => ({ type: d.type, id: toBytes(d.id), transports: d.transports as AuthenticatorTransport[] | undefined }));

export interface CreationJSON {
  challenge: string; rp: { id: string; name: string }; user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[]; timeout: number; attestation: AttestationConveyancePreference;
  authenticatorSelection: AuthenticatorSelectionCriteria; excludeCredentials: Desc[];
}
export interface RequestJSON { challenge: string; rpId: string; timeout: number; userVerification: UserVerificationRequirement; allowCredentials: Desc[] }

/** Make a passkey (navigator.credentials.create) and return the answer as JSON. */
export async function createPasskey(o: CreationJSON) {
  const c = (await navigator.credentials.create({ publicKey: {
    ...o, challenge: toBytes(o.challenge), user: { ...o.user, id: toBytes(o.user.id) }, excludeCredentials: descs(o.excludeCredentials),
  } })) as PublicKeyCredential | null;
  if (!c) throw new Error('No passkey was made');
  const r = c.response as AuthenticatorAttestationResponse;
  return { id: c.id, rawId: toB64u(c.rawId), type: c.type,
    response: { clientDataJSON: toB64u(r.clientDataJSON), attestationObject: toB64u(r.attestationObject), transports: typeof r.getTransports === 'function' ? r.getTransports() : [] } };
}

/** Use a passkey (navigator.credentials.get) and return the answer as JSON. */
export async function getPasskey(o: RequestJSON) {
  const c = (await navigator.credentials.get({ publicKey: { ...o, challenge: toBytes(o.challenge), allowCredentials: descs(o.allowCredentials) } })) as PublicKeyCredential | null;
  if (!c) throw new Error('No passkey was used');
  const r = c.response as AuthenticatorAssertionResponse;
  return { id: c.id, rawId: toB64u(c.rawId), type: c.type,
    response: { clientDataJSON: toB64u(r.clientDataJSON), authenticatorData: toB64u(r.authenticatorData), signature: toB64u(r.signature), userHandle: toB64u(r.userHandle) } };
}
