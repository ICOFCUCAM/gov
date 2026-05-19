'use client';

// Prisons & Corrections — National Justice Authority (Corrections &
// Rehabilitation). Dense dark operational console modelled on the
// benchmark: KPI strip, facility-overview schematic, population by
// custody level, movement log, inmate roster, rehabilitation pipeline,
// upcoming releases and facility-status overview. Pure & deterministic
// — engine + telemetry only.

import * as React from 'react';
import { justiceOps } from '@/lib/gov/justice-systems';
import { wave, seed } from '@/lib/telemetry';

const BG = '#0a0f16';
const PANEL = '#0e141d';
const PANEL2 = '#121a24';
const LINE = 'rgba(70,180,150,0.15)';
const LINE2 = 'rgba(255,255,255,0.06)';
const EMER = '#35c08a';
const TEAL = '#2bb3a6';
const BLUE = '#4f8df0';
const AMBER = '#e0a13a';
const ORANGE = '#e07a3a';
const RED = '#e0685f';
const PURPLE = '#8a6cf0';
const INK = '#d8e0e8';
const SOFT = '#8c99a7';
const MUT = '#5d6a77';

const CUSTODY: Record<string, string> = {
  Maximum: RED, High: AMBER, Medium: TEAL, Minimum: EMER, Protective: BLUE,
};

