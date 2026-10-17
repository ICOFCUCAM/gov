// /api/releases/hosting — hosting & deployment: the four paths compared
// for this nation (GET) and a request for an assessment (POST). The
// nation is resolved on the server; it sees only its own requests.
import { NextRequest, NextResponse } from 'next/server';
import { hostingCenter, requestAssessment } from '@/lib/data/hosting';
import { chamberBody, nationFor } from '@/lib/updates/access';
import type { HostingQuestionnaire } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ hosting: hostingCenter(n) });
}

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ path?: string; questionnaire?: Partial<HostingQuestionnaire>; by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const q = r.b.questionnaire && typeof r.b.questionnaire === 'object' ? r.b.questionnaire : {};
  const out = requestAssessment(r.nation, { path: r.b.path, questionnaire: q, by: r.b.by });
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ request: out }, { status: 201 });
}
