'use client';

// Education — Institutional inventory + Research lineage. Library-shelf
// composition: stacked manuscript-style entries with bronze marginalia.

import * as React from 'react';
import { knowledgeDevelopmentBoard, type InstitutionRecord, type ResearchProgramme } from '@/lib/gov/knowledge-development';

const NAVY = '#1a2942';
const BRONZE = '#8a6a2e';
const LIBRARY_GOLD = '#a7842a';
const INK_SOFT = '#5b6175';

const ACCRED_COL: Record<InstitutionRecord['accreditation'], string> = {
  pending: '#5b6175', accredited: '#3b5a8a', probation: '#a7842a', revoked: '#7a2a1d',
};
const PRIORITY_COL: Record<ResearchProgramme['strategicPriority'], string> = {
  core: NAVY, advisory: LIBRARY_GOLD, sunset: '#915036',
};
const TYPE_GLYPH: Record<InstitutionRecord['type'], string> = {
  Primary: '☰', Secondary: '☱', Tertiary: '☵', 'Research University': '⊕', 'Teacher College': '⊜',
};

export function InstitutionsResearchLineage({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeDevelopmentBoard(now);
  return (
    <div className="space-y-6">
      {/* Institutional shelf */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>III</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Institutional inventory</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>indexed by region, year of establishment</span>
        </div>
        <div className="space-y-2">
          {b.institutions.map((inst, i) => (
            <article key={inst.id} className="grid grid-cols-[60px_1fr_180px_90px_120px_140px] items-baseline gap-4 border-l-2 px-4 py-3"
              style={{ borderColor: ACCRED_COL[inst.accreditation], background: 'linear-gradient(90deg, rgba(26,41,66,0.03) 0%, transparent 100%)' }}>
              <span className="font-serif italic" style={{ color: BRONZE }}>№ {(i + 1).toString().padStart(2, '0')}</span>
              <div>
                <div className="font-serif text-[15px] tracking-tight" style={{ color: NAVY }}>
                  <span className="mr-2" style={{ color: LIBRARY_GOLD }} aria-hidden>{TYPE_GLYPH[inst.type]}</span>
                  {inst.name}
                </div>
                <div className="mt-0.5 font-serif text-[10px] italic" style={{ color: INK_SOFT }}>
                  {inst.type} · {inst.region} · founded {inst.establishedYearsAgo}y ago
                </div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Enrolment</div>
                <div className="font-serif text-[15px] tabular-nums" style={{ color: NAVY }}>{inst.enrolment.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Faculty</div>
                <div className="font-serif text-[15px] tabular-nums" style={{ color: INK_SOFT }}>{inst.faculty.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-serif text-[9.5px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Facility integrity</div>
                <div className="font-serif text-[15px] tabular-nums" style={{ color: inst.facilityIntegrity >= 75 ? NAVY : LIBRARY_GOLD }}>{inst.facilityIntegrity}</div>
              </div>
              <span className="font-serif text-[10px] uppercase italic tracking-[0.18em]" style={{ color: ACCRED_COL[inst.accreditation] }}>
                ◇ {inst.accreditation}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* Research lineage */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>IV</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Research &amp; innovation lineage</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>capability ordered first</span>
        </div>
        <div className="space-y-1.5">
          {b.research.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[40px_180px_120px_120px_140px_1fr_120px] items-baseline gap-4 border-b py-2 px-1 last:border-0"
              style={{ borderColor: 'rgba(138,106,46,0.15)' }}>
              <span className="font-serif italic" style={{ color: BRONZE }}>{i + 1}.</span>
              <span className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>{r.sector}</span>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Funding</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: NAVY }}>{r.fundingBn}<span className="text-[10px]" style={{ color: INK_SOFT }}>Bn</span></div>
              </div>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Lineage</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: BRONZE }}>{r.fundingLineageYears}<span className="text-[10px]" style={{ color: INK_SOFT }}>y</span></div>
              </div>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Outputs / y</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: INK_SOFT }}>{r.outputsPerYear.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative h-1.5 w-24" style={{ background: 'rgba(138,106,46,0.15)' }}>
                  <span className="absolute inset-y-0 left-0" style={{ width: `${r.capabilityIdx}%`, background: PRIORITY_COL[r.strategicPriority] }} />
                </span>
                <span className="font-serif text-[12px] tabular-nums" style={{ color: PRIORITY_COL[r.strategicPriority] }}>{r.capabilityIdx}</span>
              </div>
              <span className="font-serif text-[10px] italic tracking-[0.16em] uppercase text-right" style={{ color: PRIORITY_COL[r.strategicPriority] }}>
                · {r.strategicPriority}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>
        Research lineage measures continuous funded years across administrations — sovereign knowledge production
        is preserved through the political cycle, not at its mercy.
      </p>
    </div>
  );
}
