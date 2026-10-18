// Directives kept by the platform (lib/data/directives.ts), used when the
// shared database is not connected. GET lists them (?status, ?issuer,
// ?limit); POST drafts one under the named (verified, when signed in) official.
import { NextRequest, NextResponse } from 'next/server';
import { listDirectives, draftDirective, settleDirectives } from '@/lib/data/directives';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  settleDirectives();
  const q = req.nextUrl.searchParams;
  return NextResponse.json({ directives: listDirectives({ status: q.get('status') ?? undefined, issuer: q.get('issuer') ?? undefined, limit: Number(q.get('limit')) || undefined }) });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial(await req.json().catch(() => ({})));
  const r = draftDirective(b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ directive: r }, { status: 201 });
}
