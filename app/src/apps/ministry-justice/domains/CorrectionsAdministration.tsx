'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ◇ I — Corrections Administration.
// Surface the correctional-facility roster from the continuity engine,
// with rights-safeguard index and oversight class.

const OVERSIGHT_COL: Record<string, string> = {
  'independent-oversight': JUSTICE_DS.navy,
  'ministerial-review': JUSTICE_DS.bronze,
  'no-recent-audit': JUSTICE_DS.alert,
};

export function CorrectionsAdministration({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const facilities = b.corrections;
  const meanOcc = Math.round(facilities.reduce((s, f) => s + f.occupancyPct, 0) / facilities.length);
  const meanSafe = Math.round(facilities.reduce((s, f) => s + f.rightsSafeguardIdx, 0) / facilities.length);
  return (
    <DocketFrame archetype="corrections" numeral="◇ I" title="Corrections Administration" subtitle="facility roster · rights safeguards">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Facilities', v: facilities.length, t: JUSTICE_DS.ivory },
          { l: 'Mean occupancy', v: `${meanOcc}%`, t: meanOcc > 100 ? JUSTICE_DS.burgundy : meanOcc > 90 ? JUSTICE_DS.bronze : JUSTICE_DS.navy },
          { l: 'Mean safeguard idx', v: meanSafe, t: meanSafe >= 80 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="facility register" />
      {facilities.map((f, i) => (
        <RegisterRow key={f.id} numeral={`№ ${String(i + 1).padStart(2, '0')}`}
          primary={f.facility}
          secondary={`${f.region} · ${f.rehabilitationProgrammes} rehab programmes`}
          status={f.oversightStatus.replace(/-/g, ' ')}
          statusColor={OVERSIGHT_COL[f.oversightStatus]}
          columns={[
            { label: 'occupancy', value: `${f.occupancyPct}%`, tone: f.occupancyPct > 100 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
            { label: 'safeguard', value: `${f.rightsSafeguardIdx}`, tone: f.rightsSafeguardIdx >= 80 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
          ]} />
      ))}
    </DocketFrame>
  );
}
