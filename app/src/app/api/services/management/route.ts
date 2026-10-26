// /api/services/management — service management (plan step I13,
// lib/frontdoor/service-management.ts). GET: the dashboard registry,
// service-level objectives with the target in force (none until the nation's
// target, cited, is approved), performance reports, disruptions, changes and
// architecture exceptions (their standing computed today) of the institutions
// the signed-in official reaches; with ?service=<id>&from=&to= the service's
// performance computed now from its procedure's cases, every figure a signal
// (Record, Sample, Not connected), never a generated number.
//
// POST (signed-in officials; checked in lib/frontdoor against the institution):
//   dashboard | publish-dashboard | objective | target | approve-target | report | validate-report |
//   disruption | update-disruption | change | decide-change | exception | approve-exception | withdraw-exception
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { reaches, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { listMinistries } from '@/lib/data/store';
import * as sm from '@/lib/frontdoor/service-management';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const s = await caseScope();
  const service = q.get('service');
  if (service) {
    const now = new Date();
    const from = q.get('from') ?? `${now.getUTCFullYear()}-01-01`, to = q.get('to') ?? now.toISOString().slice(0, 10);
    const p = sm.servicePerformance(service, { from, to });
    if ('error' in p) return NextResponse.json(p, { status: 404 });
    if (s && p.institution && !reaches(s, p.institution) && roleOf(s) !== 'auditor') return NextResponse.json({ error: 'A service\'s performance is read by officials of the institution that owns it' }, { status: 403 });
    return NextResponse.json(p);
  }
  // Auditors and the whole government read what they reach; an institution's officials their own.
  const institutions = s ? listMinistries().map(m => m.id).filter(id => reaches(s, id) || roleOf(s) === 'auditor') : undefined;
  return NextResponse.json({ ...sm.serviceManagement(institutions), measures: Object.entries(sm.MEASURES).map(([key, m]) => ({ key, label: m.label, unit: m.unit })), access: sm.ACCESS_CLASSES });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const a = { name: who.name, ...(who.id ? { id: who.id } : {}), scope: s };
  const ops: Record<string, () => object | { error: string }> = {
    dashboard: () => sm.proposeDashboard(b, a),
    'publish-dashboard': () => sm.publishDashboard(b.id, a),
    objective: () => sm.defineObjective(b, a),
    target: () => sm.proposeTarget(b.id, b, a),
    'approve-target': () => sm.approveTarget(b.id, a),
    report: () => sm.recordReport(b, a),
    'validate-report': () => sm.validateReport(b.id, a),
    disruption: () => sm.reportDisruption({ ...b, sample: b.sample === true }, a),
    'update-disruption': () => sm.updateDisruption(b.id, b, a),
    change: () => sm.proposeChange(b, a),
    'decide-change': () => sm.decideChange(b.id, b, a),
    exception: () => sm.proposeException(b, a),
    'approve-exception': () => sm.approveException(b.id, a),
    'withdraw-exception': () => sm.withdrawException(b.id, b.reason, a),
  };
  const fn = ops[String(b.op ?? '')];
  if (!fn) return NextResponse.json({ error: `op is one of ${Object.keys(ops).join(', ')}` }, { status: 400 });
  const r = fn();
  return 'error' in r ? NextResponse.json(r, { status: /officials of|can sign|Auditors|owns the service/.test(r.error) ? 403 : 422 }) : NextResponse.json(r);
}
