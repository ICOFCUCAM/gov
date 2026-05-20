'use client';

// Foreign Affairs — Citizen Foreign Services Portal.
// Passport service pipelines as paired application/issued counters,
// consular request severity queue, visa category band, regional
// travel advisory feed. Distinct geometry: passport-stamp counters,
// triage-coloured consular cards, regional advisory horizon strip.

import * as React from 'react';
import { foreignAffairsExtendedBoard, type PassportPipeline, type ConsularRequest, type TravelAdvisoryFeed, type VisaProcessing } from '@/lib/gov/foreign-affairs-extended';

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
const ALERT = '#a05538';

const SEVERITY_COL: Record<ConsularRequest['severity'], string> = {
  standard: SILVER, urgent: GOLD, critical: BURGUNDY,
};
const STATUS_COL: Record<ConsularRequest['status'], string> = {
  received: SILVER, 'in-progress': GOLD, 'awaiting-host': ALERT, resolved: GOLD_DIM,
};
const ADV_COL: Record<TravelAdvisoryFeed['level'], string> = {
  normal: GOLD, 'heightened-caution': SILVER, 'reconsider-travel': ALERT, 'do-not-travel': BURGUNDY,
};
const SERVICE_LABEL: Record<PassportPipeline['service'], string> = {
  'first-issue': 'First issue', renewal: 'Renewal', 'replacement-lost': 'Lost / replacement', 'emergency-travel': 'Emergency travel', 'diplomatic-passport': 'Diplomatic passport',
};
const KIND_LABEL: Record<ConsularRequest['kind'], string> = {
  'detention-abroad': 'Detention abroad',
  'medical-emergency': 'Medical emergency',
  'death-of-citizen': 'Death of citizen',
  'legal-aid-abroad': 'Legal aid abroad',
  'evacuation-request': 'Evacuation request',
  'document-attestation': 'Document attestation',
};
const VISA_LABEL: Record<VisaProcessing['category'], string> = {
  tourist: 'Tourist', business: 'Business', student: 'Student', work: 'Work', diplomatic: 'Diplomatic', 'family-reunion': 'Family reunion', humanitarian: 'Humanitarian',
};

