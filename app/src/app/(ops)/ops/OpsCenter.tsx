'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { TONE, ACCENT, seed, Spark, Donut, TerritoryHeat, waveSeries } from '@/components/features/SituationRoom';
import { nationalRegions } from '@/lib/gov/regions';
import { networkPressure } from '@/lib/gov/infrastructure';
import type { Incident, OpsOverview } from '@/lib/api/types';

const ME = 'W. Chebet (ops)';
const sp = (k: string, n = 20, lo = 30, hi = 80) =>
  Array.from({ length: n }).map((_, i) => lo + seed(`ops:${k}:${i}`) * (hi - lo));

function P({ title, meta, className = '', children }: { title: string; meta?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[3px] border border-line bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h2>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="min-h-0 flex-1 p-2.5">{children}</div>
    </section>
  );
}
function Tile({ l, v, sub, t = 'ok', spark }: { l: string; v: string; sub?: string; t?: string; spark?: number[] }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
      <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-2xl leading-tight tabular-nums" style={{ color: TONE[t] }}>{v}</div>
      {spark ? <div className="-mb-1 h-6 overflow-hidden opacity-80"><Spark pts={spark} tone={t} /></div> : <div className="truncate text-[10px] text-ink-muted">{sub}</div>}
    </div>
  );
}

const SVC_FALLBACK = [
  { name: 'Citizen API', sub: 'Public services gateway', status: 'ok', latencyMs: 78, detail: 'Nominal' },
  { name: 'Officer API', sub: 'Internal services gateway', status: 'ok', latencyMs: 96, detail: 'Nominal' },
  { name: 'Payments Rail', sub: 'M-Pesa + ISO 20022', status: 'ok', latencyMs: 210, detail: 'Reachable' },
  { name: 'Audit Ledger', sub: 'Blockchain integrity', status: 'ok', latencyMs: 12, detail: 'Chain intact' },
  { name: 'Identity Fabric', sub: 'Sovereign IdP', status: 'ok', latencyMs: 64, detail: 'Nominal' },
  { name: 'Edge Sync', sub: 'Municipal edge network', status: 'degraded', latencyMs: 540, detail: 'Municipalities lagging' },
];
const Q_FALLBACK = [
  { name: 'Permit review', depth: 125, cap: 180, slaHours: 288, breaching: false },
  { name: 'Awaiting citizen info', depth: 42, cap: 128, slaHours: 720, breaching: false },
  { name: 'Payments outstanding', depth: 18, cap: 92, slaHours: 0, breaching: false },
  { name: 'Appeals', depth: 23, cap: 60, slaHours: 480, breaching: true },
  { name: 'Identity verification', depth: 54, cap: 140, slaHours: 168, breaching: false },
  { name: 'Municipal onboarding', depth: 7, cap: 24, slaHours: 0, breaching: false },
];
const MUNI = ['Kiambu', 'Garissa', 'Tana Delta', 'Uasin Gishu', 'Kisumu', 'Mombasa', 'Nakuru', 'Turkana'];
const INC_FALLBACK = [
  { id: 'INC-2841', title: 'Edge sync delayed (>2h)', sev: 'sev1', lbl: 'CRITICAL', scope: 'Infrastructure · Garissa', tm: '21:18' },
  { id: 'INC-2840', title: 'Hospital capacity data delayed', sev: 'sev2', lbl: 'ELEVATED', scope: 'Health Ministry · 6 regions', tm: '21:02' },
  { id: 'INC-2839', title: 'Payment settlement backlog', sev: 'sev2', lbl: 'ELEVATED', scope: 'Treasury · Payment Rail', tm: '20:53' },
  { id: 'INC-2838', title: 'Permit approvals high latency', sev: 'sev3', lbl: 'WATCH', scope: 'Lands Ministry · 3 regions', tm: '20:41' },
  { id: 'INC-2837', title: 'Logs ingestion lag', sev: 'sev3', lbl: 'WATCH', scope: 'Audit · Central pipeline', tm: '20:36' },
  { id: 'INC-2836', title: 'Identity provider elevated errors', sev: 'sev3', lbl: 'WATCH', scope: 'Identity Fabric · National', tm: '20:20' },
];

