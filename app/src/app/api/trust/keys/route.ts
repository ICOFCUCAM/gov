// GET /api/trust/keys — the public trust list of the state's seal keys
// (lib/keys/seal-register.ts; format in docs/SEAL_KEYS.md): every key ever
// recorded except withdrawn proposals, with its purpose, public key, SHA-256
// fingerprint, status, validity, compromise time and legal basis, so a
// certificate or decision can be checked outside the platform. Public and
// read-only (no sign-in); never names an official.
import { NextResponse } from 'next/server';
import { trustList } from '@/lib/keys/seal-register';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(trustList(), { headers: { 'cache-control': 'public, max-age=60' } });
}
