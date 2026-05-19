'use client';

// Domain — Sovereign Data & Security. Tamper-evident audit chain, access
// governance, data residency and live threat posture. Cinematic sovereign
// command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { sovereignSecurity } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, BarPanel, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#37c7d4';

export function SecuritySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const se = sovereignSecurity(id, ts);
  const [contained, setContained] = React.useState<Set<string>>(() => new Set());
  const pTone: Tone = se.posture === 'breach' ? 'alert' : se.posture === 'guarded' ? 'warn' : 'ok';
  const adv = aiAdvisory('Sovereign Security', [
    { label: 'Open incidents', value: Math.min(100, se.openIncidents * 30), adverse: true },
    { label: 'Audit chain gap', value: Math.max(0, (100 - se.auditChainIntactPct) * 20), adverse: true },
    { label: 'Residency gap', value: Math.max(0, 100 - se.dataResidencyPct), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={15} title="Sovereign Data & Security" subtitle="Audit Chain · Access Governance · Threat Posture"
        posture={se.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Audit Chain', v: `${se.auditChainIntactPct}%`, s: 'intact', t: se.auditChainIntactPct >= 99 ? 'ok' : 'warn', k: 'sea' },
        { l: 'Data Residency', v: `${se.dataResidencyPct}%`, s: 'in-country', t: se.dataResidencyPct >= 95 ? 'ok' : 'warn', k: 'ser' },
        { l: 'Encryption', v: `${se.encryptionCoveragePct}%`, s: 'coverage', t: se.encryptionCoveragePct >= 98 ? 'ok' : 'warn', k: 'see' },
        { l: 'Open Incidents', v: `${se.openIncidents}`, s: 'active', t: se.openIncidents ? 'alert' : 'ok', k: 'sei' },
        { l: 'Access Tiers', v: `${se.accessTiers.length}`, s: 'governed', t: 'ok', k: 'set' },
        { l: 'Threat Vectors', v: `${se.threats.length}`, s: 'monitored', t: se.threats.some(x => x.tone === 'alert') ? 'alert' : 'ok', k: 'sev' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BarPanel title="Access governance" meta="role · sessions · denied%" accent={ACC} live
            rows={se.accessTiers.map(a => ({ label: `${a.role} (${a.activeSessions.toLocaleString()})`, pct: Math.min(100, a.deniedPct * 7), tone: a.tone, tail: `${a.deniedPct}% deny` }))} />
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <CommandPanel title="Threat posture" meta="vector · severity · contain" accent={ACC} live>
        <div className="space-y-1.5">
          {se.threats.map(x => {
            const done = x.blocked || contained.has(x.vector);
            return (
              <div key={x.vector} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'rgba(55,199,212,0.18)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(done ? 'ok' : x.tone)}` }}>
                <span className="text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: sc(x.tone) }}>{x.severity}</span>
                <span className="text-[10px] font-medium text-ink">{x.vector}</span>
                {done ? (
                  <span className="ml-auto text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ {x.blocked ? 'blocked' : 'contained'}</span>
                ) : (
                  <button onClick={() => setContained(prev => new Set(prev).add(x.vector))}
                    className="focus-ring ml-auto rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                    style={{ borderColor: ACC, color: ACC }}>Contain</button>
                )}
              </div>
            );
          })}
        </div>
      </CommandPanel>

      <DispatchChannel scope={`health:secline:${id}`} now={now} accent={ACC}
        selfTier="MINISTRY" selfName="Security operations" toTier="NATIONAL"
        title="Security ops ↔ national CERT — incidents & containment" />

      <RuntimeQueue scope={`${id}:security`} kind="incident" title="Security runtime — detect → contain → eradicate → attest" by="Security Officer" role={role} withheld={withheld} />
    </div>
  );
}
