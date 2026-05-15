import { NextRequest, NextResponse } from 'next/server';
import { listIntegrations, registerIntegration } from '@/lib/data/store';
import type { IntegrationKind } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ integrations: listIntegrations() });
}

export async function POST(req: NextRequest) {
  let b: { kind?: string; name?: string; ownerOrg?: string; contact?: string; scopes?: string[] };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.name || !b.ownerOrg || !b.contact || !b.scopes?.length) {
    return NextResponse.json({ error: 'name, ownerOrg, contact, scopes required' }, { status: 422 });
  }
  const kind: IntegrationKind = b.kind === 'extension' ? 'extension' : 'integration';
  const r = registerIntegration({ kind, name: b.name, ownerOrg: b.ownerOrg, contact: b.contact, scopes: b.scopes });
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json(r, { status: 201 });
}
