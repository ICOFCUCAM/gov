// Mutual TLS between installations (review R10, finding I4/I7).
//
// A federation grant may name the partner installation's client certificate
// (its SHA-256 fingerprint, optionally its subject). From then on the
// partner's exchanges under that grant (/api/federation/exchange) are
// accepted only over mutual TLS with that certificate, in addition to its
// integration key. TLS is ended by the nation's ingress, which checks the
// client certificate against the federation CA and passes the result on in
// headers (nginx: `ssl-client-verify`, `ssl-client-subject-dn` and, with
// auth-tls-pass-certificate-to-upstream, the URL-encoded certificate in
// `ssl-client-cert`). The platform believes those headers only when told to
// (CIVICOS_TRUST_PROXY_CLIENT_CERT=1) and, when CIVICOS_FEDERATION_HOST is
// set, only on requests for that host (the ingress host that requires client
// certificates; the main host strips the headers). The fingerprint is
// computed here from the certificate itself.
//
// The other direction (this installation calling a partner) is
// lib/exchange/federation-client.ts.
//
// Durable through lib/data/persist.ts (`__civicosPartnerCerts`): grant id →
// binding. Every change is audited with the official's name.

import { X509Certificate, timingSafeEqual } from 'node:crypto';
import { listGrants, recordAudit } from '@/lib/data/store';
import { touch } from '@/lib/data/repo/track';

export interface CertBinding {
  /** SHA-256 fingerprint of the partner's client certificate (64 lowercase hex). */
  sha256: string;
  /** Its subject as the ingress reports it (RFC 2253, e.g. "CN=exchange.gov.example,O=…"), when given. */
  subject?: string;
  /** When the certificate expires, when it was given as a certificate. */
  notAfter?: string;
  by: string;
  at: string;
}

interface Db { bindings: Record<string, CertBinding> }
const g = globalThis as unknown as { __civicosPartnerCerts?: Db };
const db = (): Db => {
  const d = touch('__civicosPartnerCerts', g.__civicosPartnerCerts ??= { bindings: {} });
  d.bindings ??= {};
  return d;
};
export function resetPartnerCerts(): void { g.__civicosPartnerCerts = undefined; }

/** 64 lowercase hex from "AB:CD:…", "abcd…" or with spaces; null when it is not a SHA-256 fingerprint. */
export function normaliseFingerprint(v: string): string | null {
  const h = v.replace(/[\s:]/g, '').toLowerCase();
  return /^[0-9a-f]{64}$/.test(h) ? h : null;
}

/** The SHA-256 fingerprint of a PEM (or DER) certificate. */
export function fingerprintOf(cert: string | Buffer): { sha256: string; subject: string; notAfter: string } {
  const c = new X509Certificate(cert);
  return { sha256: normaliseFingerprint(c.fingerprint256)!, subject: c.subject.split('\n').reverse().join(','), notAfter: new Date(c.validTo).toISOString() };
}

const normDn = (dn: string) => dn.split(/\s*[,/\n]\s*/).filter(Boolean).map(p => p.trim().toLowerCase()).sort().join(',');

export const grantCertificate = (grantId: string): CertBinding | undefined => db().bindings[grantId];

/** Name the partner's client certificate for a grant (a PEM certificate, or a fingerprint with an optional subject). */
export function setGrantCertificate(grantId: string, input: { certificate?: unknown; sha256?: unknown; subject?: unknown }, by: string, now = Date.now()): CertBinding | { error: string; status: number } {
  if (!listGrants().some(x => x.id === grantId)) return { error: 'Grant not found', status: 404 };
  let b: Omit<CertBinding, 'by' | 'at'>;
  if (typeof input.certificate === 'string' && input.certificate.includes('BEGIN CERTIFICATE')) {
    try { b = fingerprintOf(input.certificate); } catch { return { error: 'Not a readable X.509 certificate (PEM)', status: 422 }; }
  } else if (typeof input.sha256 === 'string' && normaliseFingerprint(input.sha256)) {
    b = { sha256: normaliseFingerprint(input.sha256)!, ...(typeof input.subject === 'string' && input.subject.trim() ? { subject: input.subject.trim().slice(0, 500) } : {}) };
  } else {
    return { error: 'Send the partner\'s client certificate (PEM) as "certificate", or its SHA-256 fingerprint as "sha256"', status: 422 };
  }
  const binding: CertBinding = { ...b, by, at: new Date(now).toISOString() };
  const replaced = !!db().bindings[grantId];
  db().bindings[grantId] = binding;
  recordAudit(by, replaced ? 'federation.certificate.replace' : 'federation.certificate.register', `Grant:${grantId}`, 'ok', `sha256:${binding.sha256.slice(0, 16)}…${binding.subject ? ` · ${binding.subject.slice(0, 120)}` : ''}`);
  return binding;
}

