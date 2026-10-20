'use client';

// Interior Command — National Security & Civil Operations Ecosystem. Dense
// command grid modelled on the benchmark: emblemed posture header and eight
// numbered ●LIVE modules (National Security / Immigration & Border / Civil
// Registry / Emergency & Disaster / Police Operations / Cybercrime &
// Intelligence / Regional Governance / Public-Safety Citizen Portal) with a
// live right rail (quick actions · inter-ministry links · mission status ·
// activity feed). Pure & deterministic — engine + telemetry only.

import * as React from 'react';
import { NotYetButton } from '@/components/ui/NotYetButton';
import Link from 'next/link';
import { interiorOps } from '@/lib/gov/interior-systems';
import { policeOps, emergencyOps, immigrationOps } from '@/lib/gov/agency-systems';
import { wave, waveSeries, seed } from '@/lib/telemetry';
import { nationTime, nationTimeZoneLabel, aiLabel, regionName } from '@/lib/nation/registry';
import { nationalRegions } from '@/lib/gov/regions';
import type { SignalKind } from '@/lib/twin/signal';
import { SignalTag } from '@/components/ui/SignalTag';
import type { MapPoint } from '@/components/map/NationMap';
import { RegionMap, mapClock, perUnit, skewed, useNationUnits, useRegisteredSites, type MapValue, type NationUnit, type RegionGlow, type RegionMarker } from '@/apps/ministry-interior/domains/RegionMaps';
import { IndexTag } from '@/components/ui/IndexTag';

const BG = '#070a10';
const PANEL = '#0c1119';
const PANEL2 = '#10151f';
const LINE = 'rgba(216,100,95,0.16)';
const RED = '#e0685f';
const RED_BR = '#f0867c';
const AMBER = '#e0a13a';
const GOLD = '#c9a24a';
const CYAN = '#4fb3d9';
const EMER = '#3fae82';
const INK = '#d6dde6';
const SOFT = '#93a0ad';
const MUT = '#62707e';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

const f1 = (n: number) => n.toFixed(1);
const tc = (t: string) => (t === 'ok' ? EMER : t === 'warn' ? AMBER : RED);

function Spark({ pts, color = RED, w = 64, h = 18 }: { pts: number[]; color?: string; w?: number; h?: number }) {
  if (pts.length < 2) return null;
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - mn) / sp) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb,${color} 55%,transparent))` }} />
    </svg>
  );
}

function Donut({ segs, total, sub, size = 92 }: {
  segs: { label: string; v: number; c: string }[]; total: string; sub: string; size?: number;
}) {
  const sum = segs.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 8, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1f29" strokeWidth="8" />
        {segs.map((s, i) => {
          const fr = s.v / sum;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.c} strokeWidth="8"
            strokeDasharray={`${fr * circ} ${circ}`} strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          acc += fr; return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.17} fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>{total}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize={size * 0.085} fill={MUT} className="uppercase" style={{ letterSpacing: '0.1em' }}>{sub}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.c }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: SOFT }}>{s.label}</span>
            <span className="font-mono tabular-nums" style={{ color: INK }}>{Math.round((s.v / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 26, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden>
        <circle cx="33" cy="33" r={r} fill="none" stroke="#1a1f29" strokeWidth="6" />
        <circle cx="33" cy="33" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} transform="rotate(-90 33 33)"
          style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb,${color} 60%,transparent))` }} />
        <text x="33" y="38" textAnchor="middle" fontSize="15" fontWeight="700" fill={color} style={{ fontFamily: SERIF }}>{Math.round(v)}</text>
      </svg>
      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: MUT }}>{label}</span>
    </div>
  );
}

// The nation's real regions, coloured by the panel's figure in the panel's
// own bands (hot / amber / gold / monitor), with pressure glowing over the
// regions under strain (map plan phase 5; was an 18×9 dot grid).
const MONITOR = '#2a3a44';
const bandOf = (hot: string) => (v: number) => (v >= 82 ? hot : v >= 62 ? AMBER : v >= 40 ? GOLD : MONITOR);

