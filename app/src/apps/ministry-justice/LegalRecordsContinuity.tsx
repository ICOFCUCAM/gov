'use client';

// Justice — National Legal Records Continuity.
// Archival shelving panel for sovereign vaults + numbered fascicle
// rows for chain-of-custody transactions. Embossed numbering,
// integrity seals, archival ledger discipline. Same constitutional
// palette as existing Justice surfaces (charcoal / ivory parchment /
// restrained burgundy / bronze / muted navy) but new geometry —
// archival shelving stacks and roman-numeral fascicle headers, not
// chamber register rows.

import * as React from 'react';
import { justiceRecordsForensicsBoard, type ArchiveVault, type ChainOfCustodyTransaction } from '@/lib/gov/justice-records-forensics';

const CHARCOAL = '#1a1d24';
const PANEL = '#1e2129';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';
const ALERT = '#a04030';

const STATUS_COL: Record<ArchiveVault['status'], string> = {
  sealed: BRONZE, live: NAVY, review: BURGUNDY, restoration: ALERT,
};
const CUSTODY_COL: Record<ChainOfCustodyTransaction['status'], string> = {
  'in-transit': BRONZE, verified: NAVY, held: BURGUNDY, flagged: ALERT,
};
const CATEGORY_GLYPH: Record<ArchiveVault['category'], string> = {
  constitutional: '§', 'supreme-rulings': '✠', criminal: '◊', civil: '¶', 'land-title': '⌬', 'corporate-registry': '☉',
};
const ARTEFACT_GLYPH: Record<ChainOfCustodyTransaction['artefact'], string> = {
  document: '📜', 'physical-evidence': '◇', 'digital-evidence': '⌬', 'biometric-record': '⌖', 'forensic-report': '⚗',
};

// An archival shelf — vertical stack of book spines per vault
function ArchivalShelf({ a }: { a: ArchiveVault }) {
  const col = STATUS_COL[a.status];
  // 12 spines representing decades of records
  const spines = 12;
  const litFrac = a.digitisedPct / 100;
  return (
    <article className="flex flex-col" style={{ background: PANEL, border: `1px solid ${RULE}`, minHeight: '240px' }}>
      <div className="px-4 py-3" style={{ background: 'rgba(140,106,58,0.06)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <span className="font-serif italic text-[14px]" style={{ color: BRONZE }}>{CATEGORY_GLYPH[a.category]}</span>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>· {a.status}</span>
        </div>
        <div className="mt-1 text-[12px]" style={{ color: IVORY }}>{a.vault}</div>
        <div className="text-[9.5px] italic" style={{ color: MUT }}>{a.category} · {a.custodian}</div>
      </div>
      {/* book-spine shelf */}
      <div className="flex flex-1 items-end gap-[2px] px-4 pt-3" style={{ minHeight: '70px' }}>
        {Array.from({ length: spines }).map((_, i) => {
          const digitised = i < Math.round(litFrac * spines);
          const height = 60 + (i % 3) * 6;
          return (
            <div key={i} className="relative flex-1" style={{
              height: `${height}%`,
              background: digitised ? `linear-gradient(180deg, ${BRONZE}66 0%, ${NAVY} 100%)` : `linear-gradient(180deg, ${BURGUNDY}44 0%, ${CHARCOAL} 100%)`,
              borderTop: `1px solid ${BRONZE}66`,
              borderBottom: `1px solid ${CHARCOAL}`,
            }}>
              {/* embossed band */}
              <span className="absolute inset-x-0 top-1/3 h-px" style={{ background: BRONZE, opacity: 0.5 }} />
              {/* roman tome number */}
              <span className="absolute inset-x-0 top-1.5 text-center font-serif text-[7px]" style={{ color: IVORY, opacity: 0.85 }}>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i]}
              </span>
            </div>
          );
        })}
      </div>
      {/* base */}
      <div className="mx-4 mt-1 h-1" style={{ background: BRONZE, opacity: 0.7 }} />
      <div className="grid grid-cols-3 gap-2 px-4 py-3 text-[10px] font-serif">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>records</div>
          <div className="tabular-nums" style={{ color: IVORY }}>{a.recordsM}M</div>
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>digitised</div>
          <div className="tabular-nums" style={{ color: a.digitisedPct >= 80 ? NAVY : BRONZE }}>{a.digitisedPct}%</div>
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>integrity</div>
          <div className="tabular-nums" style={{ color: a.integrityIdx >= 85 ? NAVY : BRONZE }}>{a.integrityIdx}</div>
        </div>
      </div>
    </article>
  );
}