export function removeGrantCertificate(grantId: string, by: string): { ok: true } | { error: string; status: number } {
  const cur = db().bindings[grantId];
  if (!cur) return { error: 'This grant names no client certificate', status: 404 };
  delete db().bindings[grantId];
  recordAudit(by, 'federation.certificate.remove', `Grant:${grantId}`, 'ok', `sha256:${cur.sha256.slice(0, 16)}…`);
  return { ok: true };
}

export interface ClientIdentity {
  /** The ingress's headers are believed here (CIVICOS_TRUST_PROXY_CLIENT_CERT=1, and the federation host when set). */
  trusted: boolean;
  /** The ingress verified a client certificate. */
  verified: boolean;
  subject?: string;
  sha256?: string;
  problem?: string;
}

/** The client certificate the ingress verified for this request, from its headers (only when trusted). */
export function clientIdentity(headers: { get(name: string): string | null }, env: NodeJS.ProcessEnv = process.env, requestHost = headers.get('host') ?? ''): ClientIdentity {
  if (env.CIVICOS_TRUST_PROXY_CLIENT_CERT !== '1') return { trusted: false, verified: false, problem: 'this server does not accept client certificates from the ingress (CIVICOS_TRUST_PROXY_CLIENT_CERT)' };
  const host = env.CIVICOS_FEDERATION_HOST?.trim().toLowerCase();
  if (host && requestHost.toLowerCase().replace(/:\d+$/, '') !== host) {
    return { trusted: false, verified: false, problem: `exchanges under this grant must come through the federation host ${host}` };
  }
  const verify = headers.get(env.CIVICOS_CLIENT_CERT_VERIFY_HEADER?.trim() || 'ssl-client-verify') ?? '';
  if (verify !== 'SUCCESS') return { trusted: true, verified: false, problem: verify ? `the ingress did not verify the client certificate (${verify.slice(0, 80)})` : 'no client certificate was presented' };
  const subject = headers.get(env.CIVICOS_CLIENT_CERT_SUBJECT_HEADER?.trim() || 'ssl-client-subject-dn') ?? undefined;
  const raw = headers.get(env.CIVICOS_CLIENT_CERT_HEADER?.trim() || 'ssl-client-cert');
  let sha256: string | undefined;
  if (raw) {
    try { sha256 = fingerprintOf(decodeURIComponent(raw)).sha256; } catch { return { trusted: true, verified: false, subject, problem: 'the client certificate passed on by the ingress is not readable' }; }
  }
  return { trusted: true, verified: true, ...(subject ? { subject } : {}), ...(sha256 ? { sha256 } : {}) };
}

/**
 * Whether a request may use a grant: always when the grant names no client
 * certificate; otherwise only with the verified certificate it names.
 */
export function checkPartnerCertificate(grantId: string | undefined, headers: { get(name: string): string | null }, env: NodeJS.ProcessEnv = process.env, requestHost?: string): { ok: true; required: boolean; sha256?: string } | { ok: false; reason: string } {
  const binding = grantId ? db().bindings[grantId] : undefined;
  if (!binding) return { ok: true, required: false };
  const id = clientIdentity(headers, env, requestHost ?? headers.get('host') ?? '');
  if (!id.verified) return { ok: false, reason: `this grant requires mutual TLS with the partner's registered certificate: ${id.problem}` };
  if (!id.sha256) return { ok: false, reason: 'the ingress did not pass the client certificate on (auth-tls-pass-certificate-to-upstream), so its fingerprint cannot be matched' };
  const same = timingSafeEqual(Buffer.from(id.sha256, 'hex'), Buffer.from(binding.sha256, 'hex'));
  if (!same) return { ok: false, reason: `the client certificate (sha256:${id.sha256.slice(0, 16)}…) is not the one registered for this grant` };
  if (binding.subject && id.subject && normDn(binding.subject) !== normDn(id.subject)) return { ok: false, reason: 'the client certificate\'s subject is not the one registered for this grant' };
  return { ok: true, required: true, sha256: id.sha256 };
}

/** The grant a partner tenant's exchange rests on (the same rule as federationExchange()). */
export const grantForTenant = (tenant: string): string | undefined => listGrants().find(x => x.fromTenant === 'home' && x.toTenant === tenant)?.id;

/** Counts for the status read (no fingerprints of other grants). */
export const certificateBindings = (): number => Object.keys(db().bindings).length;
