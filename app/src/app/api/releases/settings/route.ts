// /api/releases/settings — a nation's resilience and security settings:
// probation length, automatic fallback or ask first, health source,
// rollout ring, definitions policy and estate size.
import { NextRequest, NextResponse } from 'next/server';
import { updateSettings } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';
import type { ResilienceSettings } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const r = await chamberBody<Partial<ResilienceSettings> & { estate?: { servers?: number; endpoints?: number }; by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const { by, estate, probationMinutes, fallback, healthSource, ring, definitionsPolicy } = r.b;
  const out = updateSettings(r.nation.id, { estate, probationMinutes, fallback, healthSource, ring, definitionsPolicy }, typeof by === 'string' ? by : '');
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ nation: out });
}
