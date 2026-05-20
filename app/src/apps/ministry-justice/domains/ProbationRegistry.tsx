'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';
import { seed, wave } from '@/lib/telemetry';

// ◇ II — Probation Registry. Synthetic register derived from the
// corrections engine (per facility, a portion of inmates is on
// probation/parole). Tracks compliance, breaches, and pending
// revocation hearings.

export function ProbationRegistry({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const epoch = b.epoch;
  const programmes = b.corrections.map((f, i) => {
    const k = `pr:${f.id}:${epoch}`;
    const probationersK = Math.round(wave(`${k}:p`, epoch / 5, 0.4, 14.4) * 10) / 10;
    const compliancePct = Math.round(wave(`${k}:c`, epoch / 6, 62, 96));
    const breachesQ = Math.floor(seed(`${k}:b`) * 38);
    const revocationsPending = Math.floor(seed(`${k}:r`) * 18);
    void i;
    return { facility: f.facility, region: f.region, probationersK, compliancePct, breachesQ, revocationsPending };
  });
  const total = Math.round(programmes.reduce((s, p) => s + p.probationersK, 0) * 10) / 10;
  const meanCompl = Math.round(programmes.reduce((s, p) => s + p.compliancePct, 0) / programmes.length);
  const totalRevocations = programmes.reduce((s, p) => s + p.revocationsPending, 0);
  return (
    <DocketFrame archetype="corrections" numeral="◇ II" title="Probation Registry" subtitle="post-custodial conditions · compliance">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Probationers active', v: `${total}K`, t: JUSTICE_DS.ivory },
          { l: 'Mean compliance', v: `${meanCompl}%`, t: meanCompl >= 85 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
          { l: 'Revocations pending', v: totalRevocations, t: totalRevocations > 30 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="programme register" />
      <ul className="space-y-1.5">
        {programmes.map(p => (
          <li key={p.facility} className="grid grid-cols-[1fr_90px_100px_100px_100px] items-baseline gap-3 text-[11px]">
            <span style={{ color: JUSTICE_DS.ivory }}>{p.facility}<span className="ml-2 text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>· {p.region}</span></span>
            <span className="text-right tabular-nums" style={{ color: JUSTICE_DS.ink }}>{p.probationersK}K</span>
            <span className="text-right tabular-nums" style={{ color: p.compliancePct >= 85 ? JUSTICE_DS.navy : JUSTICE_DS.bronze }}>{p.compliancePct}% compl</span>
            <span className="text-right tabular-nums" style={{ color: p.breachesQ > 20 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze }}>{p.breachesQ} breach</span>
            <span className="text-right tabular-nums" style={{ color: p.revocationsPending > 8 ? JUSTICE_DS.alert : JUSTICE_DS.mut }}>{p.revocationsPending} revoke</span>
          </li>
        ))}
      </ul>
    </DocketFrame>
  );
}
