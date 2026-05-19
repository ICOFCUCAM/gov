'use client';

// apps/citizen-wallet — federated citizen-facing sovereign application.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { citizenWallet } from '@/lib/gov/citizen-systems';
import { citizenRequests } from '@/lib/gov/citizen-requests';
import { OpsHeader, KpiStrip, BarPanel, StatTiles } from '@/apps/_shared/Ops';
import { MinistryChainSection, EncounterThread } from '@/apps/_shared/InstitutionChain';
import { facilities, chainDef, MINISTRY_CHAIN } from '@/lib/gov/institution-chain';
import { enroll, enrollments, subscribe as enSub, version as enVer } from '@/lib/gov/enrollment-store';
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
  // Mirror MinistryChainSection's facility pick (FINANCE, seed 9) so the
  // citizen's encounter shares the exact scope as the ministry's desk.
  const cwEpoch = Math.max(0, Math.floor(now / 4000));
  const cwFacs = facilities('FINANCE', cwEpoch);
  const cwFac = cwFacs[Math.abs([...appId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 9)) % cwFacs.length] ?? cwFacs[0]!;
  const ewv = React.useSyncExternalStore(enSub, enVer, () => 0);
  const [enrMin, setEnrMin] = React.useState('FINANCE');
  const enrFacs = React.useMemo(() => facilities(enrMin, cwEpoch), [enrMin, cwEpoch]);
  const enrFac = enrFacs[Math.abs([...appId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 9)) % enrFacs.length] ?? enrFacs[0]!;
  const enrRole = chainDef(enrMin).actorRole;
  const cwEnr = React.useMemo(() => enrollments(enrMin, enrFac.id, enrRole, now), [enrMin, enrFac.id, enrRole, now, ewv]);
  const [cwName, setCwName] = React.useState('');
  const submitEnrol = () => { if (cwName.trim()) { enroll(enrMin, enrFac.id, cwName, enrRole, 'Citizen self-service', now); setCwName(''); } };
  const myReqs = cwEnr.filter(e => e.by === 'Citizen self-service').slice(-4).reverse();
  const enrMinistries = React.useMemo(() => Object.keys(MINISTRY_CHAIN), []);
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
      <CommandPanel title={`Enrolment portal · ${chainDef(enrMin).ministry}`} meta={`register at ${enrFac.id} — pending review at the desk`} accent={ACC}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <select value={enrMin} onChange={e => setEnrMin(e.target.value)}
            className="focus-ring max-w-[140px] shrink-0 rounded-[3px] border bg-surface px-1 py-1 text-[9px] text-ink-soft" style={{ borderColor: 'rgb(var(--c-line))' }}>
            {enrMinistries.map(k => <option key={k} value={k}>{chainDef(k).ministry}</option>)}
          </select>
          <input value={cwName} onChange={e => setCwName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitEnrol(); }}
            placeholder={`Full name to enrol at ${enrFac.name}…`}
            className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink" style={{ borderColor: 'rgb(var(--c-line))' }} />
          <button type="button" onClick={submitEnrol}
            className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: ACC, color: ACC }}>Submit enrolment</button>
        </div>
        {myReqs.length ? (
          <div className="space-y-0.5">
            {myReqs.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-[9.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{e.name}</span>
                <span className="shrink-0 text-[7.5px] uppercase tracking-wider" style={{ color: e.status === 'active' ? 'rgb(var(--c-ok))' : e.status === 'verified' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-link))' }}>{e.status}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-[9px] text-ink-muted">No enrolment submitted yet. Your request appears on the branch desk for verification.</div>}
      </CommandPanel>
      <EncounterThread scope={`enc:finance:${cwFac.id}`} now={now} accent={ACC}
        selfAuthor="PUBLIC" officialName={`Assessor · ${cwFac.id}`} publicName="Citizen"
        title={`Message the service desk · ${cwFac.id}`} />
      <MinistryChainSection ministryKey="FINANCE" id={appId} now={now} accent={ACC} />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'approval'} title={`${label} runtime — execute the citizen-service workflow`} by="Service Agent" role={role} withheld={withheld} />
    </div>
  );
}
