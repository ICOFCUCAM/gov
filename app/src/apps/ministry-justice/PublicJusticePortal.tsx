'use client';

// Justice — Public Justice Portal.
// Filing intake counters with acceptance/rejection split, civil
// complaints pipeline ledger, rights petitions docket, attorney
// registration summary. Distinct from prior Justice surfaces:
// stamp-style filing tickets, 5-stage complaint pipeline pips,
// petition docket cards.

import * as React from 'react';
import { justiceRecordsForensicsBoard, type CivilComplaint, type RightsPetition, type LegalFilingFlow } from '@/lib/gov/justice-records-forensics';

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

const COMPLAINT_STATUS_COL: Record<CivilComplaint['status'], string> = {
  received: TEAL_INK, screening: BRONZE, mediation: NAVY, tribunal: '#a05538', resolved: NAVY,
};
const COMPLAINT_SEV_COL: Record<CivilComplaint['severity'], string> = {
  low: TEAL_INK, elevated: BRONZE, severe: ALERT,
};
const PETITION_STATUS_COL: Record<RightsPetition['status'], string> = {
  docketed: BRONZE, scheduled: NAVY, 'in-hearing': BURGUNDY, reserved: BRONZE, 'ruling-issued': NAVY,
};
const FILING_CATEGORY_LABEL: Record<LegalFilingFlow['category'], string> = {
  civil: 'Civil', criminal: 'Criminal', family: 'Family', commercial: 'Commercial', administrative: 'Administrative', constitutional: 'Constitutional',
};

