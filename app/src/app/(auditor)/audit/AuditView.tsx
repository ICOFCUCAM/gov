'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { api } from '@/lib/api/client';
import type { AuditEntry } from '@/lib/api/types';

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

  const intact = verify?.ok ?? true;
  const tone = intact ? 'ok' : 'alert';
  const denied = (events ?? []).filter(e => e.outcome !== 'ok').length;

  const tele = [
    { l: 'Chain integrity', v: verify ? (intact ? 'INTACT' : 'BROKEN') : '—', t: tone },
    { l: 'Events recorded', v: String(events?.length ?? 0), t: 'ok' },
    { l: 'Verified links', v: String(verify?.checked ?? 0), t: 'ok' },
    { l: 'Non-ok outcomes', v: String(denied), t: denied ? 'warn' : 'ok' },
    { l: 'Last verification', v: verify ? `${Math.round((now % 60000) / 1000)}s ago` : 'pending', t: 'ok' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-xl tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
          </div>
        ))}
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

      <p className="text-[10px] text-ink-muted">
        Read-only oversight. Every state-changing action is hash-chained and tamper-evident. No citizen records are exposed — only the ledger of what was done, by whom, to which resource.
      </p>
    </div>
  );
}
