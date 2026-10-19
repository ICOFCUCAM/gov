// /api/releases/health — the nation's deployment agent reports health for
// the release on probation. Accepted only with that nation's agent
// credential (`Authorization: Bearer cag_…`), issued from the nation's
// settings page: a user session or the distribution link key is refused,
// and the nation is the one the credential belongs to.
//
// Fallback needs consecutive bad or missing reports, or two independent
// critical checks failing together; one bad report only marks the release
// degraded.
import { NextRequest, NextResponse } from 'next/server';
import { reportHealth, HEALTH_CHECKS, nationForAgent, resolveNation } from '@/lib/data/updates';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ checks: HEALTH_CHECKS });
}

export async function POST(req: NextRequest) {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const nation = nationForAgent(bearer);
  if (!nation) {
    return NextResponse.json({ error: 'A deployment-agent credential is required (Authorization: Bearer cag_…). Issue one from the Update Center settings.' }, { status: 401 });
  }
  let b: { checks?: unknown; link?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  // A credential speaks only for its own nation.
  const named = typeof b.link === 'string' ? b.link : new URL(req.url).searchParams.get('link');
  if (named) {
    const other = resolveNation(named);
    if (!other || other.id !== nation.id) return NextResponse.json({ error: 'This credential belongs to another nation' }, { status: 403 });
  }
  const out = reportHealth(nation.id, { checks: b.checks });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