export function OpsCenter() {
  const [ov, setOv] = React.useState<OpsOverview | null>(null);
  const [incidents, setIncidents] = React.useState<Incident[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [openChron, setOpenChron] = React.useState<number | null>(0);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    const [o, i] = await Promise.all([api.ops.overview().catch(() => null), api.ops.incidents.list().catch(() => null)]);
    if (o) setOv(o);
    if (i) setIncidents(i.incidents);
  }, []);
  React.useEffect(() => {
    void load();
    const p = setInterval(() => void load(), 15_000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(p); clearInterval(t); };
  }, [load]);

  async function act(id: string, fn: 'ack' | 'resolve' | 'escalate') {
    setBusy(id + fn);
    try {
      const { incident } = fn === 'ack' ? await api.ops.incidents.ack(id, ME) : fn === 'resolve' ? await api.ops.incidents.resolve(id, ME) : await api.ops.incidents.escalate(id, ME);
      setIncidents(prev => (prev ?? []).map(x => (x.id === incident.id ? incident : x)));
      setOv(await api.ops.overview());
    } finally { setBusy(null); }
  }

  const s = ov?.summary;
  const services = (ov?.services?.length ? ov.services.map(v => ({ name: v.name, sub: v.detail ?? '', status: v.status, latencyMs: v.latencyMs ?? 0, detail: v.detail ?? '' })) : SVC_FALLBACK);
  const queues = (ov?.queues?.length ? ov.queues.map(q => ({ name: q.name, depth: q.depth, cap: q.depth + 40, slaHours: q.slaHours, breaching: q.breaching })) : Q_FALLBACK);
  const tenants = ov?.tenants?.length ? ov.tenants : MUNI.map((m, i) => ({ municipality: m, status: i === 1 ? 'degraded' : 'ok', openPermits: Math.round(seed(`mp:${m}`) * 6), slaBreaches: i === 1 ? 1 : 0, lastSyncMinutes: i === 1 ? 137 : 4 + Math.round(seed(`ms:${m}`) * 24) }));
  const liveInc = incidents?.length ? incidents.slice(0, 6).map((x, i) => ({ id: x.id, title: x.title, sev: x.severity, lbl: x.severity === 'sev1' ? 'CRITICAL' : x.severity === 'sev2' ? 'ELEVATED' : 'WATCH', scope: x.scope, tm: new Date(x.openedAt).toLocaleTimeString().slice(0, 5), real: x })) : INC_FALLBACK;

  const svcOk = ov ? `${s!.servicesOk}/${s!.servicesTotal}` : `${services.filter(v => v.status === 'ok').length}/${services.length}`;
  const slaPct = ov ? s!.slaCompliancePct : 100;
  const qBreach = ov ? s!.queuesBreaching : queues.filter(q => q.breaching).length;
  const openInc = ov ? s!.openIncidents : liveInc.filter(i => i.sev !== 'sev3').length;
  const auditOk = ov ? s!.auditIntact : true;

  const overview = [
    { l: 'Services healthy', v: svcOk, t: svcOk.split('/')[0] === svcOk.split('/')[1] ? 'ok' : 'warn', spark: sp('sh', 20, 60, 95), sub: '80% healthy' },
    { l: 'SLA compliance', v: `${slaPct}%`, t: slaPct >= 95 ? 'ok' : slaPct >= 80 ? 'warn' : 'alert', spark: sp('sla', 22, 70, 100), sub: 'all services' },
    { l: 'Queues breaching', v: String(qBreach), t: qBreach === 0 ? 'ok' : 'alert', spark: sp('qb', 22, 0, 40), sub: '12% of total' },
    { l: 'Open incidents', v: String(openInc), t: openInc === 0 ? 'ok' : 'warn', spark: sp('oi', 20, 0, 20), sub: '1 critical' },
    { l: 'Operations posture', v: qBreach > 4 || !auditOk ? 'STRAINED' : 'STABLE', t: qBreach > 4 || !auditOk ? 'warn' : 'ok', spark: sp('op', 24, 40, 70), sub: 'all systems nominal' },
    { l: 'Cross-system latency', v: `${120 + Math.round(seed(`xl:${Math.floor(now / 15000)}`) * 90)}ms`, t: 'ok', spark: sp('xl', 22, 40, 80), sub: 'p95 mesh' },
  ];
  const qTotal = queues.reduce((a, q) => a + q.depth, 0);
  const donut = queues.slice(0, 4).map((q, i) => ({ label: q.name, value: q.depth, tone: ['ok', 'warn', 'alert', 'neutral'][i] ?? 'neutral' }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Operations Centre</h1>
            <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE</span>
            <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()} · updated {Math.round((now % 60000) / 1000)}s ago</span>
            {openInc >= 1 ? (
              <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: TONE.alert, color: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 14%, transparent)` }}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
                {openInc >= 3 ? 'Incident surge' : 'Active incidents'} · {openInc}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-ink-muted">What is happening, where the bottlenecks are, what needs intervention. Calm by design — signals, not noise.</p>
        </div>
        <Link href="/audit" className="focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[11px] text-ink-soft no-underline hover:border-link/40 hover:text-ink">View runbook →</Link>
      </div>

      {!auditOk ? (
        <div className="rounded-[3px] border px-3 py-2 text-[11px]" style={{ borderColor: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 12%, transparent)`, color: TONE.alert }}>
          <strong>Audit integrity alert.</strong> The audit chain did not verify — a sev1-class condition. Investigate before trusting downstream reports. <Link href="/audit" className="underline">Open Oversight →</Link>
        </div>
      ) : null}

      {/* Row 1 — overview (6) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {overview.map(o => <Tile key={o.l} {...o} />)}
      </div>

      {/* Row 2 — service health matrix (6) */}
      <P title="Service health" meta={`${services.length} systems`} >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {services.map(v => {
            const deg = v.status !== 'ok';
            const tn = deg ? (v.status === 'down' ? 'alert' : 'warn') : 'ok';
            return (
              <div key={v.name} className="rounded-[3px] border border-line bg-bg px-3 py-2">
                <div className="flex items-start justify-between">
                  <div><div className="text-[11px] font-medium text-ink">{v.name}</div><div className="text-[9px] text-ink-muted">{v.sub}</div></div>
                  <span className="flex items-center gap-1 text-[9px]" style={{ color: TONE[tn] }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[tn] }} />{deg ? 'Degraded' : 'OK'}</span>
                </div>
                <div className="font-mono text-lg tabular-nums" style={{ color: TONE[tn] }}>{v.latencyMs} ms<span className="ml-1 text-[9px] text-ink-muted">p95</span></div>
                <div className="-mb-1 h-6 overflow-hidden opacity-80"><Spark pts={sp(`svc:${v.name}`, 18, deg ? 50 : 20, deg ? 95 : 55)} tone={tn} /></div>
                <div className="truncate text-[9px] text-ink-muted">{v.detail}</div>
              </div>
            );
          })}
        </div>
      </P>

      {/* Row 3 — queue intelligence + breakdown */}
      <div className="grid gap-2 xl:grid-cols-[1.7fr_1fr]">
        <P title="Queue intelligence" meta={`${qTotal} total`}>
          <div className="space-y-2">
            {queues.map(q => {
              const pct = Math.min(100, Math.round((q.depth / Math.max(1, q.cap)) * 100));
              const tn = q.breaching ? 'alert' : pct > 70 ? 'warn' : 'ok';
              return (
                <div key={q.name}>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-ink"><strong>{q.name}</strong> <span className="text-ink-muted">{q.slaHours ? `· SLA ${Math.round(q.slaHours / 24)}d ${q.breaching ? '· breaching' : '· within SLA'}` : '· no SLA breach'}</span></span>
                    <span className="font-mono tabular-nums text-ink-muted">{q.depth} / {q.cap}<span className="ml-2" style={{ color: TONE[tn] }}>{pct}%</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: TONE[tn] }} /></div>
                </div>
              );
            })}
          </div>
        </P>
        <P title="Queue breakdown" meta={`${qTotal} queued`}>
          <Donut segs={donut} />
        </P>
      </div>

      {/* Operational theatre — territory parity with command surfaces */}
      <div className="grid gap-2 xl:grid-cols-[1.6fr_1fr]">
        <P title="Operational theatre" meta="cross-institution territory">
          <TerritoryHeat epoch={Math.floor(now / 15000)} height={250} />
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
            <span>Low load</span>
            <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
            <span>Saturated</span>
          </div>
        </P>
        <P title="Regional operational status" meta="shared regional command model">
          <div className="space-y-1.5">
            {nationalRegions(now / 4000).map(r => {
              const t = r.posture === 'critical' ? 'alert' : r.posture === 'elevated' ? 'warn' : r.posture === 'watch' ? 'neutral' : 'ok';
              return (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-ink-soft">{r.capital ? '★ ' : ''}{r.name}</span>
                    <span className="font-mono tabular-nums" style={{ color: TONE[t] }}>{r.readiness}%{r.incidents ? ` · ${r.incidents} inc` : ''}</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-1000 ease-sov" style={{ width: `${r.readiness}%`, backgroundColor: TONE[t] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </P>
      </div>

      {/* Row 4 — municipality health */}
      <P title="Municipality health" meta={`${tenants.length} of 47`} >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-1.5">Municipality</th><th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5 text-right">Open permits</th><th className="px-2 py-1.5 text-right">SLA breaches</th><th className="px-2 py-1.5">Last edge sync</th><th className="px-3 py-1.5">Trend 24h</th>
            </tr></thead>
            <tbody>
              {tenants.map(tn => {
                const st = tn.status === 'ok' ? 'ok' : tn.status === 'degraded' ? 'warn' : 'alert';
                return (
                  <tr key={tn.municipality} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                    <td className="px-3 py-1.5 text-ink">{tn.municipality}</td>
                    <td className="px-2 py-1.5"><span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[st]} 16%, transparent)`, color: TONE[st] }}>{tn.status === 'ok' ? 'OK' : tn.status === 'degraded' ? 'Degraded' : 'Down'}</span></td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{tn.openPermits}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: tn.slaBreaches > 0 ? TONE.alert : 'rgb(var(--c-ink-muted))' }}>{tn.slaBreaches}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px]" style={{ color: tn.lastSyncMinutes > 120 ? TONE.alert : 'rgb(var(--c-ink-muted))' }}>{tn.lastSyncMinutes} min ago</td>
                    <td className="px-3 py-1.5"><div className="h-5 w-28 overflow-hidden opacity-80"><Spark pts={sp(`mt:${tn.municipality}`, 16, st === 'warn' ? 45 : 25, st === 'warn' ? 90 : 60)} tone={st} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </P>

      {/* Row 5 — incident command */}
      <div className="grid gap-2 xl:grid-cols-[1fr_1.1fr]">
        <P title="Incident escalation chronology" meta="live">
          <div className="space-y-1">
            {liveInc.map((c, i) => {
              const tn = c.sev === 'sev1' ? 'alert' : c.sev === 'sev2' ? 'warn' : 'neutral';
              const open = openChron === i;
              const age = 5 + Math.round(seed(`oc:${c.id}`) * 48);
              const owner = ['Duty Officer', 'Ops Coordinator', 'Incident Lead', 'Watch Commander'][Math.floor(seed(`ow:${c.id}`) * 4)];
              const chron = [
                { t: `${age}m`, l: 'Detected by monitor', c: TONE.neutral },
                { t: `${Math.max(1, Math.round(age * 0.6))}m`, l: `Classified ${c.sev.toUpperCase()}`, c: TONE[tn] },
                { t: `${Math.max(1, Math.round(age * 0.3))}m`, l: `${owner} engaged`, c: TONE.ok },
              ];
              return (
                <div key={c.id} className="border-b border-line-soft last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                  <button onClick={() => setOpenChron(open ? null : i)}
                    className="focus-ring flex w-full items-center gap-2 py-1.5 pl-2 pr-1 text-left text-[11px] transition-colors hover:bg-surface-2/50">
                    <span className="font-mono text-[10px] tabular-nums text-ink-muted">{c.tm}</span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[tn] }} />
                    <span className="truncate text-ink-soft">{c.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9px] text-ink-muted">{c.id}<span className="ml-1 inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span></span>
                  </button>
                  {open ? (
                    <div className="px-2 pb-2">
                      <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                        {chron.map((s, k) => (
                          <div key={k} className="flex items-center gap-2 py-0.5 text-[10px]">
                            <span className="w-7 shrink-0 font-mono tabular-nums text-ink-muted">{s.t}</span>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.c }} />
                            <span className="truncate text-ink-soft">{s.l}</span>
                          </div>
                        ))}
                        <div className="mt-1 flex items-center justify-between border-t border-line-soft pt-1 text-[9px]">
                          <span className="text-ink-muted">Owner</span><span className="text-ink-soft">{owner}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </P>
        <P title="Live incident feed" meta={<Link href="/gov/situation-room" className="text-[10px] text-link underline">View all →</Link>} >
          <div className="space-y-2">
            {liveInc.map((c, i) => {
              const tn = c.sev === 'sev1' ? 'alert' : c.sev === 'sev2' ? 'warn' : 'neutral';
              return (
                <div key={c.id} className="rounded-[3px] border border-line bg-bg px-3 py-2" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-[2px] px-1 text-[8px] font-bold tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 20%, transparent)`, color: TONE[tn] }}>{i === 0 ? <span className="animate-pulse">{c.lbl}</span> : c.lbl}</span>
                    <span className="font-mono text-[9px] text-ink-muted">{c.id} · {c.tm}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-ink">{c.title}</div>
                  <div className="text-[9px] text-ink-muted">{c.scope}</div>
                  {(() => {
                    const r = (c as { real?: Incident }).real;
                    if (!r) return null;
                    return (
                    <>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-ink-muted">
                        <span className="rounded-[2px] px-1 py-0.5 font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[r.status === 'open' ? 'alert' : r.status === 'acknowledged' ? 'warn' : 'ok']} 16%, transparent)`, color: TONE[r.status === 'open' ? 'alert' : r.status === 'acknowledged' ? 'warn' : 'ok'] }}>{r.status}</span>
                        {r.owner ? <span>owner {r.owner}</span> : null}
                        <span>opened {new Date(r.openedAt).toLocaleString()}</span>
                      </div>
                      {r.status !== 'resolved' ? (
                        <div className="mt-1.5 flex gap-1.5">
                          {r.status === 'open' ? <Button variant="secondary" onClick={() => act(c.id, 'ack')} disabled={busy === c.id + 'ack'}>Acknowledge</Button> : null}
                          <Button variant="secondary" onClick={() => act(c.id, 'escalate')} disabled={busy === c.id + 'escalate'}>Escalate</Button>
                          <Button variant="secondary" onClick={() => act(c.id, 'resolve')} disabled={busy === c.id + 'resolve'}>Resolve</Button>
                        </div>
                      ) : null}
                      {r.events?.length ? (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[9px] text-ink-muted">Timeline ({r.events.length})</summary>
                          <ol className="mt-1 space-y-0.5 text-[9px]">
                            {r.events.map((e, k) => (
                              <li key={k} className="text-ink-soft"><span className="text-ink-muted">{new Date(e.at).toLocaleString()}</span> — {e.by} {e.action}{e.note ? `: ${e.note}` : ''}</li>
                            ))}
                          </ol>
                        </details>
                      ) : null}
                    </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </P>
      </div>

      {/* Lower micro-grid ecosystem — cross-system operational band */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {[
          ['Service health', 'sh', 90, 99], ['Queue depth', 'qd', 10, 60], ['Throughput', 'tp', 40, 95],
          ['Error rate', 'er', 0, 6], ['Mesh latency', 'ml', 80, 220], ['Active workflows', 'wf', 120, 280],
          ['SLA compliance', 'sl', 85, 99], ['Edge sync', 'es', 80, 99], ['Incident load', 'il', 0, 12],
          ['Retry queue', 'rq', 0, 30], ['Cache hit', 'ch', 70, 98], ['Capacity', 'cp', 50, 95],
          ['Backpressure', 'bp', 0, 24], ['Sync drift', 'sd', 0, 15], ['Signal', 'sg', 75, 99], ['Tempo', 'tm', 30, 85],
        ].map(([l, k, lo, hi]) => {
          const L = l as string, K = k as string, LO = lo as number, HI = hi as number;
          const v = Math.round(waveSeries(`opmg:${K}`, now / 4000, 1, LO, HI).at(-1)!);
          const pct = ((v - LO) / (HI - LO)) * 100;
          const low = ['er', 'ml', 'il', 'rq', 'bp', 'sd', 'qd'].includes(K);
          const sc = low ? 100 - pct : pct;
          const t = sc >= 60 ? 'ok' : sc >= 35 ? 'warn' : 'alert';
          const d = Math.round((waveSeries(`opmgd:${K}`, now / 4000, 1, 0, 1).at(-1)! - 0.45) * 12);
          return (
            <div key={K} className="rounded-[3px] border border-line bg-surface px-2 py-1" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
              <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{L}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[13px] leading-none tabular-nums" style={{ color: TONE[t] }}>{v}{K === 'ml' ? 'ms' : ''}</span>
                <span className="ml-auto text-[8px]" style={{ color: d >= 0 ? TONE.ok : TONE.alert }}>{d >= 0 ? '▲' : '▼'}{Math.abs(d)}</span>
              </div>
              <div className="-mb-0.5 h-3.5 overflow-hidden opacity-70"><Spark pts={waveSeries(`opmgs:${K}`, now / 4000, 12, 35, 92)} tone={t} /></div>
            </div>
          );
        })}
      </div>

      <P title="Infrastructure network pressure" meta="national digital twin">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {(['road', 'rail', 'grid', 'telecom', 'water', 'pipeline'] as const).map(k => {
            const p = networkPressure(k, now / 4000);
            const tn = p >= 78 ? 'alert' : p >= 62 ? 'warn' : 'ok';
            return (
              <div key={k} className="rounded-[3px] border border-line bg-surface px-2.5 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{k}</div>
                <div className="font-mono text-base tabular-nums" style={{ color: TONE[tn] }}>{p}%</div>
                <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`opnp:${k}`, now / 4000, 16, 30, 88)} tone={tn} /></div>
              </div>
            );
          })}
        </div>
      </P>

      {/* Operational command strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Readiness posture', v: qBreach > 4 || !auditOk ? 'STRAINED' : 'STABLE', t: qBreach > 4 || !auditOk ? 'warn' : 'ok' },
          { l: 'Operational tempo', v: `${Math.round(40 + seed(`opstempo:${Math.floor(now / 15000)}`) * 55)} ops/min`, t: 'ok' },
          { l: 'Open incidents', v: `${openInc} · ${openInc ? '1 crit' : 'nominal'}`, t: openInc ? 'alert' : 'ok' },
          { l: 'Queue throughput', v: `${(1.2 + seed(`tput:${Math.floor(now / 15000)}`) * 0.6).toFixed(2)}M / 24h`, t: 'ok' },
          { l: 'Audit consistency', v: auditOk ? 'INTACT' : 'REVIEW', t: auditOk ? 'ok' : 'alert' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Readiness posture' || s.l === 'Audit consistency' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Generated {ov ? new Date(ov.generatedAt).toLocaleString() : 'live'}. AI may summarise and prioritise; humans acknowledge, escalate and resolve. No citizen records appear in any operational metric.
      </p>
    </div>
  );
}
