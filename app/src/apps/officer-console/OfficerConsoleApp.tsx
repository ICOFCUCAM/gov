'use client';

// apps/officer-console — federated internal officer disposition app.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { officerConsole } from '@/lib/gov/citizen-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { queue: 'case', decisions: 'approval', review: 'case' };
const LABEL: Record<string, string> = { queue: 'Work Queue', decisions: 'Decisions', review: 'Review' };

export function OfficerConsoleApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = officerConsole(appId, ts);
  const d = WF[domain] ? domain : 'queue';
  const label = LABEL[d] ?? 'Work Queue';
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Officers online', v: `${o.officersOnline}`, t: 'ok' },
        { l: 'Decisions queue', v: o.decisionsQueue.toLocaleString(), t: o.decisionsQueue > 2500 ? 'alert' : o.decisionsQueue > 1200 ? 'warn' : 'ok' },
        { l: 'Review backlog', v: o.reviewBacklog.toLocaleString(), t: o.reviewBacklog > 3500 ? 'alert' : 'warn' },
        { l: 'SLA met', v: `${o.slaMetPct}%`, t: o.slaMetPct >= 80 ? 'ok' : 'warn' },
        { l: 'Dispositions today', v: o.dispositionsToday.toLocaleString(), t: 'ok' },
        { l: 'Escalations open', v: `${o.escalationsOpen}`, t: o.escalationsOpen > 30 ? 'alert' : o.escalationsOpen ? 'warn' : 'ok' },
      ]} />
      <Panel title="Desk load" meta="disposition queues">
        <Bars rows={o.byDesk.map(x => ({ label: x.desk, pct: Math.min(100, x.queue / 14), tone: x.tone, tail: `${x.queue}` }))} />
      </Panel>
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute officer dispositions`} by="Officer" role={role} withheld={withheld} />
    </div>
  );
}
