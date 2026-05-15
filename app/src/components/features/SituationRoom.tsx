'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { identityFor } from '@/lib/archetype-profiles';
import { resolveIdentity } from '@/lib/sovereign-identity';
import type {
  NationalSnapshot,
  NationalCoordination,
  SovereignProfile,
  ArchetypeKey,
} from '@/lib/api/types';

const TONE: Record<string, string> = {
  alert: '#f1707a',
  warn: '#e0b341',
  ok: '#34d39c',
  neutral: '#6b7a90',
};
const ACCENT = '#37c7d4';

// Deep-navy situation-room palette (overrides the .sov tokens locally).
const PALETTE = {
  '--c-bg': '7 12 20',
  '--c-surface': '12 18 30',
  '--c-surface-2': '19 27 43',
  '--c-ink': '226 233 243',
  '--c-ink-soft': '150 165 186',
  '--c-ink-muted': '101 116 139',
  '--c-line': '28 38 56',
  '--c-line-soft': '21 29 44',
  '--c-link': '74 198 212',
  '--c-link-hover': '130 220 230',
  '--accent': ACCENT,
} as React.CSSProperties;

function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
const toneFor = (v: number) => (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');
function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}

const RAIL: { i: string; l: string; href: string; key: string }[] = [
  { i: '◎', l: 'Situation Room', href: '/gov/situation-room', key: 'sr' },
  { i: '◆', l: 'Cabinet Intelligence', href: '/gov', key: 'cab' },
  { i: '▦', l: 'Ministries', href: '/ministries', key: 'min' },
  { i: '⚠', l: 'Incidents', href: '/gov/coordination', key: 'inc' },
  { i: '⊞', l: 'Operations Centre', href: '/ops', key: 'ops' },
  { i: '◉', l: 'Regional Overview', href: '/gov/coordination', key: 'reg' },
  { i: '⟁', l: 'Analytics & Intelligence', href: '/gov/coordination', key: 'an' },
  { i: '§', l: 'Treasury Command', href: '/gov', key: 'tr' },
  { i: '⚡', l: 'Infrastructure', href: '/gov', key: 'inf' },
  { i: '◈', l: 'Security & Interior', href: '/gov', key: 'sec' },
  { i: '⛑', l: 'Emergency Response', href: '/gov/coordination', key: 'er' },
  { i: '⛓', l: 'Audit & Oversight', href: '/audit', key: 'aud' },
  { i: '▤', l: 'Documents & Records', href: '/wallet/documents', key: 'doc' },
  { i: '⇄', l: 'Communications', href: '/integrations', key: 'com' },
  { i: '⚙', l: 'Settings', href: '/platform', key: 'set' },
];

