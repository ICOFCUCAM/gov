// RFC 3161 time-stamps for signed audit heads, from the nation's own
// Time-Stamping Authority (review R7, finding D9).
//
// A signed head proves who signed it, not when: whoever holds the audit key
// could sign an old head later. A time-stamp token from the nation's TSA
// (CIVICOS_TSA_URL) binds the signed head to a time the TSA vouches for.
// When a head has been signed, the platform sends the TSA a TimeStampReq
// (RFC 3161 §2.4.1, built here in DER) over the SHA-256 of the signed head,
// with a fresh nonce, and keeps the token it returns with the head. The token
// is checked before it is kept: status granted, the message imprint and nonce
// are ours, the CMS signature (RFC 5652) is valid with the TSA certificate in
// the token, which must be for time-stamping; with CIVICOS_TSA_CA (the TSA's
// CA certificates, PEM) the certificate must also chain to it. /audit then
// shows "time-stamped by <TSA> at <genTime>".
//
// Settings: CIVICOS_TSA_URL (http(s); the TSA's own address), CIVICOS_TSA_CA,
// CIVICOS_TSA_AUTH (an Authorization header value, when the TSA asks for
// one), CIVICOS_TSA_TLS_CA (CA file for the TSA's web certificate),
// CIVICOS_TSA_POLICY (a policy OID to request). Off without CIVICOS_TSA_URL.

import { createHash, randomBytes, verify as verifySig, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Agent, fetch as undiciFetch } from 'undici';
import { TAG, ctx, read, expectTag, decodeOid, decodeUint, decodeTime, seq, int, oid, nul, octets, bool, type Node } from '@/lib/asn1/der';
import { withSpan, SpanKind } from '@/lib/ops/trace';

export const OID = {
  sha256: '2.16.840.1.101.3.4.2.1', sha384: '2.16.840.1.101.3.4.2.2', sha512: '2.16.840.1.101.3.4.2.3', sha1: '1.3.14.3.2.26',
  signedData: '1.2.840.113549.1.7.2', tstInfo: '1.2.840.113549.1.9.16.1.4',
  contentType: '1.2.840.113549.1.9.3', messageDigest: '1.2.840.113549.1.9.4',
  timeStamping: '1.3.6.1.5.5.7.3.8',
} as const;
const HASH_OF: Record<string, string> = { [OID.sha256]: 'sha256', [OID.sha384]: 'sha384', [OID.sha512]: 'sha512', [OID.sha1]: 'sha1' };
const SIG_HASH: Record<string, string | null> = {
  '1.2.840.113549.1.1.11': 'sha256', '1.2.840.113549.1.1.12': 'sha384', '1.2.840.113549.1.1.13': 'sha512', '1.2.840.113549.1.1.5': 'sha1',
  '1.2.840.10045.4.3.2': 'sha256', '1.2.840.10045.4.3.3': 'sha384', '1.2.840.10045.4.3.4': 'sha512',
  '1.3.101.112': null, // Ed25519
};
const RSA_ENCRYPTION = '1.2.840.113549.1.1.1';
const EC_PUBLIC_KEY = '1.2.840.10045.2.1';

// ── Request ───────────────────────────────────────────────────────────

/** TimeStampReq ::= SEQUENCE { version 1, messageImprint, reqPolicy?, nonce?, certReq } (SHA-256 imprint). */
export function buildTimeStampReq(input: { digest: Buffer; nonce?: Buffer; certReq?: boolean; policy?: string }): Buffer {
  if (input.digest.length !== 32) throw new Error('The message imprint must be a SHA-256 digest');
  return seq(
    int(1),
    seq(seq(oid(OID.sha256), nul()), octets(input.digest)),
    ...(input.policy ? [oid(input.policy)] : []),
    ...(input.nonce ? [int(input.nonce)] : []),
    ...(input.certReq ?? true ? [bool(true)] : []),
  );
}

// ── Response ──────────────────────────────────────────────────────────

const STATUS = ['granted', 'grantedWithMods', 'rejection', 'waiting', 'revocationWarning', 'revocationNotification'];

