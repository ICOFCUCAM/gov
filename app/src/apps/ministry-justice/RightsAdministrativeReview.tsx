'use client';

// Justice — Rights Protection & Administrative Legality. Two registers:
// the Bill of Rights monitoring index, and the administrative-legality
// ledger over every ministry. Correctional oversight closes the chain.

import * as React from 'react';
import { justiceContinuityBoard, type RightsProtection, type CorrectionalFacility } from '@/lib/gov/justice-continuity';

const CHARCOAL = '#1a1d24';
const PANEL = '#1e2129';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';

const RIGHTS_COL: Record<RightsProtection['status'], string> = {
  preserved: NAVY, watch: BRONZE, escalation: BURGUNDY,
};
const OVERSIGHT_COL: Record<CorrectionalFacility['oversightStatus'], string> = {
  'independent-oversight': NAVY, 'ministerial-review': BRONZE, 'no-recent-audit': BURGUNDY,
};

export function RightsAdministrativeReview({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  return (
    <div className="space-y-px" style={{ background: RULE, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Bill of rights register */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-4 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>§ III  Bill of Rights — Monitoring Index</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Civil liberties register</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{b.rights.length} rights tracked</span>
        </header>
        <ol className="divide-y" style={{ borderColor: RULE }}>
          {b.rights.map(r => (
            <li key={r.right} className="grid grid-cols-[1fr_140px_140px_140px] items-baseline gap-3 py-3" style={{ borderColor: RULE }}>
              <span className="text-[12px]" style={{ color: IVORY }}>{r.right}</span>
              <div className="flex items-center gap-2">
                <div className="h-[3px] flex-1" style={{ background: 'rgba(140,106,58,0.18)' }}>
                  <div className="h-full" style={{ width: `${r.monitoringIdx}%`, background: RIGHTS_COL[r.status] }} />
                </div>
                <span className="tabular-nums text-[10px]" style={{ color: RIGHTS_COL[r.status] }}>{r.monitoringIdx}</span>
              </div>
              <span className="text-right tabular-nums text-[11px]" style={{ color: r.alertsRaised >= 4 ? BURGUNDY : r.alertsRaised >= 2 ? BRONZE : MUT }}>
                {r.alertsRaised} alerts
              </span>
              <span className="text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: RIGHTS_COL[r.status] }}>· {r.status}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Administrative legality */}
      <section className="px-6 py-5" style={{ background: PANEL }}>
        <header className="mb-4 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>¶ Administrative Legality Ledger</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Executive accountability — every ministry under review</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>compliance ascending — weakest first</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <colgroup><col /><col style={{ width: '180px' }} /><col style={{ width: '110px' }} /><col style={{ width: '130px' }} /><col style={{ width: '140px' }} /></colgroup>
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
                <th className="py-2 pr-2">Ministry</th>
                <th className="py-2 pr-2">Compliance</th>
                <th className="py-2 pr-2 text-right">Outstanding</th>
                <th className="py-2 pr-2 text-right">Audit lineage</th>
                <th className="py-2 pr-2 text-right">Accountability idx</th>
              </tr>
            </thead>
            <tbody>
              {b.administrative.map(a => {
                const tone = a.complianceIdx >= 84 ? NAVY : a.complianceIdx >= 70 ? BRONZE : BURGUNDY;
                return (
                  <tr key={a.ministry} className="border-t" style={{ borderColor: RULE }}>
                    <td className="py-2 pr-2" style={{ color: IVORY }}>{a.ministry}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-[3px] w-28" style={{ background: 'rgba(140,106,58,0.18)' }}>
                          <div className="h-full" style={{ width: `${a.complianceIdx}%`, background: tone }} />
                        </div>
                        <span className="tabular-nums text-[10px]" style={{ color: tone }}>{a.complianceIdx}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums" style={{ color: a.outstandingActions >= 10 ? BURGUNDY : a.outstandingActions >= 5 ? BRONZE : MUT }}>{a.outstandingActions}</td>
                    <td className="py-2 pr-2 text-right tabular-nums" style={{ color: INK }}>{a.auditLineageYears}y</td>
                    <td className="py-2 pr-2 text-right tabular-nums" style={{ color: a.executiveAccountabilityIdx >= 80 ? NAVY : a.executiveAccountabilityIdx >= 60 ? BRONZE : BURGUNDY }}>{a.executiveAccountabilityIdx}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Correctional oversight */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-4 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>§ VII  Detention Oversight</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Correctional facilities · oversight register</h3>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-px md:grid-cols-2 lg:grid-cols-3" style={{ background: RULE }}>
          {b.corrections.map(f => (
            <article key={f.id} className="px-4 py-3" style={{ background: CHARCOAL }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: IVORY }}>{f.facility}</span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: BRONZE }}>{f.region}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em]" style={{ color: MUT }}>occupancy</div>
                  <div className="tabular-nums text-[12px]" style={{ color: f.occupancyPct > 110 ? BURGUNDY : f.occupancyPct > 95 ? BRONZE : NAVY }}>{f.occupancyPct}%</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em]" style={{ color: MUT }}>rehab progs</div>
                  <div className="tabular-nums text-[12px]" style={{ color: INK }}>{f.rehabilitationProgrammes}</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em]" style={{ color: MUT }}>safeguard idx</div>
                  <div className="tabular-nums text-[12px]" style={{ color: f.rightsSafeguardIdx >= 80 ? NAVY : BRONZE }}>{f.rightsSafeguardIdx}</div>
                </div>
              </div>
              <div className="mt-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: OVERSIGHT_COL[f.oversightStatus] }}>· {f.oversightStatus}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
