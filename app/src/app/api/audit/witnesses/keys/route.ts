// /api/audit/witnesses/keys — the public keys whose signed attestations of
// the audit chain the platform records (go-live review H-1).
//
// GET                         every registered key (public keys are public)
// POST { label, jwk, by }     register a witness's public key   (administrators: lib/auth/roles.ts ADMIN_ONLY)
// DELETE ?id=…&by=…           revoke it; its earlier attestations stay, it attests no more
//
// The name recorded is the signed-in official's (withOfficial), never a typed one
// when someone is signed in. Each change is written to the substrate's audit
// chain (scope substrate:witnesses).

import { NextResponse } from 'next/server';
import { serverClient, publicClient } from '@/lib/db/client';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { witnessKeyFingerprint, publicWitnessJwk, type WitnessJwk } from '@/lib/audit/witness-signature';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = publicClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  const { data, error } = await sb.from('civicos_audit_witness_keys')
    .select('id,witness_label,public_jwk,registered_by,registered_at,revoked_at,revoked_by')
    .order('registered_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: 'could not read the witness keys' }, { status: 502 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const body = (await withOfficial(await req.json().catch(() => ({})))) as { label?: unknown; jwk?: unknown; by?: unknown };
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const by = typeof body.by === 'string' ? body.by.trim() : '';
  if (!label || label.length > 200) return NextResponse.json({ error: 'label required (at most 200 characters)' }, { status: 400 });
  if (!by) return NextResponse.json({ error: 'by (the administrator registering the key) required' }, { status: 400 });
  if (!witnessKeyFingerprint(body.jwk)) return NextResponse.json({ error: 'jwk must be an EC P-256 or Ed25519 public key' }, { status: 400 });
  if ((body.jwk as WitnessJwk).d !== undefined) return NextResponse.json({ error: 'that is a private key; register the public half only' }, { status: 400 });

  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  const { data, error } = await sb.rpc('civicos_register_witness_key', {
    p_witness_label: label, p_public_jwk: publicWitnessJwk(body.jwk as WitnessJwk) as never, p_registered_by: by,
  });
  if (error) return NextResponse.json({ error: 'the key was not registered' }, { status: 502 });
  return NextResponse.json({ key: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const url = new URL(req.url);
  const id = url.searchParams.get('id') ?? '';
  const { by } = (await withOfficial({ by: url.searchParams.get('by') ?? '' })) as { by: string };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!by.trim()) return NextResponse.json({ error: 'by (the administrator revoking the key) required' }, { status: 400 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  const { data, error } = await sb.rpc('civicos_revoke_witness_key', { p_id: id, p_revoked_by: by.trim() });
  if (error) return NextResponse.json({ error: 'the key was not revoked' }, { status: 502 });
  if (!data) return NextResponse.json({ error: 'no active key with that id' }, { status: 404 });
  return NextResponse.json({ revoked: id });
}
