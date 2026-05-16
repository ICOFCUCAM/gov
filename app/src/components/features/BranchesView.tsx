'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import { constitutionFor } from '@/lib/gov/constitution';
import { legislativePipeline, judicialDocket, separationIntegrity, branchReadiness } from '@/lib/gov/branches';
import type { StateForm } from '@/lib/api/types';

export function BranchesView() {
  const [now, setNow] = React.useState(() => Date.now());
  const [form, setForm] = React.useState<StateForm>('republic');
  React.useEffect(() => {
    api.sovereign.get().then(r => r.sovereign?.stateForm && setForm(r.sovereign.stateForm)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const m = constitutionFor(form);
  const bills = legislativePipeline(ts);
  const docket = judicialDocket(ts);
  const sep = separationIntegrity(ts);

  const tele = [
    { l: 'Constitutional form', v: m.label, t: 'ok', k: 'cf' },
    { l: 'Branches', v: String(m.branches.length), t: 'ok', k: 'br' },
    { l: 'Legislature', v: m.legislature.structure.toUpperCase(), t: 'ok', k: 'lg' },
    { l: 'Bills in progress', v: String(bills.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'bp' },
    { l: 'Open cases', v: String(docket.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'oc' },
    { l: 'Separation', v: sep.intact ? 'INTACT' : 'STRAINED', t: sep.intact ? 'ok' : 'alert', k: 'si' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Constitutional Architecture</h1>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: TONE.link, color: TONE.link, backgroundColor: `color-mix(in srgb, ${TONE.link} 12%, transparent)` }}>{m.label}</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: sep.intact ? TONE.ok : TONE.alert, color: sep.intact ? TONE.ok : TONE.alert, backgroundColor: `color-mix(in srgb, ${sep.intact ? TONE.ok : TONE.alert} 12%, transparent)` }}>
          Separation of powers · {sep.intact ? 'Intact' : 'Strained'}
        </span>
      </div>

      <p className="text-[11px] text-ink-muted">
        Government topology is derived from the configured constitutional form — not hardcoded. {m.selection}.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(t => (
          <div key={t.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{t.l}</div>
            <div className="truncate font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[t.t] }}>{t.v}</div>
            <div className="-mb-1 h-4 overflow-hidden opacity-70"><Spark pts={waveSeries(`cv:${t.k}`, ts, 14, 40, 92)} tone={t.t} /></div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {m.branches.map(b => {
          const r = branchReadiness(b.key, ts);
          return (
            <Panel key={b.key} title={b.name} meta={`readiness ${r.total}% · ${r.posture}`} className="min-h-[200px]" bodyClass="!p-1.5">
              <p className="mb-1.5 text-[10px] text-ink-muted">{b.mandate}</p>
              <div className="space-y-1">
                {b.bodies.map(body => (
                  <div key={body.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                    <span className="block truncate text-[11px] text-ink">{body.name}</span>
                    <span className="block truncate text-[9px] text-ink-muted">{body.role}</span>
                  </div>
                ))}
              </div>
              <Link href={`/gov/branch/${b.key}`} className="focus-ring mt-1.5 inline-block text-[10px] text-link underline underline-offset-2">Enter {b.name} →</Link>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <Panel title="Authority chain" meta={m.selection} bodyClass="!p-0">
          {m.authorityChain.map(a => (
            <div key={a.rank} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0">
              <span className="grid h-5 w-5 place-items-center rounded-[3px] bg-surface-2 text-[10px] font-bold text-ink-soft">{a.rank}</span>
              <span className="text-[12px] text-ink">{a.office}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Separation-of-powers invariant watch" meta="constitutional safeguards" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {sep.checks.map(c => (
              <div key={c.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0"><span className="block truncate text-[11px] text-ink-soft">{c.l}</span><span className="block truncate text-[9px] text-ink-muted">{c.detail}</span></span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${c.ok ? TONE.ok : TONE.alert} 18%, transparent)`, color: c.ok ? TONE.ok : TONE.alert }}>{c.ok ? 'Held' : 'Breach'}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="text-[10px] text-ink-muted">
        {m.emergencyDoctrine}. The constitutional structure is read-only and advisory; only the constituted branches exercise authority through constitutional process. The same CivicOS core resolves any sovereign governance model from configuration.
      </p>
    </div>
  );
}
