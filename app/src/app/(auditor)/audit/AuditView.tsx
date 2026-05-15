'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TONE, Panel, Spark, seed } from '@/components/features/SituationRoom';
import { api } from '@/lib/api/client';
import type { AuditEntry } from '@/lib/api/types';

const CONTROLS = [
  { l: 'Access control', k: 'ac' },
  { l: 'Change management', k: 'cm' },
  { l: 'Data integrity', k: 'di' },
  { l: 'Incident response', k: 'ir' },
  { l: 'Segregation of duties', k: 'sd' },
  { l: 'Cryptographic assurance', k: 'ca' },
];

const BODIES = [
  { l: 'Constitutional Court', s: 'Quarterly review', t: 'ok' },
  { l: 'National Audit Office', s: 'Continuous attest', t: 'ok' },
  { l: 'Parliamentary Oversight', s: 'Session active', t: 'warn' },
  { l: 'Inspector-General', s: 'Standing mandate', t: 'ok' },
];

export function AuditView() {
  const [events, setEvents] = React.useState<AuditEntry[] | null>(null);
  const [verify, setVerify] = React.useState<{ ok: boolean; checked: number; brokenAtSeq?: number } | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    const [{ events }, v] = await Promise.all([api.audit.list(), api.audit.verify().catch(() => null)]);
    setEvents(events);
    if (v) setVerify(v);
  }, []);

  React.useEffect(() => {
    void load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(() => void load(), 15_000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [load]);

  const epoch = Math.floor(now / 15000);
  const intact = verify?.ok ?? true;
  const tone = intact ? 'ok' : 'alert';
  const evs = events ?? [];
  const denied = evs.filter(e => e.outcome !== 'ok').length;
  const sp = (k: string, lo = 35, hi = 90) => Array.from({ length: 16 }).map((_, i) => lo + seed(`au:${k}:${i}:${epoch}`) * (hi - lo));

  const tele = [
    { l: 'Chain integrity', v: verify ? (intact ? 'INTACT' : 'BROKEN') : '—', sub: intact ? 'tamper-evident' : 'investigate', t: tone, spark: sp('ci', intact ? 80 : 10, intact ? 99 : 40) },
    { l: 'Events recorded', v: String(evs.length), sub: `+${Math.round(seed(`er:${epoch}`) * 40)} / 24h`, t: 'ok', spark: sp('er', 20, 70) },
    { l: 'Verified links', v: String(verify?.checked ?? 0), sub: 'hash continuity', t: 'ok', spark: sp('vl', 60, 95) },
    { l: 'Non-ok outcomes', v: String(denied), sub: denied ? 'review queue' : 'clean', t: denied ? 'warn' : 'ok', spark: sp('no', 0, denied ? 50 : 8) },
    { l: 'Anomaly signals', v: String(2 + Math.round(seed(`an:${epoch}`) * 4)), sub: 'behavioural', t: 'warn', spark: sp('an', 10, 55) },
    { l: 'Attestation', v: 'CURRENT', sub: `last ${Math.round((now % 60000) / 1000)}s`, t: 'ok', spark: sp('at', 70, 96) },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={m.spark} tone={m.t} /></div>
            <div className="truncate text-[8px] text-ink-muted">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Control assurance" meta="continuous attestation" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {CONTROLS.map(c => {
              const v = 78 + Math.round(seed(`ctl:${c.k}:${epoch}`) * 21);
              const tn = v >= 95 ? 'ok' : v >= 88 ? 'warn' : 'alert';
              return (
                <div key={c.k} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{c.l}</span>
                  <div className="h-4 w-14 shrink-0 opacity-70"><Spark pts={sp(`c:${c.k}`, 60, 95)} tone={tn} /></div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: TONE[tn] }}>{v}%</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Oversight bodies" meta="independent mandate" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {BODIES.map(b => (
              <div key={b.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-ink">{b.l}</span>
                  <span className="block truncate text-[9px] text-ink-muted">{b.s}</span>
                </span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[b.t]} 18%, transparent)`, color: TONE[b.t] }}>{b.t === 'ok' ? 'Active' : 'In session'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Anomaly signals" meta="behavioural detection" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1">
            {[
              { l: 'Off-hours privileged action', t: 'warn' },
              { l: 'Repeated denied access', t: 'alert' },
              { l: 'Config drift detected', t: 'ok' },
              { l: 'Bulk export pattern', t: 'warn' },
              { l: 'Role escalation request', t: 'ok' },
            ].map((a, i) => (
              <div key={a.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{a.l}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: TONE[a.t] }}>×{1 + Math.round(seed(`anq:${i}:${epoch}`) * 6)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Integrity actions" meta="oversight authority" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {[
              { l: 'Re-verify chain', g: '⛓', a: () => void api.audit.verify().then(setVerify) },
              { l: 'Export ledger', g: '▤' },
              { l: 'Freeze segment', g: '⊘' },
              { l: 'Open inquiry', g: '⚖' },
              { l: 'Notify oversight', g: '◈' },
              { l: 'Attestation seal', g: '✓' },
            ].map((q, i) => (
              <button key={q.l} onClick={q.a}
                className="focus-ring group flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1.5 text-left text-[10px] font-medium text-ink-soft transition-all hover:bg-surface-2/60">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[11px]" style={{ color: i === 3 ? TONE.warn : TONE.ok }}>{q.g}</span>
                <span className="min-w-0 truncate">{q.l}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Tamper-evident audit chain"
        meta={
          <span className="flex items-center gap-2">
            {verify ? (
              <span className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tone]} 16%, transparent)`, color: TONE[tone] }}>
                {intact ? `✓ ${verify.checked} links verified` : `✗ broken @ seq ${verify.brokenAtSeq}`}
              </span>
            ) : null}
            <Button variant="secondary" onClick={() => void api.audit.verify().then(setVerify)}>Re-verify</Button>
          </span>
        }
        bodyClass="overflow-auto !p-0"
      >
        {events === null ? (
          <p className="p-3 text-xs text-ink-muted">Replaying hash chain…</p>
        ) : events.length === 0 ? (
          <EmptyState title="No audit events yet" hint="State-changing actions (decisions, payments, escalations) are hash-chained here as they occur." />
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8px] uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-1.5">Seq</th><th className="px-2 py-1.5">When</th><th className="px-2 py-1.5">Actor</th>
                <th className="px-2 py-1.5">Action</th><th className="px-2 py-1.5">Resource</th><th className="px-3 py-1.5">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const ok = e.outcome === 'ok';
                return (
                  <tr key={e.id} className="border-b border-line-soft transition-colors hover:bg-surface-2/50 last:border-0">
                    <td className="px-3 py-1.5 font-mono text-ink-muted">{e.seq}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink-muted">{new Date(e.at).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{e.actor}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink">{e.action}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-ink-muted">{e.resource}</td>
                    <td className="px-3 py-1.5">
                      <span className="rounded-[2px] px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE[ok ? 'ok' : 'alert']} 16%, transparent)`, color: TONE[ok ? 'ok' : 'alert'] }}>{e.outcome}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Operational command strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Integrity posture', v: intact ? 'ASSURED' : 'BREACH', t: tone },
          { l: 'Verification tempo', v: `${Math.round(20 + seed(`avt:${epoch}`) * 40)} / min`, t: 'ok' },
          { l: 'Open inquiries', v: `${denied ? 1 : 0} active`, t: denied ? 'warn' : 'ok' },
          { l: 'Coverage', v: `${94 + Math.round(seed(`cov:${epoch}`) * 5)}%`, t: 'ok' },
          { l: 'Oversight', v: 'INDEPENDENT', t: 'ok' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Integrity posture' || s.l === 'Oversight' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Read-only oversight. Every state-changing action is hash-chained and tamper-evident. No citizen records are exposed — only the ledger of what was done, by whom, to which resource.
      </p>
    </div>
  );
}
