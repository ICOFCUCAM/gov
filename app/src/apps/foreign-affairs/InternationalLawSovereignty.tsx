'use client';

// Foreign Affairs — International Law & Sovereignty Protection.
// Sovereignty disputes docket with forum lanes (bilateral /
// arbitration / international court / mediation), treaty legality
// register, sovereignty integrity readout. Distinct: lane-based
// docket geography with our-posture flags, not scatter or wedges.

import * as React from 'react';
import { foreignAffairsExtendedBoard, type SovereigntyDispute, type TreatyLegalityCheck } from '@/lib/gov/foreign-affairs-extended';

const MIDNIGHT = '#0e1b3a';
const MIDNIGHT_DEEP = '#08122a';
const CHARCOAL = '#16181f';
const PANEL = '#1a1c24';
const GOLD = '#a78947';
const GOLD_DIM = '#7a6233';
const SILVER = '#a8aab0';
const BURGUNDY = '#6b2a35';
const INK = '#dad9d2';
const PARCH = '#ece6d3';
const MUT = '#7a7e88';
const TRACE = 'rgba(167,137,71,0.22)';

const FORUM_COL: Record<SovereigntyDispute['forum'], string> = {
  bilateral: SILVER, 'arbitration-tribunal': GOLD, 'international-court': GOLD_DIM, mediation: '#5a7d8f',
};
const POSTURE_COL: Record<SovereigntyDispute['ourPosture'], string> = {
  defending: BURGUNDY, asserting: GOLD, 'co-claimant': SILVER, observer: MUT,
};
const STAGE_GLYPH: Record<SovereigntyDispute['stage'], string> = {
  consultation: '◌', memorial: '✎', 'oral-hearings': '◐', deliberation: '◑', 'ruling-pending': '★',
};
const COMPLIANCE_COL: Record<TreatyLegalityCheck['complianceClass'], string> = {
  compliant: GOLD, partial: SILVER, 'in-breach': BURGUNDY, 'reservation-filed': '#a05538',
};
const DOMAIN_GLYPH: Record<SovereigntyDispute['domain'], string> = {
  maritime: '⌒', airspace: '✈', 'land-border': '◆', 'cyber-jurisdiction': '⌬', 'resource-rights': '⛬', 'treaty-interpretation': '§',
};

export function InternationalLawSovereignty({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsExtendedBoard(now);
  const l = b.law;
  const lanes: SovereigntyDispute['forum'][] = ['bilateral', 'arbitration-tribunal', 'international-court', 'mediation'];
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· International Law &amp; Sovereignty Protection ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: PARCH }}>
              {l.disputes.length} active sovereignty disputes · {l.treatyLegality.length} treaty integrity checks
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Sovereignty integrity', v: l.sovereigntyIntegrityIdx, c: l.sovereigntyIntegrityIdx >= 80 ? GOLD : SILVER },
              { l: 'Intl. compliance', v: l.internationalComplianceIdx, c: l.internationalComplianceIdx >= 80 ? GOLD : SILVER },
              { l: 'Arbitrations', v: l.activeArbitrationsOurs, c: l.activeArbitrationsOurs >= 5 ? BURGUNDY : GOLD_DIM },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Forum lanes — sovereignty docket */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP, borderBottom: `1px solid ${TRACE}` }}>
        <h3 className="mb-4 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>⚖ Sovereignty docket · forum lanes</h3>
        <div className="grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-4" style={{ background: TRACE }}>
          {lanes.map(lane => {
            const inLane = l.disputes.filter(d => d.forum === lane);
            const col = FORUM_COL[lane];
            return (
              <div key={lane} className="px-5 py-4" style={{ background: CHARCOAL }}>
                <div className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: TRACE }}>
                  <span className="text-[10px] uppercase italic tracking-[0.32em]" style={{ color: col }}>{lane.replace(/-/g, ' ')}</span>
                  <span className="text-[9.5px] italic" style={{ color: MUT }}>{inLane.length} cases</span>
                </div>
                <div className="space-y-2">
                  {inLane.length === 0 ? (
                    <div className="text-[10px] italic" style={{ color: MUT }}>— no active disputes —</div>
                  ) : inLane.map(d => (
                    <article key={d.id} className="px-3 py-2.5" style={{ background: PANEL, borderLeft: `3px solid ${POSTURE_COL[d.ourPosture]}` }}>
                      <div className="flex items-baseline justify-between">
                        <span className="tabular-nums text-[9.5px]" style={{ color: GOLD_DIM }}>{d.id}</span>
                        <span className="text-[9.5px] italic" style={{ color: POSTURE_COL[d.ourPosture] }}>· {d.ourPosture}</span>
                      </div>
                      <div className="mt-1 text-[11px]" style={{ color: PARCH }}>
                        <span className="mr-2" style={{ color: GOLD_DIM }}>{DOMAIN_GLYPH[d.domain]}</span>
                        {d.domain.replace(/-/g, ' ')}
                      </div>
                      <div className="text-[10px] italic" style={{ color: MUT }}>vs. {d.counterparty}</div>
                      <div className="mt-2 flex items-baseline justify-between text-[9.5px] italic">
                        <span style={{ color: MUT }}>filed {d.filedDaysAgo}d ago</span>
                        <span style={{ color: GOLD }}>{STAGE_GLYPH[d.stage]} {d.stage.replace(/-/g, ' ')}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Treaty legality register */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>§ Treaty legality &amp; compliance register</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>treaty · scope · outstanding obligations · next review · integrity</span>
        </div>
        <div className="overflow-hidden border" style={{ borderColor: TRACE, background: CHARCOAL }}>
          {l.treatyLegality.map((t, i) => {
            const col = COMPLIANCE_COL[t.complianceClass];
            return (
              <div key={t.treatyTitle} className="grid grid-cols-[1fr_120px_110px_100px_140px_120px] items-center gap-3 border-t px-5 py-3 text-[11px]" style={{ borderColor: i === 0 ? 'transparent' : TRACE }}>
                <span style={{ color: PARCH }}>{t.treatyTitle}</span>
                <span className="text-[9.5px] uppercase italic tracking-[0.24em]" style={{ color: GOLD_DIM }}>{t.scope}</span>
                <span className="text-right tabular-nums" style={{ color: t.outstandingObligations >= 10 ? BURGUNDY : t.outstandingObligations >= 4 ? GOLD : MUT }}>{t.outstandingObligations} obl.</span>
                <span className="text-right tabular-nums text-[10px]" style={{ color: t.nextReviewDays < 0 ? BURGUNDY : t.nextReviewDays <= 30 ? GOLD : MUT }}>
                  {t.nextReviewDays < 0 ? `${Math.abs(t.nextReviewDays)}d overdue` : `${t.nextReviewDays}d`}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-[3px] flex-1" style={{ background: '#0d1428' }}>
                    <div className="h-full" style={{ width: `${t.legalIntegrityIdx}%`, background: col }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: col }}>{t.legalIntegrityIdx}</span>
                </div>
                <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: col }}>● {t.complianceClass.replace(/-/g, ' ')}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-[10px] italic" style={{ color: MUT }}>
          Legal coordination latency: <span className="not-italic tabular-nums" style={{ color: GOLD }}>{l.legalCoordinationLatencyHrs}h</span> across the diplomatic legal corps.
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: MIDNIGHT, borderTop: `1px solid ${TRACE}` }}>
        <span className="text-[9px] uppercase italic tracking-[0.4em]" style={{ color: GOLD_DIM }}>
          ⚖ Pacta sunt servanda · agreements are kept; sovereignty is defended ⚖
        </span>
      </footer>
    </div>
  );
}
