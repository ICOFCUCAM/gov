// The partner installation's client certificate for a grant (mutual TLS,
// lib/exchange/mtls.ts). GET shows it; PUT names it ({ certificate: PEM } or
// { sha256, subject? }), after which the partner's exchanges under this grant
// are accepted only over mutual TLS with that certificate; DELETE removes it.
// Administrators only (lib/auth/roles.ts); the official's verified name is
// recorded and every change audited.
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial } from '@/lib/auth/official';
import { grantCertificate, setGrantCertificate, removeGrantCertificate } from '@/lib/exchange/mtls';
import { listGrants } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!listGrants().some(g => g.id === params.id)) return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
  return NextResponse.json({ grant: params.id, certificate: grantCertificate(params.id) ?? null });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; certificate?: unknown; sha256?: unknown; subject?: unknown };
  const by = typeof b.by === 'string' && b.by.trim() ? b.by.trim() : null;
  if (!by) return NextResponse.json({ error: 'Name the official making the change (sign in)' }, { status: 422 });
  const r = setGrantCertificate(params.id, b, by);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ grant: params.id, certificate: r });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const by = typeof b.by === 'string' && b.by.trim() ? b.by.trim() : null;
  if (!by) return NextResponse.json({ error: 'Name the official making the change (sign in)' }, { status: 422 });
  const r = removeGrantCertificate(params.id, by);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
