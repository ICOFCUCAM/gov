'use client';

// apps/citizen-wallet — federated citizen-facing sovereign application.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenWallet } from '@/lib/gov/citizen-systems';
import { citizenRequests } from '@/lib/gov/citizen-requests';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { identity: 'permit', services: 'approval', payments: 'procurement' };
const LABEL: Record<string, string> = { identity: 'Identity', services: 'Services', payments: 'Payments' };

export function CitizenWalletApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const w = citizenWallet(appId, ts);
  const d = WF[domain] ? domain : 'identity';
  const label = LABEL[d] ?? 'Identity';
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Citizens enrolled', v: `${w.enrolledM}M`, t: 'ok' },
        { l: 'Identity verified', v: `${w.identityVerifiedPct}%`, t: w.identityVerifiedPct >= 85 ? 'ok' : 'warn' },
        { l: 'Active requests', v: w.activeServiceRequests.toLocaleString(), t: 'ok' },
        { l: 'Payments today', v: `${w.paymentsTodayM}M`, t: 'ok' },
        { l: 'Applications pending', v: w.applicationsPending.toLocaleString(), t: w.applicationsPending > 18000 ? 'warn' : 'ok' },
        { l: 'Services uptime', v: `${w.servicesUptimePct}%`, t: w.servicesUptimePct >= 99 ? 'ok' : 'warn' },
      ]} />
      <Panel title="Service channels" meta="citizen access integrity">
        <Bars rows={w.channels.map(c => ({ label: c.channel, pct: c.uptime, tone: c.tone, tail: `${c.uptime}%` }))} />
      </Panel>
      <Panel title="Top services" meta="volume · SLA">
        <Bars rows={w.topServices.map(s => ({ label: s.service, pct: s.slaMetPct, tone: s.slaMetPct >= 80 ? 'ok' : 'warn', tail: `${s.volume.toLocaleString()} · ${s.slaMetPct}%` }))} />
      </Panel>
      {(() => {
        const cr = citizenRequests(now / 4000);
        return (
          <Panel title="Citizen request lifecycle" meta={`submitted → routed → processed · SLA met ${cr.slaMetPct}% · ${cr.breaching} breaching`}>
            <StatGrid items={[
              { l: 'Open', v: `${cr.open}`, t: cr.open > 12 ? 'warn' : 'ok' },
              { l: 'Resolved', v: `${cr.resolved}`, t: 'ok' },
              { l: 'Escalated', v: `${cr.escalated}`, t: cr.escalated ? 'warn' : 'ok' },
              { l: 'Breaching', v: `${cr.breaching}`, t: cr.breaching ? 'alert' : 'ok' },
              { l: 'SLA met', v: `${cr.slaMetPct}%`, t: cr.slaMetPct >= 80 ? 'ok' : 'warn' },
              { l: 'Routed targets', v: `${cr.byTarget.length}`, t: 'ok' },
            ]} />
            <div className="mt-2"><Bars rows={cr.byTarget.map(b => ({ label: `→ ${b.target}`, pct: Math.min(100, b.inbound * 12), tone: b.breaching ? 'alert' : b.inbound > 3 ? 'warn' : 'ok', tail: `${b.inbound} inbound · ${b.breaching} bk` }))} /></div>
          </Panel>
        );
      })()}
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'approval'} title={`${label} runtime — execute the citizen-service workflow`} by="Service Agent" role={role} withheld={withheld} />
    </div>
  );
}
