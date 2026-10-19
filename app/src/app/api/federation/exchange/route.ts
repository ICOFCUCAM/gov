// A federation partner's request for data under a grant (review R10): the
// partner's system presents its integration key (Authorization: Bearer civ_…,
// scope `federation:exchange`) and POSTs { tenant, scope, purpose,
// retainDays?, onward? }. The grant's usage policy is enforced: a purpose
// outside it, a longer retention or onward sharing it does not allow is
// refused with the reason; an allowed exchange returns the obligations. The platform
// decides with the same default-deny rule as /api/federation/check, records
// the exchange in the exchange log on its side and answers with a signed
// receipt for the partner's side. Every decision is audited.
// When the grant names the partner's client certificate (mutual TLS,
// lib/exchange/mtls.ts), the exchange is refused unless the ingress verified
// that very certificate for this request.
import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey, federationExchange, recordAudit } from '@/lib/data/store';
import { exchangeResponse } from '@/lib/exchange/log';
import { checkPartnerCertificate, grantForTenant } from '@/lib/exchange/mtls';

export const dynamic = 'force-dynamic';
const FEDERATION_SCOPE = 'federation:exchange';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text();
  const base = { channel: 'federation' as const, method: req.method, path: req.nextUrl.pathname, body: raw, signature: 'absent' as const };
  const access = verifyIntegrationKey(req.headers.get('authorization'), FEDERATION_SCOPE);
  if (!access.ok) {
    const headers: Record<string, string> = access.retryAfterSeconds ? { 'Retry-After': String(access.retryAfterSeconds) } : {};
    return exchangeResponse({ ...base, feedId: null, status: access.status, result: access.error }, { error: access.error }, headers);
  }
  let b: { tenant?: unknown; scope?: unknown; [k: string]: unknown };
  try { b = JSON.parse(raw || '{}'); } catch { return exchangeResponse({ ...base, feedId: access.client.id, status: 400, result: 'not JSON' }, { error: 'The body must be JSON' }); }
  if (typeof b.tenant !== 'string' || typeof b.scope !== 'string' || !b.tenant || !b.scope) {
    return exchangeResponse({ ...base, feedId: access.client.id, status: 422, result: 'tenant and scope required' }, { error: 'Send { "tenant": "…", "scope": "…" }' });
  }
  const grantId = grantForTenant(b.tenant);
  const mtls = checkPartnerCertificate(grantId, req.headers, process.env, req.headers.get('host') ?? req.nextUrl.host);
  if (!mtls.ok) {
    recordAudit(`Integration: ${access.client.name} (${access.client.id})`, 'federation.exchange', `Grant:${grantId}`, 'denied', `${b.scope} · ${mtls.reason}`);
    return exchangeResponse({ ...base, feedId: access.client.id, tenant: b.tenant, grantId, status: 403, result: `refused: ${mtls.reason}` }, { allowed: false, reason: mtls.reason });
  }
  const d = federationExchange({ tenant: b.tenant, scope: b.scope, client: access.client, usage: { purpose: b.purpose, retainDays: b.retainDays, onward: b.onward } });
  const tlsNote = mtls.required && mtls.sha256 ? ` · mTLS sha256:${mtls.sha256.slice(0, 16)}…` : '';
  return exchangeResponse(
    { ...base, feedId: access.client.id, tenant: b.tenant, grantId: d.grantId, status: d.allowed ? 200 : 403, result: `${d.allowed ? 'allowed' : 'refused'}: ${d.reason}${tlsNote}` },
    { allowed: d.allowed, reason: d.reason, ...(d.grantId ? { grant: d.grantId } : {}), ...(d.obligations ? { obligations: d.obligations } : {}) },
  );
}