function ThreatMap({ title, values, kind, source, hot = RED, valueLabel = 'Threat index', points, markers = [], heat = false, bands, minHeight = 120, maxHeight = 180 }: {
  title: string; values: MapValue[]; kind: SignalKind; source: string; hot?: string; valueLabel?: string;
  points?: MapPoint[]; markers?: RegionMarker[]; heat?: boolean; bands?: (v: number) => string; minHeight?: number; maxHeight?: number;
}) {
  const band = bands ?? bandOf(hot);
  const glows: RegionGlow[] = values.filter(v => v.value >= 62).map(v => ({
    region: v.key, colour: band(v.value), r: heat ? v.value / 100 : (v.value - 50) / 60, pulse: v.value >= 82,
  }));
  return (
    <div className="rounded-[2px] p-1" style={{ background: '#080b11' }}>
      <RegionMap title={title} values={values} kind={kind} source={source} valueLabel={valueLabel} unit="/100" theatre small hideCaption
        colourOf={v => band(v.value)} glows={glows} markers={markers} points={points} maxHeight={maxHeight} minHeight={minHeight}
        emptyNote="Loading the nation's regions…" />
    </div>
  );
}

function NodeGraph({ seedKey, color = RED }: { seedKey: string; color?: string }) {
  const n = 8;
  const nodes = Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * (28 + seed(`${seedKey}:r:${i}`) * 8), y: 36 + Math.sin(a) * (20 + seed(`${seedKey}:s:${i}`) * 5) };
  });
  return (
    <svg viewBox="0 0 100 72" className="w-full" style={{ height: 80 }} aria-hidden>
      {nodes.map((p, i) => <line key={i} x1="50" y1="36" x2={p.x} y2={p.y} stroke={color} strokeWidth="0.5" opacity="0.4" />)}
      {nodes.map((p, i) => i < n - 1 ? <line key={`e${i}`} x1={p.x} y1={p.y} x2={nodes[i + 1]!.x} y2={nodes[i + 1]!.y} stroke={color} strokeWidth="0.3" opacity="0.22" /> : null)}
      <circle cx="50" cy="36" r="4" fill={color} />
      {nodes.map((p, i) => <circle key={`n${i}`} cx={p.x} cy={p.y} r={2 + seed(`${seedKey}:z:${i}`) * 1.6} fill={seed(`${seedKey}:t:${i}`) > 0.7 ? AMBER : color} opacity="0.9" />)}
    </svg>
  );
}

