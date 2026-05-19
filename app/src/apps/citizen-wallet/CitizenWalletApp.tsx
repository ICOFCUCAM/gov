'use client';

// apps/citizen-wallet — federated citizen-facing sovereign application.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenWallet } from '@/lib/gov/citizen-systems';
import { citizenRequests } from '@/lib/gov/citizen-requests';
import { OpsHeader, KpiStrip, BarPanel, StatTiles } from '@/apps/_shared/Ops';
import { MinistryChainSection } from '@/apps/_shared/InstitutionChain';
import { CommandPanel, type Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#36d39b';
const WF: Record<string, WorkKind> = { identity: 'permit', services: 'approval', payments: 'procurement' };
const LABEL: Record<string, string> = { identity: 'Identity', services: 'Services', payments: 'Payments' };

export function CitizenWalletApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const w = citizenWallet(appId, ts);
  const d = WF[domain] ? domain : 'identity';
  const label = LABEL[d] ?? 'Identity';
  const raw: { l: string; v: string; t?: Tone }[] = d === 'identity' ? [
    { l: 'Citizens Enrolled', v: `${w.enrolledM}M`, t: 'ok' },
    { l: 'Identity Verified', v: `${w.identityVerifiedPct}%`, t: w.identityVerifiedPct >= 85 ? 'ok' : w.identityVerifiedPct >= 70 ? 'warn' : 'alert' },
    { l: 'Applications Pending', v: w.applicationsPending.toLocaleString(), t: w.applicationsPending > 18000 ? 'warn' : 'ok' },
  ] : d === 'payments' ? [
    { l: 'Payments Today', v: `${w.paymentsTodayM}M`, t: 'ok' },
    { l: 'Services Uptime', v: `${w.servicesUptimePct}%`, t: w.servicesUptimePct >= 99 ? 'ok' : 'warn' },
    { l: 'Active Requests', v: w.activeServiceRequests.toLocaleString(), t: 'ok' },
  ] : [
    { l: 'Citizens Enrolled', v: `${w.enrolledM}M`, t: 'ok' },
    { l: 'Identity Verified', v: `${w.identityVerifiedPct}%`, t: w.identityVerifiedPct >= 85 ? 'ok' : 'warn' },
    { l: 'Active Requests', v: w.activeServiceRequests.toLocaleString(), t: 'ok' },
    { l: 'Payments Today', v: `${w.paymentsTodayM}M`, t: 'ok' },
    { l: 'Applications Pending', v: w.applicationsPending.toLocaleString(), t: w.applicationsPending > 18000 ? 'warn' : 'ok' },
    { l: 'Services Uptime', v: `${w.servicesUptimePct}%`, t: w.servicesUptimePct >= 99 ? 'ok' : 'warn' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `cw${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';
  const cr = citizenRequests(ts);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#04100c', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Citizen Wallet · ${label}`} subtitle="Sovereign Citizen-Service Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <div className="grid gap-2 xl:grid-cols-2">
        <BarPanel title="Service channels" meta="citizen access integrity" accent={ACC} live
          rows={w.channels.map(c => ({ label: c.channel, pct: c.uptime, tone: c.tone, tail: `${c.uptime}%` }))} />
        <BarPanel title="Top services" meta="volume · SLA" accent={ACC}
          rows={w.topServices.map(s => ({ label: s.service, pct: s.slaMetPct, tone: (s.slaMetPct >= 80 ? 'ok' : 'warn') as Tone, tail: `${s.volume.toLocaleString()} · ${s.slaMetPct}%` }))} />
      </div>
      <CommandPanel title="Citizen request lifecycle" meta={`SLA met ${cr.slaMetPct}% · ${cr.breaching} breaching`} accent={ACC} live>
        <StatTiles accent={ACC} items={[
          { l: 'Open', v: `${cr.open}`, t: cr.open > 12 ? 'warn' : 'ok' },
          { l: 'Resolved', v: `${cr.resolved}`, t: 'ok' },
          { l: 'Escalated', v: `${cr.escalated}`, t: cr.escalated ? 'warn' : 'ok' },
          { l: 'Breaching', v: `${cr.breaching}`, t: cr.breaching ? 'alert' : 'ok' },
        ]} />
        <div className="mt-2 space-y-1">
          {cr.byTarget.map(b => (
            <div key={b.target} className="flex items-center gap-2 text-[8.5px]">
              <span className="w-32 shrink-0 truncate text-ink-soft">→ {b.target}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#13243a' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, b.inbound * 12)}%`, background: `rgb(var(--c-${b.breaching ? 'alert' : b.inbound > 3 ? 'warn' : 'ok'}))` }} /></span>
              <span className="w-28 shrink-0 text-right font-mono tabular-nums text-ink-muted">{b.inbound} in · {b.breaching} bk</span>
            </div>
          ))}
        </div>
      </CommandPanel>
      <MinistryChainSection ministryKey="FINANCE" id={appId} now={now} accent={ACC} />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'approval'} title={`${label} runtime — execute the citizen-service workflow`} by="Service Agent" role={role} withheld={withheld} />
    </div>
  );
}
