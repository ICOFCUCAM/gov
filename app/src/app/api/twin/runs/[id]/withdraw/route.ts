// Withdraw a twin import (a correction, lib/twin/register.ts withdrawRun): its
// observations are marked superseded from now, never deleted, so as-of
// queries for what was known before still see them. A named official with a
// reason; audited. A signed-in official's verified name replaces any name in
// the request (withOfficial).

import { NextRequest, NextResponse } from 'next/server';
import { withdrawRun } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; reason?: string };
  const r = withdrawRun(params.id, String(b.by ?? ''), String(b.reason ?? ''));
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such import' ? 404 : 422 });
  return NextResponse.json(r);
}