function Donut({ segs, total }: { segs: { label: string; v: number; n: string; c: string }[]; total: string }) {
  const size = 150, sum = segs.reduce((s, x) => s + x.v, 0) || 1, r = size / 2 - 11, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a212c" strokeWidth="12" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="12"
            strokeDasharray={`${Math.max(0, fr * circ - 2)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="46%" textAnchor="middle" fontSize="10" fill={MUT}>Total</text>
        <text x="50%" y="59%" textAnchor="middle" fontSize="17" fontWeight="700" fill={INK}>{total}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="tabular-nums" style={{ color: INK }}>{s.n}</span>
            <span className="w-12 text-right tabular-nums" style={{ color: MUT }}>({Math.round((s.v / sum) * 1000) / 10}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FacilityMap() {
  // Deterministic isometric-style schematic of a correctional complex.
  const blocks: [string, number, number, number, number, string][] = [
    ['Housing Units', 70, 60, 90, 46, EMER],
    ['Recreation Yard', 188, 44, 86, 40, TEAL],
    ['Administration', 44, 132, 88, 42, BLUE],
    ['Medical', 168, 130, 70, 40, PURPLE],
    ['Workshop', 196, 192, 78, 38, AMBER],
  ];
  return (
    <svg viewBox="0 0 300 250" style={{ width: '100%', height: 230 }} aria-hidden>
      <defs>
        <pattern id="fmgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke={LINE2} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="20" y="20" width="260" height="210" rx="8" fill="url(#fmgrid)" stroke={LINE} />
      <rect x="20" y="20" width="260" height="210" rx="8" fill="none" stroke={LINE} />
      {blocks.map(([nm, x, y, w, h, c]) => (
        <g key={nm}>
          <rect x={x} y={y} width={w} height={h} rx="5" fill={`color-mix(in srgb,${c} 16%,${PANEL})`} stroke={c} strokeWidth="1" />
          <rect x={x} y={y} width={w} height="3" rx="1.5" fill={c} opacity="0.7" />
          <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="600" fill={INK}>{nm}</text>
        </g>
      ))}
      <circle cx="150" cy="125" r="2.5" fill={EMER}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function PrisonsCorrections({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const jo = justiceOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const hm = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const pop = jo.corrections.population;
  const cap = jo.corrections.capacity;
  const fac = jo.corrections.facilities;
  const util = Math.min(99, Math.round((pop / cap) * 100));
  const staff = 22_000 + Math.round(seed(`pc:st:${id}`) * 6000);
  const incidents = Math.round(wave(`pc:in:${id}`, ts, 240, 420));
  const nf = (x: number) => x.toLocaleString();

  const kpis: [string, string, string, string, boolean | null, string, number?][] = [
    ['Total Inmates', nf(pop), '2.1%', '◉', false, PURPLE],
    ['Facilities', String(fac), '', '▤', null, BLUE],
    ['Capacity', nf(cap), `${util}.3%`, '▦', null, TEAL, util],
    ['Active Staff', nf(staff), '1.8%', '☗', false, EMER],
    ['Incidents (30 Days)', nf(incidents), '12.4%', '⚠', true, AMBER],
    ['Escapes (30 Days)', '0', '', '⚑', null, RED],
  ];

  const custody = [
    { label: 'Maximum Security', v: 27.3, n: '62,382', c: RED },
    { label: 'High Security', v: 33.6, n: '76,742', c: AMBER },
    { label: 'Medium Security', v: 25.4, n: '58,091', c: TEAL },
    { label: 'Minimum Security', v: 11.2, n: '25,613', c: EMER },
    { label: 'Protective Custody', v: 2.5, n: '5,633', c: BLUE },
  ];

  const moves: [string, string, string, string][] = [
    ['10:35 AM', 'Inmate Transfer', 'Unit B2 → Yard A', 'INM-45872'],
    ['10:21 AM', 'Cell Assignment', 'Unit C1, Cell 12', 'INM-22531'],
    ['10:10 AM', 'Medical Escort', 'Medical Unit', 'INM-77812'],
    ['09:58 AM', 'Court Transfer', 'Court Building', 'INM-33421'],
    ['09:42 AM', 'Program Transfer', 'Education Center', 'INM-55102'],
    ['09:30 AM', 'Return from Court', 'Unit A3', 'INM-11788'],
  ];

  const roster: [string, string, string, string, string, string, string][] = [
    ['INM-45872', 'John D. Williams', 'Central State CC', 'Maximum', 'B2-124', 'Violent Offense', '12 Jun 2032'],
    ['INM-22531', 'Marcus T. Johnson', 'Riverside Prison', 'High', 'C1-012', 'Robbery', '08 Mar 2031'],
    ['INM-77812', 'Daniel R. Martinez', 'Greenfield Institution', 'Medium', 'D3-208', 'Drug Offense', '22 Nov 2028'],
    ['INM-33421', 'Christopher L. Brown', 'Highland Correctional', 'Maximum', 'A1-045', 'Homicide', '17 Aug 2034'],
    ['INM-55102', 'Kevin D. Davis', 'Coastal Rehab Center', 'Minimum', 'F2-018', 'Fraud', '14 Feb 2027'],
    ['INM-11788', 'Jason P. Miller', 'Central State CC', 'High', 'C3-099', 'Assault', '05 Sep 2030'],
  ];

  const pipeline: [string, string, string][] = [
    ['Assessment', '22,845', '📋'], ['Program Assigned', '18,732', '🗂'],
    ['In Progress', '12,481', '⏳'], ['Completed', '7,291', '✓'], ['Reintegrated', '3,842', '⬡'],
  ];
  const topPrograms: [string, string, number][] = [
    ['Vocational Training', '6,842', 78], ['Education Programs', '5,621', 72],
    ['Substance Abuse Treatment', '4,128', 68], ['Behavioral Therapy', '3,892', 65],
    ['Life Skills Development', '2,741', 71],
  ];

  const releases: [string, string, string, string, string][] = [
    ['INM-22341', 'Robert K. Anderson', 'Riverside Prison', '20 May 2025', 'Parole Eligible'],
    ['INM-44108', 'Brian T. Harris', 'Greenfield Institution', '22 May 2025', 'Mandatory Release'],
    ['INM-77890', 'Steven W. Walker', 'Coastal Rehab Center', '24 May 2025', 'Parole Eligible'],
    ['INM-99122', 'David M. Clark', 'Central State CC', '26 May 2025', 'Mandatory Release'],
  ];

  const facStatus: [string, string, string, string][] = [
    ['Operational', '62', '79.5%', EMER], ['High Alert', '10', '12.8%', AMBER],
    ['Under Maintenance', '4', '5.1%', BLUE], ['Offline', '2', '2.6%', RED],
  ];

  const Card = ({ title, sub, action, children, className }: {
    title: string; sub?: string; action?: string; children: React.ReactNode; className?: string;
  }) => (
    <section className={`flex flex-col rounded-lg border ${className ?? ''}`} style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: LINE2 }}>
        <div>
          <h3 className="text-[12px] font-semibold" style={{ color: INK }}>{title}</h3>
          {sub ? <div className="text-[9px]" style={{ color: MUT }}>{sub}</div> : null}
        </div>
        {action ? <span className="text-[9.5px] font-medium" style={{ color: EMER }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: `linear-gradient(135deg,${EMER},${TEAL})` }} aria-hidden>⚖</span>
          <div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: INK }}>National Justice Authority</div>
            <div className="text-[9px]" style={{ color: MUT }}>Corrections &amp; Rehabilitation · Secure. Manage. Rehabilitate.</div>
          </div>
        </div>
        <div>
          <div className="text-[19px] font-bold leading-tight" style={{ color: INK }}>Prisons &amp; Corrections</div>
          <div className="text-[10.5px]" style={{ color: MUT }}>Integrated management of correctional facilities, inmates, rehabilitation and reintegration.</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 text-[10.5px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}, {hm}</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>▤ All Facilities ▾</span>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: LINE2, background: PANEL, color: SOFT }}>⛁<span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[8px] font-bold text-white" style={{ background: RED }}>15</span></span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE2, background: PANEL }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: EMER }}>CO</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Corrections Officer</span><span style={{ color: MUT }}>Ministry of Justice</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, d, ic, dn, c, bar]) => (
          <div key={l} className="rounded-lg border p-3.5" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-[13px]" style={{ background: `color-mix(in srgb,${c as string} 16%,${PANEL})`, color: c as string }} aria-hidden>{ic}</span>
              <span className="text-[10.5px]" style={{ color: MUT }}>{l}</span>
            </div>
            <div className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
            {bar != null ? (
              <>
                <div className="text-[8.5px]" style={{ color: MUT }}>Utilization Rate</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: '#1a212c' }}>
                  <span className="block h-full rounded-full" style={{ width: `${bar as number}%`, background: c as string }} />
                </div>
              </>
            ) : (
              <div className="text-[9px]" style={{ color: dn == null ? MUT : dn ? RED : EMER }}>
                {dn == null ? '—' : dn ? '↓' : '↑'} {d || ''} <span style={{ color: MUT }}>vs last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Facility Overview" sub="Central State Correctional Complex">
          <div className="flex gap-3">
            <div className="min-w-0 flex-1"><FacilityMap /></div>
            <div className="w-32 space-y-2 text-[10px]">
              {[['Housing Units', '8', SOFT], ['Population', '4,812', SOFT], ['Capacity', '5,600', SOFT], ['Staff On Duty', '312', SOFT], ['Security Level', 'Maximum', RED], ['Status', 'Operational', EMER]].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: LINE2 }}>
                  <span style={{ color: MUT }}>{l}</span><span className="font-semibold tabular-nums" style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Population by Custody Level" sub={`As of ${dd}`}>
          <Donut total={nf(pop)} segs={custody} />
        </Card>
        <Card title="Movement Log" action="View All →">
          <div className="space-y-2.5">
            {moves.map(([tm, ev, loc, inm]) => (
              <div key={inm + tm} className="flex items-center gap-2.5 text-[10px]">
                <span className="w-16 tabular-nums" style={{ color: MUT }}>{tm}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER }} />
                <div className="min-w-0 flex-1"><span style={{ color: INK }}>{ev}</span> <span style={{ color: MUT }}>· {loc}</span></div>
                <span className="font-mono text-[9px]" style={{ color: SOFT }}>{inm}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Inmate Roster">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[9.5px]">
            {['All Inmates', 'By Facility', 'By Custody Level'].map((t, i) => (
              <span key={t} className="rounded-md px-2.5 py-1" style={{ background: i === 0 ? `color-mix(in srgb,${EMER} 18%,${PANEL})` : PANEL2, color: i === 0 ? EMER : SOFT, border: `1px solid ${i === 0 ? LINE : LINE2}` }}>{t}</span>
            ))}
            <span className="ml-auto rounded-md border px-2.5 py-1" style={{ borderColor: LINE2, background: PANEL2, color: MUT }}>⌕ Search inmate…</span>
            <span className="rounded-md border px-2.5 py-1" style={{ borderColor: LINE2, background: PANEL2, color: SOFT }}>⛃ Filter</span>
          </div>
          <div className="flex border-b pb-1.5 text-[8px] uppercase tracking-wider" style={{ color: MUT, borderColor: LINE2 }}>
            <span className="w-20">Inmate ID</span><span className="flex-1">Name</span><span className="w-32">Facility</span>
            <span className="w-20">Custody</span><span className="w-16">Cell</span><span className="w-24">Offense</span><span className="w-20">Sentence End</span><span className="w-14 text-right">Status</span>
          </div>
          <div className="mt-1 divide-y" style={{ borderColor: LINE2 }}>
            {roster.map(([iid, nm, fc, cu, ce, of, se]) => (
              <div key={iid} className="flex items-center py-1.5 text-[9.5px]" style={{ borderColor: LINE2 }}>
                <span className="w-20 font-mono" style={{ color: SOFT }}>{iid}</span>
                <span className="min-w-0 flex-1 truncate" style={{ color: INK }}>{nm}</span>
                <span className="w-32 truncate" style={{ color: SOFT }}>{fc}</span>
                <span className="w-20"><span className="rounded px-1.5 py-0.5 text-[8.5px] font-semibold" style={{ color: CUSTODY[cu], background: `color-mix(in srgb,${CUSTODY[cu]} 18%,${PANEL})` }}>{cu}</span></span>
                <span className="w-16 font-mono" style={{ color: MUT }}>{ce}</span>
                <span className="w-24 truncate" style={{ color: SOFT }}>{of}</span>
                <span className="w-20 tabular-nums" style={{ color: MUT }}>{se}</span>
                <span className="w-14 text-right"><span className="text-[8.5px] font-semibold" style={{ color: EMER }}>● Active</span></span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[9px]" style={{ color: MUT }}>
            <span>Showing 1 to 6 of {nf(pop)} inmates</span>
            <span className="flex items-center gap-1">
              <span className="rounded border px-1.5 py-0.5" style={{ borderColor: LINE2 }}>‹</span>
              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: `color-mix(in srgb,${EMER} 18%,${PANEL})`, color: EMER }}>1</span>
              <span className="px-1.5 py-0.5">2</span><span className="px-1.5 py-0.5">3</span><span className="px-1">…</span>
              <span className="px-1.5 py-0.5 tabular-nums">{Math.ceil(pop / 6).toLocaleString()}</span>
              <span className="rounded border px-1.5 py-0.5" style={{ borderColor: LINE2 }}>›</span>
            </span>
          </div>
        </Card>
        <Card title="Rehabilitation Pipeline" action="View All →">
          <div className="flex items-center justify-between">
            {pipeline.map(([st, v, ic], i) => (
              <React.Fragment key={st}>
                <div className="flex flex-col items-center text-center">
                  <span className="grid h-9 w-9 place-items-center rounded-lg text-[13px]" style={{ background: `color-mix(in srgb,${EMER} 14%,${PANEL})`, color: EMER }} aria-hidden>{ic}</span>
                  <span className="mt-1 text-[12px] font-bold tabular-nums" style={{ color: INK }}>{v}</span>
                  <span className="text-[8px] leading-tight" style={{ color: MUT }}>{st}</span>
                </div>
                {i < pipeline.length - 1 ? <span className="text-[12px]" style={{ color: MUT }}>→</span> : null}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4 mb-1.5 flex justify-between text-[8.5px] uppercase tracking-wider" style={{ color: MUT }}>
            <span>Top Programs</span><span>Participants · Completion</span>
          </div>
          <div className="space-y-2.5">
            {topPrograms.map(([nm, pt, rate]) => (
              <div key={nm} className="text-[10px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: SOFT }}>{nm}</span>
                  <span className="tabular-nums" style={{ color: INK }}>{pt} <span style={{ color: EMER }}>· {rate}%</span></span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}>
                  <span className="block h-full rounded-full" style={{ width: `${rate}%`, background: EMER }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Upcoming Releases" sub="Next 30 Days" action="View All →">
          <div className="flex items-stretch gap-3">
            <div className="flex w-32 shrink-0 flex-col justify-center rounded-lg border px-3 py-4 text-center" style={{ borderColor: LINE2, background: PANEL2 }}>
              <span className="text-[18px]" aria-hidden>📅</span>
              <span className="text-[22px] font-bold tabular-nums" style={{ color: INK }}>1,842</span>
              <span className="text-[9px]" style={{ color: MUT }}>Total Releases</span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-4">
              {releases.map(([iid, nm, fc, dt, ty]) => (
                <div key={iid} className="rounded-lg border p-2.5" style={{ borderColor: LINE2, background: PANEL2 }}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full text-[9px] font-bold" style={{ background: `color-mix(in srgb,${BLUE} 22%,${PANEL})`, color: BLUE }}>{nm.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                    <span className="font-mono text-[8.5px]" style={{ color: MUT }}>{iid}</span>
                  </div>
                  <div className="mt-1.5 truncate text-[10px] font-medium" style={{ color: INK }}>{nm}</div>
                  <div className="truncate text-[8.5px]" style={{ color: MUT }}>{fc}</div>
                  <div className="mt-1 text-[9px] tabular-nums" style={{ color: SOFT }}>{dt}</div>
                  <div className="mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ color: ty === 'Parole Eligible' ? EMER : AMBER, background: `color-mix(in srgb,${ty === 'Parole Eligible' ? EMER : AMBER} 16%,${PANEL})` }}>{ty}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Facility Status Overview" action="View All →">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {facStatus.map(([l, v, p, c]) => (
              <div key={l} className="rounded-lg border p-3" style={{ borderColor: LINE2, background: PANEL2 }}>
                <div className="flex items-center gap-1.5 text-[9px]"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><span style={{ color: MUT }}>{l}</span></div>
                <div className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: INK }}>{v}</div>
                <div className="text-[9px] tabular-nums" style={{ color: c }}>{p}</div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: '#1a212c' }}>
                  <span className="block h-full rounded-full" style={{ width: p, background: c }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[9.5px]" style={{ borderColor: LINE2, color: MUT }}>
        <span>National Justice Authority — Secure. Manage. Rehabilitate.</span>
        <span>Active Facilities {fac} · Capacity Utilization {util}.3% · Access-to-Justice Index {jo.accessToJusticeIndex} · Rehab Active {nf(jo.corrections.rehabActive)}</span>
      </div>
    </div>
  );
}
