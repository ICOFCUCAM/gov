'use client';

// Domain — Executive Briefing. Ministerial command: synthesised national
// briefing, ranked strategic directives, cabinet escalation and active
// emergency declarations. Cinematic sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { executiveBriefing } from '@/lib/gov/health-operations';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#37c7d4';

export function ExecutiveBriefingSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const eb = executiveBriefing(id, ts);
  const [issued, setIssued] = React.useState<Set<string>>(() => new Set());
  const pTone: Tone = eb.posture === 'crisis' ? 'alert' : eb.posture === 'elevated' ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={14} title="Executive Briefing" subtitle="Ministerial Command · National Synthesis"
        posture={`${eb.posture}${eb.cabinetEscalation ? ' · CABINET' : ''}`} tone={pTone} now={now} role={role} accent={ACC} />

      <div className="rounded-[5px] border px-3 py-2 text-[11px] font-medium" style={{ borderColor: `color-mix(in srgb,${ACC} 30%,#15233a)`, color: sc(pTone), background: 'rgba(7,18,32,0.92)' }}>{eb.briefingLine}</div>

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Posture', v: eb.posture.toUpperCase(), s: 'national', t: pTone, k: 'ebp' },
        { l: 'Critical Alerts', v: `${eb.alerts.filter(a => a.severity === 'critical').length}`, s: 'active', t: eb.alerts.some(a => a.severity === 'critical') ? 'alert' : 'ok', k: 'eba' },
        { l: 'Directives', v: `${eb.directives.length}`, s: 'strategic', t: 'ok', k: 'ebd' },
        { l: 'Declarations', v: `${eb.declarations.length}`, s: 'emergency', t: eb.declarations.length ? 'alert' : 'ok', k: 'ebx' },
        { l: 'Cabinet', v: eb.cabinetEscalation ? 'ACTIVE' : 'STANDBY', s: 'escalation', t: eb.cabinetEscalation ? 'alert' : 'ok', k: 'ebc' },
        { l: 'Confidence', v: `${eb.confidencePct}%`, s: 'synthesis', t: 'ok', k: 'ebf' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="National alerts" meta="domain · severity" accent={ACC} live>
          <div className="space-y-1">
            {eb.alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[3px] border px-2 py-1 text-[9px]" style={{ borderColor: 'rgba(55,199,212,0.16)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(a.tone)}` }}>
                <span className="w-16 shrink-0 text-[7px] font-bold uppercase tracking-wider" style={{ color: sc(a.tone) }}>{a.severity}</span>
                <span className="w-18 shrink-0 text-[8px] text-ink-muted">{a.domain}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{a.headline}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Strategic directives" meta="issue ministerial directive" accent={ACC} live>
          <div className="space-y-1.5">
            {eb.directives.map(d => {
              const done = d.status === 'issued' || d.status === 'in-effect' || issued.has(d.id);
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: 'rgba(55,199,212,0.16)', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${sc(done ? 'ok' : d.tone)}` }}>
                  <span className="font-mono text-[8.5px] tabular-nums text-ink-muted">{d.id}</span>
                  <span className="min-w-0 flex-1 text-[9.5px] text-ink">{d.directive}</span>
                  <span className="shrink-0 text-[7.5px] text-ink-muted">{d.owner}</span>
                  {done ? (
                    <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ {d.status}</span>
                  ) : (
                    <button onClick={() => setIssued(prev => new Set(prev).add(d.id))}
                      className="focus-ring shrink-0 rounded-[3px] border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
                      style={{ borderColor: ACC, color: ACC }}>Issue</button>
                  )}
                </div>
              );
            })}
          </div>
        </CommandPanel>
      </div>

      {eb.declarations.length > 0 ? (
        <CommandPanel title="Emergency declarations" meta="scope · level · renewal" accent={ACC} live>
          <div className="space-y-1">
            {eb.declarations.map((x, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]" style={{ color: sc(x.tone) }}>
                <span className="w-32 shrink-0 truncate">{x.scope}</span>
                <span className="w-16 shrink-0 text-[7.5px] font-bold uppercase">{x.level}</span>
                <span className="min-w-0 flex-1 text-ink-muted">declared {x.ageHrs}h ago</span>
                <span className="shrink-0 font-mono tabular-nums">renew in {Math.max(0, x.renewalDueHrs - x.ageHrs)}h</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      ) : null}

      <RuntimeQueue scope={`${id}:executive`} kind="incident" title="Executive runtime — brief → direct → declare → review" by="Minister's Office" role={role} withheld={withheld} />
    </div>
  );
}
