'use client';

// Police domain — Constitutional Oversight. The constitutional engine's
// live verdict for the Police agency: mandate adherence, emergency-power
// lifecycle, audit-chain dependency and the capabilities the constitution
// withholds while non-compliant. Accountability is a first-class surface.

import * as React from 'react';
import { wave } from '@/lib/telemetry';
import { verifyChain } from '@/services/audit-ledger';
import { evaluateConstitution } from '@/services/constitutional-engine';

const STATUS_COLOR: Record<string, string> = {
  ok: 'rgb(var(--c-ok))', watch: 'rgb(var(--c-warn))', breach: 'rgb(var(--c-alert))',
};

export function ConstitutionalOversight({ id, now, accent }: {
  id: string; now: number; accent: string;
}) {
  const ts = now / 4000;
  const nowHrs = now / 4000;
  const stress = Math.round(wave(`con:police:${id}`, ts, 18, 96));
  const chain = verifyChain(`${id}:strategic-command`);
  const emergency = stress >= 88
    ? {
        scope: 'police',
        authority: 'Cabinet emergency cell',
        assertedAtHrs: nowHrs - (stress - 50),
        renewals: [{ atHrs: nowHrs - (stress - 50) / 2, authority: 'Legislature' }],
      }
    : null;
  const v = evaluateConstitution({
    kind: 'agency', domain: 'police', stress,
    emergencyAsserted: emergency != null, emergency, nowHrs,
    auditIntact: chain.intact,
  });

  const postureColor = v.posture === 'breach' ? 'rgb(var(--c-alert))'
    : v.posture === 'under-review' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[3px] border border-line bg-surface px-2 py-1.5"
        style={{ borderColor: `color-mix(in srgb,${accent} 18%,rgb(var(--c-line)))` }}>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">Constitutional posture</span>
        <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: postureColor }}>{v.posture}</span>
        <span className="ml-auto text-[10px] text-ink-muted">Operational stress <span className="font-semibold tabular-nums text-ink">{stress}</span></span>
        <span className="text-[10px] text-ink-muted">Emergency phase <span className="font-semibold uppercase text-ink">{v.emergency.phase}</span></span>
      </div>

      <div className="rounded-[3px] border border-line bg-surface">
        <div className="border-b border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Constitutional checks
        </div>
        <ul className="divide-y divide-line">
          {v.checks.map(c => (
            <li key={c.rule} className="flex items-start gap-2 px-2 py-1 text-[11px]">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[c.status] }} aria-hidden />
              <span className="w-40 shrink-0 font-medium text-ink">{c.rule}</span>
              <span className="min-w-0 flex-1 text-ink-muted">{c.detail}</span>
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: STATUS_COLOR[c.status] }}>{c.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[3px] border border-line bg-surface p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Capabilities withheld by the constitution
        </div>
        {v.withheld.length === 0 ? (
          <p className="text-[11px]" style={{ color: 'rgb(var(--c-ok))' }}>None — Police Command is operating with full constitutional authority.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {v.withheld.map(w => (
              <span key={w} className="rounded-[2px] border border-line px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: 'rgb(var(--c-alert))' }}>{w}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