// Filing ticket — paper stamp with two-tone counter
function FilingTicket({ f }: { f: LegalFilingFlow }) {
  const acceptanceRate = Math.round((f.acceptedToday / Math.max(1, f.filedToday)) * 100);
  return (
    <article className="relative" style={{ background: PANEL, border: `1px solid ${RULE}` }}>
      {/* perforated edges */}
      <div className="absolute inset-y-0 -left-1 flex flex-col justify-around" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: CHARCOAL }} />)}
      </div>
      <div className="absolute inset-y-0 -right-1 flex flex-col justify-around" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: CHARCOAL }} />)}
      </div>
      <div className="px-5 pt-4 pb-3" style={{ background: 'rgba(140,106,58,0.05)', borderBottom: `1px dashed ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <span className="font-serif italic text-[10px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>Filing Counter</span>
          <span className="font-serif text-[10px] tabular-nums" style={{ color: MUT }}>{f.medianAcceptanceHrs}h median</span>
        </div>
        <div className="mt-1 font-serif text-[14px]" style={{ color: IVORY }}>{FILING_CATEGORY_LABEL[f.category]}</div>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 font-serif">
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>filed today</div>
            <div className="tabular-nums text-[18px]" style={{ color: IVORY }}>{f.filedToday.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>accepted</div>
            <div className="tabular-nums text-[18px]" style={{ color: NAVY }}>{f.acceptedToday.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>rejected</div>
            <div className="tabular-nums text-[18px]" style={{ color: f.rejectedToday >= 60 ? BURGUNDY : MUT }}>{f.rejectedToday.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden" style={{ background: CHARCOAL }}>
          <div style={{ width: `${acceptanceRate}%`, background: `linear-gradient(90deg, ${NAVY} 0%, ${TEAL_INK} 100%)` }} />
          <div style={{ width: `${100 - acceptanceRate}%`, background: `linear-gradient(90deg, ${BURGUNDY}66 0%, ${BURGUNDY} 100%)` }} />
        </div>
        <div className="mt-1 flex items-baseline justify-between font-serif italic text-[10px]">
          <span style={{ color: NAVY }}>acceptance {acceptanceRate}%</span>
          <span style={{ color: MUT }}>pending {f.pending.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
}

export function PublicJusticePortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const p = b.portal;
  const stages: CivilComplaint['status'][] = ['received', 'screening', 'mediation', 'tribunal', 'resolved'];
  return (
    <div style={{ background: CHARCOAL, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-6" style={{ borderBottom: `1px solid ${RULE}`, background: 'linear-gradient(180deg, #1d2027 0%, #1a1d24 100%)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-serif italic text-[10px] uppercase tracking-[0.42em]" style={{ color: BRONZE }}>Public Justice Portal — Petitioner &amp; Counsel Access</div>
            <h2 className="mt-2 font-serif text-[18px] tracking-[0.04em]" style={{ color: IVORY }}>
              {p.attorneyRegistration.licensedAttorneysK}K licensed counsel · {p.publicLegalNoticesIssued24h} public notices · {p.caseTrackingAccessesDailyK}K daily case lookups
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Portal availability', v: `${p.portalAvailabilityPct}%`, c: p.portalAvailabilityPct >= 99 ? NAVY : BRONZE },
              { l: 'Disciplinary cases', v: p.attorneyRegistration.disciplinaryCasesOpen, c: p.attorneyRegistration.disciplinaryCasesOpen >= 120 ? ALERT : MUT },
              { l: 'Pro-bono Q (kh)', v: p.attorneyRegistration.proBonoHoursThisQK, c: TEAL_INK },
            ].map(x => (
              <div key={x.l} className="px-3 py-2 font-serif" style={{ background: PANEL, border: `1px solid ${RULE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Filing tickets */}
      <section className="px-8 py-6" style={{ background: CHARCOAL, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-4 font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>📜 Legal filing counters · 6 jurisdictions</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {p.filings.map(f => <FilingTicket key={f.category} f={f} />)}
        </div>
      </section>

      {/* Civil complaints pipeline ledger */}
      <section className="px-8 py-6" style={{ background: PANEL, borderBottom: `1px solid ${RULE}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>¶ Civil complaints · 5-stage pipeline</h3>
          <span className="font-serif italic text-[9.5px]" style={{ color: MUT }}>received → screening → mediation → tribunal → resolved</span>
        </div>
        <div className="overflow-hidden border" style={{ borderColor: RULE, background: CHARCOAL }}>
          <div className="grid grid-cols-[100px_180px_60px_1fr_100px_110px] gap-3 px-4 py-2 font-serif italic text-[9.5px] uppercase tracking-[0.22em]" style={{ color: MUT, background: PANEL2 }}>
            <span>Filing №</span><span>Kind</span><span className="text-right">Days</span><span>Pipeline</span><span className="text-right">Severity</span><span className="text-right">Stage</span>
          </div>
          {p.complaints.map(c => {
            const idx = stages.indexOf(c.status);
            return (
              <div key={c.id} className="grid grid-cols-[100px_180px_60px_1fr_100px_110px] items-center gap-3 border-t px-4 py-2.5 font-serif text-[11px]" style={{ borderColor: RULE }}>
                <span className="tabular-nums" style={{ color: BRONZE }}>{c.id}</span>
                <span style={{ color: IVORY }}>{c.kind.replace(/-/g, ' ')}</span>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{c.ageDays}d</span>
                {/* pipeline pips */}
                <div className="flex items-center gap-1.5">
                  {stages.map((s, si) => (
                    <React.Fragment key={s}>
                      <span className="block" style={{
                        width: si === idx ? 10 : 6, height: si === idx ? 10 : 6,
                        background: si <= idx ? COMPLAINT_STATUS_COL[c.status] : 'rgba(140,106,58,0.18)',
                        clipPath: si === idx ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : 'circle(50%)',
                      }} />
                      {si < stages.length - 1 ? <span className="block h-px w-4" style={{ background: si < idx ? COMPLAINT_STATUS_COL[c.status] : RULE }} /> : null}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-right uppercase italic text-[9.5px] tracking-[0.22em]" style={{ color: COMPLAINT_SEV_COL[c.severity] }}>● {c.severity}</span>
                <span className="text-right uppercase italic text-[9.5px] tracking-[0.22em]" style={{ color: COMPLAINT_STATUS_COL[c.status] }}>· {c.status}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rights petitions docket */}
      <section className="px-8 py-6" style={{ background: CHARCOAL }}>
        <h3 className="mb-4 font-serif italic text-[11px] uppercase tracking-[0.36em]" style={{ color: BRONZE }}>§ Rights petitions · constitutional docket</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {p.rightsPetitions.map(r => {
            const col = PETITION_STATUS_COL[r.status];
            return (
              <article key={r.id} className="grid grid-cols-[80px_1fr] gap-4 px-5 py-3" style={{ background: PANEL, border: `1px solid ${RULE}`, borderLeft: `4px solid ${col}` }}>
                <div className="flex flex-col items-start">
                  <span className="font-serif italic text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>petition №</span>
                  <span className="font-serif tabular-nums text-[12px]" style={{ color: BRONZE }}>{r.id}</span>
                  <span className="mt-1 font-serif italic text-[8.5px] uppercase tracking-[0.22em]" style={{ color: r.scope === 'class' ? BURGUNDY : r.scope === 'institutional' ? BRONZE : MUT }}>· {r.scope}</span>
                </div>
                <div>
                  <div className="font-serif text-[12px]" style={{ color: IVORY }}>{r.matter}</div>
                  <div className="mt-1 font-serif italic text-[10px]" style={{ color: MUT }}>filed {r.filedDaysAgo}d ago · hearing in {r.daysToHearing}d</div>
                  <div className="mt-2 inline-block rounded-sm px-2 py-0.5 font-serif italic text-[9.5px] uppercase tracking-[0.22em]" style={{ background: `${col}22`, color: col }}>· {r.status.replace(/-/g, ' ')}</div>
                </div>
              </article>
            );
          })}
        </div>
        {/* attorney rail */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5 font-serif" style={{ background: PANEL2, border: `1px solid ${RULE}` }}>
          {[
            { l: 'Licensed counsel', v: `${p.attorneyRegistration.licensedAttorneysK}K`, c: IVORY },
            { l: 'New admissions Q', v: p.attorneyRegistration.newAdmissionsThisQ.toLocaleString(), c: NAVY },
            { l: 'Disciplinary open', v: p.attorneyRegistration.disciplinaryCasesOpen, c: p.attorneyRegistration.disciplinaryCasesOpen >= 120 ? ALERT : MUT },
            { l: 'Pro-bono Q (kh)', v: p.attorneyRegistration.proBonoHoursThisQK, c: TEAL_INK },
            { l: 'Registration uptime', v: `${p.attorneyRegistration.registrationUptimePct}%`, c: p.attorneyRegistration.registrationUptimePct >= 99 ? NAVY : BRONZE },
          ].map(x => (
            <div key={x.l} className="px-4 py-3" style={{ borderRight: `1px solid ${RULE}` }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL, borderTop: `1px solid ${RULE}` }}>
        <span className="font-serif italic text-[10px] uppercase tracking-[0.32em]" style={{ color: MUT }}>
          § Audiatur et altera pars · the portal is the citizen's standing in the court §
        </span>
      </footer>
    </div>
  );
}
