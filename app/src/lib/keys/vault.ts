// HashiCorp Vault / OpenBao Transit as the platform's key custodian.
//
// Self-hostable and sovereign: the nation runs it. The platform signs audit
// heads and exchange receipts with `transit/sign/<key>` (Ed25519 keys) and
// gets envelope data keys from `transit/datakey/plaintext/<key>` (an
// aes256-gcm96 key), unwrapping stored ones with `transit/decrypt/<key>`.
// No private key and no key encryption key ever leaves Vault.
//
// Authentication: a token (CIVICOS_VAULT_TOKEN, or _FILE as written by a
// Vault agent), or AppRole (CIVICOS_VAULT_ROLE_ID + CIVICOS_VAULT_SECRET_ID,
// or _FILE), logged in on first use and again when the token expires or is
// refused. CIVICOS_VAULT_NAMESPACE for Vault Enterprise / OpenBao namespaces,
// CIVICOS_VAULT_TRANSIT_MOUNT (default `transit`), CIVICOS_VAULT_CA (the
// nation's CA file for the Vault server's certificate).
//
// Vault policy the platform needs (keys named as configured):
//   path "transit/sign/civicos-audit"            { capabilities = ["update"] }
//   path "transit/sign/civicos-exchange"         { capabilities = ["update"] }
//   path "transit/keys/civicos-audit"            { capabilities = ["read"] }
//   path "transit/keys/civicos-exchange"         { capabilities = ["read"] }
//   path "transit/sign/civicos-token"            { capabilities = ["update"] }
//   path "transit/keys/civicos-token"            { capabilities = ["read"] }
//   path "transit/datakey/plaintext/civicos-data" { capabilities = ["update"] }
//   path "transit/decrypt/civicos-data"          { capabilities = ["update"] }

import { ed25519RawToPem, jsonClient, secretFrom, serviceUrl, type JsonClient, type RemoteKeyService } from './remote';

interface VaultAnswer<T> { data?: T; auth?: { client_token?: string; lease_duration?: number }; errors?: string[] }

export class VaultTransit implements RemoteKeyService {
  readonly kind = 'vault' as const;
  readonly endpoint: string;
  private readonly http: JsonClient;
  private readonly mount: string;
  private token?: string;
  private tokenExpires = 0;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {
    const base = serviceUrl(env.CIVICOS_VAULT_ADDR, 'CIVICOS_VAULT_ADDR');
    this.endpoint = base.origin;
    this.http = jsonClient(base, { caFile: env.CIVICOS_VAULT_CA?.trim() || undefined, service: 'vault' });
    this.mount = (env.CIVICOS_VAULT_TRANSIT_MOUNT?.trim() || 'transit').replace(/^\/|\/$/g, '');
    const token = secretFrom(env, 'CIVICOS_VAULT_TOKEN');
    if (token) { this.token = token; this.tokenExpires = Number.POSITIVE_INFINITY; }
    else if (!secretFrom(env, 'CIVICOS_VAULT_ROLE_ID')) throw new Error('Vault needs CIVICOS_VAULT_TOKEN or CIVICOS_VAULT_ROLE_ID and CIVICOS_VAULT_SECRET_ID');
  }

  private headers(token?: string): Record<string, string> {
    const ns = this.env.CIVICOS_VAULT_NAMESPACE?.trim();
    return { ...(token ? { 'x-vault-token': token } : {}), ...(ns ? { 'x-vault-namespace': ns } : {}) };
  }

  private async login(): Promise<string> {
    const role_id = secretFrom(this.env, 'CIVICOS_VAULT_ROLE_ID');
    const secret_id = secretFrom(this.env, 'CIVICOS_VAULT_SECRET_ID');
    if (!role_id) throw new Error('Vault token refused and no AppRole configured');
    const mount = this.env.CIVICOS_VAULT_APPROLE_MOUNT?.trim() || 'approle';
    const r = await this.http.call<VaultAnswer<never>>('POST', `v1/auth/${mount}/login`, { role_id, ...(secret_id ? { secret_id } : {}) }, this.headers());
    const t = r.json?.auth?.client_token;
    if (r.status !== 200 || !t) throw new Error(`Vault AppRole login failed (${r.status}${r.json?.errors?.length ? `: ${r.json.errors.join('; ')}` : ''})`);
    this.token = t;
    const ttl = r.json.auth?.lease_duration ?? 0;
    this.tokenExpires = ttl > 0 ? Date.now() + ttl * 900 : Number.POSITIVE_INFINITY; // renew at 90 % of the lease
    return t;
  }

  /** One Transit call, logging in with AppRole when there is no token, it has expired or Vault refuses it. */
  private async transit<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const appRole = !!secretFrom(this.env, 'CIVICOS_VAULT_ROLE_ID');
    let token = this.token && Date.now() < this.tokenExpires ? this.token : appRole ? await this.login() : this.token;
    let r = await this.http.call<VaultAnswer<T>>(method, `v1/${this.mount}/${path}`, body, this.headers(token));
    if (r.status === 403 && appRole) {
      token = await this.login();
      r = await this.http.call<VaultAnswer<T>>(method, `v1/${this.mount}/${path}`, body, this.headers(token));
    }
    if (r.status < 200 || r.status >= 300 || !r.json?.data) {
      throw new Error(`Vault ${path.split('/')[0]} failed (${r.status}${r.json?.errors?.length ? `: ${r.json.errors.join('; ')}` : ''})`);
    }
    return r.json.data;
  }

  async sign(key: string, data: Buffer): Promise<{ signature: Buffer; version: number }> {
    const d = await this.transit<{ signature: string }>('POST', `sign/${encodeURIComponent(key)}`, { input: data.toString('base64') });
    const m = /^vault:v(\d+):(.+)$/.exec(d.signature);
    if (!m) throw new Error('Vault returned a signature in an unknown form');
    return { signature: Buffer.from(m[2]!, 'base64'), version: Number(m[1]) };
  }

  async publicKey(key: string, version?: number): Promise<{ publicKeyPem: string; version: number }> {
    const d = await this.transit<{ type: string; latest_version: number; keys: Record<string, { public_key?: string }> }>('GET', `keys/${encodeURIComponent(key)}`);
    if (d.type !== 'ed25519') throw new Error(`Vault key ${key} is ${d.type}; audit and exchange keys must be ed25519`);
    const v = version ?? d.latest_version;
    const pub = d.keys[String(v)]?.public_key;
    if (!pub) throw new Error(`Vault key ${key} has no public key for version ${v}`);
    return { publicKeyPem: pub.startsWith('-----BEGIN') ? pub : ed25519RawToPem(Buffer.from(pub, 'base64')), version: v };
  }

  async dataKey(key: string): Promise<{ plaintext: Buffer; wrapped: string }> {
    const d = await this.transit<{ plaintext: string; ciphertext: string }>('POST', `datakey/plaintext/${encodeURIComponent(key)}`, { bits: 256 });
    const plaintext = Buffer.from(d.plaintext, 'base64');
    if (plaintext.length !== 32) throw new Error('Vault returned a data key that is not 256 bits');
    return { plaintext, wrapped: d.ciphertext };
  }

  async unwrap(key: string, wrapped: string): Promise<Buffer> {
    const d = await this.transit<{ plaintext: string }>('POST', `decrypt/${encodeURIComponent(key)}`, { ciphertext: wrapped });
    return Buffer.from(d.plaintext, 'base64');
  }
}
