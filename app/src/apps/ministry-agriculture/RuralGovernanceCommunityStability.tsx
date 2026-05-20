'use client';

// Agriculture — Rural Governance & Community Stability.
// Cooperative spoke diagram (regional cooperatives radiating from
// rural centres), subsidy grain-sack rows, workforce demographic
// rosette, land-registration cadastral grid. Earthen palette,
// quietly bureaucratic.
// Distinct from prior Agriculture surfaces — no dam-walls, no
// seasonal disk, no parchment cards.

import * as React from 'react';
import { agricultureRuralBoard, type RuralZone, type SubsidyProgramme } from '@/lib/gov/agriculture-rural';

const SOIL = '#3a2f22';
const SOIL_DEEP = '#1f1813';
const HARVEST = '#a47a35';
const HARVEST_DARK = '#7a5a26';
const FIELD = '#4e6d3e';
const FIELD_DARK = '#2c4023';
const SKY = '#5a7d8f';
const PARCH = '#e9dfc8';
const INK = '#d8d0bc';
const MUT = '#8a8270';
const ALERT = '#a04030';

const ZONE_COL: Record<RuralZone['classification'], string> = {
  thriving: FIELD, stable: HARVEST, pressured: HARVEST_DARK, fragile: '#a05538', distressed: ALERT,
};
const SUBSIDY_COL: Record<SubsidyProgramme['status'], string> = {
  open: FIELD, oversubscribed: HARVEST, closed: MUT, review: ALERT,
};

const CATEGORY_GLYPH: Record<SubsidyProgramme['category'], string> = {
  'crop-input': '🌾', irrigation: '≋', livestock: '🐄', 'cooperative-grant': '⌬', 'climate-adaptation': '☀', 'youth-rural': '✦',
};