/** TimeStampResp ::= SEQUENCE { status PKIStatusInfo, timeStampToken ContentInfo? }. */
export function parseTimeStampResp(der: Buffer): { status: number; statusText: string; token?: Buffer } {
  const root = expectTag(read(der), TAG.SEQUENCE, 'TimeStampResp');
  const info = expectTag(root.children[0], TAG.SEQUENCE, 'PKIStatusInfo');
  const status = Number(decodeUint(expectTag(info.children[0], TAG.INTEGER, 'PKIStatus').value));
  const free = info.children.find(c => c.tag === TAG.SEQUENCE);
  const text = free?.children.map(c => c.value.toString('utf8')).join(' ');
  return { status, statusText: `${STATUS[status] ?? `status ${status}`}${text ? `: ${text}` : ''}`, ...(root.children[1] ? { token: root.children[1].der } : {}) };
}

export interface TstInfo {
  policy: string;
  hashAlgorithm: string;
  imprint: Buffer;
  /** Serial number, hex. */
  serial: string;
  /** ISO 8601. */
  genTime: string;
  nonce?: bigint;
}

export interface ParsedToken {
  tst: TstInfo;
  /** The TSTInfo DER, as signed. */
  eContent: Buffer;
  certificates: X509Certificate[];
  signer: { digestAlgorithm: string; signedAttrs?: Node; signatureAlgorithm: string; signature: Buffer; serial?: string };
}

const algOid = (n: Node | undefined, what: string) => decodeOid(expectTag(expectTag(n, TAG.SEQUENCE, what).children[0], TAG.OID, `${what} OID`).value);

/** ContentInfo { id-signedData, [0] SignedData { …, encapContentInfo { id-ct-TSTInfo, [0] OCTET STRING TSTInfo }, [0] certificates, signerInfos } }. */
export function parseToken(token: Buffer): ParsedToken {
  const ci = expectTag(read(token), TAG.SEQUENCE, 'ContentInfo');
  if (decodeOid(expectTag(ci.children[0], TAG.OID, 'contentType').value) !== OID.signedData) throw new Error('The token is not CMS SignedData');
  const sd = expectTag(expectTag(ci.children[1], ctx(0), '[0] content').children[0], TAG.SEQUENCE, 'SignedData');
  const encap = expectTag(sd.children[2], TAG.SEQUENCE, 'encapContentInfo');
  if (decodeOid(expectTag(encap.children[0], TAG.OID, 'eContentType').value) !== OID.tstInfo) throw new Error('The token does not hold a TSTInfo');
  const eContent = expectTag(expectTag(encap.children[1], ctx(0), '[0] eContent').children[0], TAG.OCTET_STRING, 'eContent').value;
  let i = 3;
  const certificates: X509Certificate[] = [];
  if (sd.children[i]?.tag === ctx(0)) { for (const c of sd.children[i]!.children) { try { certificates.push(new X509Certificate(c.der)); } catch { /* other certificate formats */ } } i++; }
  if (sd.children[i]?.tag === ctx(1)) i++; // crls
  const infos = expectTag(sd.children[i], TAG.SET, 'signerInfos');
  if (infos.children.length !== 1) throw new Error('The token must have exactly one signer');
  const si = expectTag(infos.children[0], TAG.SEQUENCE, 'SignerInfo');
  let j = 1;
  const sid = si.children[j++]!;
  const serial = sid.tag === TAG.SEQUENCE ? expectTag(sid.children[1], TAG.INTEGER, 'serial').value.toString('hex').replace(/^0+(?=.)/, '').toUpperCase() : undefined;
  const digestAlgorithm = algOid(si.children[j++], 'digestAlgorithm');
  const signedAttrs = si.children[j]?.tag === ctx(0) ? si.children[j++] : undefined;
  const signatureAlgorithm = algOid(si.children[j++], 'signatureAlgorithm');
  const signature = expectTag(si.children[j], TAG.OCTET_STRING, 'signature').value;

  const t = expectTag(read(eContent), TAG.SEQUENCE, 'TSTInfo');
  const mi = expectTag(t.children[2], TAG.SEQUENCE, 'messageImprint');
  const tst: TstInfo = {
    policy: decodeOid(expectTag(t.children[1], TAG.OID, 'policy').value),
    hashAlgorithm: algOid(mi.children[0], 'hashAlgorithm'),
    imprint: expectTag(mi.children[1], TAG.OCTET_STRING, 'hashedMessage').value,
    serial: decodeUint(expectTag(t.children[3], TAG.INTEGER, 'serialNumber').value).toString(16),
    genTime: decodeTime(expectTag(t.children[4], TAG.GeneralizedTime, 'genTime')),
  };
  for (const c of t.children.slice(5)) if (c.tag === TAG.INTEGER) tst.nonce = decodeUint(c.value);
  return { tst, eContent, certificates, signer: { digestAlgorithm, ...(signedAttrs ? { signedAttrs } : {}), signatureAlgorithm, signature, ...(serial ? { serial } : {}) } };
}

