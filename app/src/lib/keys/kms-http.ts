// A generic KMS over HTTP: the interface a cloud KMS (AWS KMS, Azure Key
// Vault, Google Cloud KMS, a national HSM gateway…) is put behind, by a small
// shim the nation runs next to it. The platform never holds the keys; the
// shim answers four calls, authenticated with a bearer token
// (CIVICOS_KMS_TOKEN or _FILE), over HTTPS (CIVICOS_KMS_URL; CIVICOS_KMS_CA
// for the nation's CA):
//
//   POST {base}/keys/{name}/sign      { "data": "<base64>" }
//        → { "signature": "<base64 Ed25519, 64 bytes>", "version": 1 }
//   GET  {base}/keys/{name}/public[?version=N]
//        → { "publicKeyPem": "-----BEGIN PUBLIC KEY-----…", "version": 1 }
//   POST {base}/keys/{name}/datakey   {}
//        → { "plaintext": "<base64, 32 bytes>", "ciphertext": "<opaque wrapped key>" }
//   POST {base}/keys/{name}/decrypt   { "ciphertext": "<opaque wrapped key>" }
//        → { "plaintext": "<base64, 32 bytes>" }
//
// Signing keys must be Ed25519 (the signatures are checked with the public
// key the shim returns); a KMS without Ed25519 needs an HSM-backed shim.
// Any non-2xx answer is an error ({ "error": "…" }).

import { jsonClient, secretFrom, serviceUrl, type JsonClient, type RemoteKeyService } from './remote';

export class KmsHttp implements RemoteKeyService {
  readonly kind = 'kms-http' as const;
  readonly endpoint: string;
  private readonly http: JsonClient;
  private readonly token: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const base = serviceUrl(env.CIVICOS_KMS_URL, 'CIVICOS_KMS_URL');
    this.endpoint = base.origin;
    this.http = jsonClient(base, { caFile: env.CIVICOS_KMS_CA?.trim() || undefined, service: 'kms' });
    const t = secretFrom(env, 'CIVICOS_KMS_TOKEN');
    if (!t) throw new Error('The KMS shim needs CIVICOS_KMS_TOKEN');
    this.token = t;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const r = await this.http.call<T & { error?: string }>(method, path, body, { authorization: `Bearer ${this.token}` });
    if (r.status < 200 || r.status >= 300 || !r.json) throw new Error(`KMS ${path.split('/').slice(-1)[0]} failed (${r.status}${r.json?.error ? `: ${r.json.error}` : ''})`);
    return r.json;
  }

  async sign(key: string, data: Buffer) {
    const r = await this.call<{ signature: string; version?: number }>('POST', `keys/${encodeURIComponent(key)}/sign`, { data: data.toString('base64') });
    return { signature: Buffer.from(r.signature, 'base64'), version: r.version ?? 1 };
  }

  async publicKey(key: string, version?: number) {
    const r = await this.call<{ publicKeyPem: string; version?: number }>('GET', `keys/${encodeURIComponent(key)}/public${version ? `?version=${version}` : ''}`);
    return { publicKeyPem: r.publicKeyPem, version: r.version ?? version ?? 1 };
  }

  async dataKey(key: string) {
    const r = await this.call<{ plaintext: string; ciphertext: string }>('POST', `keys/${encodeURIComponent(key)}/datakey`, {});
    const plaintext = Buffer.from(r.plaintext, 'base64');
    if (plaintext.length !== 32) throw new Error('The KMS returned a data key that is not 256 bits');
    return { plaintext, wrapped: r.ciphertext };
  }

  async unwrap(key: string, wrapped: string) {
    const r = await this.call<{ plaintext: string }>('POST', `keys/${encodeURIComponent(key)}/decrypt`, { ciphertext: wrapped });
    return Buffer.from(r.plaintext, 'base64');
  }
}
