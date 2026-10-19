// HTTP Message Signatures (RFC 9421) with Ed25519, and Content-Digest
// (RFC 9530), for systems that send data to the platform (review R10).
//
// A sender signs at least "@method", the target ("@target-uri", or
// "@authority" and "@path") and, when there is a body, "content-digest";
// `created` is required and must be within five minutes of the platform's
// clock. Only `alg="ed25519"` (or no alg) is accepted. The platform checks
// the signature with the public key the institution registered for that
// feed (lib/exchange/feed-keys.ts), and the digest against the body bytes.
//
// signRequest() is the same algorithm from the sender's side (tests, and an
// example for institutions' developers).

import { createHash, createPublicKey, sign, verify, type KeyObject } from 'node:crypto';

export const MAX_SKEW_SECONDS = 300;

export interface SignedRequestLike {
  method: string;
  url: string;
  headers: { get(name: string): string | null };
}

interface Parsed { label: string; components: string[]; paramsRaw: string; params: Record<string, string | number>; listRaw: string }

/** Parse a Signature-Input dictionary: label=("c1" "c2");created=…;keyid="…";alg="…". */
export function parseSignatureInput(value: string): Parsed[] {
  const out: Parsed[] = [];
  const re = /([a-z*][a-z0-9_.*-]*)=(\(([^)]*)\)((?:;[a-z*][a-z0-9_.*-]*=(?:"(?:[^"\\]|\\.)*"|-?\d+|[A-Za-z*][A-Za-z0-9_.:%*/-]*|\?[01]))*))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const inner = m[3]!.trim();
    const components = inner ? inner.split(/\s+/).map(c => {
      if (!/^"[^"]+"$/.test(c)) throw new Error(`Unsupported component ${c} (parameters on components are not accepted)`);
      return c.slice(1, -1);
    }) : [];
    const params: Record<string, string | number> = {};
    for (const p of m[4]!.split(';').filter(Boolean)) {
      const eq = p.indexOf('=');
      const k = p.slice(0, eq), v = p.slice(eq + 1);
      params[k] = v.startsWith('"') ? v.slice(1, -1).replace(/\\(.)/g, '$1') : /^-?\d+$/.test(v) ? Number(v) : v;
    }
    out.push({ label: m[1]!, components, paramsRaw: m[4]!, params, listRaw: m[2]! });
  }
  return out;
}

/** Parse a Signature dictionary: label=:base64:. */
export function parseSignature(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of value.matchAll(/([a-z*][a-z0-9_.*-]*)=:([A-Za-z0-9+/=]*):/g)) out[m[1]!] = m[2]!;
  return out;
}

/** The URL as the sender addressed it: behind a proxy, CIVICOS_PUBLIC_ORIGIN (e.g. https://gov.example) replaces the internal origin. */
function addressed(url: string): URL {
  const u = new URL(url);
  const pub = process.env.CIVICOS_PUBLIC_ORIGIN;
  if (!pub) return u;
  const o = new URL(pub);
  u.protocol = o.protocol; u.host = o.host;
  return u;
}

function componentValue(name: string, req: SignedRequestLike): string | null {
  const u = addressed(req.url);
  switch (name) {
    case '@method': return req.method.toUpperCase();
    case '@target-uri': return u.href;
    case '@authority': return u.host.toLowerCase();
    case '@scheme': return u.protocol.replace(':', '').toLowerCase();
    case '@path': return u.pathname || '/';
    case '@query': return u.search || '?';
    case '@request-target': return `${u.pathname}${u.search}`;
    default:
      if (name.startsWith('@')) return null;
      return req.headers.get(name)?.trim().replace(/\s*\r?\n\s*/g, ' ') ?? null;
  }
}

/** The signature base (RFC 9421 §2.5) for covered components and the serialized signature params. */
export function signatureBase(req: SignedRequestLike, components: string[], listRaw: string): string {
  const lines = components.map(c => {
    const v = componentValue(c, req);
    if (v === null) throw new Error(`The signed component "${c}" is not in the request`);
    return `"${c}": ${v}`;
  });
  lines.push(`"@signature-params": ${listRaw}`);
  return lines.join('\n');
}

/** RFC 9530 Content-Digest for a body (sha-256). */
export const contentDigest = (body: string | Buffer): string =>
  `sha-256=:${createHash('sha256').update(body).digest('base64')}:`;

