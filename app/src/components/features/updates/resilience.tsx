'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { CHAMPAGNE, hair, ghostBtn } from '@/components/features/onboarding/Chrome';
import type {
  ChamberRelease, FallbackIncident, HealthCheckKey, Probation, SecurityPosture, SubscribedNation, UpdateChamber,
} from '@/lib/api/types';
import { Chip, ErrorLine, Panel, fmtDateTime, useActor } from './ui';
import { NIGHT } from '@/lib/theme/tokens';

// Resilience surfaces of the Update Center: live probation, fallback
// incidents, publisher advisories and the security posture.

export const CHECK_LABEL: Record<HealthCheckKey, string> = {
  readiness: 'Readiness', liveness: 'Liveness', 'error-rate': 'Error rate', latency: 'Latency', 'audit-chain': 'Audit chain',
  'smoke-sign-in': 'Sign-in', 'smoke-wallet': 'Citizen wallet', 'smoke-payments': 'Payments', 'smoke-registry': 'Registry',
};
const CHECK_ORDER: HealthCheckKey[] = ['readiness', 'liveness', 'error-rate', 'latency', 'audit-chain', 'smoke-sign-in', 'smoke-wallet', 'smoke-payments', 'smoke-registry'];

/** How a failed probation of this release would be handled for this nation. */
export function fallbackMode(r: Pick<ChamberRelease, 'compatibleWithPrevious'>, n: Pick<SubscribedNation, 'settings'>): { automatic: boolean; text: string } {
  if (!r.compatibleWithPrevious) return { automatic: false, text: 'Ask first — this release is not backward compatible, so the software is never switched back automatically' };
  if (n.settings.fallback === 'ask') return { automatic: false, text: 'Ask first — your setting' };
  return { automatic: true, text: 'Automatic — the software switches back to the last known good release; data is untouched' };
}

