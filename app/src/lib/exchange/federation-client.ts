// This installation as a federation partner calling another one (review
// R10): POST {partner}/api/federation/exchange with the integration key the
// partner issued, presenting this installation's client certificate for
// mutual TLS when one is configured:
//
//   CIVICOS_FEDERATION_CERT  client certificate (PEM, or a file path)
//   CIVICOS_FEDERATION_KEY   its private key (PEM, or a file path)
//   CIVICOS_FEDERATION_CA    CA certificates the partner's server certificate
//                            must chain to (PEM or file path; the system's
//                            CAs when unset)
//
// The partner registers this certificate's SHA-256 fingerprint on its grant
// (lib/exchange/mtls.ts on its side). The connection goes through an undici
// Agent holding the certificate; the key stays in this process. The answer
// carries the partner's signed receipt (lib/exchange/log.ts on its side),
// returned to the caller to keep.

import { readFileSync } from 'node:fs';
import { Agent, fetch as undiciFetch } from 'undici';
import { fingerprintOf } from './mtls';
import { withSpan, SpanKind } from '@/lib/ops/trace';

const pemOrFile = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  if (!t) return undefined;
  return t.includes('-----BEGIN') ? t.replace(/\\n/g, '\n') : readFileSync(t, 'utf8');
};

export interface FederationTls { cert: string; key: string; ca?: string; sha256: string; subject: string; notAfter: string }

/** The client certificate settings, or null when none is configured (an error when only half is). */
export function federationTls(env: NodeJS.ProcessEnv = process.env): FederationTls | null {
  const cert = pemOrFile(env.CIVICOS_FEDERATION_CERT);
  const key = pemOrFile(env.CIVICOS_FEDERATION_KEY);
  if (!cert && !key) return null;
  if (!cert || !key) throw new Error('Set both CIVICOS_FEDERATION_CERT and CIVICOS_FEDERATION_KEY for mutual TLS');
  const ca = pemOrFile(env.CIVICOS_FEDERATION_CA);
  return { cert, key, ...(ca ? { ca } : {}), ...fingerprintOf(cert) };
}

const g = globalThis as unknown as { __federationAgent?: { config: string; agent: Agent } };
/** The undici Agent that presents the client certificate (one per configuration). */
export function federationAgent(env: NodeJS.ProcessEnv = process.env): Agent | undefined {
  const t = federationTls(env);
  if (!t && !env.CIVICOS_FEDERATION_CA) return undefined;
  const config = `${t?.sha256 ?? ''}|${env.CIVICOS_FEDERATION_CA ?? ''}`;
  if (g.__federationAgent?.config === config) return g.__federationAgent.agent;
  const ca = pemOrFile(env.CIVICOS_FEDERATION_CA);
  const agent = new Agent({ connect: { ...(t ? { cert: t.cert, key: t.key } : {}), ...(ca ? { ca } : {}) } });
  g.__federationAgent = { config, agent };
  return agent;
}

export interface PartnerExchange { status: number; body: Record<string, unknown>; receipt?: unknown; mutualTls: boolean }

/** Ask a partner installation for an exchange under its grant to this nation. */
export async function requestPartnerExchange(input: {
  partnerUrl: string;
  apiKey: string;
  request: { tenant: string; scope: string; purpose?: string; retainDays?: number; onward?: boolean };
}, env: NodeJS.ProcessEnv = process.env): Promise<PartnerExchange> {
  const base = new URL(input.partnerUrl);
  const loopback = base.hostname === '127.0.0.1' || base.hostname === 'localhost';
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) throw new Error('A partner installation is reached over https');
  const url = new URL('/api/federation/exchange', base);
  const dispatcher = federationAgent(env);
  return withSpan('federation.exchange', { 'server.address': url.host, 'civicos.mtls': !!federationTls(env) }, async () => {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify(input.request),
      signal: AbortSignal.timeout(15_000),
      ...(dispatcher ? { dispatcher } : {}),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body, ...(body.receipt ? { receipt: body.receipt } : {}), mutualTls: !!federationTls(env) };
  }, SpanKind.CLIENT);
}