export interface TokenCheck {
  ok: boolean;
  /** The TSA, from its certificate's subject (CN, O) or the token. */
  tsa?: string;
  genTime?: string;
  serial?: string;
  policy?: string;
  /** The certificate chains to CIVICOS_TSA_CA (undefined when none is configured). */
  trusted?: boolean;
  problem?: string;
}

const subjectName = (c: X509Certificate): string => {
  const parts = Object.fromEntries(c.subject.split('\n').map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
  return [parts.CN, parts.O].filter(Boolean).join(', ') || c.subject.replace(/\n/g, ', ');
};

function verifyCms(p: ParsedToken): { cert?: X509Certificate; problem?: string } {
  const { signer } = p;
  const hash = HASH_OF[signer.digestAlgorithm];
  if (!hash) return { problem: `unsupported digest algorithm ${signer.digestAlgorithm}` };
  let signedBytes = p.eContent;
  if (signer.signedAttrs) {
    const attrs = new Map(signer.signedAttrs.children.map(a => [decodeOid(a.children[0]!.value), a.children[1]!]));
    const ct = attrs.get(OID.contentType)?.children[0];
    if (!ct || decodeOid(ct.value) !== OID.tstInfo) return { problem: 'the signed content type is not TSTInfo' };
    const md = attrs.get(OID.messageDigest)?.children[0];
    if (!md || !md.value.equals(createHash(hash).update(p.eContent).digest())) return { problem: 'the signed message digest does not match the TSTInfo' };
    // The signature covers the attributes as a SET OF (RFC 5652 §5.4), not the [0] IMPLICIT form.
    signedBytes = Buffer.concat([Buffer.from([TAG.SET]), signer.signedAttrs.der.subarray(1)]);
  }
  const sigHash = signer.signatureAlgorithm === RSA_ENCRYPTION || signer.signatureAlgorithm === EC_PUBLIC_KEY ? hash : SIG_HASH[signer.signatureAlgorithm];
  if (sigHash === undefined) return { problem: `unsupported signature algorithm ${signer.signatureAlgorithm}` };
  const candidates = signer.serial ? p.certificates.filter(c => c.serialNumber.replace(/^0+(?=.)/, '').toUpperCase() === signer.serial) : p.certificates;
  for (const cert of candidates.length ? candidates : p.certificates) {
    try { if (verifySig(sigHash, signedBytes, cert.publicKey, signer.signature)) return { cert }; } catch { /* try the next */ }
  }
  return { problem: p.certificates.length ? 'the TSA signature does not verify' : 'the token carries no TSA certificate (certReq)' };
}

function chainsTo(cert: X509Certificate, pool: X509Certificate[], anchors: X509Certificate[]): boolean {
  let cur = cert;
  for (let depth = 0; depth < 6; depth++) {
    if (anchors.some(a => a.fingerprint256 === cur.fingerprint256)) return true;
    const anchor = anchors.find(a => cur.checkIssued(a) && cur.verify(a.publicKey));
    if (anchor) return true;
    const next = pool.find(c => c !== cur && cur.checkIssued(c) && cur.verify(c.publicKey));
    if (!next) return false;
    cur = next;
  }
  return false;
}

/** Parse the CA bundle given as PEM text. */
export function parseCaBundle(pem: string): X509Certificate[] {
  return (pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? []).map(b => new X509Certificate(b));
}

/**
 * Check a token against what was asked: imprint (and nonce when given), the
 * TSA's CMS signature and certificate (for time-stamping, valid at genTime),
 * and, with `anchors`, its chain.
 */
export function checkToken(token: Buffer, expect: { digest: Buffer; nonce?: bigint; anchors?: X509Certificate[] }): TokenCheck {
  let p: ParsedToken;
  try { p = parseToken(token); } catch (e) { return { ok: false, problem: `unreadable token: ${(e as Error).message}` }; }
  const base = { genTime: p.tst.genTime, serial: p.tst.serial, policy: p.tst.policy };
  if (p.tst.hashAlgorithm !== OID.sha256 || !p.tst.imprint.equals(expect.digest)) return { ok: false, ...base, problem: 'the message imprint is not the signed head\'s' };
  if (expect.nonce !== undefined && p.tst.nonce !== expect.nonce) return { ok: false, ...base, problem: 'the nonce does not match the request' };
  const v = verifyCms(p);
  if (!v.cert) return { ok: false, ...base, problem: v.problem };
  const tsa = subjectName(v.cert);
  const usage = v.cert.keyUsage ?? [];
  if (!usage.includes(OID.timeStamping)) return { ok: false, ...base, tsa, problem: 'the TSA certificate is not for time-stamping' };
  const at = Date.parse(p.tst.genTime);
  if (at < Date.parse(v.cert.validFrom) || at > Date.parse(v.cert.validTo)) return { ok: false, ...base, tsa, problem: 'the TSA certificate was not valid at the time stamped' };
  if (expect.anchors?.length) {
    const trusted = chainsTo(v.cert, p.certificates, expect.anchors);
    if (!trusted) return { ok: false, ...base, tsa, trusted, problem: 'the TSA certificate does not chain to CIVICOS_TSA_CA' };
    return { ok: true, ...base, tsa, trusted };
  }
  return { ok: true, ...base, tsa };
}

// ── Asking the nation's TSA ───────────────────────────────────────────

export interface TsaConfig { url: URL; anchors: X509Certificate[]; auth?: string; tlsCa?: string; policy?: string }

/** The TSA settings, or null when CIVICOS_TSA_URL is not set. */
export function tsaConfig(env: NodeJS.ProcessEnv = process.env): TsaConfig | null {
  const raw = env.CIVICOS_TSA_URL?.trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('CIVICOS_TSA_URL must be an http(s) address');
  const caFile = env.CIVICOS_TSA_CA?.trim();
  const tlsFile = env.CIVICOS_TSA_TLS_CA?.trim();
  return {
    url,
    anchors: caFile ? parseCaBundle(caFile.startsWith('-----BEGIN') ? caFile.replace(/\\n/g, '\n') : readFileSync(caFile, 'utf8')) : [],
    ...(env.CIVICOS_TSA_AUTH?.trim() ? { auth: env.CIVICOS_TSA_AUTH.trim() } : {}),
    ...(tlsFile ? { tlsCa: readFileSync(tlsFile, 'utf8') } : {}),
    ...(env.CIVICOS_TSA_POLICY?.trim() ? { policy: env.CIVICOS_TSA_POLICY.trim() } : {}),
  };
}

export interface Stamp extends TokenCheck { token: string; url: string }

/** Ask the TSA for a token over `digest` (SHA-256) and check it before returning it. */
export async function timestamp(digest: Buffer, cfg: TsaConfig): Promise<Stamp> {
  const nonce = randomBytes(8);
  nonce[0] = nonce[0]! & 0x7f;
  const req = buildTimeStampReq({ digest, nonce, certReq: true, ...(cfg.policy ? { policy: cfg.policy } : {}) });
  return withSpan('tsa.timestamp', { 'server.address': cfg.url.host }, async () => {
    const res = await undiciFetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/timestamp-query', accept: 'application/timestamp-reply', ...(cfg.auth ? { authorization: cfg.auth } : {}) },
      body: req,
      signal: AbortSignal.timeout(15_000),
      ...(cfg.tlsCa ? { dispatcher: new Agent({ connect: { ca: cfg.tlsCa } }) } : {}),
    });
    if (!res.ok) throw new Error(`The TSA answered ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > 64_000) throw new Error('The TSA answer is too large');
    const r = parseTimeStampResp(body);
    if (r.status > 1 || !r.token) throw new Error(`The TSA refused: ${r.statusText}`);
    const check = checkToken(r.token, { digest, nonce: BigInt(`0x${nonce.toString('hex')}`), anchors: cfg.anchors });
    if (!check.ok) throw new Error(`The TSA token does not check out: ${check.problem}`);
    return { ...check, token: r.token.toString('base64'), url: `${cfg.url.origin}${cfg.url.pathname}` };
  }, SpanKind.CLIENT);
}
