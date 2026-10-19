// /api/releases/[id]/readiness — preflight compatibility and staging for
// one release, as this nation sees it.
//   GET  the latest preflight report, the staging environment and run.
//   POST { action: 'preflight' | 'waive' | 'cancel-waiver' | 'stage' | 'stage-fail' | 'uat', … }
// Installation-level: this nation's government-wide administrators only
// (lib/auth/roles.ts, checked in chamberBody()). A waiver is dual control by
// two sign-ins: the first official proposes { findingKey, reason }, a different
// signed-in official confirms with { findingKey } in their own request.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { releaseFor, superviseProbations } from '@/lib/data/updates';
import { officialId } from '@/lib/auth/official';
import { latestPreflight, runPreflight, waiveFinding, stagingEnvironment, stagingRun, stagingInstall, stagingFail, signUat } from '@/lib/data/readiness';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const r = releaseFor(n.id, params.id);
  if (!r) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  superviseProbations();
  return NextResponse.json({ preflight: latestPreflight(n.id, r.id) ?? null, staging: stagingEnvironment(n), run: stagingRun(n.id, r.id) ?? null, stagingRequired: n.settings.stagingRequired });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await chamberBody<{ action?: string; by?: string; secondBy?: string; reason?: string; findingKey?: string; tester?: string; date?: string; evidence?: string }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const r = releaseFor(n.id, params.id);
  if (!r) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  const by = typeof b.by === 'string' ? b.by.trim() : '';
  switch (b.action) {
    case 'preflight':
      if (!by) return NextResponse.json({ error: 'Name the person running the preflight' }, { status: 422 });
      return NextResponse.json({ preflight: runPreflight(n, r, by) });
    case 'waive':
    case 'cancel-waiver': {
      const out = waiveFinding(n, r, String(b.findingKey ?? ''), { by, byId: await officialId(), secondBy: b.secondBy, reason: b.reason, cancel: b.action === 'cancel-waiver' });
      if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
      const { pending, ...preflight } = out;
      return NextResponse.json({ preflight, ...(pending ? { pending: true } : {}) });
    }
    case 'stage': {
      const out = stagingInstall(n, r, by);
      return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ run: out });
    }
    case 'stage-fail': {
      const out = stagingFail(n, r, by, String(b.reason ?? ''));
      return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ run: out });
    }
    case 'uat': {
      const out = signUat(n, r, { tester: b.tester, date: b.date, evidence: b.evidence });
      return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ run: out });
    }
    default:
      return NextResponse.json({ error: 'action must be preflight, waive, cancel-waiver, stage, stage-fail or uat' }, { status: 422 });
  }
}
