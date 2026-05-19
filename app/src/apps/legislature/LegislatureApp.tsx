'use client';

// apps/legislature — federated legislative execution application. Bills
// are a live state machine. Cinematic sovereign command rhythm (ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { parliamentarySchedule, budgetApprovalPipeline, oversightHearings } from '@/lib/gov/legislative-operations';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#c9a24a';
const WF: Record<string, WorkKind> = {
  drafting: 'bill', bills: 'bill', live: 'bill', committees: 'case', scheduling: 'case',
  voting: 'bill', amendment: 'bill', constitutional: 'judicial', oversight: 'case',
  budget: 'procurement', hearings: 'case', intelligence: 'case', chambers: 'case', appropriation: 'procurement',
};
const LABEL: Record<string, string> = {
  drafting: 'Bill Drafting', bills: 'Bill Pipeline', live: 'Legislative Intelligence',
  committees: 'Committee Systems', scheduling: 'Parliamentary Scheduling', voting: 'Voting Systems',
  amendment: 'Amendment Workflows', constitutional: 'Constitutional Review', oversight: 'Oversight Hearings',
  budget: 'Budget Approval Pipeline', hearings: 'Public Hearing Systems', chambers: 'Chambers', appropriation: 'Appropriation',
};
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `lg${i}` }));

export function LegislatureApp({ domain, now, role, withheld }: {
  domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ls = legislativeState(ts);
  const d = WF[domain] ? domain : 'bills';
  const label = LABEL[d] ?? 'Bill Pipeline';

  let kpis: K[] = [];
  const bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] }[] = [];
  let pTone: Tone = 'ok';

  if (d === 'budget' || d === 'appropriation') {
    const bp = budgetApprovalPipeline(ts); pTone = bp.blocked ? 'alert' : 'warn';
    const stages = ['tabled', 'committee', 'debate', 'appropriation vote', 'assented'];
    kpis = [
      { l: 'Appropriation', v: `$${bp.appropriationBn}B`, t: 'ok' }, { l: 'Stage', v: bp.stage, t: bp.blocked ? 'alert' : 'warn' },
      { l: 'Scrutiny Days Left', v: `${bp.scrutinyDaysLeft}`, t: bp.scrutinyDaysLeft <= 5 ? 'alert' : 'warn' },
      { l: 'Amendments Tabled', v: `${bp.amendmentsTabled}`, t: 'warn' },
      { l: 'Blocked', v: bp.blocked ? 'YES' : 'NO', t: bp.blocked ? 'alert' : 'ok' },
      { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
    ];
    bars.push({ title: 'Appropriation pipeline', meta: 'tabled → committee → debate → vote → assent', rows: stages.map((s, i) => ({ label: s, pct: stages.indexOf(bp.stage) >= i ? 100 : 0, tone: (bp.blocked && s === bp.stage ? 'alert' : stages.indexOf(bp.stage) >= i ? 'ok' : 'warn') as Tone, tail: s === bp.stage ? '● current' : '' })) });
  } else if (d === 'oversight' || d === 'hearings' || d === 'committees') {
    const oh = oversightHearings(ts); pTone = ls.blocked ? 'alert' : oh.inquiriesOpen >= 4 ? 'warn' : 'ok';
    kpis = [
      { l: 'Inquiries Open', v: `${oh.inquiriesOpen}`, t: oh.inquiriesOpen >= 4 ? 'warn' : 'ok' },
      { l: 'Summonses Issued', v: `${oh.summonsesIssued}`, t: 'warn' }, { l: 'Committees', v: `${oh.active.length}`, t: 'ok' },
      { l: 'Bills In Session', v: `${ls.inSession}`, t: 'ok' }, { l: 'Blocked Bills', v: `${ls.blocked}`, t: ls.blocked ? 'alert' : 'ok' },
      { l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' : 'warn' },
    ];
    bars.push({ title: 'Oversight & committee activity', meta: 'investigations · witnesses', rows: oh.active.map(a => ({ label: `${a.committee} · ${a.subject}`, pct: a.status === 'reported' ? 100 : a.status === 'in session' ? 60 : 25, tone: (a.status === 'reported' ? 'ok' : 'warn') as Tone, tail: `${a.witnesses}w · ${a.status}` })) });
  } else if (d === 'scheduling') {
    const ps = parliamentarySchedule(ts); pTone = ps.scheduleConflicts > 6 ? 'alert' : 'warn';
    kpis = [
      { l: 'Sittings This Week', v: `${ps.sittingsThisWeek}`, t: 'ok' }, { l: 'Order-Paper Items', v: `${ps.orderPaperItems}`, t: 'ok' },
      { l: 'Scheduled Hearings', v: `${ps.scheduledHearings}`, t: 'ok' }, { l: 'Recess', v: ps.recess ? 'YES' : 'NO', t: ps.recess ? 'warn' : 'ok' },
      { l: 'Schedule Conflicts', v: `${ps.scheduleConflicts}`, t: ps.scheduleConflicts > 6 ? 'alert' : 'warn' },
      { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
    ];
  } else {
    const stageTone = (b: typeof ls.bills[number]): Tone => b.stage === 'Withdrawn' ? 'alert' : b.blocked ? 'alert' : b.stage === 'Published' ? 'ok' : 'warn';
    pTone = ls.blocked ? 'alert' : 'ok';
    kpis = [
      { l: 'Bills Tracked', v: `${ls.bills.length}`, t: 'ok' }, { l: 'In Session', v: `${ls.inSession}`, t: 'ok' },
      { l: 'Blocked', v: `${ls.blocked}`, t: ls.blocked ? 'alert' : 'ok' }, { l: 'Published YTD', v: `${ls.publishedYtd}`, t: 'ok' },
      { l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' : 'warn' },
      { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
    ];
    bars.push({ title: 'Bill lifecycle ledger', meta: 'draft → committee → vote → assent → published', rows: ls.bills.slice(0, 10).map(b => ({ label: b.title, pct: b.progressPct, tone: stageTone(b), tail: `${b.stage}${b.blocked ? ' · blocked' : ''}` })) });
    if (ls.division) bars.push({ title: 'Floor division', meta: 'live vote', rows: [
      { label: `Ayes — ${ls.division.billTitle}`, pct: (ls.division.ayes / ls.division.total) * 100, tone: 'ok' as Tone, tail: `${ls.division.ayes}` },
      { label: 'Noes', pct: (ls.division.noes / ls.division.total) * 100, tone: 'alert' as Tone, tail: `${ls.division.noes}` },
      { label: ls.division.carried ? 'Carried' : 'Not carried', pct: 100, tone: (ls.division.carried ? 'ok' : 'alert') as Tone, tail: `thr ${ls.division.threshold}` },
    ] });
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#0c0a05', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Legislature · ${label}`} subtitle="Sovereign Legislative Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      {bars.map((b, i) => <BarPanel key={i} title={b.title} meta={b.meta} accent={ACC} live={i === 0} rows={b.rows} />)}
      <ActorChainStrip ministryKey="LEGISLATURE" idKey={`leg:${d}`} now={now} accent={ACC} recordPrefix="BILL" />
      <MinistryChainSection ministryKey="LEGISLATURE" id={`leg:${d}`} now={now} accent={ACC} />
      <RuntimeQueue scope={`leg:${d}`} kind={WF[d] ?? 'bill'} title={`${label} runtime — execute the legislative workflow`} by="Clerk" role={role} withheld={withheld} />
    </div>
  );
}
