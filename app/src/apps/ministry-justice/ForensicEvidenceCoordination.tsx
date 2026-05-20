'use client';

// Justice — Forensic & Evidence Coordination.
// National forensic laboratory roster with capacity gauges (vertical
// retort flasks), evidence corpus inventory bar, inter-agency
// authentication flow. Constitutional palette retained; new geometry —
// retort flask gauges (not bars, not rivets, not chevrons).

import * as React from 'react';
import { justiceRecordsForensicsBoard, type ForensicLab } from '@/lib/gov/justice-records-forensics';

const CHARCOAL = '#1a1d24';
const PANEL = '#1e2129';
const PANEL2 = '#23262e';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';
const ALERT = '#a04030';
const TEAL_INK = '#5d7a6d';

const ACCRED_COL: Record<ForensicLab['accreditationStatus'], string> = {
  accredited: NAVY, review: BRONZE, probation: '#a05538', suspended: ALERT,
};

const DISCIPLINE_GLYPH: Record<ForensicLab['discipline'], string> = {
  'DNA & biology': '⚕', Toxicology: '⚗', Ballistics: '◊', 'Digital & cyber': '⌬', 'Document examination': '✎', 'Trace evidence': '◇', 'Forensic pathology': '✠',
};

// Retort-flask capacity gauge — distinct from prior surfaces
function RetortFlask({ utilisation, col }: { utilisation: number; col: string }) {
  const w = 64, h = 80;
  const neckH = 18; const bulbH = h - neckH - 4;
  const fillFrac = Math.min(1, utilisation / 100);
  const fillH = bulbH * fillFrac;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* neck */}
      <rect x={w / 2 - 6} y={2} width={12} height={neckH} fill="none" stroke={BRONZE} strokeWidth={1} />
      {/* bulb outline (rounded) */}
      <path d={`M${w / 2 - 6} ${neckH + 2} Q4 ${neckH + 14} 4 ${h - 6} Q4 ${h - 2} ${w / 2} ${h - 2} Q${w - 4} ${h - 2} ${w - 4} ${h - 6} Q${w - 4} ${neckH + 14} ${w / 2 + 6} ${neckH + 2}`}
        fill="none" stroke={BRONZE} strokeWidth={1.2} />
      {/* fill (gradient amber→col) */}
      <defs>
        <linearGradient id={`flaskFill-${col.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity={0.5} />
          <stop offset="100%" stopColor={col} stopOpacity={0.95} />
        </linearGradient>
      </defs>
      <path d={`M${w / 2 - 6} ${h - 2 - fillH} Q4 ${h - 2 - fillH * 0.4} 4 ${h - 6} Q4 ${h - 2} ${w / 2} ${h - 2} Q${w - 4} ${h - 2} ${w - 4} ${h - 6} Q${w - 4} ${h - 2 - fillH * 0.4} ${w / 2 + 6} ${h - 2 - fillH}`}
        fill={`url(#flaskFill-${col.replace('#', '')})`} />
      {/* tick marks 25/50/75 */}
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={w - 8} y1={h - 6 - bulbH * p} x2={w - 4} y2={h - 6 - bulbH * p} stroke={BRONZE} strokeOpacity={0.4} strokeWidth={0.8} />
      ))}
      {/* numeric reading */}
      <text x={w / 2} y={neckH - 4} textAnchor="middle" fontSize={9} fontFamily="ui-serif, Georgia, serif" fill={col} fontWeight={700}>{utilisation}%</text>
    </svg>
  );
}

