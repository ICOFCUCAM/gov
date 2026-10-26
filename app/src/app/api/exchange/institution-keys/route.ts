// GET /api/exchange/institution-keys — the public keys this installation's
// institutions sign federation events with (plan I9, lib/federation/keys.ts):
// for another installation's officials to propose trusting (two of them
// approve each). Production keys seen so far (key files or a remote key
// provider), each with its key id; public halves only, never key material.
import { NextResponse } from 'next/server';
import { seenInstitutionKeys } from '@/lib/federation/keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ keys: seenInstitutionKeys().map(k => ({ institution: k.institution, keyId: k.keyId, source: k.source, since: k.since, publicKeyPem: k.publicKeyPem })) });
}
