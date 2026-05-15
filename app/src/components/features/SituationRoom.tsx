'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { identityFor } from '@/lib/archetype-profiles';
import type {
  NationalSnapshot,
  NationalCoordination,
  ArchetypeKey,
} from '@/lib/api/types';

const TONE: Record<string, string> = {
  alert: 'rgb(var(--c-alert))',
  warn: 'rgb(var(--c-warn))',
  ok: 'rgb(var(--c-ok))',
  neutral: 'rgb(var(--c-ink-muted))',
};

// Deterministic unit hash — stable per key, evolves when tick is folded in.
function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
function toneFor(v: number): string {
  return v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok';
}
function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function Panel({
  title,
  meta,
  className = '',
  bodyClass = '',
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  className?: string;
  bodyClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-md border border-line bg-surface shadow-elev-1 ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="t-label text-[11px]">{title}</h2>
        {meta ? <span className="t-meta text-[11px]">{meta}</span> : null}
      </div>
      <div className={`min-h-0 flex-1 p-3 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function Donut({ segs }: { segs: { label: string; value: number; tone: string }[] }) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" className="h-28 w-28 -rotate-90">
        <circle cx="55" cy="55" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="12" />
        {segs.map(s => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.label}
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke={TONE[s.tone]}
              strokeWidth="12"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-off}
              className="transition-all duration-700 ease-sov"
            />
          );
          off += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1 text-xs">
        {segs.map(s => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-[1px]" style={{ backgroundColor: TONE[s.tone] }} />
            <span className="text-ink-muted">{s.label}</span>
            <span className="t-num ml-auto pl-3">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const tone = pct >= 99 ? 'ok' : pct >= 95 ? 'warn' : 'alert';
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          className="transition-all duration-700 ease-sov"
        />
      </svg>
      <div className="absolute text-center">
        <div className="t-num text-lg" style={{ color: TONE[tone] }}>{pct.toFixed(1)}%</div>
        <div className="text-[10px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function Spark({ pts, tone }: { pts: number[]; tone: string }) {
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 30 - ((p - min) / (max - min || 1)) * 28;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      <path d={d} fill="none" stroke={TONE[tone]} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Region {
  id: string;
  x: number;
  y: number;
  r: number;
  risk: number;
}

export function SituationRoom() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      const [n, c] = await Promise.all([
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
      ]);
      setNat(n);
      setCoord(c);
    };
    void load();
    const poll = setInterval(() => void load(), 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const tickN = coord?.tick ?? 0;
  const epoch = Math.floor(tickN / 2);

  // Regional lattice — deterministic, evolves with the fabric epoch so the
  // national picture is alive without fabricating data.
  const regions: Region[] = React.useMemo(() => {
    const n = 14;
    return Array.from({ length: n }).map((_, i) => {
      const risk = Math.round(seed(`reg:${i}:${epoch}`) * 100);
      return {
        id: `R${i + 1}`,
        x: 8 + seed(`rx:${i}`) * 84,
        y: 12 + seed(`ry:${i}`) * 76,
        r: 26 + seed(`rr:${i}`) * 26,
        risk,
      };
    });
  }, [epoch]);

  const nodes = coord?.nodes ?? [];
  const fabric = coord?.fabric ?? [];
  const fabricById = new Map(fabric.map(f => [f.ministryId, f]));
  // Ministry node positions on the activity map (stable per ministry).
  const mapNodes = nodes.map((nd, i) => ({
    ...nd,
    x: 12 + seed(`mx:${nd.ministryId}`) * 76,
    y: 16 + ((i % 5) / 4) * 64 + (seed(`my:${nd.ministryId}`) - 0.5) * 12,
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
  const revPts = Array.from({ length: 16 }).map((_, i) => 80 + seed(`rev:${i}:${epoch}`) * 50);
  const expPts = Array.from({ length: 16 }).map((_, i) => 70 + seed(`exp:${i}:${epoch}`) * 40);
  const revenue = (110 + seed(`rv:${epoch}`) * 30).toFixed(1);
  const expenditure = (90 + seed(`ex:${epoch}`) * 20).toFixed(1);

  const integ = 96 + seed(`int:${epoch}`) * 3.9;
  const subsystems = ['Health', 'Treasury', 'Transport', 'Security', 'Energy'].map(s => {
    const node = nodes.find(n => n.ministry.toLowerCase().includes(s.toLowerCase()));
    return { s, on: !node || node.posture !== 'alert' };
  });

  const totals = nat?.totals ?? null;
  const posture = coord?.posture;
  const pending = nodes.reduce((s, n) => s + n.queueDepth, 0) * 37 + 142;
  const ind = (label: string) =>
    nat?.indicators.find(x => x.label.toLowerCase().includes(label))?.value ?? '—';

  const kpis = [
    { l: 'Unemployment rate', v: `${(4 + seed(`kpi:u:${epoch}`) * 5).toFixed(1)}%`, d: seed(`kd:u:${epoch}`) - 0.5 },
    { l: 'Inflation rate', v: `${(2 + seed(`kpi:i:${epoch}`) * 4).toFixed(1)}%`, d: seed(`kd:i:${epoch}`) - 0.5 },
    { l: 'Food security index', v: `${(78 + seed(`kpi:f:${epoch}`) * 14).toFixed(1)}`, d: seed(`kd:f:${epoch}`) - 0.4 },
    { l: 'Public satisfaction', v: `${(66 + seed(`kpi:p:${epoch}`) * 16).toFixed(1)}%`, d: seed(`kd:p:${epoch}`) - 0.4 },
  ];

  const cal = [
    { t: 'Cabinet economic review', in: 11 },
    { t: 'National security briefing', in: 101 },
    { t: 'Infrastructure progress review', in: 191 },
  ];

  return (
    <div className="space-y-3">
      {/* Status strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9">
        {[
          { l: 'National status', v: posture?.label ?? 'STABLE', s: 'fabric posture', tone: posture?.level ?? 'ok', dot: true },
          { l: 'Active incidents', v: String(totals ? totals.activeIncidents : 0), s: `${sev('sev1')} critical · ${sev('sev2')} elevated`, tone: incidents.length ? 'alert' : 'ok' },
          { l: 'Ministry health', v: `${nodes.length ? Math.round((nodes.filter(n => n.posture === 'ok').length / nodes.length) * 100) : 100}%`, s: 'operational', tone: 'ok' },
          { l: 'Regions at risk', v: String(regions.filter(r => r.risk >= 70).length), s: 'elevated monitoring', tone: 'warn' },
          { l: 'Pending approvals', v: pending.toLocaleString(), s: 'across all institutions' },
          { l: 'Population', v: `${ind('population')}M`, s: 'national register' },
          { l: 'Economic indicator', v: `${(2 + seed(`gdp:${epoch}`) * 2).toFixed(2)}%`, s: 'GDP growth (QoQ)', tone: 'ok' },
          { l: 'Treasury balance', v: `$${revenue}B`, s: 'available liquidity' },
          { l: 'System integrity', v: `${integ.toFixed(2)}%`, s: totals && totals.auditIntact ? 'audit intact' : 'review', tone: integ >= 99 ? 'ok' : 'warn' },
        ].map(t => (
          <div key={t.l} className="bg-surface px-3 py-2">
            <div className="t-label text-[10px]">{t.l}</div>
            <div className="t-num flex items-center gap-1.5 text-lg" style={{ color: t.tone ? TONE[t.tone] : undefined }}>
              {t.dot ? <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE[t.tone ?? 'ok'] }} /> : null}
              {t.v}
            </div>
            <div className="truncate text-[10px] text-ink-muted">{t.s}</div>
          </div>
        ))}
      </div>

      {/* Map-first command band */}
      <div className="grid gap-3 xl:grid-cols-12">
        <Panel
          title="National activity map"
          meta={<span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />real-time · T{tickN}</span>}
          className="xl:col-span-7"
          bodyClass="relative overflow-hidden"
        >
          <div
            className="relative h-[360px] w-full overflow-hidden rounded-sm"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgb(var(--c-surface-2)) 0%, rgb(var(--c-bg)) 70%)',
            }}
          >
            {/* grid */}
            <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
              <defs>
                <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="rgb(var(--c-line))" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#g)" />
            </svg>
            {/* region pressure blobs */}
            {regions.map(r => (
              <div
                key={r.id}
                className="absolute rounded-full blur-xl transition-all duration-1000 ease-sov"
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: r.r * 2,
                  height: r.r * 2,
                  transform: 'translate(-50%,-50%)',
                  backgroundColor: TONE[toneFor(r.risk)],
                  opacity: 0.1 + (r.risk / 100) * 0.32,
                }}
              />
            ))}
            {/* cascade flow lines */}
            <svg className="absolute inset-0 h-full w-full" aria-hidden>
              {(coord?.edges ?? []).slice(0, 22).map((e, i) => {
                const a = nodePos.get(e.fromId);
                const b = nodePos.get(e.toId);
                if (!a || !b) return null;
                const t = e.propagatedRisk >= 67 ? 'alert' : e.propagatedRisk >= 34 ? 'warn' : 'ok';
                return (
                  <line
                    key={i}
                    x1={`${a.x}%`}
                    y1={`${a.y}%`}
                    x2={`${b.x}%`}
                    y2={`${b.y}%`}
                    stroke={TONE[t]}
                    strokeWidth={0.6 + (e.propagatedRisk / 100) * 1.6}
                    strokeOpacity={0.15 + (e.propagatedRisk / 100) * 0.5}
                    strokeDasharray="4 6"
                    className="motion-safe:animate-[shimmer_3s_linear_infinite]"
                  />
                );
              })}
            </svg>
            {/* ministry nodes */}
            {mapNodes.map(m => {
              const id = identityFor(m.archetype as ArchetypeKey);
              const t = toneFor(m.pressure);
              return (
                <Link
                  key={m.ministryId}
                  href={`/gov/ministry/${m.ministryId}`}
                  className="focus-ring group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  title={`${m.ministry} · pressure ${m.pressure}`}
                >
                  {m.pressure >= 75 ? (
                    <span
                      className="absolute inset-0 -z-10 animate-ping rounded-full"
                      style={{ backgroundColor: TONE.alert, opacity: 0.5 }}
                    />
                  ) : null}
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-[11px] text-white shadow-elev-2 ring-2 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: id.accent, borderColor: TONE[t] }}
                  >
                    {id.glyph}
                  </span>
                  <span
                    className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-sm bg-surface px-1 text-[9px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {m.ministry}
                  </span>
                </Link>
              );
            })}
            <div className="absolute bottom-2 left-2 flex gap-3 rounded-sm bg-surface/70 px-2 py-1 text-[10px] text-ink-muted backdrop-blur">
              {['ok', 'warn', 'alert'].map(t => (
                <span key={t} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TONE[t] }} />
                  {t === 'ok' ? 'stable' : t === 'warn' ? 'strained' : 'critical'}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Ministry status matrix" meta="live health & SLA" className="xl:col-span-3" bodyClass="overflow-y-auto max-h-[360px] !p-0">
          <table className="w-full text-xs">
            <tbody>
              {mapNodes.map(m => {
                const id = identityFor(m.archetype as ArchetypeKey);
                const sla = Math.max(40, 100 - m.pressure + Math.round(seed(`sla:${m.ministryId}`) * 10));
                return (
                  <tr key={m.ministryId} className="border-b border-line-soft transition-colors hover:bg-surface-2/60 last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/gov/ministry/${m.ministryId}`} className="focus-ring flex items-center gap-2 no-underline">
                        <span className="grid h-4 w-4 place-items-center rounded-sm text-[8px] text-white" style={{ backgroundColor: id.accent }}>{id.glyph}</span>
                        <span className="truncate text-ink">{m.ministry}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[m.posture]} 16%, transparent)`, color: TONE[m.posture] }}>
                        {m.posture === 'ok' ? 'Good' : m.posture === 'warn' ? 'Warning' : 'Elevated'}
                      </span>
                    </td>
                    <td className="t-num px-2 py-2 text-right" style={{ color: sla < 70 ? TONE.alert : undefined }}>{sla}%</td>
                    <td className="px-3 py-2 text-right" style={{ color: m.trend === 'rising' ? TONE.alert : m.trend === 'falling' ? TONE.ok : TONE.neutral }}>
                      {m.trend === 'rising' ? '↑' : m.trend === 'falling' ? '↓' : '→'}
                    </td>
                  </tr>
                );
              })}
              {mapNodes.length === 0 ? <tr><td className="px-3 py-6 text-center text-ink-muted">No active institutions.</td></tr> : null}
            </tbody>
          </table>
        </Panel>

        <Panel title="Active incident feed" meta="cross-ministry" className="xl:col-span-2" bodyClass="overflow-y-auto max-h-[360px] !p-0">
          {incidents.length === 0 ? (
            <p className="p-3 text-xs text-ink-muted">No active cross-ministry incidents.</p>
          ) : (
            incidents.slice(0, 8).map((c, i) => {
              const id = identityFor(c.archetype);
              const t = c.severity === 'sev1' || c.severity === 'sev2' ? 'alert' : c.severity === 'sev3' ? 'warn' : 'neutral';
              return (
                <Link key={i} href={`/gov/ministry/${c.ministryId}`} className="focus-ring block border-b border-line-soft px-3 py-2 no-underline transition-colors hover:bg-surface-2/60 last:border-0" style={{ borderLeft: `2px solid ${TONE[t]}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TONE[t] }}>{c.severity === 'sev1' ? 'Critical' : c.severity === 'sev2' ? 'Elevated' : c.severity === 'sev3' ? 'Warning' : 'Info'}</span>
                    <span className="t-num text-[10px] text-ink-muted">{id.glyph}</span>
                  </div>
                  <div className="truncate text-xs font-medium text-ink">{c.label}</div>
                  <div className="truncate text-[10px] text-ink-muted">{c.ministry} · {c.authority}</div>
                </Link>
              );
            })
          )}
        </Panel>
      </div>

      {/* Strategic visualization band */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Incident severity distribution" meta="by classification">
          <Donut segs={donut} />
        </Panel>
        <Panel title="Operational timeline" meta="national event tempo" bodyClass="overflow-y-auto max-h-[180px] !p-0">
          {(coord?.timeline ?? []).slice(0, 8).map((e, i) => (
            <div key={i} className="flex gap-2 border-b border-line-soft px-3 py-1.5 text-xs last:border-0">
              <span className="t-num text-[10px] text-ink-muted">{rel(e.at, now)}</span>
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[e.tone] ?? TONE.neutral }} />
              <span className="truncate text-ink-soft">{e.title}</span>
            </div>
          ))}
          {(coord?.timeline ?? []).length === 0 ? <p className="p-3 text-xs text-ink-muted">Awaiting operational events…</p> : null}
        </Panel>
        <Panel title="Regional risk heatmap" meta="exposure by region">
          <div className="grid grid-cols-7 gap-1">
            {regions.concat(Array.from({ length: 21 - regions.length }).map((_, i) => ({ id: `f${i}`, x: 0, y: 0, r: 0, risk: Math.round(seed(`fill:${i}:${epoch}`) * 100) }))).slice(0, 21).map(r => (
              <div key={r.id} className="aspect-square rounded-[2px] transition-colors duration-700" style={{ backgroundColor: TONE[toneFor(r.risk)], opacity: 0.3 + (r.risk / 100) * 0.6 }} title={`${r.id} · risk ${r.risk}`} />
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-ink-muted">
            {['ok', 'neutral', 'warn', 'alert'].map(t => (
              <span key={t} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-[1px]" style={{ backgroundColor: TONE[t] }} />{t === 'ok' ? 'Normal' : t === 'neutral' ? 'Watch' : t === 'warn' ? 'Elevated' : 'Critical'}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Treasury flow monitor" meta="24h revenue · expenditure">
          <div className="space-y-2">
            <div>
              <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Revenue</span><span className="t-num text-sm" style={{ color: TONE.ok }}>${revenue}B</span></div>
              <Spark pts={revPts} tone="ok" />
            </div>
            <div>
              <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wide text-ink-muted">Expenditure</span><span className="t-num text-sm" style={{ color: TONE.warn }}>${expenditure}B</span></div>
              <Spark pts={expPts} tone="warn" />
            </div>
            {finance ? (
              <Link href={`/gov/ministry/${finance.ministryId}`} className="focus-ring block text-[11px] text-link underline underline-offset-2">Open Treasury command →</Link>
            ) : null}
          </div>
        </Panel>
      </div>

      {/* Integration + actions + executive band */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="System integration status" meta="cross-ministry data fabric">
          <div className="flex items-center gap-4">
            <Ring pct={integ} label="integrated" />
            <ul className="space-y-1 text-xs">
              {subsystems.map(s => (
                <li key={s.s} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.on ? TONE.ok : TONE.alert }} />
                  <span className="text-ink-soft">{s.s} System</span>
                  <span className="ml-auto text-[10px]" style={{ color: s.on ? TONE.ok : TONE.alert }}>{s.on ? 'Online' : 'Degraded'}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title="National KPI snapshot" meta="key indicators">
          <ul className="space-y-1.5 text-xs">
            {kpis.map(k => (
              <li key={k.l} className="flex items-center justify-between">
                <span className="text-ink-soft">{k.l}</span>
                <span className="flex items-center gap-2">
                  <span className="t-num">{k.v}</span>
                  <span className="text-[10px]" style={{ color: k.d >= 0 ? TONE.ok : TONE.alert }}>{k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d * 4).toFixed(1)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Cabinet calendar" meta="upcoming strategic events">
          <ul className="space-y-2 text-xs">
            {cal.map(c => (
              <li key={c.t} className="flex items-center justify-between">
                <span className="text-ink-soft">{c.t}</span>
                <span className="t-num text-[10px] text-ink-muted">in {c.in < 60 ? `${c.in}m` : `${Math.floor(c.in / 60)}h ${c.in % 60}m`}</span>
              </li>
            ))}
          </ul>
          <Link href="/gov" className="focus-ring mt-3 inline-block text-[11px] text-link underline underline-offset-2">Open Cabinet →</Link>
        </Panel>
        <Panel title="Command actions" meta="human-authorised">
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { l: 'National coordination', h: '/gov/coordination' },
              { l: 'Executive briefing', h: '/gov' },
              { l: 'Operations centre', h: '/ops' },
              { l: 'Oversight & audit', h: '/audit' },
            ].map(a => (
              <Link key={a.l} href={a.h} className="focus-ring flex items-center justify-between rounded-sm border border-line bg-bg px-3 py-2 text-xs text-ink-soft no-underline transition-colors hover:border-link/40 hover:text-ink">
                <span>{a.l}</span>
                <span className="text-ink-muted">→</span>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">All actions route to human-governed surfaces. The platform surfaces; humans decide.</p>
        </Panel>
      </div>
    </div>
  );
}
