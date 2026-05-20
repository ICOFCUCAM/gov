'use client';

// Agriculture — Public Agriculture Portal.
// Permit application stalls, subsidy applications queue, climate
// advisory ticker, pest outbreak map, irrigation request ledger.
// Earthen palette with field-green for normal, harvest amber for
// pressured, ALERT red for severe. Geometry: stall counters,
// progress strips, severity chips.

import * as React from 'react';
import { agricultureRuralBoard, type AgriPermitFlow, type SubsidyApplication, type ClimateAdvisory, type PestAlert, type IrrigationRequest } from '@/lib/gov/agriculture-rural';

const SOIL = '#3a2f22';
const SOIL_DEEP = '#1f1813';
const HARVEST = '#a47a35';
const HARVEST_DARK = '#7a5a26';
const FIELD = '#4e6d3e';
const SKY = '#5a7d8f';
const PARCH = '#e9dfc8';
const INK = '#d8d0bc';
const MUT = '#8a8270';
const ALERT = '#a04030';

const PERMIT_LABEL: Record<AgriPermitFlow['category'], string> = {
  'farm-registration': 'Farm registration',
  'irrigation-water-right': 'Irrigation water right',
  'livestock-movement': 'Livestock movement permit',
  'agro-chemical-use': 'Agro-chemical use',
  'export-certification': 'Export certification',
  'organic-certification': 'Organic certification',
};
const SUBSIDY_LABEL: Record<SubsidyApplication['category'], string> = {
  'crop-input': 'Crop input', irrigation: 'Irrigation', livestock: 'Livestock', 'cooperative-grant': 'Cooperative', 'climate-adaptation': 'Climate adapt.', 'youth-rural': 'Youth rural',
};
const STATUS_COL: Record<SubsidyApplication['status'], string> = {
  received: SKY, verified: HARVEST, approved: FIELD, rejected: ALERT, disbursed: FIELD,
};
const ADVISORY_COL: Record<ClimateAdvisory['severity'], string> = {
  advisory: SKY, warning: HARVEST, severe: ALERT,
};
const ADVISORY_GLYPH: Record<ClimateAdvisory['kind'], string> = {
  'drought-watch': '☀', 'frost-warning': '❄', heatwave: '🜂', 'storm-advisory': '⛈', 'rainfall-deficit': '◌', 'flood-risk': '≋',
};
const PEST_COL: Record<PestAlert['outbreakStatus'], string> = {
  monitoring: SKY, localized: HARVEST, spreading: '#a05538', epidemic: ALERT,
};
const PEST_GLYPH: Record<PestAlert['pest'], string> = {
  locust: '◆', 'army-worm': '◈', rust: '◇', aphid: '⌬', 'fungal-blight': '⛬', rodent: '✦',
};
const IRRIGATION_COL: Record<IrrigationRequest['status'], string> = {
  queued: MUT, reviewing: HARVEST, approved: FIELD, partial: SKY, denied: ALERT,
};