// Cooperative spoke diagram per rural zone
function CooperativeSpoke({ z }: { z: RuralZone }) {
  const w = 96, h = 96, cx = w / 2, cy = h / 2, r = 36;
  const col = ZONE_COL[z.classification];
  const spokes = Math.min(10, Math.max(3, Math.round(z.cooperativesActive / 30)));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={SOIL_DEEP} />
      {/* rings */}
      {[0.4, 0.7].map(p => <circle key={p} cx={cx} cy={cy} r={r * p} fill="none" stroke={HARVEST_DARK} strokeOpacity={0.3} strokeDasharray="2 3" />)}
      {/* spokes */}
      {Array.from({ length: spokes }).map((_, i) => {
        const ang = (i / spokes) * Math.PI * 2 - Math.PI / 2;
        const x2 = cx + Math.cos(ang) * r;
        const y2 = cy + Math.sin(ang) * r;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={col} strokeOpacity={0.7} strokeWidth={1.5} />
            <circle cx={x2} cy={y2} r={2.5} fill={col} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={7} fill={SOIL_DEEP} stroke={col} strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill={col} fontWeight={700}>{z.cooperativesActive}</text>
    </svg>
  );
}

// Workforce demographic rosette — 4-segment polar bar
function WorkforceRosette({ w, h }: { w: ReturnType<typeof agricultureRuralBoard>['rural']['workforce']; h: number }) {
  const size = h, cx = size / 2, cy = size / 2, r = size / 2 - 12;
  const segments = [
    { label: 'Women', value: w.womenInAgriculturePct, col: HARVEST, angle: 0 },
    { label: 'Youth', value: w.youthInAgriculturePct, col: FIELD, angle: 90 },
    { label: 'Ext. officers', value: Math.min(100, w.trainedExtensionOfficersK / 86 * 100), col: SKY, angle: 180 },
    { label: 'Shortages', value: w.workforceShortagesIdx, col: ALERT, angle: 270 },
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={SOIL_DEEP} strokeWidth={1} />
      {[0.25, 0.5, 0.75].map(p => <circle key={p} cx={cx} cy={cy} r={r * p} fill="none" stroke={HARVEST_DARK} strokeOpacity={0.25} />)}
      {segments.map(s => {
        const start = (s.angle - 35) * Math.PI / 180;
        const end = (s.angle + 35) * Math.PI / 180;
        const innerR = 16;
        const reachR = innerR + ((r - innerR) * Math.min(100, s.value) / 100);
        const x1 = cx + Math.cos(start) * innerR; const y1 = cy + Math.sin(start) * innerR;
        const x2 = cx + Math.cos(end) * innerR; const y2 = cy + Math.sin(end) * innerR;
        const x3 = cx + Math.cos(end) * reachR; const y3 = cy + Math.sin(end) * reachR;
        const x4 = cx + Math.cos(start) * reachR; const y4 = cy + Math.sin(start) * reachR;
        return (
          <g key={s.label}>
            <path d={`M${x1} ${y1} L${x2} ${y2} A${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`} fill={s.col} fillOpacity={0.18} />
            <path d={`M${x1} ${y1} L${x4} ${y4} A${reachR} ${reachR} 0 0 1 ${x3} ${y3} L${x2} ${y2} A${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`} fill={s.col} fillOpacity={0.65} stroke={s.col} strokeWidth={1} />
            <text x={cx + Math.cos(s.angle * Math.PI / 180) * (r + 4)} y={cy + Math.sin(s.angle * Math.PI / 180) * (r + 4) + 3}
              textAnchor={Math.cos(s.angle * Math.PI / 180) > 0.2 ? 'start' : Math.cos(s.angle * Math.PI / 180) < -0.2 ? 'end' : 'middle'}
              fontSize={9} fill={MUT} letterSpacing={1.5}>{s.label.toUpperCase()}</text>
            <text x={cx + Math.cos(s.angle * Math.PI / 180) * (r + 4)} y={cy + Math.sin(s.angle * Math.PI / 180) * (r + 4) + 14}
              textAnchor={Math.cos(s.angle * Math.PI / 180) > 0.2 ? 'start' : Math.cos(s.angle * Math.PI / 180) < -0.2 ? 'end' : 'middle'}
              fontSize={11} fill={s.col} fontWeight={700}>{Math.round(s.value)}%</text>
          </g>
        );
      })}
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={9} fill={MUT} letterSpacing={2}>AGE {w.meanAgeYears}</text>
    </svg>
  );
}

// Subsidy grain-sack row
function GrainSackRow({ s }: { s: SubsidyProgramme }) {
  const col = SUBSIDY_COL[s.status];
  const sacks = 12;
  const lit = Math.round((s.fulfilmentPct / 100) * sacks);
  return (
    <div className="grid grid-cols-[44px_1fr_180px_100px_110px_90px] items-center gap-4 px-4 py-3" style={{ background: SOIL_DEEP, borderBottom: `1px solid ${SOIL}` }}>
      <span className="text-center text-[18px]" style={{ color: HARVEST }}>{CATEGORY_GLYPH[s.category]}</span>
      <div>
        <div className="text-[11.5px]" style={{ color: PARCH }}>{s.programme}</div>
        <div className="text-[9.5px] italic" style={{ color: MUT }}>· {s.category}</div>
      </div>
      {/* grain sacks */}
      <div className="flex items-end gap-[2px]" aria-hidden>
        {Array.from({ length: sacks }).map((_, i) => {
          const filled = i < lit;
          return (
            <div key={i} style={{
              width: 10, height: filled ? 16 : 8,
              background: filled ? col : '#0d0a07',
              border: `1px solid ${HARVEST_DARK}`,
              borderTopLeftRadius: 4, borderTopRightRadius: 4,
              opacity: filled ? 0.45 + (i / sacks) * 0.55 : 0.5,
            }} />
          );
        })}
      </div>
      <span className="text-right tabular-nums text-[11px]" style={{ color: col }}>{s.fulfilmentPct}% disb.</span>
      <span className="text-right tabular-nums text-[11px]" style={{ color: INK }}>{s.beneficiariesK.toLocaleString()}K ben.</span>
      <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: col }}>● {s.status}</span>
    </div>
  );
}

