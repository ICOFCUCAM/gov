'use client';

// Education — National Education Command. Indexed library-catalogue
// composition: serif headers, roman-numeral section dividers, parchment-
// toned panels, navy/bronze/library-gold accents. Deliberately not card
// grids / tables — uses chronological columns and indexed ledger rows.

import * as React from 'react';
import { knowledgeDevelopmentBoard, type LiteracyPosture } from '@/lib/gov/knowledge-development';

const POSTURE_COL: Record<LiteracyPosture, string> = {
  consolidating: '#7a6a2b', sustained: '#3b5a8a', engaged: '#a7842a',
  strained: '#915036', 'fracture-watch': '#7a2a1d',
};

const PARCHMENT = '#f4ecd6';
const NAVY = '#1a2942';
const BRONZE = '#8a6a2e';
const LIBRARY_GOLD = '#a7842a';
const INK_SOFT = '#5b6175';

function Roman({ n }: { n: number }) {
  const arr = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return <span className="font-serif italic" style={{ color: BRONZE }}>{arr[n - 1] ?? n}</span>;
}

export function NationalEducationCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeDevelopmentBoard(now);
  const c = b.command;
  return (
    <div className="space-y-5" style={{ background: 'linear-gradient(180deg, rgba(244,236,214,0.04) 0%, transparent 50%)' }}>
      {/* Bound-volume header */}
      <div className="border-y px-6 py-4" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 50%,transparent)', background: 'rgba(26,41,66,0.08)' }}>
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-[10px] italic tracking-[0.28em]" style={{ color: BRONZE }}>VOL. {c.yearsEducationContinuity}</span>
          <span className="font-serif text-[10px] tracking-[0.28em]" style={{ color: INK_SOFT }}>·</span>
          <span className="font-serif text-[10px] uppercase tracking-[0.28em]" style={{ color: INK_SOFT }}>National Education &amp; Civil Development</span>
        </div>
        <div className="mt-2 flex items-baseline gap-6">
          <div>
            <div className="font-serif text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>Sovereign posture</div>
            <div className="font-serif text-[22px] tracking-tight" style={{ color: POSTURE_COL[c.posture] }}>{c.posture.replace('-', ' ')}</div>
          </div>
          <div>
            <div className="font-serif text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>Literacy</div>
            <div className="font-serif text-[22px] tabular-nums tracking-tight" style={{ color: NAVY }}>{c.literacyIdx}</div>
          </div>
          <div>
            <div className="font-serif text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>Capability</div>
            <div className="font-serif text-[22px] tabular-nums tracking-tight" style={{ color: BRONZE }}>{c.capabilityIdx}</div>
          </div>
          <div>
            <div className="font-serif text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>Institutional performance</div>
            <div className="font-serif text-[22px] tabular-nums tracking-tight" style={{ color: LIBRARY_GOLD }}>{c.institutionalPerformance}</div>
          </div>
          <div className="ml-auto">
            <div className="font-serif text-[10px] italic tracking-[0.18em]" style={{ color: INK_SOFT }}>{b.bannerLine}</div>
          </div>
        </div>
      </div>

      {/* Section I — Regional literacy ledger */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <Roman n={1} />
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Regional literacy &amp; capability ledger</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>recorded across six provinces</span>
        </div>
        <div className="overflow-hidden border-y" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 35%,transparent)' }}>
          {c.regions.map((r, i) => (
            <div key={r.region} className="grid grid-cols-[40px_220px_1fr_1fr_1fr_1fr_140px] items-baseline gap-4 border-b px-6 py-3 last:border-0"
              style={{ borderColor: 'rgba(138,106,46,0.18)', background: i % 2 === 0 ? 'rgba(244,236,214,0.02)' : 'transparent' }}>
              <span className="font-serif text-[10px] tabular-nums" style={{ color: BRONZE }}>{(i + 1).toString().padStart(2, '·')}</span>
              <span className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>{r.region}</span>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Literacy</div>
                <div className="font-serif text-[16px] tabular-nums" style={{ color: r.literacyPct >= 85 ? NAVY : r.literacyPct >= 75 ? LIBRARY_GOLD : '#915036' }}>{r.literacyPct}%</div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Primary net</div>
                <div className="font-serif text-[16px] tabular-nums" style={{ color: INK_SOFT }}>{r.primaryNetPct}%</div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Secondary net</div>
                <div className="font-serif text-[16px] tabular-nums" style={{ color: INK_SOFT }}>{r.secondaryNetPct}%</div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Capability idx</div>
                <div className="font-serif text-[16px] tabular-nums" style={{ color: BRONZE }}>{r.capabilityIdx}</div>
              </div>
              <span className="font-serif text-[10px] uppercase tracking-[0.16em] italic"
                style={{ color: r.continuityRisk === 'fracture' ? '#7a2a1d' : r.continuityRisk === 'monitor' ? LIBRARY_GOLD : '#3b5a8a' }}>
                {r.continuityRisk === 'fracture' ? '· fracture' : r.continuityRisk === 'monitor' ? '· monitor' : '· steady'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Section II — Generational continuity chronology */}
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <Roman n={2} />
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Generational continuity chronology</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>five cohorts traced through the system</span>
        </div>
        <div className="relative border-l-2 pl-6" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 50%,transparent)' }}>
          {b.cohorts.map((co, i) => (
            <div key={co.generation} className="relative mb-4 last:mb-0">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full" style={{ background: i === 0 ? LIBRARY_GOLD : i === b.cohorts.length - 1 ? NAVY : BRONZE }} />
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-[10px] tabular-nums tracking-[0.18em]" style={{ color: BRONZE }}>§ {i + 1}</span>
                <span className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>{co.generation}</span>
                <span className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>{co.populationM}M citizens</span>
                <span className="ml-auto font-serif text-[10px]" style={{ color: INK_SOFT }}>
                  capability <span className="tabular-nums" style={{ color: NAVY }}>{co.capabilityReadiness}</span>
                  <span className="mx-2">·</span>
                  literacy continuity <span className="tabular-nums" style={{ color: NAVY }}>{co.literacyContinuity}</span>
                  <span className="mx-2">·</span>
                  inequality <span className="tabular-nums" style={{ color: co.inequalityIdx > 45 ? '#915036' : INK_SOFT }}>{co.inequalityIdx}</span>
                  {co.workforceReadinessPct > 0 ? (
                    <>
                      <span className="mx-2">·</span>
                      workforce-ready <span className="tabular-nums" style={{ color: co.workforceReadinessPct >= 70 ? NAVY : LIBRARY_GOLD }}>{co.workforceReadinessPct}%</span>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(138,106,46,0.4) 0%, transparent 100%)' }} />
            </div>
          ))}
        </div>
      </section>
      <p className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>
        Continuity preserved across cohorts and provinces; pluralistic doctrine and equitable continuity remain
        the constitutional foundation of every reading on this ledger.
      </p>
    </div>
  );
}
