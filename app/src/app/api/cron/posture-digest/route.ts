// Per-charter posture aggregator. Reads each activated institution's
// open pressure (work items + escalations + dispatches), derives a
// posture / readiness / stress reading, and appends a posture_history
// snapshot. Designed to run on a slow cadence (every 30 minutes or so);
// produces a continuous timeline visible on /gov/posture without
// requiring any operator to manually snapshot.
//
// The activated institutions come from the platform's register
// (lib/institution/charter-register.ts; architecture review D8), not from
// the substrate's civicos.institutions, which only mirrors it; the pressure
// counts are the substrate's own rows.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';
import { findCharters } from '@/lib/institution/charter-register';

export const dynamic = 'force-dynamic';

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

type Posture = 'steady' | 'elevated' | 'crisis' | 'national-emergency' | 'recovery';

function postureFor(open: number, urgent: number, openEsc: number): Posture {
  if (urgent >= 5 || openEsc >= 8) return 'crisis';
  if (urgent >= 2 || openEsc >= 3 || open >= 25) return 'elevated';
  return 'steady';
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const insts = findCharters({ activated: true }).slice(0, 200).map(c => ({ charter_id: c.charterId }));

  const snapshots: { charter_id: string; posture: Posture; readiness: number; stress: number; open: number; urgent: number; openEsc: number }[] = [];

  for (const i of insts) {
    const charter = (i as { charter_id: string }).charter_id;
    const [{ count: open }, { count: urgent }, { count: openEsc }] = await Promise.all([
      sb.from('civicos_work_items').select('id', { head: true, count: 'exact' })
        .eq('originating_charter_id', charter).eq('closed', false),
      sb.from('civicos_work_items').select('id', { head: true, count: 'exact' })
        .eq('originating_charter_id', charter).eq('closed', false)
        .in('priority', ['urgent', 'critical']),
      sb.from('civicos_escalations').select('id', { head: true, count: 'exact' })
        .or(`source_charter_id.eq.${charter},target_charter_id.eq.${charter}`)
        .is('resolved_at', null),
    ]);
    const o = open ?? 0, u = urgent ?? 0, e = openEsc ?? 0;
    const posture = postureFor(o, u, e);
    // Heuristic mapping → readiness/stress scores.
    const stress = Math.min(100, o * 2 + u * 10 + e * 8);
    const readiness = Math.max(0, 100 - stress);
    await sb.rpc('civicos_record_posture', {
      p_charter_id: charter, p_posture: posture, p_readiness: readiness,
      p_stress: stress, p_detail: { open: o, urgent: u, openEsc: e, source: 'posture-digest' },
    });
    snapshots.push({ charter_id: charter, posture, readiness, stress, open: o, urgent: u, openEsc: e });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString(), snapshots });
}

export const POST = GET;