export function RuralGovernanceCommunityStability({ id, now }: { id: string; now: number }) {
  void id;
  const b = agricultureRuralBoard(now);
  const r = b.rural;
  return (
    <div style={{ background: SOIL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: `linear-gradient(180deg, ${SOIL} 0%, ${SOIL_DEEP} 100%)`, borderBottom: `1px solid ${HARVEST_DARK}55` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.42em]" style={{ color: HARVEST }}>Rural Governance &amp; Community Stability</div>
            <h2 className="mt-2 text-[18px] tracking-[0.03em]" style={{ color: PARCH }}>
              {r.zones.length} rural zones · {r.workforce.totalAgricultureWorkforceK.toLocaleString()}K agricultural workforce · {r.cooperativeMembershipMillions}M cooperative members
            </h2>
            <div className="mt-1 text-[10px] italic" style={{ color: MUT }}>· season ⟨{b.season}⟩ · rural continuity index <span className="not-italic tabular-nums" style={{ color: r.ruralContinuityIdx >= 70 ? FIELD : HARVEST }}>{r.ruralContinuityIdx}</span></div>
          </div>
        </div>
      </header>

      {/* Zone cooperative spokes */}
      <section className="px-8 py-6" style={{ background: SOIL_DEEP, borderBottom: `1px solid ${SOIL}` }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>⌬ Regional cooperative networks · spoke diagrams</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {r.zones.map(z => (
            <article key={z.id} className="grid grid-cols-[100px_1fr] items-center gap-3 px-4 py-3" style={{ background: SOIL, border: `1px solid ${ZONE_COL[z.classification]}33` }}>
              <CooperativeSpoke z={z} />
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: PARCH }}>{z.region}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: ZONE_COL[z.classification] }}>● {z.classification}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>HOUSEHOLDS</div>
                    <div className="tabular-nums" style={{ color: INK }}>{z.farmingHouseholdsK}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>POPULATION</div>
                    <div className="tabular-nums" style={{ color: INK }}>{z.population.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>STABILITY</div>
                    <div className="tabular-nums" style={{ color: z.ruralStabilityIdx >= 75 ? FIELD : HARVEST }}>{z.ruralStabilityIdx}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>OUTMIGR.</div>
                    <div className="tabular-nums" style={{ color: z.outmigrationPressureIdx >= 50 ? ALERT : MUT }}>{z.outmigrationPressureIdx}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Subsidy programmes — grain sacks */}
      <section className="px-8 py-6" style={{ background: SOIL, borderBottom: `1px solid ${HARVEST_DARK}33` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>🌾 Subsidy programmes · grain-sack fulfilment</h3>
        <div style={{ border: `1px solid ${SOIL_DEEP}` }}>
          {r.subsidyProgrammes.map(s => <GrainSackRow key={s.id} s={s} />)}
        </div>
      </section>

      {/* Workforce rosette + land cadastre */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[300px_1fr]" style={{ background: SOIL_DEEP }}>
        <div className="px-6 py-6" style={{ background: SOIL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>✦ Workforce rosette</h3>
          <div className="flex justify-center">
            <WorkforceRosette w={r.workforce} h={240} />
          </div>
          <div className="mt-3 text-[10px] italic text-center" style={{ color: MUT }}>
            workforce <span className="not-italic tabular-nums" style={{ color: PARCH }}>{r.workforce.totalAgricultureWorkforceK.toLocaleString()}K</span> · mean age <span className="not-italic tabular-nums" style={{ color: PARCH }}>{r.workforce.meanAgeYears}</span>y
          </div>
        </div>
        <div className="px-6 py-6" style={{ background: SOIL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>◊ Land registration cadastre · 5 categories</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {r.landRegistrations.map(l => (
              <div key={l.category} className="relative px-4 py-3" style={{ background: SOIL, border: `1px solid ${HARVEST_DARK}55` }}>
                {/* cadastral parcel grid */}
                <div className="pointer-events-none absolute inset-1 grid grid-cols-4 grid-rows-3 gap-px opacity-25" aria-hidden>
                  {Array.from({ length: 12 }).map((_, i) => <span key={i} className="block" style={{ background: i % 3 === 0 ? FIELD_DARK : SOIL_DEEP }} />)}
                </div>
                <div className="relative">
                  <div className="text-[10.5px] uppercase tracking-[0.2em]" style={{ color: PARCH }}>{l.category.replace(/-/g, ' ')}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>PENDING</div>
                      <div className="tabular-nums" style={{ color: l.pending > 20000 ? HARVEST : INK }}>{l.pending.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>REG. THIS Q</div>
                      <div className="tabular-nums" style={{ color: FIELD }}>{l.registeredThisQ.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>MEDIAN D</div>
                      <div className="tabular-nums" style={{ color: l.medianProcessingDays > 120 ? ALERT : HARVEST }}>{l.medianProcessingDays}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>DISPUTES</div>
                      <div className="tabular-nums" style={{ color: l.disputesOpen > 100 ? ALERT : MUT }}>{l.disputesOpen}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: SOIL, borderTop: `1px solid ${HARVEST_DARK}33` }}>
        <span className="text-[9px] uppercase tracking-[0.34em]" style={{ color: MUT }}>
          ⌬ Rural continuity is sovereign continuity — the cooperative is older than the state ⌬
        </span>
      </footer>
    </div>
  );
}
