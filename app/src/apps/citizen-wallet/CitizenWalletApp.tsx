'use client';

// apps/citizen-wallet — federated citizen-facing sovereign application.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenWallet } from '@/lib/gov/citizen-systems';
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
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'approval'} title={`${label} runtime — execute the citizen-service workflow`} by="Service Agent" role={role} withheld={withheld} />
    </div>
  );
}
