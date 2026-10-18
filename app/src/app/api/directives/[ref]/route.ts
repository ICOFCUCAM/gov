// One platform directive. POST { action: 'sign' | 'rescind', effectiveAt? }
// under the named (verified, when signed in) official; audited.
import { NextRequest, NextResponse } from 'next/server';
import { directive, signDirective, rescindDirective, settleDirectives } from '@/lib/data/directives';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
  settleDirectives();
  const d = directive(params.ref);
  if (!d) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  return NextResponse.json({ directive: d });
}

export async function POST(req: NextRequest, { params }: { params: { ref: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string; effectiveAt?: string | null };
  const r = b.action === 'sign' ? signDirective(params.ref, b.by, b.effectiveAt)
    : b.action === 'rescind' ? rescindDirective(params.ref, b.by)
    : { error: 'action must be sign or rescind' };
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such directive' ? 404 : 422 });
  return NextResponse.json({ directive: r });
}
