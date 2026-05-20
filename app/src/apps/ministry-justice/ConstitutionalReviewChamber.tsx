'use client';

// Justice — Constitutional Review Chamber. A deliberative chamber
// register, not a dashboard. Constitutional articles are arrayed as a
// numbered statute index; posture is reported with the gravity of a
// chamber clerk. Charcoal / ivory parchment / restrained burgundy /
// constitutional bronze / muted institutional navy.

import * as React from 'react';
import { justiceContinuityBoard, type ConstitutionalArticle, type ConstitutionalPosture } from '@/lib/gov/justice-continuity';

const CHARCOAL = '#1a1d24';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';

const POSTURE_COL: Record<ConstitutionalPosture, string> = {
  sound: NAVY, engaged: BRONZE, 'under-review': BRONZE, pressure: BURGUNDY, 'breach-watch': '#5e1d24',
};

export function ConstitutionalReviewChamber({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const r = b.review;
  return (
    <div className="space-y-0" style={{ background: CHARCOAL, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Chamber masthead */}
      <header className="border-y px-6 py-5" style={{ borderColor: RULE, background: 'linear-gradient(180deg, #1d2027 0%, #1a1d24 100%)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>Chamber of Constitutional Review</div>
            <h2 className="mt-2 text-[18px] font-medium tracking-[0.04em]" style={{ color: IVORY }}>{b.bannerLine}</h2>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>Sitting / epoch</div>
            <div className="mt-1 tabular-nums text-[14px]" style={{ color: IVORY }}>{String(b.epoch).padStart(6, '0')}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: RULE }}>
          {[
            { l: 'Composite integrity', v: r.integrityIdx, t: r.integrityIdx >= 84 ? NAVY : r.integrityIdx >= 70 ? BRONZE : BURGUNDY },
            { l: 'Separation of powers', v: r.separationOfPowersIdx, t: r.separationOfPowersIdx >= 80 ? NAVY : BRONZE },
            { l: 'Judicial independence', v: r.judicialIndependenceIdx, t: r.judicialIndependenceIdx >= 80 ? NAVY : BRONZE },
            { l: 'Emergency powers asserted', v: r.emergencyPowersAsserted, t: r.emergencyPowersAsserted ? BURGUNDY : NAVY },
          ].map(c => (
            <div key={c.l} className="px-4 py-3" style={{ background: CHARCOAL }}>
              <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{c.l}</div>
              <div className="mt-1 tabular-nums text-[17px]" style={{ color: c.t }}>{c.v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Posture stripe */}
      <div className="flex items-stretch px-6 py-3" style={{ background: '#0f1116', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex-1 text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>Posture of the constitutional order</div>
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-12" style={{ background: POSTURE_COL[r.posture] }} />
          <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: POSTURE_COL[r.posture] }}>· {r.posture}</span>
        </div>
      </div>

      {/* Articles register */}
      <section className="px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <h3 className="text-[10px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>Register of constitutional articles · {r.articles.length} entries</h3>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: r.articlesUnderReview ? BURGUNDY : MUT }}>{r.articlesUnderReview} under formal review</span>
        </div>
        <ol className="divide-y" style={{ borderColor: RULE }}>
          {r.articles.map((a: ConstitutionalArticle, idx: number) => (
            <li key={a.article} className="grid grid-cols-[68px_1fr_120px_120px_120px] items-baseline gap-4 py-3" style={{ borderColor: RULE }}>
              <span className="tabular-nums text-[12px] tracking-[0.08em]" style={{ color: BRONZE }}>{a.article}</span>
              <span className="text-[13px]" style={{ color: IVORY }}>{a.title}</span>
              <span className="tabular-nums text-right text-[12px]" style={{ color: a.integrityIdx >= 80 ? NAVY : a.integrityIdx >= 65 ? BRONZE : BURGUNDY }}>
                integrity · {a.integrityIdx}
              </span>
              <span className="text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: a.underReview ? BURGUNDY : MUT }}>
                {a.underReview ? '· under review' : '· settled'}
              </span>
              <span className="text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: a.emergencyPowerActive ? BURGUNDY : MUT }}>
                {a.emergencyPowerActive ? '⚠ emergency invoked' : '— dormant'}
              </span>
              {void idx}
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t px-6 py-4 text-[10px] uppercase tracking-[0.24em]" style={{ borderColor: RULE, color: MUT }}>
        The chamber records — the chamber does not interpret. Interpretation is ruled in the bench.
      </footer>
    </div>
  );
}