/** Check a Content-Digest header against the body: at least one sha-256 or sha-512 value, every one of those matching. */
export function checkContentDigest(header: string | null, body: string | Buffer): string | null {
  if (!header) return 'Send a Content-Digest header (RFC 9530, sha-256)';
  const entries = [...header.matchAll(/(sha-256|sha-512|[a-z0-9-]+)=:([A-Za-z0-9+/=]*):/g)];
  const known = entries.filter(e => e[1] === 'sha-256' || e[1] === 'sha-512');
  if (!known.length) return 'Content-Digest needs sha-256 or sha-512';
  for (const [, alg, value] of known) {
    const want = createHash(alg === 'sha-256' ? 'sha256' : 'sha512').update(body).digest('base64');
    if (want !== value) return 'Content-Digest does not match the body';
  }
  return null;
}

export type SignatureCheck =
  | { ok: true; keyId: string; label: string; created: number }
  | { ok: false; reason: string; keyId?: string };

/**
 * Verify a request against the registered key: a signature by that key over
 * the required components, made within MAX_SKEW_SECONDS, and (with a body) a
 * matching Content-Digest.
 */
export function verifyRequestSignature(req: SignedRequestLike, body: string, key: { publicKeyPem: string; keyId: string }, now = Date.now()): SignatureCheck {
  const input = req.headers.get('signature-input');
  const sigHeader = req.headers.get('signature');
  if (!input || !sigHeader) return { ok: false, reason: 'This feed requires signed requests (RFC 9421): send Signature-Input and Signature' };
  let parsed: Parsed[];
  try { parsed = parseSignatureInput(input); } catch (e) { return { ok: false, reason: (e as Error).message }; }
  const sigs = parseSignature(sigHeader);
  const mine = parsed.filter(p => p.params.keyid === key.keyId);
  if (!mine.length) return { ok: false, reason: `No signature by the registered key ${key.keyId}`, keyId: String(parsed[0]?.params.keyid ?? '') || undefined };
  let pub: KeyObject;
  try { pub = createPublicKey(key.publicKeyPem); } catch { return { ok: false, reason: 'The registered key cannot be read' }; }
  let last = 'Bad signature';
  for (const p of mine) {
    const c = p.components;
    if (p.params.alg !== undefined && p.params.alg !== 'ed25519') { last = `Algorithm ${p.params.alg} is not accepted (ed25519 only)`; continue; }
    if (!c.includes('@method')) { last = 'The signature must cover "@method"'; continue; }
    if (!c.includes('@target-uri') && !(c.includes('@authority') && (c.includes('@path') || c.includes('@request-target')))) { last = 'The signature must cover "@target-uri" (or "@authority" and "@path")'; continue; }
    if (body.length && !c.includes('content-digest')) { last = 'The signature must cover "content-digest"'; continue; }
    const created = p.params.created;
    if (typeof created !== 'number') { last = 'The signature needs a created time'; continue; }
    if (Math.abs(now / 1000 - created) > MAX_SKEW_SECONDS) { last = 'The signature was made more than five minutes from now'; continue; }
    if (typeof p.params.expires === 'number' && p.params.expires < now / 1000) { last = 'The signature has expired'; continue; }
    const sig = sigs[p.label];
    if (!sig) { last = `No Signature value for ${p.label}`; continue; }
    let base: string;
    try { base = signatureBase(req, c, p.listRaw); } catch (e) { last = (e as Error).message; continue; }
    let good = false;
    try { good = verify(null, Buffer.from(base, 'utf8'), pub, Buffer.from(sig, 'base64')); } catch { good = false; }
    if (!good) { last = 'The signature does not verify with the registered key'; continue; }
    if (body.length || c.includes('content-digest')) {
      const bad = checkContentDigest(req.headers.get('content-digest'), body);
      if (bad) { last = bad; continue; }
    }
    return { ok: true, keyId: key.keyId, label: p.label, created };
  }
  return { ok: false, reason: last, keyId: key.keyId };
}

/** Sign a request as a sending system would: returns the headers to add (Content-Digest, Signature-Input, Signature). */
export function signRequest(o: { method: string; url: string; headers?: Record<string, string>; body?: string; privateKey: KeyObject; keyId: string; created?: number; label?: string; components?: string[] }): Record<string, string> {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  const body = o.body ?? '';
  if (body.length) headers['content-digest'] = contentDigest(body);
  const components = o.components ?? ['@method', '@target-uri', ...(body.length ? ['content-digest'] : [])];
  const created = o.created ?? Math.floor(Date.now() / 1000);
  const listRaw = `(${components.map(c => `"${c}"`).join(' ')});created=${created};keyid="${o.keyId}";alg="ed25519"`;
  const h = new Headers(headers);
  const base = signatureBase({ method: o.method, url: o.url, headers: h }, components, listRaw);
  const label = o.label ?? 'sig1';
  headers['signature-input'] = `${label}=${listRaw}`;
  headers.signature = `${label}=:${sign(null, Buffer.from(base, 'utf8'), o.privateKey).toString('base64')}:`;
  return headers;
}
