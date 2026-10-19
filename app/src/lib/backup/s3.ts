// S3-compatible object storage for backups (the nation's MinIO or Ceph, or a
// cloud bucket): PUT, GET, DELETE and ListObjectsV2, signed with SigV4
// (./sigv4.ts) and sent through the platform's safe fetch
// (lib/net/safe-fetch.ts) to the configured endpoint's host only — never a
// redirect elsewhere, a size cap, a time limit, the connection pinned to
// the checked address and through the nation's egress proxy when it has one.
//
// Configuration (lib/backup/target.ts reads it):
//   CIVICOS_BACKUP_S3_ENDPOINT   https://objects.gov.example (http only to a private address with _ALLOW_PRIVATE)
//   CIVICOS_BACKUP_S3_BUCKET     the bucket
//   CIVICOS_BACKUP_S3_REGION     default us-east-1 (MinIO's default)
//   CIVICOS_BACKUP_S3_PREFIX     default civicos-backups/
//   CIVICOS_BACKUP_S3_ACCESS_KEY_ID / _SECRET_ACCESS_KEY (or _FILE), _SESSION_TOKEN
//   CIVICOS_BACKUP_S3_PATH_STYLE default on (bucket in the path; off: bucket.host)
//   CIVICOS_BACKUP_S3_ALLOW_PRIVATE  on for storage on the nation's own network

import { safeFetchBytes } from '@/lib/net/safe-fetch';
import { signV4, sha256Hex, type Credentials } from './sigv4';

export interface S3Config {
  endpoint: URL;
  bucket: string;
  region: string;
  prefix: string;
  credentials: Credentials;
  pathStyle: boolean;
  allowPrivate: boolean;
  /** Tests: replaces the pinned connection and the DNS check. */
  fetch?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
  maxBytes?: number;
}

const enc = (key: string) => key.split('/').map(encodeURIComponent).join('/');

export class S3Client {
  constructor(readonly cfg: S3Config) {
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(cfg.bucket)) throw new Error('CIVICOS_BACKUP_S3_BUCKET is not a valid bucket name');
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(cfg.endpoint.hostname);
    if (cfg.endpoint.protocol !== 'https:' && !(cfg.allowPrivate || loopback)) throw new Error('CIVICOS_BACKUP_S3_ENDPOINT must be https (plain http only with CIVICOS_BACKUP_S3_ALLOW_PRIVATE=on, for storage on the nation\'s own network)');
    if (cfg.endpoint.username || cfg.endpoint.password) throw new Error('CIVICOS_BACKUP_S3_ENDPOINT must not carry credentials');
  }

  /** The address of an object (or the bucket, for a list) with its query. */
  url(key = '', query: Record<string, string> = {}): URL {
    const e = this.cfg.endpoint;
    const base = this.cfg.pathStyle
      ? `${e.protocol}//${e.host}${e.pathname.replace(/\/$/, '')}/${this.cfg.bucket}/${enc(key)}`
      : `${e.protocol}//${this.cfg.bucket}.${e.host}${e.pathname.replace(/\/$/, '')}/${enc(key)}`;
    const u = new URL(base);
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    return u;
  }

  private async send(method: 'GET' | 'PUT' | 'DELETE', url: URL, body?: Buffer, extra: Record<string, string> = {}): Promise<{ status: number; bytes: Buffer; headers: Headers }> {
    const payloadHash = sha256Hex(body ?? '');
    const headers = { ...extra, ...(body ? { 'content-length': String(body.length) } : {}) };
    const signed = signV4({ method, url, headers, payloadHash, region: this.cfg.region, service: 's3', date: new Date(), credentials: this.cfg.credentials });
    const { host: _host, ...send } = signed.headers;
    const allowedHost = url.host;
    const r = await safeFetchBytes(url.href, {
      method, headers: send, ...(body ? { body } : {}),
      allow: u => u.host === allowedHost, redirects: 0, allowPrivate: this.cfg.allowPrivate,
      maxBytes: this.cfg.maxBytes ?? 2_000_000_000, timeoutMs: 120_000,
      okStatus: s => (s >= 200 && s < 300) || s === 404,
      ...(this.cfg.fetch ? { fetch: this.cfg.fetch } : {}), ...(this.cfg.resolve ? { resolve: this.cfg.resolve } : {}),
    });
    return { status: r.status, bytes: r.bytes, headers: r.headers };
  }

  async put(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    const r = await this.send('PUT', this.url(this.cfg.prefix + key), body, { 'content-type': contentType });
    if (r.status === 404) throw new Error(`The bucket ${this.cfg.bucket} does not exist`);
  }

  /** The object, or null when it is not there. */
  async get(key: string): Promise<Buffer | null> {
    const r = await this.send('GET', this.url(this.cfg.prefix + key));
    return r.status === 404 ? null : r.bytes;
  }

  async delete(key: string): Promise<void> {
    await this.send('DELETE', this.url(this.cfg.prefix + key));
  }

  /** Every key under the prefix (without it), following continuation tokens. */
  async list(): Promise<{ key: string; size: number }[]> {
    const out: { key: string; size: number }[] = [];
    let token: string | undefined;
    for (let page = 0; page < 1000; page++) {
      const q: Record<string, string> = { 'list-type': '2', prefix: this.cfg.prefix, ...(token ? { 'continuation-token': token } : {}) };
      const r = await this.send('GET', this.url('', q));
      if (r.status === 404) throw new Error(`The bucket ${this.cfg.bucket} does not exist`);
      const xml = r.bytes.toString('utf8');
      for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const key = xmlText(/<Key>([\s\S]*?)<\/Key>/.exec(m[1]!)?.[1] ?? '');
        const size = Number(/<Size>(\d+)<\/Size>/.exec(m[1]!)?.[1] ?? 0);
        if (key.startsWith(this.cfg.prefix)) out.push({ key: key.slice(this.cfg.prefix.length), size });
      }
      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = truncated ? xmlText(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? '') : undefined;
      if (!token) break;
    }
    return out;
  }
}

const xmlText = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
