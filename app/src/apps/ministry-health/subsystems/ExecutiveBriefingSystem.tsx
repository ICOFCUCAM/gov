'use client';

// apps/ministry-health/subsystems/ExecutiveBriefingSystem — Layer 1
// ministerial command: synthesised national briefing, ranked strategic
// directives, cabinet escalation and active emergency declarations.
// Command-grade Mode A.

import * as React from 'react';
import { StatGrid, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { executiveBriefing } from '@/lib/gov/health-operations';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function ExecutiveBriefingSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const eb = executiveBriefing(id, ts);
  const [issued, setIssued] = React.useState<Set<string>>(() => new Set());
  const pTone: 'ok' | 'warn' | 'alert' = eb.posture === 'crisis' ? 'alert' : eb.posture === 'elevated' ? 'warn' : 'ok';
  return (
    <div className="space-y-2 rounded-[4px] bg-[#070a0e] p-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: '#1d2a36', background: 'linear-gradient(90deg,#0b0f14,#0d1620)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ac(pTone), textShadow: `0 0 14px color-mix(in srgb, ${ac(pTone)} 60%, transparent)` }}>◉ EXECUTIVE BRIEFING</span>
        <PosturePill label={eb.posture} tone={pTone} />
        {eb.cabinetEscalation ? <span className="rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: `color-mix(in srgb, ${ac('alert')} 22%, transparent)`, color: ac('alert') }}>CABINET ESCALATION</span> : null}
        <span className="ml-auto text-[9px] text-ink-muted">minister · {role}</span>
      </div>
      <div className="rounded-[3px] border px-2.5 py-1.5 text-[11px] font-medium" style={{ borderColor: '#1d2a36', color: ac(pTone), background: '#0b0f14' }}>{eb.briefingLine}</div>
      <StatGrid items={[
        { l: 'Posture', v: eb.posture, t: pTone },
        { l: 'Critical alerts', v: `${eb.alerts.filter(a => a.severity === 'critical').length}`, t: eb.alerts.some(a => a.severity === 'critical') ? 'alert' : 'ok' },
        { l: 'Directives', v: `${eb.directives.length}`, t: 'ok' },
        { l: 'Declarations', v: `${eb.declarations.length}`, t: eb.declarations.length ? 'alert' : 'ok' },
        { l: 'Cabinet', v: eb.cabinetEscalation ? 'ACTIVE' : 'standby', t: eb.cabinetEscalation ? 'alert' : 'ok' },
        { l: 'Confidence', v: `${eb.confidencePct}%`, t: 'ok' },
      ]} />
      <Panel title="National alerts" meta="domain · severity">
        <div className="space-y-1">
          {eb.alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[10px]" style={{ borderLeft: `3px solid ${ac(a.tone)}` }}>
              <span className="w-20 shrink-0 text-[8px] font-bold uppercase tracking-wider" style={{ color: ac(a.tone) }}>{a.severity}</span>
              <span className="w-20 shrink-0 text-[8.5px] text-ink-muted">{a.domain}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{a.headline}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Strategic directives" meta="issue ministerial directive">
        <div className="space-y-1.5">
          {eb.directives.map(d => {
            const done = d.status === 'issued' || d.status === 'in-effect' || issued.has(d.id);
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${ac(done ? 'ok' : d.tone)}` }}>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{d.id}</span>
                <span className="min-w-0 flex-1 text-[10px] text-ink">{d.directive}</span>
                <span className="shrink-0 text-[8px] text-ink-muted">{d.owner}</span>
                {done ? (
                  <span className="shrink-0 text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: ac('ok') }}>✓ {d.status}</span>
                ) : (
                  <button onClick={() => setIssued(prev => new Set(prev).add(d.id))}
                    className="focus-ring shrink-0 rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">Issue</button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      {eb.declarations.length > 0 ? (
        <Panel title="Emergency declarations" meta="scope · level · age · renewal">
          <div className="space-y-1">
            {eb.declarations.map((x, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: ac(x.tone) }}>
                <span className="w-32 shrink-0 truncate">{x.scope}</span>
                <span className="w-20 shrink-0 text-[8px] font-bold uppercase">{x.level}</span>
                <span className="min-w-0 flex-1 text-ink-muted">declared {x.ageHrs}h ago</span>
                <span className="shrink-0 font-mono tabular-nums">renew in {Math.max(0, x.renewalDueHrs - x.ageHrs)}h</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
      <RuntimeQueue scope={`${id}:executive`} kind="incident" title="Executive runtime — brief → direct → declare → review" by="Minister's Office" role={role} withheld={withheld} />
    </div>
  );
}
