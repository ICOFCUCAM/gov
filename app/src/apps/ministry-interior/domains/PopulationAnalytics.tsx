'use client';

// Population Analytics — National Statistics Bureau (Demographic
// Intelligence & Societal Analytics). Light, modern statistical-agency
// surface modelled on the benchmark: demographic KPI strip, population
// density map, population pyramid, demographic composition, births/deaths,
// migration, urbanization, employment, household & social indicators,
// wealth distribution, AI forecast, census intelligence and a national
// movement heatmap. Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { interiorOps } from '@/lib/gov/interior-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';

const BG = '#f5f6fb';
const CARD = '#ffffff';
const LINE = '#e7e9f1';
const INK = '#1d2333';
const SOFT = '#56607a';
const MUT = '#8b94a8';
const BLUE = '#4f7df0';
const PURPLE = '#8a6cf0';
const TEAL = '#27b3a6';
const GREEN = '#2bb673';
const AMBER = '#e0a13a';
const RED = '#e0685f';
const CYAN = '#3fb6d8';

const seriesC = [BLUE, PURPLE, TEAL, AMBER, GREEN, '#c4cbd9'];

function Card({ title, info, action, children, className }: {
  title: string; info?: boolean; action?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border ${className ?? ''}`}
      style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: INK }}>
          {title}{info ? <span className="grid h-3.5 w-3.5 place-items-center rounded-full text-[8px]" style={{ background: '#eef1f8', color: MUT }}>i</span> : null}
        </h3>
        {action ? <span className="text-[11px] font-medium" style={{ color: BLUE }}>{action}</span> : null}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function Kpi({ label, value, delta, sub, icon, c }: {
  label: string; value: string; delta: string; sub: string; icon: string; c: string;
}) {
  const dn = delta.startsWith('-');
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: LINE, background: CARD, boxShadow: '0 1px 3px rgba(20,30,60,0.04)' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[16px]" style={{ background: `color-mix(in srgb,${c} 14%,#fff)`, color: c }} aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px]" style={{ color: MUT }}>{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-bold tabular-nums" style={{ color: INK }}>{value}</span>
          <span className="text-[11px] font-semibold" style={{ color: dn ? RED : GREEN }}>{delta}</span>
        </div>
        <div className="text-[9.5px]" style={{ color: MUT }}>{sub}</div>
      </div>
    </div>
  );
}

function Donut({ segs, top, sub, size = 132 }: {
  segs: { label: string; v: number; n: string; c: string }[]; top: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 11, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f6" strokeWidth="13" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="13"
            strokeLinecap="round" strokeDasharray={`${Math.max(0, fr * circ - 3)} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.17} fontWeight="700" fill={INK}>{top}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.075} fill={MUT}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-[3px]" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-semibold tabular-nums" style={{ color: INK }}>{Math.round((s.v / sum) * 1000) / 10}%</span>
            <span className="w-14 text-right tabular-nums" style={{ color: MUT }}>{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ series, height = 140, area }: { series: { name: string; c: string; pts: number[] }[]; height?: number; area?: boolean }) {
  const all = series.flatMap(s => s.pts);
  const mn = Math.min(...all), sp = Math.max(...all) - mn || 1;
  const path = (pts: number[]) => pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${92 - ((p - mn) / sp) * 82}`).join(' ');
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
        {[20, 40, 60, 80].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#eef0f6" strokeWidth="0.5" />)}
        {series.map(s => (
          <React.Fragment key={s.name}>
            {area ? <polygon points={`0,92 ${path(s.pts)} 100,92`} fill={s.c} opacity="0.08" /> : null}
            <polyline points={path(s.pts)} fill="none" stroke={s.c} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </React.Fragment>
        ))}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-x-4 text-[9.5px]" style={{ color: SOFT }}>
        {series.map(s => <span key={s.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: s.c }} />{s.name}</span>)}
      </div>
    </div>
  );
}

function Pyramid({ seedKey }: { seedKey: string }) {
  const bands = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80+'];
  const data = bands.map((b, i) => ({
    b, m: 2 + seed(`${seedKey}:m:${i}`) * 4 * (1 - i / 12), f: 2 + seed(`${seedKey}:f:${i}`) * 4 * (1 - i / 12),
  }));
  const mx = Math.max(...data.flatMap(d => [d.m, d.f]));
  return (
    <div className="space-y-[3px]">
      {data.slice().reverse().map(d => (
        <div key={d.b} className="flex items-center gap-1 text-[8px]">
          <div className="flex flex-1 justify-end"><span className="h-2.5 rounded-l-[2px]" style={{ width: `${(d.m / mx) * 100}%`, background: BLUE }} /></div>
          <span className="w-9 text-center" style={{ color: MUT }}>{d.b}</span>
          <div className="flex flex-1"><span className="h-2.5 rounded-r-[2px]" style={{ width: `${(d.f / mx) * 100}%`, background: PURPLE }} /></div>
        </div>
      ))}
      <div className="flex justify-between pt-1 text-[8px]" style={{ color: MUT }}><span>6M</span><span>Population (Millions)</span><span>6M</span></div>
    </div>
  );
}

function DensityMap({ seedKey }: { seedKey: string }) {
  const pts = Array.from({ length: 240 }).map((_, i) => {
    const a = seed(`${seedKey}:a:${i}`) * Math.PI * 2;
    const rad = Math.pow(seed(`${seedKey}:r:${i}`), 0.6) * 46;
    const d = seed(`${seedKey}:d:${i}`);
    return { x: 50 + Math.cos(a) * rad * (0.8 + seed(`${seedKey}:x:${i}`) * 0.5), y: 48 + Math.sin(a) * rad * 0.74, d };
  });
  const dc = (d: number) => (d > 0.88 ? '#3b1c8c' : d > 0.7 ? PURPLE : d > 0.5 ? BLUE : d > 0.3 ? '#8fb3f5' : '#cdd9f4');
  return (
    <svg viewBox="0 0 100 90" className="w-full" style={{ height: 210 }} aria-hidden>
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1 + p.d * 2.4} fill={dc(p.d)} opacity={0.45 + p.d * 0.5} />)}
    </svg>
  );
}