// Numbered fascicle row — chain-of-custody transaction
function FascicleRow({ t, idx }: { t: ChainOfCustodyTransaction; idx: number }) {
  const col = CUSTODY_COL[t.status];
  return (
    <div className="grid grid-cols-[60px_70px_140px_1fr_70px_120px] items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: RULE, background: PANEL }}>
      {/* fascicle number with wax-pip */}
      <div className="flex items-center gap-2">
        <span className="font-serif italic text-[11px] tabular-nums" style={{ color: BRONZE }}>№ {String(idx + 1).padStart(3, '0')}</span>
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: col }} />
      </div>
      <span className="font-serif text-[10.5px] tabular-nums" style={{ color: MUT }}>{t.id}</span>
      <span className="font-serif text-[11px]" style={{ color: IVORY }}>
        <span className="mr-2" style={{ color: BRONZE }}>{ARTEFACT_GLYPH[t.artefact]}</span>{t.artefact.replace(/-/g, ' ')}
      </span>
      <span className="font-serif text-[11px]" style={{ color: INK }}>
        <span className="italic" style={{ color: MUT }}>{t.fromCustodian}</span>
        <span className="mx-2" style={{ color: BRONZE }}>↦</span>
        <span style={{ color: IVORY }}>{t.toCustodian}</span>
      </span>
      <span className="text-right font-serif text-[10px] tabular-nums" style={{ color: MUT }}>{t.ageHrs}h</span>
      <span className="text-right font-serif text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: col }}>· {t.status}</span>
    </div>
  );
}

export function LegalRecordsContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const r = b.records;
  return (
    <div style={{ background: CHARCOAL, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-6" style={{ borderBottom: `1px solid ${RULE}`, background: 'linear-gradient(180deg, #1d2027 0%, #1a1d24 100%)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-serif italic text-[10px] uppercase tracking-[0.42em]" style={{ color: BRONZE }}>Office of the Chief Archivist — Sovereign Legal Memory</div>
            <h2 className="mt-2 font-serif text-[18px] tracking-[0.04em]" style={{ color: IVORY }}>
              {r.totalRecordsM.toLocaleString()}M records across {r.archives.length} sovereign vaults · {r.judicialMemoryYears} years of judicial memory
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Archival integrity', v: r.archivalIntegrityIdx, c: r.archivalIntegrityIdx >= 85 ? NAVY : BURGUNDY },
              { l: 'Digitisation', v: `${r.digitisationProgressPct}%`, c: r.digitisationProgressPct >= 70 ? NAVY : BRONZE },
              { l: 'Restoration cases', v: r.outstandingRestorationCases, c: r.outstandingRestorationCases >= 6 ? ALERT : MUT },
            ].map(x => (
              <div key={x.l} className="px-3 py-2 font-serif" style={{ background: PANEL, border: `1px solid ${RULE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Vault shelves */}
      <section className="px-8 py-6" style={{ background: CHARCOAL, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-4 font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>✠ Sovereign archival vaults · category index</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {r.archives.map(a => <ArchivalShelf key={a.id} a={a} />)}
        </div>
      </section>

      {/* Chain-of-custody fascicles */}
      <section className="px-8 py-6" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>↣ Chain-of-custody fascicles · live ledger</h3>
          <span className="font-serif italic text-[9.5px]" style={{ color: MUT }}>seal · ledger № · artefact · custody handover · age · status</span>
        </div>
        <div className="overflow-hidden border" style={{ borderColor: RULE, background: CHARCOAL }}>
          {r.custodyTransactions.map((t, i) => <FascicleRow key={t.id} t={t} idx={i} />)}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL, borderTop: `1px solid ${RULE}` }}>
        <span className="font-serif italic text-[10px] uppercase tracking-[0.32em]" style={{ color: MUT }}>
          ✠ Lex archiva est lex aeterna · the archive is the memory of the constitution ✠
        </span>
      </footer>
    </div>
  );
}
