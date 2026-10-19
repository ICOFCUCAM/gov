// Mutual TLS between installations, as configured here (lib/exchange/mtls.ts,
// lib/exchange/federation-client.ts): this installation's client certificate
// (fingerprint, subject, expiry; never the key), whether the server accepts
// client certificates verified by the ingress, and how many grants name one.
import { NextResponse } from 'next/server';
import { federationTls } from '@/lib/exchange/federation-client';
import { certificateBindings } from '@/lib/exchange/mtls';

export const dynamic = 'force-dynamic';

export function GET() {
  let client: { sha256: string; subject: string; notAfter: string; ca: boolean } | null = null;
  let problem: string | undefined;
  try {
    const t = federationTls();
    if (t) client = { sha256: t.sha256, subject: t.subject, notAfter: t.notAfter, ca: !!t.ca };
  } catch (e) { problem = (e as Error).message; }
  return NextResponse.json({
    client,
    ...(problem ? { problem } : {}),
    server: { trustsIngressClientCertificates: process.env.CIVICOS_TRUST_PROXY_CLIENT_CERT === '1', federationHost: process.env.CIVICOS_FEDERATION_HOST?.trim() || null },
    grantsRequiringCertificate: certificateBindings(),
  });
}
