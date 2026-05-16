'use client';

// apps/legislature — federated legislative execution application.
// Bills are a live state machine (draft → committee → review →
// amendment → vote → senate → executive → constitutional review),
// not static counters.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { parliamentarySchedule, budgetApprovalPipeline, oversightHearings } from '@/lib/gov/legislative-operations';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

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

export function LegislatureApp({ domain, now, role, withheld }: {
  domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ls = legislativeState(ts);
  const d = WF[domain] ? domain : 'bills';
  const label = LABEL[d] ?? 'Bill Pipeline';

  let body: React.ReactNode;
  if (d === 'budget' || d === 'appropriation') {
    const bp = budgetApprovalPipeline(ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Appropriation', v: `$${bp.appropriationBn}B`, t: 'ok' },
          { l: 'Stage', v: bp.stage, t: bp.blocked ? 'alert' : 'warn' },
          { l: 'Scrutiny days left', v: `${bp.scrutinyDaysLeft}`, t: bp.scrutinyDaysLeft <= 5 ? 'alert' : 'warn' },
          { l: 'Amendments tabled', v: `${bp.amendmentsTabled}`, t: 'warn' },
          { l: 'Blocked', v: bp.blocked ? 'YES' : 'NO', t: bp.blocked ? 'alert' : 'ok' },
          { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
        ]} />
        <Panel title="Appropriation pipeline" meta="tabled → committee → debate → vote → assent">
          <Bars rows={['tabled', 'committee', 'debate', 'appropriation vote', 'assented'].map((s, i) => ({
            label: s, pct: ['tabled', 'committee', 'debate', 'appropriation vote', 'assented'].indexOf(bp.stage) >= i ? 100 : 0,
            tone: bp.blocked && s === bp.stage ? 'alert' : ['tabled', 'committee', 'debate', 'appropriation vote', 'assented'].indexOf(bp.stage) >= i ? 'ok' : 'warn',
            tail: s === bp.stage ? '● current' : '',
          }))} />
        </Panel>
      </>
    );
  } else if (d === 'oversight' || d === 'hearings' || d === 'committees') {
    const oh = oversightHearings(ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Inquiries open', v: `${oh.inquiriesOpen}`, t: oh.inquiriesOpen >= 4 ? 'warn' : 'ok' },
          { l: 'Summonses issued', v: `${oh.summonsesIssued}`, t: 'warn' },
          { l: 'Committees', v: `${oh.active.length}`, t: 'ok' },
          { l: 'Bills in session', v: `${ls.inSession}`, t: 'ok' },
          { l: 'Blocked bills', v: `${ls.blocked}`, t: ls.blocked ? 'alert' : 'ok' },
          { l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' : 'warn' },
        ]} />
        <Panel title="Oversight & committee activity" meta="investigations · witnesses">
          <Bars rows={oh.active.map(a => ({ label: `${a.committee} · ${a.subject}`, pct: a.status === 'reported' ? 100 : a.status === 'in session' ? 60 : 25, tone: a.status === 'reported' ? 'ok' : 'warn', tail: `${a.witnesses}w · ${a.status}` }))} />
        </Panel>
      </>
    );
  } else if (d === 'scheduling') {
    const ps = parliamentarySchedule(ts);
    body = (
      <StatGrid items={[
        { l: 'Sittings this week', v: `${ps.sittingsThisWeek}`, t: 'ok' },
        { l: 'Order-paper items', v: `${ps.orderPaperItems}`, t: 'ok' },
        { l: 'Scheduled hearings', v: `${ps.scheduledHearings}`, t: 'ok' },
        { l: 'Recess', v: ps.recess ? 'YES' : 'NO', t: ps.recess ? 'warn' : 'ok' },
        { l: 'Schedule conflicts', v: `${ps.scheduleConflicts}`, t: ps.scheduleConflicts > 6 ? 'alert' : 'warn' },
        { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
      ]} />
    );
  } else {
    const stageTone = (b: typeof ls.bills[number]) => b.stage === 'Withdrawn' ? 'alert' : b.blocked ? 'alert' : b.stage === 'Published' ? 'ok' : 'warn';
    body = (
      <>
        <StatGrid items={[
          { l: 'Bills tracked', v: `${ls.bills.length}`, t: 'ok' },
          { l: 'In session', v: `${ls.inSession}`, t: 'ok' },
          { l: 'Blocked', v: `${ls.blocked}`, t: ls.blocked ? 'alert' : 'ok' },
          { l: 'Published YTD', v: `${ls.publishedYtd}`, t: 'ok' },
          { l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' : 'warn' },
          { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert' },
        ]} />
        <Panel title="Bill lifecycle ledger" meta="draft → committee → vote → assent → published">
          <Bars rows={ls.bills.slice(0, 10).map(b => ({ label: b.title, pct: b.progressPct, tone: stageTone(b) as 'ok' | 'warn' | 'alert', tail: `${b.stage}${b.blocked ? ' · blocked' : ''}` }))} />
        </Panel>
        {ls.division ? (
          <Panel title="Floor division" meta="live vote">
            <Bars rows={[
              { label: `Ayes — ${ls.division.billTitle}`, pct: (ls.division.ayes / ls.division.total) * 100, tone: 'ok', tail: `${ls.division.ayes}` },
              { label: 'Noes', pct: (ls.division.noes / ls.division.total) * 100, tone: 'alert', tail: `${ls.division.noes}` },
              { label: ls.division.carried ? 'Carried' : 'Not carried', pct: 100, tone: ls.division.carried ? 'ok' : 'alert', tail: `thr ${ls.division.threshold}` },
            ]} />
          </Panel>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {body}
      <RuntimeQueue scope={`leg:${d}`} kind={WF[d] ?? 'bill'} title={`${label} runtime — execute the legislative workflow`} by="Clerk" role={role} withheld={withheld} />
    </div>
  );
}
