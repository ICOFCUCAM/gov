'use client';

// Education — Digital learning + civilizational memory infrastructure.
// Library-card composition: horizontally indexed reading-room entries
// followed by archival categories rendered as catalogue tabs.

import * as React from 'react';
import { knowledgeDevelopmentBoard } from '@/lib/gov/knowledge-development';

const NAVY = '#1a2942';
const BRONZE = '#8a6a2e';
const LIBRARY_GOLD = '#a7842a';
const INK_SOFT = '#5b6175';

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr_60px] items-baseline gap-4 py-1.5 border-b" style={{ borderColor: 'rgba(138,106,46,0.12)' }}>
      <span className="font-serif text-[12px]" style={{ color: INK_SOFT }}>{label}</span>
      <span className="relative h-1.5" style={{ background: 'rgba(138,106,46,0.12)' }}>
        <span className="absolute inset-y-0 left-0" style={{ width: `${value}%`, background: color }} />
      </span>
      <span className="font-serif text-[14px] tabular-nums text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export function KnowledgeInfrastructure({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeDevelopmentBoard(now);
  const k = b.knowledgeInfra;
  return (
    <div className="space-y-6">
      {/* Knowledge infrastructure */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>V</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Digital learning &amp; knowledge infrastructure</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>{k.archivalRecordsM}M archival records held</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <Bar value={k.archiveIntegrity} color={NAVY} label="Archive integrity" />
            <Bar value={k.curationContinuity} color={NAVY} label="Curation continuity" />
            <Bar value={k.remoteLearningCoveragePct} color={BRONZE} label="Remote-learning coverage" />
          </div>
          <div>
            <Bar value={k.digitalContentDistributionIdx} color={BRONZE} label="Digital content distribution" />
            <Bar value={k.bandwidthEquityIdx} color={LIBRARY_GOLD} label="Bandwidth equity (rural ↔ urban)" />
          </div>
        </div>
      </section>

      {/* Civilizational archive */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>VI</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Cultural &amp; civilizational memory</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>preserved across generations</span>
        </div>
        <div className="space-y-1">
          {b.civilizationalMemory.map((m, i) => (
            <div key={m.category} className="grid grid-cols-[28px_240px_1fr_1fr_1fr_1fr] items-baseline gap-4 border-l-2 py-2 pl-3"
              style={{ borderColor: i % 2 === 0 ? NAVY : BRONZE, background: 'linear-gradient(90deg, rgba(244,236,214,0.03) 0%, transparent 100%)' }}>
              <span className="font-serif text-[10px] italic tabular-nums" style={{ color: BRONZE }}>·{i + 1}</span>
              <span className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>{m.category}</span>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Preservation</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: m.preservationPct >= 80 ? NAVY : LIBRARY_GOLD }}>{m.preservationPct}%</div>
              </div>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Public access</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: INK_SOFT }}>{m.publicAccessIdx}</div>
              </div>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Intergenerational transfer</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: BRONZE }}>{m.generationalTransferIdx}</div>
              </div>
              <div>
                <div className="font-serif text-[9px] uppercase tracking-[0.16em]" style={{ color: INK_SOFT }}>Digitisation</div>
                <div className="font-serif text-[14px] tabular-nums" style={{ color: INK_SOFT }}>{m.digitisationPct}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>
        Civilizational memory is non-ideological by mandate — archives, civic education and constitutional literacy
        are preserved pluralistically, never curated to any single political doctrine.
      </p>
    </div>
  );
}