// Permit stall card
function PermitStall({ p }: { p: AgriPermitFlow }) {
  const approvalRate = p.approvedThisWeek + p.rejectedThisWeek === 0 ? 0
    : Math.round((p.approvedThisWeek / (p.approvedThisWeek + p.rejectedThisWeek)) * 100);
  return (
    <article className="px-5 py-4" style={{ background: SOIL, border: `1px solid ${HARVEST_DARK}55`, borderTop: `3px solid ${HARVEST}` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]" style={{ color: PARCH }}>{PERMIT_LABEL[p.category]}</span>
        <span className="text-[9.5px] italic" style={{ color: MUT }}>{p.medianReviewDays}d median</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
        <div>
          <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>PENDING</div>
          <div className="tabular-nums text-[14px]" style={{ color: p.pending > 6000 ? HARVEST : INK }}>{p.pending.toLocaleString()}</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>APPROVED /WK</div>
          <div className="tabular-nums text-[14px]" style={{ color: FIELD }}>{p.approvedThisWeek.toLocaleString()}</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>REJECTED /WK</div>
          <div className="tabular-nums text-[14px]" style={{ color: p.rejectedThisWeek >= 100 ? ALERT : MUT }}>{p.rejectedThisWeek.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-3 h-[3px]" style={{ background: SOIL_DEEP }}>
        <div className="h-full" style={{ width: `${approvalRate}%`, background: FIELD }} />
      </div>
      <div className="mt-1 text-[9.5px] italic" style={{ color: FIELD }}>approval {approvalRate}%</div>
    </article>
  );
}

export function PublicAgriculturePortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = agricultureRuralBoard(now);
  const p = b.portal;
  return (
    <div style={{ background: SOIL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: `linear-gradient(180deg, ${SOIL} 0%, ${SOIL_DEEP} 100%)`, borderBottom: `1px solid ${HARVEST_DARK}55` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.42em]" style={{ color: HARVEST }}>Public Agriculture Portal</div>
            <h2 className="mt-2 text-[18px] tracking-[0.03em]" style={{ color: PARCH }}>
              {p.permits.length} permit stalls · {p.subsidyApplications.length} live subsidy applications · {p.climateAdvisories.length} climate advisories · {p.publicNoticesIssued24h} notices/24h
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center" style={{ minWidth: '300px' }}>
            {[
              { l: 'Portal uptime', v: `${p.portalUptimePct}%`, c: p.portalUptimePct >= 99 ? FIELD : HARVEST },
              { l: 'Daily contacts', v: `${p.farmingSupportContactsDailyK}K`, c: SKY },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: SOIL, border: `1px solid ${HARVEST_DARK}55` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[15px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Permit stalls */}
      <section className="px-8 py-6" style={{ background: SOIL_DEEP, borderBottom: `1px solid ${SOIL}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>📜 Permit stalls · 6 categories</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {p.permits.map(pp => <PermitStall key={pp.category} p={pp} />)}
        </div>
      </section>

      {/* Subsidy applications queue */}
      <section className="px-8 py-6" style={{ background: SOIL, borderBottom: `1px solid ${HARVEST_DARK}33` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>🌾 Subsidy applications · live queue</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>received → verified → approved → disbursed</span>
        </div>
        <div className="overflow-hidden" style={{ background: SOIL_DEEP, border: `1px solid ${SOIL}` }}>
          <div className="grid grid-cols-[80px_140px_120px_100px_100px_120px] gap-3 px-4 py-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUT, background: SOIL }}>
            <span>App №</span><span>Category</span><span>Region</span><span className="text-right">Amount K</span><span className="text-right">Days open</span><span className="text-right">Status</span>
          </div>
          {p.subsidyApplications.map(a => (
            <div key={a.id} className="grid grid-cols-[80px_140px_120px_100px_100px_120px] items-center gap-3 px-4 py-2.5 text-[11px]" style={{ borderTop: `1px solid ${SOIL}` }}>
              <span className="tabular-nums" style={{ color: HARVEST_DARK }}>{a.id}</span>
              <span style={{ color: PARCH }}>{SUBSIDY_LABEL[a.category]}</span>
              <span style={{ color: INK }}>{a.region}</span>
              <span className="text-right tabular-nums" style={{ color: PARCH }}>{a.amountRequestedK.toLocaleString()}</span>
              <span className="text-right tabular-nums" style={{ color: a.daysOpen > 60 ? MUT : INK }}>{a.daysOpen}d</span>
              <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: STATUS_COL[a.status] }}>● {a.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Climate advisory ticker + pest map */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: SOIL_DEEP }}>
        <div className="px-8 py-6" style={{ background: SOIL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>☀ Climate advisory ticker</h3>
          <div className="space-y-2">
            {p.climateAdvisories.map(c => {
              const col = ADVISORY_COL[c.severity];
              return (
                <div key={c.id} className="grid grid-cols-[40px_1fr_80px_90px] items-center gap-3 px-4 py-2.5" style={{ background: SOIL_DEEP, borderLeft: `3px solid ${col}` }}>
                  <span className="text-[18px] text-center" style={{ color: col }}>{ADVISORY_GLYPH[c.kind]}</span>
                  <div>
                    <div className="text-[11.5px]" style={{ color: PARCH }}>{c.kind.replace(/-/g, ' ')}</div>
                    <div className="text-[9.5px] italic" style={{ color: MUT }}>{c.region} · crops: {c.cropsAtRisk}</div>
                  </div>
                  <span className="text-right tabular-nums text-[11px]" style={{ color: col }}>+{c.daysAhead}d</span>
                  <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: col }}>● {c.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-8 py-6" style={{ background: SOIL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>🐛 Pest outbreak ledger · severity-sorted</h3>
          <div className="space-y-2">
            {p.pestAlerts.map(pa => {
              const col = PEST_COL[pa.outbreakStatus];
              return (
                <div key={pa.id} className="grid grid-cols-[40px_1fr_100px_100px] items-center gap-3 px-4 py-2.5" style={{ background: SOIL, borderLeft: `3px solid ${col}` }}>
                  <span className="text-[18px] text-center" style={{ color: col }}>{PEST_GLYPH[pa.pest]}</span>
                  <div>
                    <div className="text-[11.5px]" style={{ color: PARCH }}>{pa.pest.replace(/-/g, ' ')}</div>
                    <div className="text-[9.5px] italic" style={{ color: MUT }}>{pa.region} · {pa.reportedHrsAgo}h ago</div>
                  </div>
                  <span className="text-right tabular-nums text-[10.5px]" style={{ color: col }}>{pa.affectedAreaHa.toLocaleString()} ha</span>
                  <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: col }}>● {pa.outbreakStatus}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Irrigation requests */}
      <section className="px-8 py-6" style={{ background: SOIL, borderTop: `1px solid ${HARVEST_DARK}33` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>≋ Irrigation requests ledger</h3>
        <div className="overflow-hidden" style={{ background: SOIL_DEEP, border: `1px solid ${HARVEST_DARK}33` }}>
          <div className="grid grid-cols-[80px_220px_140px_100px_100px_120px] gap-3 px-4 py-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUT, background: SOIL }}>
            <span>Req №</span><span>Scheme</span><span>Region</span><span className="text-right">Volume Mcm</span><span className="text-right">Days open</span><span className="text-right">Status</span>
          </div>
          {p.irrigationRequests.map(ir => (
            <div key={ir.id} className="grid grid-cols-[80px_220px_140px_100px_100px_120px] items-center gap-3 px-4 py-2.5 text-[11px]" style={{ borderTop: `1px solid ${SOIL}` }}>
              <span className="tabular-nums" style={{ color: HARVEST_DARK }}>{ir.id}</span>
              <span style={{ color: PARCH }}>{ir.scheme}</span>
              <span style={{ color: INK }}>{ir.region}</span>
              <span className="text-right tabular-nums" style={{ color: PARCH }}>{ir.volumeMcm.toLocaleString()}</span>
              <span className="text-right tabular-nums" style={{ color: MUT }}>{ir.filedDaysAgo}d</span>
              <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: IRRIGATION_COL[ir.status] }}>● {ir.status}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: SOIL, borderTop: `1px solid ${HARVEST_DARK}33` }}>
        <span className="text-[9px] uppercase tracking-[0.34em]" style={{ color: MUT }}>
          🌾 The portal is the field office of the sovereign — every farmer is a continuity asset 🌾
        </span>
      </footer>
    </div>
  );
}
