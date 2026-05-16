'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import {
  branchFor, branchReadiness, separationIntegrity,
  legislativePipeline, chambers, committees, legislativeCalendar,
  judicialDocket, courtHierarchy, constitutionalReview, judicialRegistries,
  type BranchKey,
} from '@/lib/gov/branches';

type LegTab = 'chambers' | 'committees' | 'bills' | 'calendar' | 'oversight';
type JudTab = 'courts' | 'docket' | 'review' | 'registries' | 'analytics';

const TABS: Record<'legislature' | 'judiciary', { k: string; l: string }[]> = {
  legislature: [
    { k: 'chambers', l: 'Chambers' }, { k: 'committees', l: 'Committees' },
    { k: 'bills', l: 'Bill pipeline' }, { k: 'calendar', l: 'Calendar' },
    { k: 'oversight', l: 'Oversight inquiries' },
  ],
  judiciary: [
    { k: 'courts', l: 'Court hierarchy' }, { k: 'docket', l: 'Docket' },
    { k: 'review', l: 'Constitutional review' }, { k: 'registries', l: 'Registries' },
    { k: 'analytics', l: 'Justice analytics' },
  ],
};

export function BranchWorkspace({ branch }: { branch: 'legislature' | 'judiciary' }) {
  const [now, setNow] = React.useState(() => Date.now());
  const [tab, setTab] = React.useState<string>(TABS[branch][0]!.k);
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const b = branchFor(branch as BranchKey);
  const r = branchReadiness(branch as BranchKey, ts);
  const sep = separationIntegrity(ts);

  const tele = branch === 'legislature'
    ? (() => {
        const ch = chambers(ts); const bl = legislativePipeline(ts); const cm = committees(ts);
        return [
          { l: 'Chambers in session', v: `${ch.filter(c => c.sitting).length}/${ch.length}`, t: 'ok', k: 'cs' },
          { l: 'Quorum held', v: ch.every(c => c.inQuorum) ? 'YES' : 'AT RISK', t: ch.every(c => c.inQuorum) ? 'ok' : 'warn', k: 'qm' },
          { l: 'Bills in pipeline', v: String(bl.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'bp' },
          { l: 'Blocked stages', v: String(bl.reduce((a, s) => a + s.blocked, 0)), t: 'warn', k: 'bk' },
          { l: 'Committees sitting', v: String(cm.filter(c => c.status === 'in session').length), t: 'ok', k: 'cm' },
          { l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' },
        ];
      })()
    : (() => {
        const co = courtHierarchy(ts); const dk = judicialDocket(ts); const cr = constitutionalReview(ts);
        return [
          { l: 'Courts', v: String(co.length), t: 'ok', k: 'ct' },
          { l: 'Open cases', v: String(dk.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'oc' },
          { l: 'Mean clearance', v: `${Math.round(co.reduce((a, c) => a + c.clearance, 0) / co.length)}%`, t: 'ok', k: 'cl' },
          { l: 'Constitutional review', v: String(cr.length), t: 'warn', k: 'cr' },
          { l: 'Backlog', v: String(co.reduce((a, c) => a + c.backlog, 0)), t: 'warn', k: 'bl' },
          { l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' },
        ];
      })();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{b.name}</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>Advisory · Simulated</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: sep.intact ? TONE.ok : TONE.alert, color: sep.intact ? TONE.ok : TONE.alert, backgroundColor: `color-mix(in srgb, ${sep.intact ? TONE.ok : TONE.alert} 12%, transparent)` }}>
          Separation · {sep.intact ? 'Intact' : 'Strained'} · Readiness {r.total}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`bw:${branch}:${m.k}`, ts, 16, 35, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist">
        {TABS[branch].map(t => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className={'focus-ring border-b-2 px-3 py-2 text-sm transition-colors ' + (tab === t.k ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
            {t.l}
          </button>
        ))}
      </div>

      {branch === 'legislature' && tab === 'chambers' && (
        <div className="grid gap-2 md:grid-cols-2">
          {chambers(ts).map(c => (
            <Panel key={c.name} title={c.name} meta={c.role} bodyClass="!p-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ['Seats', String(c.seats), 'ok'],
                  ['Present', String(c.present), c.inQuorum ? 'ok' : 'warn'],
                  ['Quorum', String(c.quorum), 'neutral'],
                  ['Status', c.sitting ? 'In session' : 'Adjourned', c.sitting ? 'ok' : 'neutral'],
                ].map(([l, v, tn]) => (
                  <div key={l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                    <div className="text-[8px] uppercase tracking-wider text-ink-muted">{l}</div>
                    <div className="font-mono text-base tabular-nums" style={{ color: TONE[tn as string] }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px]" style={{ color: c.inQuorum ? TONE.ok : TONE.warn }}>
                {c.inQuorum ? 'Quorum held — chamber may transact business' : 'Below quorum — business suspended'}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {branch === 'legislature' && tab === 'committees' && (
        <Panel title="Standing & select committees" meta="hearings · inquiries" bodyClass="!p-0">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-1.5">Committee</th><th className="px-2 py-1.5 text-right">Hearings</th><th className="px-2 py-1.5 text-right">Inquiries</th><th className="px-3 py-1.5">Status</th>
            </tr></thead>
            <tbody>
              {committees(ts).map(c => (
                <tr key={c.name} className="border-b border-line-soft last:border-0">
                  <td className="px-3 py-1.5 text-ink">{c.name}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.hearings}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: c.inquiries ? TONE.warn : TONE.neutral }}>{c.inquiries}</td>
                  <td className="px-3 py-1.5"><span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${c.status === 'in session' ? TONE.ok : TONE.neutral} 16%, transparent)`, color: c.status === 'in session' ? TONE.ok : TONE.neutral }}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {branch === 'legislature' && tab === 'bills' && (
        <Panel title="Bill pipeline" meta="draft → committee → debate → amendment → vote → review → assent → publication" bodyClass="!p-2">
          <div className="space-y-1.5">
            {legislativePipeline(ts).map(s => {
              const tn = s.blocked >= 3 ? 'alert' : s.blocked >= 1 ? 'warn' : 'ok';
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-ink-soft">{s.stage}</span>
                    <span className="font-mono tabular-nums text-ink-muted">{s.count} active{s.blocked ? ` · ${s.blocked} blocked` : ''}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.count * 4)}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {branch === 'legislature' && tab === 'calendar' && (
        <Panel title="Legislative calendar" meta="order paper" bodyClass="!p-0">
          {legislativeCalendar(ts).map((e, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${e.priority === 'high' ? TONE.alert : TONE.neutral}` }}>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">{e.when}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{e.l}</span>
              <span className="text-[10px] text-ink-muted">{e.chamber}</span>
            </div>
          ))}
        </Panel>
      )}

      {branch === 'legislature' && tab === 'oversight' && (
        <Panel title="Oversight inquiries" meta="executive accountability" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {committees(ts).filter(c => c.inquiries > 0).map(c => (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="truncate text-[11px] text-ink-soft">{c.name} committee</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE.warn }}>{c.inquiries} open</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-ink-muted">Inquiries summon the executive; findings are tabled and audited. The platform surfaces; the chamber decides.</p>
        </Panel>
      )}

      {branch === 'judiciary' && tab === 'courts' && (
        <Panel title="Court hierarchy" meta="tier · load · clearance" bodyClass="!p-0">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-1.5">Court</th><th className="px-2 py-1.5">Tier</th><th className="px-2 py-1.5 text-right">Benches</th><th className="px-2 py-1.5 text-right">Load</th><th className="px-2 py-1.5 text-right">Backlog</th><th className="px-3 py-1.5 text-right">Clearance</th>
            </tr></thead>
            <tbody>
              {courtHierarchy(ts).map(c => {
                const tn = c.clearance >= 90 ? 'ok' : c.clearance >= 78 ? 'warn' : 'alert';
                return (
                  <tr key={c.name} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-1.5 text-ink">{c.name}</td>
                    <td className="px-2 py-1.5 text-ink-muted">{c.tier}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.benches}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.load}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE.warn }}>{c.backlog}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{c.clearance}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {branch === 'judiciary' && tab === 'docket' && (
        <Panel title="National docket" meta="filing → assignment → hearing → ruling → appeal → enforcement" bodyClass="!p-2">
          <div className="space-y-1.5">
            {judicialDocket(ts).map(s => {
              const tn = s.ageDays >= 90 ? 'alert' : s.ageDays >= 45 ? 'warn' : 'ok';
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-ink-soft">{s.stage}</span>
                    <span className="font-mono tabular-nums text-ink-muted">{s.count} cases · mean {s.ageDays}d</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.count * 2)}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {branch === 'judiciary' && tab === 'review' && (
        <Panel title="Constitutional review" meta="apex jurisdiction" bodyClass="!p-0">
          {constitutionalReview(ts).map((c, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0">
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{c.l}</span>
              <span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${TONE.warn} 16%, transparent)`, color: TONE.warn }}>{c.stage}</span>
              <span className="font-mono text-[10px] tabular-nums text-ink-muted">{c.ageDays}d</span>
            </div>
          ))}
        </Panel>
      )}

      {branch === 'judiciary' && tab === 'registries' && (
        <Panel title="Judicial registries" meta="filings · integrity" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {judicialRegistries(ts).map(rg => (
              <div key={rg.name} className="rounded-[3px] border border-line bg-surface px-2.5 py-2">
                <div className="truncate text-[10px] font-medium text-ink">{rg.name}</div>
                <div className="font-mono text-base tabular-nums text-ink">{rg.filings.toLocaleString()}</div>
                <div className="text-[9px]" style={{ color: rg.integrity >= 98 ? TONE.ok : TONE.warn }}>{rg.integrity}% integrity</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {branch === 'judiciary' && tab === 'analytics' && (
        <Panel title="Justice analytics" meta="system performance" bodyClass="!p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {courtHierarchy(ts).slice(0, 4).map(c => (
              <div key={c.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="truncate text-[8px] uppercase tracking-wider text-ink-muted">{c.name}</div>
                <div className="font-mono text-sm tabular-nums" style={{ color: TONE[c.clearance >= 90 ? 'ok' : 'warn'] }}>{c.clearance}%</div>
                <div className="opacity-70"><Spark pts={waveSeries(`ja:${c.name}`, ts, 12, 60, 96)} tone={c.clearance >= 90 ? 'ok' : 'warn'} /></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {r.dims.map(d => (
          <div key={d.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{d.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: d.v >= 85 ? TONE.ok : d.v >= 65 ? TONE.warn : TONE.alert }}>{d.v}%</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        {b.mandate}. Read-only and advisory — the constituted branch exercises authority through constitutional process; the platform surfaces state, it does not legislate, adjudicate or enforce. <Link href="/gov/branches" className="text-link underline underline-offset-2">Constitutional overview →</Link>
      </p>
    </div>
  );
}