function Area({ pts, color = RED, h = 70 }: { pts: number[]; color?: string; h?: number }) {
  const mn = Math.min(...pts), sp = Math.max(...pts) - mn || 1;
  const line = pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${96 - ((p - mn) / sp) * 88}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h }} aria-hidden>
      <polygon points={`0,100 ${line} 100,100`} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px color-mix(in srgb,${color} 45%,transparent))` }} />
    </svg>
  );
}

function Mod({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: LINE }}>
        <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold" style={{ border: `1px solid ${RED}`, color: RED }}>{n}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: INK }}>{title}</h3>
        <span className="ml-auto flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider"
          style={{ color: RED, background: 'color-mix(in srgb,#e0685f 16%,transparent)' }}>
          <span className="h-1 w-1 rounded-full animate-breathe" style={{ background: RED }} />Live
        </span>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}

function Stat({ l, v, s, c = INK }: { l: string; v: string; s?: string; c?: string }) {
  return (
    <div className="rounded-[3px] border px-2 py-1.5" style={{ borderColor: LINE, background: PANEL2 }}>
      <div className="text-[7.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUT }}>{l}</div>
      <div className="font-mono text-[14px] leading-tight tabular-nums" style={{ color: c }}>{v}</div>
      {s ? <div className="text-[8px]" style={{ color: SOFT }}>{s}</div> : null}
    </div>
  );
}

function Bars({ rows, accent = RED }: { rows: { l: string; v: string; pct: number }[]; accent?: string }) {
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <div key={r.l} className="text-[9px]">
          <div className="flex items-center justify-between"><span style={{ color: SOFT }}>{r.l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{r.v}</span></div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: '#1a1f29' }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const SRC_THREAT = 'Regional security stress model (sample until incident and intelligence feeds connect)';
const SRC_BORDER = 'Border risk model (sample until border management systems connect)';
const SRC_CRIME = 'Police regional load model (sample until crime records connect)';
const SRC_CYBER = 'Cyber threat model (sample until the national CERT feed connects)';

function MapLabel({ kind, source, children }: { kind: SignalKind; source: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>
      {children}<SignalTag kind={kind} source={source} className="!text-[7px]" />
    </div>
  );
}

/** The outer regions of the nation, one per direction from its centre (where border posts sit). */
function outerUnits(units: NationUnit[], n: number): NationUnit[] {
  const located = units.filter(u => u.lng != null && u.lat != null);
  if (!located.length) return [];
  const cx = located.reduce((a, u) => a + u.lng!, 0) / located.length, cy = located.reduce((a, u) => a + u.lat!, 0) / located.length;
  const best = new Map<number, { u: NationUnit; d: number }>();
  for (const u of located) {
    const k = Math.floor(((Math.atan2(u.lat! - cy, u.lng! - cx) + Math.PI) / (2 * Math.PI)) * n) % n;
    const d = Math.hypot(u.lng! - cx, u.lat! - cy);
    if (!best.has(k) || best.get(k)!.d < d) best.set(k, { u, d });
  }
  return [...best.values()].map(b => b.u);
}

/** Quick actions with an existing screen: the escalation floor and the directive board. */
const QUICK_ROUTE: Record<string, string> = {
  'Activate Emergency Protocol': '/gov/escalations',
  'Alert All Agencies': '/gov/directives',
};

export function InteriorCommand({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const io = interiorOps(id, ts);
  const po = policeOps(id, ts);
  const eo = emergencyOps(id, ts);
  const im = immigrationOps(id, ts);

  const clock = new Date(now);
  const hh = nationTime(clock);
  const dd = clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const W = (k: string, lo: number, hi: number, n = 14) => waveSeries(`ic:${k}:${id}`, ts, n, lo, hi);

  const lvl = io.internalThreatLevel;
  const sevTone = lvl === 'low' ? 'ok' : lvl === 'guarded' ? 'warn' : 'alert';
  const posture = lvl === 'high' ? 'CRITICAL' : lvl === 'elevated' ? 'SEVERE' : lvl === 'guarded' ? 'GUARDED' : 'STABLE';
  const threat = lvl === 'high' ? 'SEVERE' : lvl === 'elevated' ? 'HIGH' : lvl === 'guarded' ? 'ELEVATED' : 'LOW';
  const riskScore = Math.round(100 - io.coordination.publicOrderIndex + 12);
  const readiness = Math.round(wave(`ic:rd:${id}`, ts, 78, 98));
  const incidents = po.activeIncidents;
  const regionsRisk = po.regional.filter(r => r.tone !== 'ok').length + 8;
  const tactical = Math.round(wave(`ic:tu:${id}`, ts, 4000, 12000));
  const agencies = `${18 + Math.round(seed(`ic:ag:${id}`) * 4)} / 23`;

  // ── The nation's regions on the maps (sample figures until sources connect) ──
  const units = useNationUnits() ?? [];
  // Maps move on a slower clock than the counters, so the regions are not redrawn every tick.
  const tm = mapClock(ts);
  // Few regions (e.g. four): spread the sample evenly so the map is not all one band.
  const sk = (x: number, p: number) => skewed(x, units.length < 10 ? 1 : p);
  const posts = useRegisteredSites(['border-post']);
  const threatMap = perUnit(units, nationalRegions(tm).map(r => ({ region: r.name, v: r.composite })), r => r.v,
    u => Math.round(8 + 90 * sk(wave(`ic:tm:${id}:${u.code ?? u.name}`, tm, 0, 1), 2)));
  const borderVals = units.map(u => ({ key: u.name, value: Math.round(6 + 92 * sk(wave(`ic:bm:${id}:${u.code ?? u.name}`, tm, 0, 1), 1.7)) }));
  const highRisk = borderVals.filter(v => v.value >= 82).length;
  const restricted = borderVals.filter(v => v.value >= 62 && v.value < 82).length;
  // Border posts: examples spread over the outer regions until the facility register holds the nation's own.
  const frontier = outerUnits(units, Math.min(8, Math.max(3, Math.round(units.length / 5))));
  const postMarkers: RegionMarker[] = posts.categories.has('border-post') ? [] : frontier.map((u, i) => {
    const share = Math.floor(im.bordersOpen / frontier.length) + (i < im.bordersOpen % frontier.length ? 1 : 0);
    return { region: u.name, glyph: '⛬', colour: EMER, label: `${share} open checkpoint${share === 1 ? '' : 's'} · ${u.name}`, count: share, dy: 0.15, dx: 0.35 };
  });
  const crimeMap = perUnit(units, policeOps(id, tm).regional, r => r.load, u => Math.round(10 + 88 * sk(wave(`ic:ch:${id}:${u.code ?? u.name}`, tm, 0, 1), 1.8)));
  const cyberVals = units.map(u => ({ key: u.name, value: Math.round(8 + 90 * sk(wave(`ic:tlm:${id}:${u.code ?? u.name}`, tm, 0, 1), 2)) }));
  const stability = units.length
    ? units.map(u => ({ l: u.name, v: Math.round(wave(`ic:rsi:${id}:${u.code ?? u.name}`, ts, 50, 88)) })).sort((a, b) => a.v - b.v).slice(0, 5)
    : ['North', 'Central', 'West', 'East', 'South'].map((rg, i) => ({ l: `${rg} Region`, v: Math.round(wave(`ic:rsi:${id}:${i}`, ts, 50, 88)) }));
  const place = (i: number, ref: string) => units[i % Math.max(1, units.length)]?.name ?? regionName(i, ref);

  const headCells = [
    ['National Posture', posture, sevTone],
    ['Threat Level', threat, sevTone],
    ['Operational Readiness', `${readiness}%`, readiness >= 85 ? 'ok' : 'warn'],
    ['Incidents Active', `${incidents}`, 'alert'],
    ['Agencies Deployed', agencies, 'ok'],
  ] as [string, string, string][];

  const chips = [[aiLabel('AI Command Assist', 'Command Assist'), 'Active'], ['Data Integrity', 'Verified'], ['System Health', 'Optimal'], ['Secure Network', 'Encrypted']];

  const quick = ['Activate Emergency Protocol', 'Alert All Agencies', 'Deploy Tactical Units', 'Initiate Lockdown', 'Request Air Support', 'Activate Cyber Shield'];
  const links = ['Health', 'Finance', 'Transport', 'Defence', 'Justice', 'Foreign Affairs'];
  const feed = [
    [hh, `High-risk vehicle intercepted at ${frontier[0]?.name ?? regionName(1, 'Northern')} border checkpoint 12`, 'Border Guard'],
    ['12:45', `Flash flood reported in ${place(2, 'Riverdale District')}. Response teams dispatched.`, 'Disaster Ops'],
    ['12:41', 'Cyber threat blocked: ransomware attempt detected and neutralised.', 'Cyber Unit'],
    ['12:38', 'Arrest made in ongoing fraud investigation.', 'Police Dept'],
    ['12:35', `New permit application surge detected in ${units.find(u => u.capital)?.name ?? place(0, 'Metropolitan District')}.`, 'Civil Registry'],
  ] as [string, string, string][];

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: BG, boxShadow: 'inset 0 0 130px rgba(0,0,0,0.7)' }}>
      {/* ── Header / posture ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[4px] border px-4 py-2.5"
        style={{ borderColor: LINE, background: 'linear-gradient(100deg,#0c0f15,#12161e)' }}>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full text-[14px]" style={{ border: `1px solid ${RED}`, color: RED }} aria-hidden>⚜</span>
          <div>
            <div className="text-[15px] font-bold uppercase tracking-[0.12em]" style={{ color: INK, fontFamily: SERIF }}>Ministry of Interior</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: RED }}>National Security &amp; Civil Operations Ecosystem</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8.5px]" style={{ color: MUT }}>
          <span>DATE <span style={{ color: SOFT }}>{dd}</span></span>
          <span>TIME <span className="font-mono" style={{ color: INK }}>{hh}</span> {nationTimeZoneLabel('GMT+1')}</span>
        </div>
        {headCells.map(([l, v, t]) => (
          <div key={l} className="border-l px-3" style={{ borderColor: LINE }}>
            <div className="text-[7px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUT }}>{l}</div>
            <div className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: tc(t), fontFamily: SERIF }}>{v}</div>
          </div>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px]" style={{ color: MUT }}>
          {chips.map(([a, b]) => <span key={a} className="uppercase tracking-[0.1em]">{a} <span style={{ color: EMER }}>● {b}</span></span>)}
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-1" style={{ borderColor: LINE }}>
            <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold" style={{ background: RED, color: '#160a09' }}>HI</span>
            <span><span className="block uppercase tracking-[0.1em]" style={{ color: MUT }}>Head of Interior</span><span style={{ color: INK }}>National Executive</span></span>
          </span>
        </div>
      </div>

      {/* ── Command grid + right rail ──────────────────────────── */}
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_232px]">
        <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {/* 1 — National Security Command */}
          <Mod n={1} title="National Security Command">
            <div className="mb-2 flex items-center gap-3 rounded-[3px] border px-3 py-2" style={{ borderColor: LINE, background: PANEL2 }}>
              <div><div className="text-[7px] uppercase tracking-[0.14em]" style={{ color: MUT }}>Security Posture</div>
                <div className="text-[16px] font-bold" style={{ color: tc(sevTone), fontFamily: SERIF }}>{posture}</div></div>
              <div className="ml-auto text-right"><div className="text-[7px] uppercase tracking-[0.14em]" style={{ color: MUT }}>Risk Score <IndexTag index="interior-systems.ts · publicOrderIndex" /></div>
                <div className="font-mono text-[16px]" style={{ color: RED }}>{riskScore}<span className="text-[9px]" style={{ color: MUT }}>/100</span></div></div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Active Incidents" v={`${incidents}`} s="+23 24h" c={RED} />
              <Stat l="Regions at Risk" v={`${regionsRisk}`} s="High Risk" c={AMBER} />
              <Stat l="Tactical Units" v={tactical.toLocaleString()} s="78% strength" c={INK} />
              <Stat l="Response Teams" v={eo.responders.toLocaleString()} c={INK} />
            </div>
            <div className="mt-2 grid grid-cols-[1.5fr_1fr] gap-3">
              <div>
                <MapLabel kind="sample" source={SRC_THREAT}>National Threat Map</MapLabel>
                <ThreatMap title="National Threat Map" values={threatMap.values} kind="sample" source={SRC_THREAT} />
                <div className="mt-1 flex gap-3 text-[7px] uppercase tracking-wider" style={{ color: MUT }}>
                  {[['Critical', RED], ['High', AMBER], ['Medium', GOLD], ['Monitor', '#2a3a44']].map(([l, c]) => (
                    <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l}</span>
                  ))}
                </div>
                <div className="mt-2 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Threat Forecast (24H)</div>
                <Area pts={W('tf', 30, 90, 16)} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>{aiLabel('AI Threat Prediction', 'Threat Prediction')}</div>
                <Ring value={Math.round(wave(`ic:atp:${id}`, ts, 55, 88))} label="Probability" color={RED} />
                <div className="mt-1 space-y-0.5 text-[8px]">
                  {[['Unrest', 62], ['Terrorism', 45], ['Cyber Threat', 38], ['Organized Crime', 55], ['Border Risk', 41]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between"><span style={{ color: SOFT }}>{l}</span><span style={{ color: INK }}>{v as number}%</span></div>
                  ))}
                </div>
              </div>
            </div>
          </Mod>

          {/* 2 — Immigration & Border Intelligence */}
          <Mod n={2} title="Immigration & Border Intelligence">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Border Crossings 24H" v={im.crossingsToday.toLocaleString()} s="+8.2%" c={INK} />
              <Stat l="Watchlist Hits" v={`${im.flaggedEntries + 900}`} s="+5.1%" c={AMBER} />
              <Stat l="High-Risk Travelers" v={`${im.flaggedEntries}`} s="+11.3%" c={RED} />
              <Stat l="Deportations 24H" v={`${Math.round(wave(`ic:dp:${id}`, ts, 40, 120))}`} s="+2.4%" c={INK} />
            </div>
            <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-3">
              <div>
                <MapLabel kind="sample" source={SRC_BORDER}>Border Situation Map</MapLabel>
                <ThreatMap title="Border Situation Map" values={borderVals} kind="sample" source={SRC_BORDER} hot={RED} valueLabel="Border risk"
                  bands={v => (v >= 82 ? RED : v >= 62 ? AMBER : MONITOR)} points={posts.points} markers={postMarkers} />
                <div className="mt-1 grid grid-cols-3 gap-x-3 text-[7.5px]" style={{ color: SOFT }}>
                  {[['High-Risk Zones', highRisk, RED], ['Open Checkpoints', im.bordersOpen, EMER], ['Restricted', restricted, AMBER]].map(([l, v, c]) => (
                    <span key={l as string} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c as string }} />{l} <b style={{ color: INK }}>{v as number}</b></span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Donut size={78} total={`${im.bordersTotal}`} sub="zones" segs={[
                  { label: 'High', v: 14, c: RED }, { label: 'Medium', v: 28, c: AMBER }, { label: 'Low', v: 58, c: EMER },
                ]} />
                <div className="rounded-[3px] border px-2 py-1.5 text-[8px]" style={{ borderColor: LINE }}>
                  <div className="flex justify-between"><span style={{ color: MUT }}>Biometric Verif. 24H</span><span style={{ color: INK }}>{Math.round(wave(`ic:bv:${id}`, ts, 60000, 120000)).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUT }}>Success Rate</span><span style={{ color: EMER }}>{f1(io.identity.uptimePct)}%</span></div>
                  <div className="mt-1 flex items-center justify-between"><span style={{ color: MUT }}>Smuggling Risk</span><span className="font-mono" style={{ color: RED }}>{Math.round(wave(`ic:sr:${id}`, ts, 45, 82))}/100</span></div>
                </div>
              </div>
            </div>
          </Mod>

          {/* 3 — Civil Registry & National ID */}
          <Mod n={3} title="Civil Registry & National ID">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Digital ID Holders" v={`${io.identity.enrolledM}M`} s="12.6% pop." c={INK} />
              <Stat l="ID Issued 24H" v={io.licensing.issuedToday.toLocaleString()} s="+6.3%" c={EMER} />
              <Stat l="Births 24H" v={`${Math.round(wave(`ic:bi:${id}`, ts, 5000, 11000)).toLocaleString()}`} s="+1.8%" c={INK} />
              <Stat l="Deaths 24H" v={`${Math.round(wave(`ic:de:${id}`, ts, 1800, 3600)).toLocaleString()}`} s="+2.1%" c={SOFT} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Population Overview</div>
                <div className="mt-1 font-mono text-[18px]" style={{ color: INK, fontFamily: SERIF }}>{(41_000_000 + Math.round(seed(`ic:pop:${id}`) * 1_900_000)).toLocaleString()}</div>
                <div className="mt-1 flex gap-3 text-[8px]" style={{ color: SOFT }}>
                  <span>51.2% Male</span><span>48.8% Female</span><span style={{ color: EMER }}>Growth +1.2% YoY</span>
                </div>
                <Area pts={W('pg', 40, 80, 12)} color={CYAN} h={48} />
              </div>
              <div className="flex items-center gap-3">
                <Ring value={100 - Math.round(io.licensing.slaMetPct / 4)} label="Fraud Risk" color={EMER} />
                <div className="space-y-0.5 text-[8px]">
                  {[['Duplicate IDs', 232], ['Identity Theft', 114], ['Fake Documents', 67], ['Other Risks', 98]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between gap-3"><span style={{ color: MUT }}>{l}</span><span style={{ color: INK }}>{v as number}</span></div>
                  ))}
                  <div className="flex justify-between gap-3 border-t pt-0.5" style={{ borderColor: LINE }}><span style={{ color: MUT }}>Fraud Detected</span><span style={{ color: RED }}>0.32%</span></div>
                </div>
              </div>
            </div>
          </Mod>

          {/* 4 — Emergency & Disaster Operations */}
          <Mod n={4} title="Emergency & Disaster Operations">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Active Disasters" v={`${eo.activeCrises}`} c={RED} />
              <Stat l="Affected People" v={`${f1(eo.populationAssisted / 1e6 + 0.4)}M`} c={AMBER} />
              <Stat l="Evacuated" v={`${Math.round(eo.populationAssisted / 4).toLocaleString()}`} c={INK} />
              <Stat l="Response Teams" v={eo.responders.toLocaleString()} c={INK} />
            </div>
            <div className="mt-2 grid grid-cols-[1.3fr_1fr] gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Incident Types</div>
                <Bars accent={AMBER} rows={[['Flood', 5], ['Fire', 3], ['Storm', 2], ['Earthquake', 1], ['Landslide', 1]].map(([l, v]) => ({ l: l as string, v: `${v}`, pct: (v as number) * 18 }))} />
                <div className="mt-2 flex items-center justify-between text-[7.5px]" style={{ color: MUT }}>
                  {['Detected 12:10', 'Dispatched 12:16', 'On Scene 12:24', 'Contained'].map((s, i) => (
                    <span key={s} className="flex items-center gap-1">{i > 0 ? <span style={{ color: LINE }}>—</span> : null}<span className="h-1.5 w-1.5 rounded-full" style={{ background: i < 3 ? EMER : MUT }} />{s}</span>
                  ))}
                </div>
              </div>
              <Donut size={84} total={`${eo.resourceCoverPct}%`} sub="allocated" segs={[
                { label: 'Personnel', v: 64, c: RED }, { label: 'Vehicles', v: 22, c: AMBER }, { label: 'Equipment', v: 14, c: CYAN },
              ]} />
            </div>
          </Mod>

          {/* 5 — Police Operations Command */}
          <Mod n={5} title="Police Operations Command">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Active Patrols" v={po.unitsDeployed.toLocaleString()} c={INK} />
              <Stat l="Crime Incidents 24H" v={po.activeIncidents.toLocaleString()} s="-7.2%" c={AMBER} />
              <Stat l="Arrests 24H" v={`${Math.round(wave(`ic:ar:${id}`, ts, 300, 560))}`} s="+4.3%" c={EMER} />
              <Stat l="Response (avg)" v={`${String(Math.floor(po.meanResponseMin)).padStart(2, '0')}:${String(Math.round((po.meanResponseMin % 1) * 60)).padStart(2, '0')}`} s="mins" c={INK} />
            </div>
            <div className="mt-2 grid grid-cols-[1.2fr_1fr] gap-3">
              <div>
                <MapLabel kind="sample" source={SRC_CRIME}>Crime Heatmap (24H)</MapLabel>
                <ThreatMap title="Crime Heatmap (24H)" values={crimeMap.values} kind="sample" source={SRC_CRIME} hot={RED_BR} valueLabel="Crime load" heat />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Top Crime Types</div>
                <Bars rows={[['Theft', 32], ['Assault', 21], ['Burglary', 18], ['Fraud', 12], ['Vandalism', 9], ['Other', 8]].map(([l, v]) => ({ l: l as string, v: `${v}%`, pct: (v as number) * 3 }))} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Patrol Deployment', `${po.unitsDeployed.toLocaleString()} field`], [aiLabel('AI Crime Forecast', 'Crime Forecast'), `${Math.round(wave(`ic:cf:${id}`, ts, 18, 38))} hot areas`], ['Investigations', `${po.openInvestigations} · ${po.clearanceRatePct}% solved`]].map(([l, v]) => (
                <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div><div style={{ color: INK }}>{v}</div>
                </div>
              ))}
            </div>
          </Mod>

          {/* 6 — Cybercrime & Intelligence Fusion */}
          <Mod n={6} title="Cybercrime & Intelligence Fusion">
            <div className="grid grid-cols-4 gap-1.5">
              <Stat l="Cyber Threats" v={`${Math.round(wave(`ic:cy:${id}`, ts, 800, 1800)).toLocaleString()}`} s="+9.1%" c={RED} />
              <Stat l="Active Investigations" v={`${Math.round(wave(`ic:ai:${id}`, ts, 240, 460))}`} c={INK} />
              <Stat l="IOCs Detected" v={`${Math.round(wave(`ic:io:${id}`, ts, 3000, 6400)).toLocaleString()}`} c={CYAN} />
              <Stat l="System Compromise" v={`${Math.round(wave(`ic:sc:${id}`, ts, 8, 40))}`} s="High" c={RED} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <Donut size={80} total="100%" sub="vectors" segs={[
                { label: 'Malware', v: 32, c: RED }, { label: 'Phishing', v: 28, c: AMBER },
                { label: 'Ransomware', v: 18, c: GOLD }, { label: 'Data Breach', v: 16, c: CYAN }, { label: 'DDoS', v: 6, c: MUT },
              ]} />
              <div>
                <MapLabel kind="sample" source={SRC_CYBER}>Threat Level Map</MapLabel>
                <ThreatMap title="Threat Level Map" values={cyberVals} kind="sample" source={SRC_CYBER} hot={CYAN} valueLabel="Cyber threat level" minHeight={90} maxHeight={130} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Intelligence Graph</div>
                <NodeGraph seedKey={`ic:ig:${id}`} color={CYAN} />
              </div>
            </div>
          </Mod>

          {/* 7 — Regional Governance Coordination */}
          <Mod n={7} title="Regional Governance Coordination">
            <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-3">
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Regional Status</div>
                <Donut size={84} total={`${po.regional.length}`} sub="regions" segs={[
                  { label: 'Critical', v: 4, c: RED }, { label: 'High', v: 12, c: AMBER },
                  { label: 'Medium', v: 18, c: GOLD }, { label: 'Low', v: 6, c: EMER },
                ]} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Regional Stability Index</div>
                <Bars accent={EMER} rows={stability.map(r => ({ l: r.l, v: `${r.v}%`, pct: r.v }))} />
              </div>
              <div>
                <div className="mb-1 text-[8px] uppercase tracking-[0.16em]" style={{ color: MUT }}>Civil Unrest Indicator</div>
                <div className="text-[15px] font-bold" style={{ color: AMBER, fontFamily: SERIF }}>Medium</div>
                <div className="text-[8px]" style={{ color: SOFT }}>Trend {Math.round(wave(`ic:cu:${id}`, ts, 28, 56))}%</div>
                <Area pts={W('cu', 25, 70, 14)} color={AMBER} h={44} />
              </div>
            </div>
          </Mod>

          {/* 8 — Public Safety Citizen Portal */}
          <Mod n={8} title="Public Safety Citizen Portal">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {[['Digital ID', '◈'], ['Permits', '▤'], ['Report Incident', '⚑'], ['Emergency Alerts', '◔'], ['Immigration', '⊕'], ['Civil Records', '▦'], ['Pay Fines', '◇'], ['Feedback', '✎']].map(([l, ic]) => (
                <div key={l} className="rounded-[3px] border px-1.5 py-2 text-center" style={{ borderColor: LINE, background: PANEL2 }}>
                  <div className="text-[13px]" style={{ color: RED }} aria-hidden>{ic}</div>
                  <div className="mt-1 text-[8px]" style={{ color: SOFT }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 border-t pt-2 text-[8px]" style={{ borderColor: LINE }}>
              {[['Citizen Reports 24H', `${Math.round(wave(`ic:cr:${id}`, ts, 1200, 4200)).toLocaleString()}`], ['Permits Active', io.licensing.pending.toLocaleString()], ['Identity Verifs', `${io.identity.verificationsPerHr.toLocaleString()}/hr`], ['Portal Uptime', `${f1(io.identity.uptimePct)}%`]].map(([l, v]) => (
                <div key={l} className="rounded-[2px] border px-1.5 py-1" style={{ borderColor: LINE }}>
                  <div className="text-[7px] uppercase tracking-wider" style={{ color: MUT }}>{l}</div><div className="font-mono text-[10px]" style={{ color: INK }}>{v}</div>
                </div>
              ))}
            </div>
          </Mod>
        </div>

        {/* Right rail */}
        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="border-b px-3 py-2" style={{ borderColor: LINE }}><span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>Quick Actions</span></div>
            <div className="space-y-1 p-2">
              {quick.map(q => {
                const cls = 'focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1.5 text-left text-[9px] no-underline';
                const href = QUICK_ROUTE[q];
                return href ? (
                  <Link key={q} href={href} className={cls} style={{ borderColor: LINE, color: SOFT }}>
                    <span style={{ color: RED }} aria-hidden>▸</span>{q}
                  </Link>
                ) : (
                  <NotYetButton key={q} reason="the platform holds no operational command powers (deployments, lockdowns, air support, cyber defence); they are ordered through the security services' own systems" className={cls} style={{ borderColor: LINE, color: SOFT }}>
                    <span style={{ color: RED }} aria-hidden>▸</span>{q}
                  </NotYetButton>
                );
              })}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="border-b px-3 py-2" style={{ borderColor: LINE }}><span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>Inter-Ministry Links</span></div>
            <div className="space-y-1.5 p-2.5">
              {links.map(m => (
                <div key={m} className="flex items-center justify-between text-[9px]"><span style={{ color: SOFT }}>Ministry of {m}</span><span style={{ color: EMER }}>● Connected</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="border-b px-3 py-2" style={{ borderColor: LINE }}><span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>Mission Status</span></div>
            <div className="space-y-1.5 p-2.5 text-[9px]">
              {[['Active Missions', '18'], ['Mission Success Rate', `${f1(po.clearanceRatePct + 22)}%`], ['Avg. Response Time', '08:47'], ['Pending Approvals', `${io.licensing.pending > 3000 ? 32 : 18}`]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between"><span style={{ color: SOFT }}>{l}</span><span className="font-mono tabular-nums" style={{ color: INK }}>{v}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border" style={{ borderColor: LINE, background: PANEL }}>
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: INK }}>Real-Time Activity Feed</span>
              <span className="text-[7.5px] uppercase" style={{ color: RED }}>● Live</span>
            </div>
            <div className="space-y-2 p-2.5">
              {feed.map(([t, e, ag]) => (
                <div key={e} className="text-[8.5px]">
                  <div className="flex justify-between"><span className="font-mono" style={{ color: MUT }}>{t}</span><span className="uppercase tracking-wider" style={{ color: RED }}>{ag}</span></div>
                  <div style={{ color: SOFT }}>{e}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Classification footer ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border px-4 py-2 text-[8px] uppercase tracking-[0.16em]"
        style={{ borderColor: LINE, background: PANEL }}>
        <span style={{ color: MUT }}>Data Classification <span style={{ color: RED }}>Official · Sovereign 🔒</span></span>
        <span className="italic" style={{ color: SOFT, fontFamily: SERIF, textTransform: 'none', letterSpacing: 0 }}>
          Secure the Nation. Protect the citizen. Uphold civil order with integrity.
        </span>
        <span style={{ color: MUT }}>Secure Network <span style={{ color: EMER }}>Encrypted 🛡</span></span>
      </div>
    </div>
  );
}