// Passport stamp counter
function PassportStamp({ p }: { p: PassportPipeline }) {
  const issuanceRate = p.applicationsToday === 0 ? 0 : Math.round((p.issuedToday / p.applicationsToday) * 100);
  return (
    <article className="relative px-5 py-4" style={{ background: CHARCOAL, border: `2px solid ${TRACE}`, borderStyle: 'double' }}>
      {/* corner stamps */}
      <span className="absolute left-2 top-2 text-[10px]" style={{ color: GOLD_DIM, transform: 'rotate(-12deg)' }}>✦ APPROVED ✦</span>
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: PARCH }}>{SERVICE_LABEL[p.service]}</span>
          <span className="text-[9.5px] italic" style={{ color: GOLD }}>{p.medianTurnaroundDays}d median</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>Applied today</div>
            <div className="tabular-nums text-[18px]" style={{ color: PARCH }}>{p.applicationsToday.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>Issued today</div>
            <div className="tabular-nums text-[18px]" style={{ color: GOLD }}>{p.issuedToday.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>Backlog</div>
            <div className="tabular-nums text-[18px]" style={{ color: p.pendingBacklog > 20000 ? BURGUNDY : SILVER }}>{p.pendingBacklog.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-3 h-[3px]" style={{ background: '#0d1428' }}>
          <div className="h-full" style={{ width: `${Math.min(100, issuanceRate)}%`, background: GOLD }} />
        </div>
        <div className="mt-1 flex items-baseline justify-between text-[9.5px] italic">
          <span style={{ color: GOLD }}>issuance {issuanceRate}%</span>
          <span style={{ color: MUT }}>· of applications today</span>
        </div>
      </div>
    </article>
  );
}

export function CitizenForeignServicesPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsExtendedBoard(now);
  const p = b.portal;
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· Citizen Foreign Services Portal ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: PARCH }}>
              {p.citizensRegisteredAbroadK.toLocaleString()}K citizens registered abroad · {p.consularRequests.length} active consular requests
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Portal availability', v: `${p.portalAvailabilityPct}%`, c: p.portalAvailabilityPct >= 99 ? GOLD : SILVER },
              { l: 'Emergency hotline', v: p.overseasEmergencyHotlineOnline ? 'ONLINE' : 'DEGRADED', c: p.overseasEmergencyHotlineOnline ? GOLD : BURGUNDY },
              { l: 'Critical consular', v: p.consularRequests.filter(c => c.severity === 'critical').length, c: BURGUNDY },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[15px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Passport stamps */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP, borderBottom: `1px solid ${TRACE}` }}>
        <h3 className="mb-4 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>📕 Passport service stamps</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {p.passports.map(pp => <PassportStamp key={pp.service} p={pp} />)}
        </div>
      </section>

      {/* Consular request triage queue */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT, borderBottom: `1px solid ${TRACE}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>✉ Consular request triage queue · severity-sorted</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>request · embassy post · severity · status · hours open</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {p.consularRequests.map(r => (
            <article key={r.id} className="grid grid-cols-[60px_1fr_80px] items-baseline gap-4 px-5 py-3" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, borderLeft: `4px solid ${SEVERITY_COL[r.severity]}` }}>
              <div className="flex flex-col items-start">
                <span className="text-[8.5px] uppercase italic tracking-[0.22em]" style={{ color: MUT }}>req №</span>
                <span className="tabular-nums text-[11px]" style={{ color: GOLD_DIM }}>{r.id}</span>
              </div>
              <div>
                <div className="text-[12px]" style={{ color: PARCH }}>{KIND_LABEL[r.kind]}</div>
                <div className="text-[10px] italic" style={{ color: MUT }}>at {r.embassyPost}</div>
                <div className="mt-1 flex items-center gap-3 text-[9.5px] uppercase italic tracking-[0.22em]">
                  <span style={{ color: SEVERITY_COL[r.severity] }}>● {r.severity}</span>
                  <span style={{ color: STATUS_COL[r.status] }}>· {r.status}</span>
                </div>
              </div>
              <span className="text-right tabular-nums text-[12px]" style={{ color: r.hrsOpen > 96 ? GOLD_DIM : r.hrsOpen > 48 ? ALERT : GOLD }}>{r.hrsOpen}h</span>
            </article>
          ))}
        </div>
      </section>

      {/* Visa processing band */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP, borderBottom: `1px solid ${TRACE}` }}>
        <h3 className="mb-4 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>🛂 Visa processing · category band</h3>
        <div className="overflow-hidden border" style={{ borderColor: TRACE, background: CHARCOAL }}>
          <div className="grid grid-cols-[140px_140px_1fr_100px_100px] gap-3 px-4 py-2 text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: MUT, background: PANEL }}>
            <span>Category</span><span className="text-right">Applied (week)</span><span>Approval rate</span><span className="text-right">Median d</span><span className="text-right">Pending</span>
          </div>
          {p.visas.map(v => (
            <div key={v.category} className="grid grid-cols-[140px_140px_1fr_100px_100px] items-center gap-3 border-t px-4 py-2.5 text-[11px]" style={{ borderColor: TRACE }}>
              <span style={{ color: PARCH }}>{VISA_LABEL[v.category]}</span>
              <span className="text-right tabular-nums" style={{ color: INK }}>{v.applicationsThisWeek.toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <div className="h-[3px] flex-1" style={{ background: '#0d1428' }}>
                  <div className="h-full" style={{ width: `${v.approvalRatePct}%`, background: v.approvalRatePct >= 80 ? GOLD : v.approvalRatePct >= 60 ? SILVER : ALERT }} />
                </div>
                <span className="tabular-nums text-[10.5px]" style={{ color: v.approvalRatePct >= 80 ? GOLD : SILVER }}>{v.approvalRatePct}%</span>
              </div>
              <span className="text-right tabular-nums" style={{ color: v.medianReviewDays >= 20 ? ALERT : v.medianReviewDays >= 10 ? GOLD_DIM : GOLD }}>{v.medianReviewDays}d</span>
              <span className="text-right tabular-nums" style={{ color: v.pending > 10000 ? BURGUNDY : MUT }}>{v.pending.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Travel advisory horizon */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT }}>
        <h3 className="mb-4 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>✦ Travel advisory horizon</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.travelAdvisories.map(a => {
            const col = ADV_COL[a.level];
            return (
              <div key={a.region} className="px-5 py-3" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, borderTop: `3px solid ${col}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: PARCH }}>{a.region}</span>
                  <span className="text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: col }}>● {a.level.replace(/-/g, ' ')}</span>
                </div>
                <div className="mt-2 text-[10.5px] italic" style={{ color: MUT }}>
                  reasons active <span className="not-italic tabular-nums ml-1" style={{ color: a.reasonsActive ? GOLD : MUT }}>{a.reasonsActive}</span>
                </div>
                <div className="text-[10.5px] italic" style={{ color: MUT }}>
                  citizens in region <span className="not-italic tabular-nums ml-1" style={{ color: SILVER }}>{a.citizensRegisteredK.toLocaleString()}K</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: MIDNIGHT, borderTop: `1px solid ${TRACE}` }}>
        <span className="text-[9px] uppercase italic tracking-[0.4em]" style={{ color: GOLD_DIM }}>
          ✦ The portal is the citizen's standing abroad — protection is the first treaty ✦
        </span>
      </footer>
    </div>
  );
}