function Panel({
  title, meta, className = '', bodyClass = '', children,
}: {
  title: string; meta?: React.ReactNode; className?: string; bodyClass?: string; children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-lg border border-line bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{title}</h2>
        {meta ? <span className="text-[11px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className={`min-h-0 flex-1 p-3.5 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function Donut({ segs }: { segs: { label: string; value: number; tone: string }[] }) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 40, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <svg viewBox="0 0 110 110" className="h-28 w-28 -rotate-90">
          <circle cx="55" cy="55" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="11" />
          {segs.map(s => {
            const len = (s.value / total) * C;
            const el = (
              <circle key={s.label} cx="55" cy="55" r={R} fill="none" stroke={TONE[s.tone]} strokeWidth="11"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
                className="transition-all duration-700 ease-sov" strokeLinecap="round" />
            );
            off += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-mono text-xl tabular-nums text-ink">{total}</div>
            <div className="text-[9px] uppercase tracking-wide text-ink-muted">total</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {segs.map(s => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-[1px]" style={{ backgroundColor: TONE[s.tone] }} />
            <span className="text-ink-muted">{s.label}</span>
            <span className="ml-auto pl-4 font-mono tabular-nums text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const R = 38, C = 2 * Math.PI * R;
  const tone = pct >= 99 ? 'ok' : pct >= 95 ? 'warn' : 'alert';
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="7" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={TONE[tone]} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`} className="transition-all duration-700 ease-sov" />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-base tabular-nums" style={{ color: TONE[tone] }}>{pct.toFixed(1)}%</div>
        <div className="text-[9px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function Spark({ pts, tone }: { pts: number[]; tone: string }) {
  const max = Math.max(...pts), min = Math.min(...pts);
  const line = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * 100;
    const y = 30 - ((p - min) / (max - min || 1)) * 26 - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${line} L100,30 L0,30 Z`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-9 w-full">
      <path d={area} fill={TONE[tone]} fillOpacity="0.12" />
      <path d={line} fill="none" stroke={TONE[tone]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function SituationRoom() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      const [n, c, s] = await Promise.all([
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
      ]);
      setNat(n); setCoord(c); setSov(s);
    };
    void load();
    const poll = setInterval(() => void load(), 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const tickN = coord?.tick ?? 0;
  const epoch = Math.floor(tickN / 2);
  const identity = sov ? resolveIdentity(sov) : null;

  const regions = React.useMemo(
    () => Array.from({ length: 16 }).map((_, i) => ({
      id: `R${i + 1}`,
      x: 8 + seed(`rx:${i}`) * 84,
      y: 14 + seed(`ry:${i}`) * 72,
      r: 30 + seed(`rr:${i}`) * 30,
      risk: Math.round(seed(`reg:${i}:${epoch}`) * 100),
    })),
    [epoch],
  );

  const nodes = coord?.nodes ?? [];
  const fabricById = new Map((coord?.fabric ?? []).map(f => [f.ministryId, f]));
  const mapNodes = nodes.map((nd, i) => ({
    ...nd,
    x: 14 + seed(`mx:${nd.ministryId}`) * 72,
    y: 18 + ((i % 5) / 4) * 60 + (seed(`my:${nd.ministryId}`) - 0.5) * 10,
    pressure: fabricById.get(nd.ministryId)?.pressure ?? nd.riskScore,
    trend: fabricById.get(nd.ministryId)?.trend ?? 'steady',
  }));
  const nodePos = new Map(mapNodes.map(m => [m.ministryId, m]));

  const incidents = nat?.crossMinistryIncidents ?? [];
  const sev = (s: string) => incidents.filter(i => i.severity === s).length;
  const donut = [
    { label: 'Critical', value: sev('sev1'), tone: 'alert' },
    { label: 'Elevated', value: sev('sev2'), tone: 'alert' },
    { label: 'Warning', value: sev('sev3'), tone: 'warn' },
    { label: 'Informational', value: sev('sev4'), tone: 'neutral' },
  ];
  const finance = nodes.find(n => n.archetype === 'FINANCE');
  const revPts = Array.from({ length: 18 }).map((_, i) => 80 + seed(`rev:${i}:${epoch}`) * 50);
  const expPts = Array.from({ length: 18 }).map((_, i) => 70 + seed(`exp:${i}:${epoch}`) * 40);
  const mhPts = Array.from({ length: 14 }).map((_, i) => 70 + seed(`mh:${i}:${epoch}`) * 28);
  const revenue = (110 + seed(`rv:${epoch}`) * 30).toFixed(1);
  const expenditure = (90 + seed(`ex:${epoch}`) * 20).toFixed(1);
  const integ = 96 + seed(`int:${epoch}`) * 3.9;
  const totals = nat?.totals ?? null;
  const posture = coord?.posture;
  const pending = nodes.reduce((s, n) => s + n.queueDepth, 0) * 37 + 142;
  const indV = (l: string) => nat?.indicators.find(x => x.label.toLowerCase().includes(l))?.value ?? '—';
  const mhealth = nodes.length ? Math.round((nodes.filter(n => n.posture === 'ok').length / nodes.length) * 100) : 100;

  const kpis = [
    { l: 'Unemployment rate', v: `${(4 + seed(`ku:${epoch}`) * 5).toFixed(1)}%`, d: seed(`du:${epoch}`) - 0.5 },
    { l: 'Inflation rate', v: `${(2 + seed(`ki:${epoch}`) * 4).toFixed(1)}%`, d: seed(`di:${epoch}`) - 0.5 },
    { l: 'Food security index', v: `${(78 + seed(`kf:${epoch}`) * 14).toFixed(1)}`, d: seed(`df:${epoch}`) - 0.4 },
    { l: 'Public satisfaction', v: `${(66 + seed(`kp:${epoch}`) * 16).toFixed(1)}%`, d: seed(`dp:${epoch}`) - 0.4 },
  ];
  const cal = [
    { t: 'Cabinet economic review', m: 11 },
    { t: 'National security briefing', m: 101 },
    { t: 'Infrastructure progress review', m: 191 },
  ];
  const alerts = (coord?.chronology ?? [])
    .filter(c => c.tone === 'alert' || c.tone === 'warn')
    .slice(-3)
    .reverse();

  const strip = [
    { l: 'National status', v: posture?.label ?? 'STABLE', s: 'fabric posture', t: posture?.level ?? 'ok', dot: true },
    { l: 'Active incidents', v: String(incidents.length), s: `${sev('sev1')} critical · ${sev('sev2')} elevated`, t: incidents.length ? 'alert' : 'ok' },
    { l: 'Ministry health', v: `${mhealth}%`, s: 'operational', spark: mhPts, t: 'ok' },
    { l: 'Regions at risk', v: String(regions.filter(r => r.risk >= 70).length), s: 'elevated monitoring', t: 'warn' },
    { l: 'Pending approvals', v: pending.toLocaleString(), s: 'across institutions' },
    { l: 'Total population', v: `${indV('population')}M`, s: 'national register' },
    { l: 'Economic indicator', v: `${(2 + seed(`gdp:${epoch}`) * 2).toFixed(2)}%`, s: 'GDP growth QoQ', t: 'ok' },
    { l: 'Treasury balance', v: `$${revenue}B`, s: 'available liquidity' },
    { l: 'System integrity', v: `${integ.toFixed(2)}%`, s: totals?.auditIntact === false ? 'review' : 'operational', t: integ >= 99 ? 'ok' : 'warn' },
  ];

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]" style={PALETTE}>
      {/* Command top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-sm text-sm font-bold text-white ring-1 ring-white/15"
            style={{ backgroundColor: ACCENT }}>
            {identity ? identity.seal : 'CO'}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.18em] text-ink">CIVICOS</span>
            <span className="block text-[9px] uppercase tracking-[0.16em] text-ink-muted">Sovereign Operating System</span>
          </span>
        </Link>
        <div className="hidden flex-1 text-center md:block">
          <div className="text-sm font-semibold tracking-[0.22em] text-ink">NATIONAL SITUATION ROOM</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Real-time command &amp; coordination</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-sm border border-line bg-bg px-2 py-1 text-xs text-ink-muted lg:flex">
            <span style={{ color: ACCENT }}>⌕</span> Global search
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <span className="flex items-center gap-1.5 rounded-sm border border-line px-2 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Live · T{tickN}</span>
          </span>
          <span className="flex items-center gap-2 border-l border-line pl-3">
            <span className="text-right leading-tight">
              <span className="block text-xs font-medium text-ink">{sov?.executiveTitle ?? 'Executive Office'}</span>
              <span className="block text-[10px] text-ink-muted">{sov ? 'Head of Government' : '—'}</span>
            </span>
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs text-ink-soft ring-1 ring-line">◷</span>
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Icon command rail */}
        <nav aria-label="Situation Room navigation" className="hidden w-[212px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
          <ul className="flex-1 overflow-y-auto py-3">
            {RAIL.map(r => {
              const on = r.key === 'sr';
              return (
                <li key={r.key}>
                  <Link href={r.href}
                    className={`focus-ring flex items-center gap-3 border-l-2 px-4 py-2 text-[13px] no-underline transition-colors duration-150 ${
                      on ? 'bg-surface-2 font-medium text-ink' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                    }`}
                    style={on ? { borderLeftColor: ACCENT, color: ACCENT } : undefined}>
                    <span aria-hidden className="w-4 text-center text-sm" style={on ? { color: ACCENT } : undefined}>{r.i}</span>
                    <span className="truncate">{r.l}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 border-t border-line px-4 py-3 text-[10px]">
            <div><div className="uppercase tracking-widest text-ink-muted">System status</div><div style={{ color: TONE.ok }}>All systems operational</div></div>
            <div><div className="uppercase tracking-widest text-ink-muted">Environment</div><div className="text-ink-soft">{nat?.environment ?? 'Production'}</div></div>
            <div><div className="uppercase tracking-widest text-ink-muted">Version</div><div className="text-ink-soft">CivicOS v2.1.0</div></div>
            <div className="pt-1 text-ink-muted">© 2025 CivicOS</div>
          </div>
        </nav>

        {/* Operational canvas */}
        <main className="min-w-0 flex-1 space-y-3 overflow-y-auto bg-bg p-3">
          {/* Status strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            {strip.map(t => (
              <div key={t.l} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{t.l}</div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-lg tabular-nums" style={{ color: t.t ? TONE[t.t] : 'rgb(var(--c-ink))' }}>
                  {t.dot ? <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE[t.t ?? 'ok'] }} /> : null}
                  {t.v}
                </div>
                {t.spark ? <Spark pts={t.spark} tone="ok" /> : <div className="truncate text-[10px] text-ink-muted">{t.s}</div>}
              </div>
            ))}
          </div>

          {/* Map-first band */}
          <div className="grid gap-3 xl:grid-cols-12">
            <Panel title="National activity map"
              meta={<span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />operational view</span>}
              className="xl:col-span-7" bodyClass="!p-2">
              <div className="relative h-[368px] w-full overflow-hidden rounded-md border border-line-soft"
                style={{ background: 'radial-gradient(ellipse at 35% 30%, rgba(55,199,212,0.06) 0%, rgb(var(--c-bg)) 65%)' }}>
                <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
                  <defs><pattern id="grd" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.5" /></pattern></defs>
                  <rect width="100%" height="100%" fill="url(#grd)" />
                </svg>
                {regions.map(r => (
                  <div key={r.id} className="absolute rounded-full blur-2xl transition-all duration-1000 ease-sov"
                    style={{ left: `${r.x}%`, top: `${r.y}%`, width: r.r * 2, height: r.r * 2, transform: 'translate(-50%,-50%)', backgroundColor: TONE[toneFor(r.risk)], opacity: 0.08 + (r.risk / 100) * 0.3 }} />
                ))}
                <svg className="absolute inset-0 h-full w-full" aria-hidden>
                  {(coord?.edges ?? []).slice(0, 24).map((e, i) => {
                    const a = nodePos.get(e.fromId), b = nodePos.get(e.toId);
                    if (!a || !b) return null;
                    const tn = e.propagatedRisk >= 67 ? 'alert' : e.propagatedRisk >= 34 ? 'warn' : 'ok';
                    return <line key={i} x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`}
                      stroke={TONE[tn]} strokeWidth={0.5 + (e.propagatedRisk / 100) * 1.6}
                      strokeOpacity={0.12 + (e.propagatedRisk / 100) * 0.45} strokeDasharray="3 7"
                      className="motion-safe:animate-[shimmer_3s_linear_infinite]" />;
                  })}
                </svg>
                {mapNodes.map(m => {
                  const id = identityFor(m.archetype as ArchetypeKey);
                  const tn = toneFor(m.pressure);
                  return (
                    <Link key={m.ministryId} href={`/gov/ministry/${m.ministryId}`}
                      className="focus-ring group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.x}%`, top: `${m.y}%` }}
                      title={`${m.ministry} · pressure ${m.pressure}`}>
                      {m.pressure >= 75 ? <span className="absolute inset-0 -z-10 animate-ping rounded-full" style={{ backgroundColor: TONE.alert, opacity: 0.45 }} /> : null}
                      <span className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold text-white shadow-elev-2 ring-2 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: id.accent, borderColor: TONE[tn], boxShadow: `0 0 14px ${TONE[tn]}55` }}>
                        {id.glyph}
                      </span>
                      <span className="absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[9px] text-ink-soft opacity-0 ring-1 ring-line transition-opacity group-hover:opacity-100">
                        {m.ministry} · {m.pressure}
                      </span>
                    </Link>
                  );
                })}
                {mapNodes.length === 0 ? <div className="absolute inset-0 grid place-items-center text-xs text-ink-muted">Awaiting institutional telemetry…</div> : null}
                <div className="absolute bottom-2 left-2 flex gap-3 rounded-md border border-line bg-surface/80 px-2.5 py-1 text-[10px] text-ink-muted backdrop-blur">
                  {['ok', 'warn', 'alert'].map(t => (<span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE[t] }} />{t === 'ok' ? 'Stable' : t === 'warn' ? 'Strained' : 'Critical'}</span>))}
                </div>
                <div className="absolute right-2 top-2 rounded-md border border-line bg-surface/80 px-2 py-1 text-[10px] text-ink-muted backdrop-blur">All Layers ▾</div>
              </div>
            </Panel>

            <Panel title="Ministry status matrix" meta="live health & SLA" className="xl:col-span-3" bodyClass="overflow-y-auto max-h-[392px] !p-0">
              <table className="w-full text-xs">
                <tbody>
                  {mapNodes.map(m => {
                    const id = identityFor(m.archetype as ArchetypeKey);
                    const sla = Math.max(42, 100 - m.pressure + Math.round(seed(`sla:${m.ministryId}`) * 10));
                    return (
                      <tr key={m.ministryId} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                        <td className="px-3 py-2.5">
                          <Link href={`/gov/ministry/${m.ministryId}`} className="focus-ring flex items-center gap-2 no-underline">
                            <span className="grid h-4 w-4 place-items-center rounded-[3px] text-[8px] text-white" style={{ backgroundColor: id.accent }}>{id.glyph}</span>
                            <span className="truncate text-ink">{m.ministry}</span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[m.posture]} 18%, transparent)`, color: TONE[m.posture] }}>
                            {m.posture === 'ok' ? 'Good' : m.posture === 'warn' ? 'Warning' : 'Elevated'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums" style={{ color: sla < 70 ? TONE.alert : 'rgb(var(--c-ink-soft))' }}>{sla}%</td>
                        <td className="px-3 py-2.5 text-right" style={{ color: m.trend === 'rising' ? TONE.alert : m.trend === 'falling' ? TONE.ok : TONE.neutral }}>
                          {m.trend === 'rising' ? '↑' : m.trend === 'falling' ? '↓' : '→'}
                        </td>
                      </tr>
                    );
                  })}
                  {mapNodes.length === 0 ? <tr><td className="px-3 py-8 text-center text-ink-muted">No active institutions.</td></tr> : null}
                </tbody>
              </table>
            </Panel>

            <Panel title="Active incident feed" meta="cross-ministry" className="xl:col-span-2" bodyClass="overflow-y-auto max-h-[392px] !p-0">
              {incidents.length === 0 ? <p className="p-3 text-xs text-ink-muted">No active cross-ministry incidents.</p> : incidents.slice(0, 8).map((c, i) => {
                const id = identityFor(c.archetype);
                const tn = c.severity === 'sev1' || c.severity === 'sev2' ? 'alert' : c.severity === 'sev3' ? 'warn' : 'neutral';
                return (
                  <Link key={i} href={`/gov/ministry/${c.ministryId}`} className="focus-ring block border-b border-line-soft px-3 py-2.5 no-underline transition-colors hover:bg-surface-2/50 last:border-0" style={{ borderLeft: `2px solid ${TONE[tn]}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TONE[tn] }}>{c.severity === 'sev1' ? 'Critical' : c.severity === 'sev2' ? 'Elevated' : c.severity === 'sev3' ? 'Warning' : 'Info'}</span>
                      <span className="text-[10px] text-ink-muted">{id.glyph}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-medium text-ink">{c.label}</div>
                    <div className="truncate text-[10px] text-ink-muted">{c.ministry} · {c.authority}</div>
                  </Link>
                );
              })}
            </Panel>
          </div>

          {/* Strategic visualisation band */}
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="Incident severity distribution" meta="by classification"><Donut segs={donut} /></Panel>
            <Panel title="Operational timeline" meta="live tempo" bodyClass="overflow-y-auto max-h-[196px] !p-0">
              {(coord?.timeline ?? []).slice(0, 9).map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 text-xs last:border-0">
                  <span className="font-mono text-[10px] tabular-nums text-ink-muted">{rel(e.at, now)}</span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[e.tone] ?? TONE.neutral }} />
                  <span className="truncate text-ink-soft">{e.title}</span>
                </div>
              ))}
              {(coord?.timeline ?? []).length === 0 ? <p className="p-3 text-xs text-ink-muted">Awaiting operational events…</p> : null}
            </Panel>
            <Panel title="Regional risk heatmap" meta="exposure by region">
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 32 }).map((_, i) => {
                  const rk = Math.round(seed(`hm:${i}:${epoch}`) * 100);
                  return <div key={i} className="aspect-square rounded-[2px] transition-colors duration-700" style={{ backgroundColor: TONE[toneFor(rk)], opacity: 0.28 + (rk / 100) * 0.6 }} title={`Sector ${i + 1} · ${rk}`} />;
                })}
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-ink-muted">
                {['ok', 'neutral', 'warn', 'alert'].map(t => <span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: TONE[t] }} />{t === 'ok' ? 'Normal' : t === 'neutral' ? 'Watch' : t === 'warn' ? 'Elevated' : 'Critical'}</span>)}
              </div>
            </Panel>
            <Panel title="Treasury flow monitor" meta="24h revenue · expenditure">
              <div className="space-y-2">
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Revenue</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.ok }}>${revenue}B</span></div>
                  <Spark pts={revPts} tone="ok" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Expenditure</span><span className="font-mono text-sm tabular-nums" style={{ color: TONE.warn }}>${expenditure}B</span></div>
                  <Spark pts={expPts} tone="warn" />
                </div>
                {finance ? <Link href={`/gov/ministry/${finance.ministryId}`} className="focus-ring block text-[11px] text-link underline underline-offset-2">Open Treasury command →</Link> : null}
              </div>
            </Panel>
          </div>

          {/* Executive band */}
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="System integration status" meta="cross-ministry fabric">
              <div className="flex items-center gap-4">
                <Ring pct={integ} label="integrated" />
                <ul className="space-y-1 text-xs">
                  {['Health', 'Treasury', 'Transport', 'Security', 'Energy'].map(s => {
                    const node = nodes.find(n => n.ministry.toLowerCase().includes(s.toLowerCase()));
                    const on = !node || node.posture !== 'alert';
                    return <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: on ? TONE.ok : TONE.alert }} /><span className="text-ink-soft">{s} System</span><span className="ml-auto text-[10px]" style={{ color: on ? TONE.ok : TONE.alert }}>{on ? 'Online' : 'Degraded'}</span></li>;
                  })}
                </ul>
              </div>
            </Panel>
            <Panel title="National KPI snapshot" meta="key indicators">
              <ul className="space-y-2 text-xs">
                {kpis.map(k => (
                  <li key={k.l} className="flex items-center justify-between">
                    <span className="text-ink-soft">{k.l}</span>
                    <span className="flex items-center gap-2"><span className="font-mono tabular-nums text-ink">{k.v}</span><span className="text-[10px]" style={{ color: k.d >= 0 ? TONE.ok : TONE.alert }}>{k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d * 4).toFixed(1)}%</span></span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Top operational alerts" meta="high impact">
              {alerts.length === 0 ? <p className="text-xs text-ink-muted">No high-impact alerts in the current window.</p> : (
                <ul className="space-y-2 text-xs">
                  {alerts.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[a.tone] ?? TONE.warn }} />
                      <span><span className="font-medium text-ink">{a.title}</span><span className="block text-[10px] text-ink-muted">{a.detail}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Cabinet calendar" meta="upcoming">
              <ul className="space-y-2 text-xs">
                {cal.map(c => <li key={c.t} className="flex items-center justify-between"><span className="text-ink-soft">{c.t}</span><span className="font-mono text-[10px] tabular-nums text-ink-muted">in {c.m < 60 ? `${c.m}m` : `${Math.floor(c.m / 60)}h ${c.m % 60}m`}</span></li>)}
              </ul>
              <Link href="/gov" className="focus-ring mt-3 inline-block text-[11px] text-link underline underline-offset-2">Open Cabinet →</Link>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
