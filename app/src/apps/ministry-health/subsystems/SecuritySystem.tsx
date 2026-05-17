'use client';

// apps/ministry-health/subsystems/SecuritySystem — Layer 15. Sovereign
// health-data security: tamper-evident audit chain, access governance,
// data residency and live threat posture.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { sovereignSecurity } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function SecuritySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const sc = sovereignSecurity(id, ts);
  const [contained, setContained] = React.useState<Set<string>>(() => new Set());
  const pTone: 'ok' | 'warn' | 'alert' = sc.posture === 'breach' ? 'alert' : sc.posture === 'guarded' ? 'warn' : 'ok';
  const adv = aiAdvisory('Sovereign Security', [
    { label: 'Open incidents', value: Math.min(100, sc.openIncidents * 30), adverse: true },
    { label: 'Audit chain gap', value: Math.max(0, (100 - sc.auditChainIntactPct) * 20), adverse: true },
    { label: 'Residency gap', value: Math.max(0, 100 - sc.dataResidencyPct), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Sovereign Data &amp; Security</span>
        <PosturePill label={sc.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">audit chain · <span style={{ color: ac(sc.auditChainIntactPct >= 99.5 ? 'ok' : 'alert') }}>{sc.auditChainIntactPct}%</span> · open incidents <span className="text-ink-soft">{sc.openIncidents}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>
      <StatGrid items={[
        { l: 'Audit chain', v: `${sc.auditChainIntactPct}%`, t: sc.auditChainIntactPct >= 99.5 ? 'ok' : 'alert' },
        { l: 'Audit events 24h', v: sc.auditEvents24h.toLocaleString(), t: 'ok' },
        { l: 'Data residency', v: `${sc.dataResidencyPct}%`, t: sc.dataResidencyPct >= 95 ? 'ok' : 'warn' },
        { l: 'Encryption', v: `${sc.encryptionCoveragePct}%`, t: sc.encryptionCoveragePct >= 98 ? 'ok' : 'warn' },
        { l: 'Open incidents', v: `${sc.openIncidents}`, t: sc.openIncidents ? 'alert' : 'ok' },
        { l: 'Posture', v: sc.posture, t: pTone },
      ]} />
      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI security intelligence · {adv.severity}</div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Access governance" meta="role · sessions · denied%">
          <Bars rows={sc.accessTiers.map(a => ({ label: `${a.role} (${a.activeSessions.toLocaleString()})`, pct: Math.min(100, a.deniedPct * 7), tone: a.tone, tail: `${a.deniedPct}% deny` }))} />
        </Panel>
        <Panel title="Threat posture" meta="vector · severity · contain">
          <div className="space-y-1.5">
            {sc.threats.map(x => {
              const done = x.blocked || contained.has(x.vector);
              return (
                <div key={x.vector} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : x.tone)}` }}>
                  <span className="text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ac(x.tone) }}>{x.severity}</span>
                  <span className="text-[11px] font-medium text-ink">{x.vector}</span>
                  {done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ {x.blocked ? 'blocked' : 'contained'}</span>
                  ) : (
                    <button onClick={() => setContained(prev => new Set(prev).add(x.vector))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Contain
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <RuntimeQueue scope={`${id}:security`} kind="incident" title="Security runtime — detect → contain → eradicate → attest" by="Security Officer" role={role} withheld={withheld} />
    </div>
  );
}