function MovementMap({ seedKey }: { seedKey: string }) {
  const nodes = Array.from({ length: 9 }).map((_, i) => ({
    x: 12 + seed(`${seedKey}:x:${i}`) * 76, y: 14 + seed(`${seedKey}:y:${i}`) * 62, w: seed(`${seedKey}:w:${i}`),
  }));
  return (
    <svg viewBox="0 0 100 80" className="w-full" style={{ height: 200 }} aria-hidden>
      {nodes.map((n, i) => nodes.slice(i + 1).map((m, j) => seed(`${seedKey}:e:${i}:${j}`) > 0.55 ? (
        <path key={`${i}-${j}`} d={`M${n.x} ${n.y} Q ${(n.x + m.x) / 2} ${(n.y + m.y) / 2 - 10} ${m.x} ${m.y}`}
          fill="none" stroke={TEAL} strokeWidth={0.3 + n.w * 0.6} opacity="0.3" />
      ) : null))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={2 + n.w * 5} fill={n.w > 0.6 ? PURPLE : TEAL} opacity="0.18" />
          <circle cx={n.x} cy={n.y} r={1.4 + n.w * 1.6} fill={n.w > 0.6 ? PURPLE : TEAL} />
        </g>
      ))}
    </svg>
  );
}

export function PopulationAnalytics({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const io = interiorOps(id, ts);
  const clock = new Date(now);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = clock.toLocaleDateString('en-GB', { weekday: 'long' });
  const W = (k: string, lo: number, hi: number, n = 12) => waveSeries(`pa:${k}:${id}`, ts, n, lo, hi);

  const popM = Math.round((io.identity.enrolledM * 0.6 + 70) * 100) / 100;

  const kpis = [
    ['Total Population', `${popM}M`, '+1.35%', 'vs last year', '👥', BLUE],
    ['Growth Rate (YoY)', '1.35%', '+0.15pp', 'vs last year', '📈', GREEN],
    ['Fertility Rate', '2.05', '-0.03', 'vs last year', '👶', PURPLE],
    ['Life Expectancy', '73.4 yrs', '+0.6', 'vs last year', '❤', TEAL],
    ['Median Age', '29.7', '+0.6', 'vs last year', '🧑', AMBER],
    ['Dependency Ratio', '48.6', '-1.2', 'vs last year', '👨‍👩‍👧', CYAN],
  ] as [string, string, string, string, string, string][];

  const household: [string, string, string][] = [
    ['Total Households', '21.48M', '+1.22%'], ['Average Household Size', '3.92', '-0.05'],
    ['Single-Person Households', '3.17M', '+2.8%'], ['Households with Children', '7.98M', '+1.6%'],
    ['Female-Headed Households', '4.32M', '+3.1%'],
  ];
  const social: [string, string, string][] = [
    ['Unemployment Rate', '8.6%', '-0.4pp'], ['Poverty Rate', '14.3%', '-0.7pp'],
    ['Income Inequality (Gini)', '0.38', '+0.01'], ['Youth Not in Education/Employment', '16.2%', '+0.3pp'],
    ['Food Insecurity Rate', '9.1%', '-0.5pp'],
  ];
  const census: [string, string][] = [
    ['Latest Census Year', '2020'], ['Census Coverage', '99.2%'], ['Enumeration Districts', '58,742'],
    ['Total Housing Units', '19.36M'], ['Population Enumeration', '82.11M'],
  ];
  const srcCountries: [string, string][] = [['Country A', '42,815'], ['Country B', '28,341'], ['Country C', '19,732'], ['Country D', '17,620'], ['Country E', '13,072']];
  const dstCountries: [string, string][] = [['Country F', '31,241'], ['Country G', '26,885'], ['Country H', '18,742'], ['Country I', '14,209'], ['Country J', '11,855']];

  const Spark = ({ pts, c }: { pts: number[]; c: string }) => {
    const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
    return (
      <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden>
        <polyline points={pts.map((p, i) => `${(i / (pts.length - 1)) * 44},${14 - ((p - mn) / sp) * 14}`).join(' ')}
          fill="none" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-3 rounded-[5px] p-3" style={{ background: BG, color: INK }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg text-[16px] text-white" style={{ background: `linear-gradient(135deg,${BLUE},${PURPLE})` }} aria-hidden>▦</span>
          <div>
            <div className="text-[20px] font-bold leading-tight" style={{ color: INK }}>Population Analytics</div>
            <div className="text-[11px]" style={{ color: MUT }}>Understand today. Plan tomorrow. Shape our future.</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>📅 <span style={{ color: INK }}>{dd}</span> · {day}</span>
          <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD, color: SOFT }}>⨇ Filters</span>
          <span className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: LINE, background: CARD }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: PURPLE }}>CD</span>
            <span><span className="block font-medium" style={{ color: INK }}>Chief Data Officer</span><span style={{ color: MUT }}>National Statistics Bureau</span></span>
          </span>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([l, v, d, s, ic, c]) => <Kpi key={l} label={l} value={v} delta={d} sub={s} icon={ic} c={c} />)}
      </div>

      {/* ── Row 1 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Population Density" info action="People per km²">
          <DensityMap seedKey={`pa:dm:${id}`} />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.5px]" style={{ color: SOFT }}>
            {[['0–25', '#cdd9f4'], ['25–100', '#8fb3f5'], ['100–250', BLUE], ['250–1k', PURPLE], ['1k–2.5k', '#6a3fb0'], ['2.5k+', '#3b1c8c']].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-[2px]" style={{ background: c }} />{l}</span>
            ))}
            <span className="ml-auto font-semibold" style={{ color: INK }}>National Avg 197 /km²</span>
          </div>
        </Card>
        <Card title="Population Pyramid" action="◼ Male  ◼ Female">
          <Pyramid seedKey={`pa:py:${id}`} />
        </Card>
        <Card title="Demographic Composition">
          <Donut top={`${popM}M`} sub="Total" segs={[
            { label: '0–14 years', v: 18.6, n: '15.67M', c: BLUE }, { label: '15–24 years', v: 16.8, n: '14.15M', c: AMBER },
            { label: '25–54 years', v: 41.3, n: '34.79M', c: GREEN }, { label: '55–64 years', v: 11.2, n: '9.44M', c: PURPLE },
            { label: '65+ years', v: 12.1, n: '10.22M', c: '#c4cbd9' },
          ]} />
        </Card>
      </div>

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="Births, Deaths & Natural Increase">
          <MultiLine height={120} series={[
            { name: 'Births', c: GREEN, pts: W('bi', 50, 80, 12) },
            { name: 'Deaths', c: PURPLE, pts: W('de', 24, 40, 12) },
            { name: 'Natural Increase', c: TEAL, pts: W('ni', 30, 56, 12) },
          ]} />
          <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-center" style={{ borderColor: LINE }}>
            {[['Births (12M)', '612,843', '+2.6%'], ['Deaths (12M)', '318,764', '+1.3%'], ['Natural Increase', '294,079', '+3.9%']].map(([l, v, d]) => (
              <div key={l}><div className="text-[9px]" style={{ color: MUT }}>{l}</div><div className="text-[12px] font-bold" style={{ color: INK }}>{v}</div><div className="text-[9px]" style={{ color: GREEN }}>{d}</div></div>
            ))}
          </div>
        </Card>
        <Card title="Migration Overview" action="12 Months">
          <div className="grid grid-cols-3 gap-2">
            {[['Immigrants', '245,821', '+8.7%', BLUE], ['Emigrants', '146,932', '+3.2%', PURPLE], ['Net Migration', '98,889', '+12.5%', GREEN]].map(([l, v, d, c]) => (
              <div key={l} className="rounded-lg border px-2 py-1.5" style={{ borderColor: LINE }}>
                <div className="text-[8.5px]" style={{ color: MUT }}>{l}</div>
                <div className="text-[13px] font-bold" style={{ color: c }}>{v}</div>
                <div className="text-[8.5px]" style={{ color: GREEN }}>{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[['Top Source Countries', srcCountries], ['Top Destination Countries', dstCountries]].map(([h, list]) => (
              <div key={h as string}>
                <div className="mb-1 text-[9px] font-semibold" style={{ color: MUT }}>{h as string}</div>
                {(list as [string, string][]).map(([c, n]) => (
                  <div key={c} className="flex justify-between text-[9px]"><span style={{ color: SOFT }}>{c}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{n}</span></div>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Urbanization Trend" action="Urban / Rural">
          <MultiLine height={120} series={[
            { name: 'Urban Population %', c: TEAL, pts: W('ur', 44, 64, 8) },
            { name: 'Rural Population %', c: PURPLE, pts: W('rr', 56, 36, 8) },
          ]} />
          <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-center" style={{ borderColor: LINE }}>
            {[['Urban Pop', '52.49M', '62.3%'], ['Rural Pop', '31.78M', '37.7%'], ['Urban Growth', '+1.8pp', 'vs last yr']].map(([l, v, s]) => (
              <div key={l}><div className="text-[9px]" style={{ color: MUT }}>{l}</div><div className="text-[12px] font-bold" style={{ color: INK }}>{v}</div><div className="text-[9px]" style={{ color: MUT }}>{s}</div></div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Card title="Employment Distribution">
          <Donut size={120} top="41.62M" sub="Employed" segs={[
            { label: 'Services', v: 48.7, n: '20.26M', c: BLUE }, { label: 'Agriculture', v: 19.6, n: '8.15M', c: GREEN },
            { label: 'Manufacturing', v: 16.2, n: '6.74M', c: AMBER }, { label: 'Construction', v: 6.8, n: '2.83M', c: PURPLE },
            { label: 'Public Admin', v: 4.2, n: '1.74M', c: TEAL }, { label: 'Other', v: 4.5, n: '1.90M', c: '#c4cbd9' },
          ]} />
        </Card>
        <Card title="Household Analytics">
          <div className="space-y-2.5">
            {household.map(([l, v, d]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="grid h-5 w-5 place-items-center rounded text-[9px]" style={{ background: '#eef1f8', color: BLUE }} aria-hidden>⌂</span>
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-12 text-right tabular-nums" style={{ color: d.startsWith('-') ? RED : GREEN }}>{d}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Social Risk Indicators">
          <div className="space-y-2.5">
            {social.map(([l, v, d], i) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="min-w-0 flex-1" style={{ color: SOFT }}>{l}</span>
                <Spark pts={W(`sr${i}`, 30, 70, 8)} c={d.startsWith('-') ? GREEN : AMBER} />
                <span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span>
                <span className="w-11 text-right tabular-nums" style={{ color: d.startsWith('-') ? GREEN : RED }}>{d}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Wealth Index Distribution">
          <Donut size={120} top="100%" sub="Index" segs={[
            { label: 'Low', v: 31.9, n: '31.9%', c: '#c4cbd9' }, { label: 'Lower-Middle', v: 27.4, n: '27.4%', c: BLUE },
            { label: 'Upper-Middle', v: 22.4, n: '22.4%', c: TEAL }, { label: 'High', v: 12.0, n: '12.0%', c: PURPLE },
            { label: 'Very High', v: 6.3, n: '6.3%', c: GREEN },
          ]} />
        </Card>
      </div>

      {/* ── Row 4 ──────────────────────────────────────────────── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <Card title="AI Population Forecast" info action="Population Projection">
          <MultiLine height={150} area series={[
            { name: 'High 108.7M', c: GREEN, pts: W('fh', 50, 100, 10) },
            { name: 'Medium 96.3M', c: BLUE, pts: W('fm', 48, 84, 10) },
            { name: 'Low 84.1M', c: AMBER, pts: W('fl', 46, 70, 10) },
          ]} />
        </Card>
        <Card title="Census Intelligence">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2 text-[10px]">
              {census.map(([l, v]) => (
                <div key={l} className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-semibold tabular-nums" style={{ color: INK }}>{v}</span></div>
              ))}
            </div>
            <div className="flex flex-col items-center">
              <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden>
                <circle cx="46" cy="46" r="36" fill="none" stroke="#eef0f6" strokeWidth="8" />
                <circle cx="46" cy="46" r="36" fill="none" stroke={GREEN} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - 0.964)} transform="rotate(-90 46 46)" />
                <text x="46" y="44" textAnchor="middle" fontSize="16" fontWeight="700" fill={INK}>96.4%</text>
                <text x="46" y="58" textAnchor="middle" fontSize="7" fill={MUT}>RESPONSE</text>
              </svg>
              <span className="text-[9px] font-semibold" style={{ color: GREEN }}>Excellent</span>
            </div>
          </div>
        </Card>
        <Card title="National Movement Heatmap" info action="Internal · 30 Days">
          <MovementMap seedKey={`pa:mv:${id}`} />
          <div className="mt-1 flex items-center gap-2 text-[8.5px]" style={{ color: MUT }}>
            <span>Low</span>
            <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg,#cdd9f4,${TEAL},${PURPLE})` }} />
            <span>High</span>
          </div>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[10px]" style={{ borderColor: LINE, color: MUT }}>
        <span>All indicators are calculated using official administrative data and statistical models.</span>
        <span>Next update: {clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span>Data Source: National Statistics Bureau</span>
        <span style={{ color: BLUE }}>Privacy &amp; Data Policy</span>
      </div>
    </div>
  );
}