/** Ticks every second so countdowns stay live without refetching. */
function useNow(active: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function probationStatus(p: Probation): { label: string; tone: string } {
  if (p.state === 'awaiting-decision') return { label: 'Failed — awaiting your decision', tone: '#f1938f' };
  if (p.state === 'passed') return { label: 'Passed — now last known good', tone: '#9be7c4' };
  if (p.state === 'failed') return { label: 'Failed — fell back', tone: '#f1938f' };
  if (p.state === 'kept') return { label: 'Kept despite failed checks', tone: '#f1b36b' };
  if (p.state === 'ended') return { label: 'Ended by rollback', tone: '#8a8f99' };
  if (p.degraded) return { label: `Degraded — watching (${p.failStreak} of ${p.thresholds.consecutiveFailures})`, tone: '#f1b36b' };
  return { label: 'Healthy — watching', tone: '#9be7c4' };
}

/** Live probation: countdown, the nine checks from the latest report, and the recent report strip. */
export function ProbationPanel({ p, release, nation, q, compact = false }: { p: Probation; release?: ChamberRelease; nation: SubscribedNation; q?: string; compact?: boolean }) {
  const running = p.state === 'running';
  const now = useNow(running);
  const start = Date.parse(p.startedAt), end = Date.parse(p.endsAt);
  const pct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const left = Math.max(0, Math.ceil((end - now) / 60_000));
  const last = [...p.reports].reverse().find(r => r.source !== 'silence') ?? p.reports[p.reports.length - 1];
  const st = probationStatus(p);
  const mode = release ? fallbackMode(release, nation) : undefined;
  const recent = p.reports.slice(-30);
  return (
    <Panel strong className={compact ? 'p-4' : 'p-5 sm:p-6'}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: CHAMPAGNE }}>Probation</span>
        <span className="font-mono text-[15px] tabular-nums text-[#f4e4bd]">{p.version}</span>
        <Chip tone={st.tone} solid>{st.label}</Chip>
        {running ? <span className="ml-auto font-mono text-[11px] tabular-nums text-night-muted" aria-live="off">{left} min left</span> : null}
      </div>
      <div className="mt-3 h-[5px] overflow-hidden rounded-full" style={{ background: hair(0.12) }} role="progressbar" aria-label="Probation window" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
        <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct * 100}%`, background: st.tone }} />
      </div>
      <p className="mt-2 font-mono text-[10px] text-night-muted">{fmtDateTime(p.startedAt)} → {fmtDateTime(p.endsAt)} · last known good {p.lkgVersion} · restore point {p.restorePointId}</p>

      <ul className={`mt-4 grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`} aria-label="Latest health checks">
        {CHECK_ORDER.map(k => {
          const c = last?.checks.find(x => x.key === k);
          // Over the threshold counts against probation even when the probe itself answered.
          const over = !!c && c.value !== undefined && ((k === 'latency' && c.value > p.thresholds.latencyMs) || (k === 'error-rate' && c.value > p.thresholds.errorRatePct));
          const tone = !c ? '#8a8f99' : !c.ok ? '#f1938f' : over ? '#f1b36b' : '#9be7c4';
          const v = c?.value !== undefined ? (k === 'latency' ? ` ${c.value} ms` : k === 'error-rate' ? ` ${c.value}%` : '') : '';
          const limit = k === 'latency' ? ` > ${p.thresholds.latencyMs}` : k === 'error-rate' ? ` > ${p.thresholds.errorRatePct}%` : '';
          return (
            <li key={k} className="flex min-w-0 items-center gap-2 rounded-[2px] border px-2.5 py-1.5" style={{ borderColor: over || (c && !c.ok) ? `${tone}55` : hair(0.1) }}>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone, boxShadow: `0 0 6px ${tone}` }} />
              <span className="min-w-0 truncate text-[12px] font-light text-white/75">{CHECK_LABEL[k]}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px]" style={{ color: over ? '#f1b36b' : NIGHT.muted }}>{!c ? '—' : !c.ok ? `fail${v}` : over ? `over${v}${limit}` : `ok${v}`}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-night-faint">Reports</span>
        <div className="flex min-w-0 flex-1 gap-[3px]" aria-label={`${p.reports.length} reports`}>
          {recent.map((r, i) => {
            const over = r.checks.some(c => c.value !== undefined && ((c.key === 'latency' && c.value > p.thresholds.latencyMs) || (c.key === 'error-rate' && c.value > p.thresholds.errorRatePct)));
            const kind = r.source === 'silence' ? 'missing' : !r.ok ? 'failed' : over ? 'over threshold' : 'healthy';
            const bg = kind === 'missing' ? '#8a8f99' : kind === 'failed' ? '#f1938f' : kind === 'over threshold' ? '#f1b36b' : '#9be7c455';
            return <span key={i} title={`${fmtDateTime(r.at)} · ${kind}`} className="h-3 min-w-[3px] flex-1 rounded-[1px]" style={{ background: bg }} />;
          })}
          {!recent.length ? <span className="text-[11.5px] font-light text-night-faint">Waiting for the first report…</span> : null}
        </div>
      </div>
      {mode ? <p className="mt-3 text-[12px] font-light text-night-muted">If probation fails: {mode.text}.</p> : null}
      <p className="mt-1 text-[11.5px] font-light text-night-faint">One bad or missing report only marks the release degraded. Fallback needs {p.thresholds.consecutiveFailures} in a row, or two independent critical checks failing together.</p>
      {p.state === 'awaiting-decision' && release && q !== undefined ? (
        <Link href={`/updates/${release.id}${q}`} className="mt-3 inline-block text-[13px] underline decoration-[#f1938f]/50 underline-offset-4" style={{ color: '#f1938f' }}>Decide: fall back or keep →</Link>
      ) : null}
    </Panel>
  );
}

/** Unacknowledged fallback incidents, shown prominently until a named person acknowledges them. */
export function IncidentBanners({ incidents, link, q, onChange }: { incidents: FallbackIncident[]; link?: string; q: string; onChange: () => void }) {
  const [actor, setActor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const open = incidents.filter(i => !i.acknowledgedAt);
  if (!open.length) return null;
  async function ack(id: string) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name to acknowledge.'); return; }
    try { await api.updates.acknowledge(id, actor.trim(), link); onChange(); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not acknowledge'); }
  }
  return (
    <div className="mt-8 grid gap-3">
      {open.map(i => <IncidentCard key={i.id} i={i} q={q} action={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Your name" value={actor} onChange={e => setActor(e.target.value)} placeholder="Name, office"
            className="w-[180px] rounded-full border bg-transparent px-3 py-1.5 text-[12.5px] text-[#f3efe6] placeholder:text-night-faint focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]" style={{ borderColor: hair(0.25) }} />
          <button type="button" className={`${ghostBtn} py-1.5`} onClick={() => ack(i.id)}>Acknowledge</button>
        </div>
      } />)}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

export function IncidentCard({ i, q, action }: { i: FallbackIncident; q?: string; action?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const red = i.state === 'awaiting-decision' || !i.acknowledgedAt;
  const title = i.trigger === 'break-glass' ? `Break-glass: ${i.fromVersion} → ${i.toVersion}`
    : i.state === 'awaiting-decision' ? `${i.fromVersion} failed probation — your decision is needed`
    : i.state === 'kept' ? `${i.fromVersion} failed probation — kept by decision`
    : `${i.trigger === 'automatic' ? 'Automatic fallback' : 'Fallback'}: ${i.fromVersion} → ${i.toVersion}`;
  return (
    <div role={red ? 'alert' : undefined} className="rounded-[3px] border px-5 py-4" style={{ borderColor: red ? '#f1938f77' : hair(0.16), background: red ? 'linear-gradient(90deg, rgba(241,147,143,0.12), rgba(241,147,143,0.02))' : 'transparent' }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Chip tone={red ? '#f1938f' : '#8a8f99'} solid>{i.id}</Chip>
        <p className="min-w-0 flex-1 text-[14.5px] font-light text-[#f3efe6]">{title}</p>
        <span className="font-mono text-[10.5px] text-night-muted">{fmtDateTime(i.openedAt)}</span>
      </div>
      <p className="mt-2 text-[13px] font-light text-white/60">
        {i.failedChecks.length ? <>Failed: {i.failedChecks.map(k => CHECK_LABEL[k]).join(', ')}. </> : null}
        {i.state === 'restored' ? <>Software is back on {i.toVersion}. {i.dataRestored ? `Data restored from the snapshot of ${fmtDateTime(i.dataRestored.snapshotAt)} by ${i.dataRestored.by}.` : 'Data untouched — citizens’ transactions since the install are kept.'}</> : null}
        {i.restorePointId ? <> Restore point {i.restorePointId}.</> : null}
        {i.acknowledgedAt ? <> Acknowledged by {i.acknowledgedBy}.</> : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="font-mono text-[10px] uppercase tracking-[0.18em] text-night-muted hover:text-[#f4e4bd]">{open ? 'Hide timeline' : 'Timeline'}</button>
        {i.releaseId && q !== undefined ? <Link href={`/updates/${i.releaseId}${q}`} className="text-[12.5px] underline decoration-[#d9c398]/35 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Open release →</Link> : null}
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {open ? (
        <ol className="mt-3 space-y-1.5 border-l pl-4" style={{ borderColor: hair(0.25) }}>
          {i.timeline.map((t, k) => <li key={k} className="text-[12.5px] font-light text-white/60"><span className="font-mono text-[10.5px] text-night-faint">{fmtDateTime(t.at)}</span> · {t.text}</li>)}
        </ol>
      ) : null}
    </div>
  );
}

/** Publisher halted or withdrew a release this nation runs. */
export function AdvisoryBanners({ c, q }: { c: UpdateChamber; q: string }) {
  if (!c.advisories.length) return null;
  return (
    <div className="mt-6 grid gap-3">
      {c.advisories.map(a => (
        <div key={a.releaseId} role="alert" className="flex flex-col gap-2 rounded-[3px] border px-5 py-4 sm:flex-row sm:items-center" style={{ borderColor: '#f1b36b77', background: 'rgba(241,179,107,0.07)' }}>
          <Chip tone="#f1b36b" solid>{a.status === 'withdrawn' ? 'Withdrawn' : 'Halted'}</Chip>
          <p className="flex-1 text-[14px] font-light text-[#f3efe6]/85">
            The publisher {a.status} {a.version}, which you run{a.reason ? `: ${a.reason}` : ''}. Falling back to your last known good release ({c.nation.lkg?.version ?? c.nation.history[c.nation.history.length - 1]?.version ?? '—'}) is advised. <span className="text-night-muted">Advice only — nothing changes unless you decide.</span>
          </p>
          <Link href={`/updates/${a.releaseId}${q}`} className="whitespace-nowrap text-[13px] underline underline-offset-4" style={{ color: '#f1b36b' }}>Review →</Link>
        </div>
      ))}
    </div>
  );
}

const GRADE_TONE: Record<SecurityPosture['grade'], string> = { A: '#9be7c4', B: '#b8e0a0', C: '#f4d58d', D: '#f1b36b', E: '#f1938f' };

/** Security posture: grade, coverage, definitions, scans, advisories, and the advisory coverage rule. */
export function PosturePanel({ p, compact = false, href }: { p: SecurityPosture; compact?: boolean; href?: string }) {
  const bar = (covered: number, total: number) => (total ? covered / total : 1);
  const rows: [string, number, string][] = [
    ['Servers (host EDR / managed detection)', bar(p.coverage.servers.covered, p.coverage.servers.total), `${p.coverage.servers.covered} / ${p.coverage.servers.total}`],
    ['Officer endpoints (your own tooling)', bar(p.coverage.endpoints.covered, p.coverage.endpoints.total), `${p.coverage.endpoints.covered} / ${p.coverage.endpoints.total}`],
  ];
  return (
    <Panel strong className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex items-center gap-5 md:flex-col md:items-start">
        <span className="grid h-[86px] w-[86px] place-items-center rounded-full border-2 font-mono text-[2.6rem] font-light" style={{ borderColor: GRADE_TONE[p.grade], color: GRADE_TONE[p.grade], boxShadow: `0 0 30px ${GRADE_TONE[p.grade]}33, inset 0 0 18px ${GRADE_TONE[p.grade]}22` }} aria-label={`Posture grade ${p.grade}`}>{p.grade}</span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color: CHAMPAGNE }}>Security posture</p>
          <p className="mt-1 font-mono text-[13px] tabular-nums text-white/60">{p.score} / 100</p>
          <p className="mt-1"><Chip tone={p.gate.mode === 'none' ? '#8a8f99' : '#a9c7e8'}>{p.gate.mode === 'subscription' ? 'Platform licence' : p.gate.mode === 'byo' ? 'Own tooling (BYO)' : 'Baseline only'}</Chip></p>
        </div>
      </div>
      <div className="min-w-0">
        <div className="grid gap-3">
          {rows.map(([l, v, t]) => (
            <div key={l}>
              <p className="flex items-baseline justify-between gap-3 text-[12.5px] font-light text-white/65"><span className="min-w-0 truncate">{l}</span><span className="font-mono text-[11px] tabular-nums text-night-muted">{t}</span></p>
              <div className="mt-1.5 h-[4px] overflow-hidden rounded-full" style={{ background: hair(0.12) }}><div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: v >= 1 ? '#9be7c4' : v > 0.5 ? '#f4d58d' : '#f1938f' }} /></div>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] font-light sm:grid-cols-4">
          <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-champagne">Definitions</dt><dd className="mt-0.5 text-white/75">{p.definitionsAgeHours < 24 ? `${p.definitionsAgeHours} h old` : `${Math.round(p.definitionsAgeHours / 24)} days old`}</dd></div>
          <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-champagne">Last scan</dt><dd className="mt-0.5 text-white/75">{p.lastScanAt ? fmtDateTime(p.lastScanAt) : 'None'}</dd></div>
          <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-champagne">Advisories</dt><dd className="mt-0.5 text-white/75">{p.advisories.length ? p.advisories.map(a => a.version).join(', ') : 'None open'}</dd></div>
          <div><dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-night-champagne">Updates</dt><dd className="mt-0.5 text-[#9be7c4]">Never blocked</dd></div>
        </dl>
        {!compact && p.findings.length ? (
          <ul className="mt-4 space-y-1">{p.findings.map((f, i) => <li key={i} className="text-[12.5px] font-light text-night-muted">· {f}</li>)}</ul>
        ) : null}
        {href ? <Link href={href} className="mt-4 inline-block text-[12.5px] underline decoration-[#d9c398]/35 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>Open the security store →</Link> : null}
      </div>
    </Panel>
  );
}