export function ForensicEvidenceCoordination({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const f = b.forensics;
  return (
    <div style={{ background: CHARCOAL, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-6" style={{ borderBottom: `1px solid ${RULE}`, background: 'linear-gradient(180deg, #1d2027 0%, #1a1d24 100%)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-serif italic text-[10px] uppercase tracking-[0.42em]" style={{ color: BRONZE }}>National Forensic Authority — Sovereign Evidence Coordination</div>
            <h2 className="mt-2 font-serif text-[18px] tracking-[0.04em]" style={{ color: IVORY }}>
              {f.labs.length} accredited laboratories · {f.corpus.totalItemsM.toLocaleString()}M evidence items · interoperability {f.interOperabilityIdx}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Mean quality idx', v: f.meanQualityIdx, c: f.meanQualityIdx >= 80 ? NAVY : BRONZE },
              { l: 'Auth. backlog', v: f.authenticationBacklog.toLocaleString(), c: f.authenticationBacklog > 8000 ? ALERT : f.authenticationBacklog > 3000 ? BRONZE : MUT },
              { l: 'Inter-op idx', v: f.interOperabilityIdx, c: f.interOperabilityIdx >= 75 ? NAVY : BRONZE },
            ].map(x => (
              <div key={x.l} className="px-3 py-2 font-serif" style={{ background: PANEL, border: `1px solid ${RULE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Evidence corpus inventory */}
      <section className="px-8 py-5" style={{ background: PANEL2, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>⌬ National evidence corpus · inventory bar</h3>
        <div className="grid grid-cols-1 gap-px md:grid-cols-3 lg:grid-cols-6" style={{ background: RULE }}>
          {[
            { l: 'Total items', v: `${f.corpus.totalItemsM}M`, c: IVORY },
            { l: 'Digital evidence', v: `${f.corpus.digitalEvidenceTb.toLocaleString()} TB`, c: TEAL_INK },
            { l: 'Biometric records', v: `${f.corpus.biometricRecordsM}M`, c: BRONZE },
            { l: 'Pending auth.', v: f.corpus.pendingAuthentication.toLocaleString(), c: f.corpus.pendingAuthentication > 8000 ? ALERT : BRONZE },
            { l: 'Rejected this Q', v: f.corpus.rejectedThisQ.toLocaleString(), c: f.corpus.rejectedThisQ > 1000 ? BURGUNDY : MUT },
            { l: 'Inter-agency daily', v: f.corpus.interAgencyExchangesDaily.toLocaleString(), c: NAVY },
          ].map(x => (
            <div key={x.l} className="px-4 py-3 font-serif" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-1 tabular-nums text-[15px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Laboratory roster */}
      <section className="px-8 py-6" style={{ background: CHARCOAL }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>⚗ National forensic laboratory network — capacity retorts</h3>
          <span className="font-serif italic text-[9.5px]" style={{ color: MUT }}>discipline · region · turnaround · accreditation</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {f.labs.map(l => {
            const col = ACCRED_COL[l.accreditationStatus];
            return (
              <article key={l.id} className="grid grid-cols-[80px_1fr] items-stretch gap-4 px-4 py-3" style={{ background: PANEL, border: `1px solid ${RULE}` }}>
                {/* retort flask */}
                <div className="flex flex-col items-center justify-center">
                  <RetortFlask utilisation={Math.min(100, l.capacityUtilisationPct)} col={col} />
                  <div className="mt-1 font-serif italic text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>capacity</div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-[11.5px]" style={{ color: IVORY }}>
                      <span className="mr-2" style={{ color: BRONZE }}>{DISCIPLINE_GLYPH[l.discipline]}</span>{l.lab}
                    </span>
                    <span className="font-serif italic text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>· {l.accreditationStatus}</span>
                  </div>
                  <div className="font-serif italic text-[10px]" style={{ color: MUT }}>{l.discipline} · {l.region}</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-serif">
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>caseload</div>
                      <div className="tabular-nums" style={{ color: INK }}>{l.caseloadActive.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>turnaround</div>
                      <div className="tabular-nums" style={{ color: l.averageTurnaroundDays >= 60 ? BURGUNDY : l.averageTurnaroundDays >= 30 ? BRONZE : NAVY }}>{l.averageTurnaroundDays}d</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>examiners</div>
                      <div className="tabular-nums" style={{ color: INK }}>{l.examinersOnDuty}</div>
                    </div>
                  </div>
                  {l.capacityUtilisationPct > 100 ? (
                    <div className="mt-2 font-serif italic text-[9.5px] uppercase tracking-[0.18em]" style={{ color: BURGUNDY }}>
                      ⚠ capacity overdraft — surge protocols engaged
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL, borderTop: `1px solid ${RULE}` }}>
        <span className="font-serif italic text-[10px] uppercase tracking-[0.32em]" style={{ color: MUT }}>
          ⚗ Sub iudice, sub examine · every artefact carries its provenance ⚗
        </span>
      </footer>
    </div>
  );
}
