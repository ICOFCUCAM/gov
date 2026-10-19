// Remote key services the platform can hold its keys in (review R7, S5):
// HashiCorp Vault / OpenBao Transit (vault.ts) and a generic KMS over HTTP
// (kms-http.ts, the shim a cloud KMS or an HSM gateway sits behind). Both
// keep the keys: the platform asks them to sign and to issue or unwrap data
// keys, and never receives a signing key or the key encryption key.
//
// Calls go over HTTPS (plain http only to the loopback address, for a local
// agent such as `vault agent` or `bao agent`), through undici with the
// nation's own CA when given, and never through Next.js's patched fetch.

import { readFileSync } from 'node:fs';
import { Agent, fetch as undiciFetch } from 'undici';
import { withSpan, SpanKind } from '@/lib/ops/trace';

export interface RemoteKeyService {
  kind: 'vault' | 'kms-http';
  /** Base address, for status pages (no credentials). */
  endpoint: string;
  /** Ed25519 signature over `data` with the named key; the key version that signed. */
  sign(key: string, data: Buffer): Promise<{ signature: Buffer; version: number }>;
  /** SPKI PEM of the named key's public half (a version, or the latest). */
  publicKey(key: string, version?: number): Promise<{ publicKeyPem: string; version: number }>;
  /** A fresh 256-bit data key: in the clear for this process, and wrapped by the named key for storage. */
  dataKey(key: string): Promise<{ plaintext: Buffer; wrapped: string }>;
  /** Unwrap a stored data key with the named key. */
  unwrap(key: string, wrapped: string): Promise<Buffer>;
}

/** Read a value given directly or as `@/path/to/file` / a `*_FILE` variable. */
export function secretFrom(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const file = env[`${name}_FILE`]?.trim();
  if (file) return readFileSync(file, 'utf8').trim();
  const v = env[name]?.trim();
  if (v?.startsWith('@')) return readFileSync(v.slice(1), 'utf8').trim();
  return v || undefined;
}

/** The base address, refused unless https (or http to the loopback address). */
export function serviceUrl(raw: string | undefined, what: string): URL {
  if (!raw?.trim()) throw new Error(`${what} is not set`);
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new Error(`${what} is not a valid address`); }
  const loopback = u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && loopback)) throw new Error(`${what} must be an https address (plain http only to a local agent on 127.0.0.1)`);
  if (u.username || u.password) throw new Error(`${what} must not carry credentials`);
  return u;
}

export interface JsonClient {
  call<T>(method: 'GET' | 'POST', path: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; json: T }>;
}

/** A JSON client for one service, with the nation's CA when given (`caFile`). */
export function jsonClient(base: URL, opts: { caFile?: string; timeoutMs?: number; service: string }): JsonClient {
  const dispatcher = opts.caFile ? new Agent({ connect: { ca: readFileSync(opts.caFile, 'utf8') } }) : undefined;
  return {
    call<T>(method: 'GET' | 'POST', path: string, body?: unknown, headers: Record<string, string> = {}) {
      const url = new URL(path.replace(/^\//, ''), base.href.endsWith('/') ? base.href : `${base.href}/`);
      return withSpan(`keys.${opts.service}`, { 'server.address': url.host, 'http.request.method': method, 'url.path': url.pathname.replace(/\/[^/]+$/, '/…') }, async span => {
        const res = await undiciFetch(url, {
          method,
          headers: { accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
          ...(dispatcher ? { dispatcher } : {}),
        });
        span.setAttribute('http.response.status_code', res.status);
        const text = await res.text();
        let json: unknown = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }
        return { status: res.status, json: json as T };
      }, SpanKind.CLIENT);
    },
  };
}

/** Raw 32-byte Ed25519 public key → SPKI PEM. */
export function ed25519RawToPem(raw: Buffer): string {
  if (raw.length !== 32) throw new Error('An Ed25519 public key is 32 bytes');
  const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
  return `-----BEGIN PUBLIC KEY-----\n${der.toString('base64')}\n-----END PUBLIC KEY-----\n`;
}
