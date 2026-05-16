'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import { constitutionFor } from '@/lib/gov/constitution';
import { instantiateInstitution, systemKindLabel, type InstitutionKind } from '@/lib/institution/blueprint';
import { legislativeState, committeeInquiries, BILL_STAGES } from '@/lib/gov/legislative-engine';
import {
  branchFor, branchReadiness, separationIntegrity,
  legislativePipeline, chambersFor, committees, legislativeCalendar,
  judicialDocket, courtHierarchyFor, constitutionalReview, judicialRegistries,
} from '@/lib/gov/branches';
import type { StateForm } from '@/lib/api/types';

export function BranchWorkspace({ branchKey }: { branchKey: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  const [form, setForm] = React.useState<StateForm>('republic');
  React.useEffect(() => {
    api.sovereign.get().then(r => r.sovereign?.stateForm && setForm(r.sovereign.stateForm)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const model = constitutionFor(form);
  const b = branchFor(form, branchKey);
  const engine = b.engine ?? 'none';
  const r = branchReadiness(b.key, ts);
  const sep = separationIntegrity(ts);

  const tabsByEngine: Record<string, string[]> =
    engine === 'legislative' ? ['Chambers', 'Committees', 'Bill pipeline', 'Calendar', 'Oversight inquiries']
      .reduce<{ a: string[] }>((x, l) => ({ a: [...x.a, l] }), { a: [] }).a as unknown as Record<string, string[]>
      : {} as Record<string, string[]>;
  void tabsByEngine;
  const tabs = ['Ecosystem', ...(
    engine === 'legislative' ? ['Live legislature', 'Chambers', 'Committees', 'Bill pipeline', 'Calendar', 'Oversight inquiries']
      : engine === 'judicial' ? ['Court hierarchy', 'Docket', 'Constitutional review', 'Registries', 'Justice analytics']
      : engine === 'audit' ? ['Controls', 'Bodies', 'Authority']
      : engine === 'electoral' ? ['Electoral cycle', 'Bodies', 'Authority']
      : ['Bodies', 'Authority chain', 'Constitutional posture'])];

  const instKind: InstitutionKind =
    b.key === 'legislature' ? 'LEGISLATURE'
      : b.key === 'judiciary' ? 'JUDICIARY'
      : 'GENERIC';
  const [tab, setTab] = React.useState(tabs[0]!);
  React.useEffect(() => { setTab(tabs[0]!); /* reset when engine changes */ }, [engine]); // eslint-disable-line

  const tele = (() => {
    if (engine === 'legislative') {
      const ch = chambersFor(form, ts); const bl = legislativePipeline(ts); const cm = committees(ts);
      return [
        { l: 'Chambers in session', v: `${ch.filter(c => c.sitting).length}/${ch.length}`, t: 'ok', k: 'cs' },
        { l: 'Quorum', v: ch.every(c => c.inQuorum) ? 'HELD' : 'AT RISK', t: ch.every(c => c.inQuorum) ? 'ok' : 'warn', k: 'qm' },
        { l: 'Bills in pipeline', v: String(bl.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'bp' },
        { l: 'Blocked stages', v: String(bl.reduce((a, s) => a + s.blocked, 0)), t: 'warn', k: 'bk' },
        { l: 'Committees sitting', v: String(cm.filter(c => c.status === 'in session').length), t: 'ok', k: 'cm' },
        { l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' },
      ];
    }
    if (engine === 'judicial') {
      const co = courtHierarchyFor(form, ts); const dk = judicialDocket(ts); const cr = constitutionalReview(ts);
      return [
        { l: 'Courts', v: String(co.length), t: 'ok', k: 'ct' },
        { l: 'Open cases', v: String(dk.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'oc' },
        { l: 'Mean clearance', v: `${Math.round(co.reduce((a, c) => a + c.clearance, 0) / co.length)}%`, t: 'ok', k: 'cl' },
        { l: 'Constitutional review', v: String(cr.length), t: 'warn', k: 'cr' },
        { l: 'Backlog', v: String(co.reduce((a, c) => a + c.backlog, 0)), t: 'warn', k: 'bl' },
        { l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' },
      ];
    }
    return [
      { l: 'Bodies', v: String(b.bodies.length), t: 'ok', k: 'bd' },
      { l: 'Constitutional standing', v: `${r.dims[0]!.v}%`, t: 'ok', k: 'st' },
      { l: 'Independence', v: `${r.dims[2]!.v}%`, t: r.dims[2]!.v >= 80 ? 'ok' : 'warn', k: 'in' },
      { l: 'Process integrity', v: `${r.dims[3]!.v}%`, t: 'ok', k: 'pi' },
      { l: 'Accountability', v: `${r.dims[4]!.v}%`, t: 'ok', k: 'ac' },
      { l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' },
    ];
  })();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{b.name}</h1>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>{model.label}</span>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: sep.intact ? TONE.ok : TONE.alert, color: sep.intact ? TONE.ok : TONE.alert, backgroundColor: `color-mix(in srgb, ${sep.intact ? TONE.ok : TONE.alert} 12%, transparent)` }}>
          Separation · {sep.intact ? 'Intact' : 'Strained'} · Readiness {r.total}%
        </span>
      </div>

      <p className="text-[11px] text-ink-muted">{b.mandate} · derived from configured constitutional form ({model.label}).</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`bw:${b.key}:${m.k}`, ts, 16, 35, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist">
        {tabs.map(tl => (
          <button key={tl} role="tab" aria-selected={tab === tl} onClick={() => setTab(tl)}
            className={'focus-ring border-b-2 px-3 py-2 text-sm transition-colors ' + (tab === tl ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
            {tl}
          </button>
        ))}
      </div>

      {tab === 'Ecosystem' && (() => {
        const eco = instantiateInstitution({ id: `branch:${b.key}`, kind: instKind, activated: true }, ts);
        return (
          <div className="space-y-2">
            <Panel title="Institutional ecosystem" meta={`${b.name} · instantiated from constitutional archetype`} bodyClass="!p-1.5">
              <p className="mb-2 text-[11px] text-ink-muted">
                The {b.name} is generated from the same institutional model as ministries —
                {' '}{eco.stats.groups} system groups · {eco.stats.systems} systems ·
                {' '}{eco.stats.operational} operational · {eco.stats.degraded} degraded ·
                {' '}{eco.stats.meanHealth}% mean health. A constituted branch is a running
                institution, not a static page.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {eco.groups.map(g => (
                  <div key={g.key} className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-ink">{g.name}</span>
                      <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE[g.tone] }}>{g.health}%</span>
                    </div>
                    <div className="mb-1 text-[9px] text-ink-muted">{g.purpose}</div>
                    <ul className="space-y-0.5">
                      {g.systems.map(s => {
                        const st = s.status === 'operational' ? TONE.ok : s.status === 'degraded' ? TONE.alert : 'rgb(var(--c-ink-muted))';
                        return (
                          <li key={s.name} className="flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: st }} />
                            <span className="min-w-0 flex-1 truncate text-ink-soft">{s.name}</span>
                            <span className="shrink-0 text-[8px] uppercase tracking-wider text-ink-muted">{systemKindLabel(s.kind)}</span>
                            <span className="w-9 shrink-0 text-right font-mono text-[9px] tabular-nums" style={{ color: st }}>{s.uptime}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        );
      })()}

      {tab === 'Live legislature' && (() => {
        const ls = legislativeState(ts, model.legislature.chambers.map(c => c.name).slice(0, 2));
        const inq = committeeInquiries(ts);
        const stageTone = (b: typeof ls.bills[number]) =>
          b.stage === 'Withdrawn' ? 'rgb(var(--c-ink-muted))' : b.blocked ? TONE.alert : b.stage === 'Published' ? TONE.ok : TONE.warn;
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                { l: 'Bills tracked', v: `${ls.bills.length}`, t: 'ok' as const },
                { l: 'In session', v: `${ls.inSession}`, t: 'ok' as const },
                { l: 'Blocked', v: `${ls.blocked}`, t: ls.blocked ? 'alert' as const : 'ok' as const },
                { l: 'Published YTD', v: `${ls.publishedYtd}`, t: 'ok' as const },
                { l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' as const : 'warn' as const },
                { l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' as const : 'alert' as const },
              ].map(s => (
                <div key={s.l} className="rounded-[3px] border border-line bg-surface px-3 py-2">
                  <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.l}</div>
                  <div className="font-mono text-[14px] tabular-nums" style={{ color: TONE[s.t] }}>{s.v}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <Panel title="Bill lifecycle ledger" meta="live state machine · draft → published" className="xl:col-span-2" bodyClass="!p-0">
                <div className="max-h-[360px] overflow-y-auto">
                  {ls.bills.map(b => (
                    <div key={b.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0">
                      <span className="w-12 shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{b.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] text-ink">{b.title}</span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{b.sponsor} · {b.chamber} · {b.priority} · {b.ageDays}d</span>
                      </span>
                      <span className="w-28 shrink-0">
                        <span className="mb-0.5 block text-right text-[9px] font-semibold" style={{ color: stageTone(b) }}>
                          {b.stage}{b.blocked ? ' · blocked' : ''}
                        </span>
                        <span className="block h-1 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full" style={{ width: `${b.progressPct}%`, backgroundColor: stageTone(b) }} />
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="space-y-2">
                <Panel title="Floor division" meta={ls.division ? 'live vote' : 'no bill on the floor'} bodyClass="!p-2">
                  {ls.division ? (
                    <div>
                      <div className="mb-1 truncate text-[11px] text-ink">{ls.division.billTitle}</div>
                      <div className="flex h-3 overflow-hidden rounded-[3px]">
                        <span style={{ width: `${(ls.division.ayes / ls.division.total) * 100}%`, backgroundColor: TONE.ok }} />
                        <span style={{ width: `${(ls.division.noes / ls.division.total) * 100}%`, backgroundColor: TONE.alert }} />
                        <span style={{ width: `${(ls.division.abstain / ls.division.total) * 100}%`, backgroundColor: 'rgb(var(--c-line))' }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px]">
                        <span style={{ color: TONE.ok }}>Ayes {ls.division.ayes}</span>
                        <span style={{ color: TONE.alert }}>Noes {ls.division.noes}</span>
                        <span className="text-ink-muted">Abst {ls.division.abstain}</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: ls.division.carried ? TONE.ok : TONE.alert }}>
                        {ls.division.carried ? 'Carried' : 'Not carried'} · threshold {ls.division.threshold}
                      </div>
                    </div>
                  ) : <p className="text-[10px] text-ink-muted">No bill at division stage this sitting.</p>}
                </Panel>
                <Panel title="Political composition" meta="seats by bloc" bodyClass="!p-2">
                  <div className="space-y-1">
                    {ls.parties.map(p => (
                      <div key={p.party} className="flex items-center gap-2 text-[10px]">
                        <span className="min-w-0 flex-1 truncate text-ink-soft">{p.party}</span>
                        <span className="text-[8px] uppercase text-ink-muted">{p.bloc}</span>
                        <span className="w-8 shrink-0 text-right font-mono tabular-nums text-ink">{p.seats}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>

            <Panel title="Oversight inquiries" meta="committee investigations · live" bodyClass="!p-0">
              {inq.map((q, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[11px]">
                  <span className="w-44 shrink-0 truncate text-ink">{q.committee}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{q.subject}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider" style={{ color: q.status === 'reported' ? TONE.ok : TONE.warn }}>{q.status}</span>
                  <span className="w-20 shrink-0 text-right font-mono text-[9px] tabular-nums text-ink-muted">{q.witnessesHeard}w · {q.daysActive}d</span>
                </div>
              ))}
            </Panel>
          </div>
        );
      })()}

      {tab === 'Chambers' && (
        <div className="grid gap-2 md:grid-cols-2">
          {chambersFor(form, ts).map(c => (
            <Panel key={c.name} title={c.name} meta={c.role} bodyClass="!p-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[['Seats', String(c.seats), 'ok'], ['Present', String(c.present), c.inQuorum ? 'ok' : 'warn'], ['Quorum', String(c.quorum), 'neutral'], ['Status', c.sitting ? 'In session' : 'Adjourned', c.sitting ? 'ok' : 'neutral']].map(([l, v, tn]) => (
                  <div key={l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                    <div className="text-[8px] uppercase tracking-wider text-ink-muted">{l}</div>
                    <div className="font-mono text-base tabular-nums" style={{ color: TONE[tn as string] }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px]" style={{ color: c.inQuorum ? TONE.ok : TONE.warn }}>{c.inQuorum ? 'Quorum held — chamber may transact business' : 'Below quorum — business suspended'}</div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'Committees' && (
        <Panel title="Committees" meta="hearings · inquiries" bodyClass="!p-0">
          <table className="w-full text-[11px]"><thead><tr className="border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
            <th className="px-3 py-1.5">Committee</th><th className="px-2 py-1.5 text-right">Hearings</th><th className="px-2 py-1.5 text-right">Inquiries</th><th className="px-3 py-1.5">Status</th></tr></thead>
            <tbody>{committees(ts).map(c => (
              <tr key={c.name} className="border-b border-line-soft last:border-0">
                <td className="px-3 py-1.5 text-ink">{c.name}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.hearings}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: c.inquiries ? TONE.warn : TONE.neutral }}>{c.inquiries}</td>
                <td className="px-3 py-1.5"><span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${c.status === 'in session' ? TONE.ok : TONE.neutral} 16%, transparent)`, color: c.status === 'in session' ? TONE.ok : TONE.neutral }}>{c.status}</span></td>
              </tr>))}</tbody></table>
        </Panel>
      )}

      {tab === 'Bill pipeline' && (
        <Panel title="Bill pipeline" meta="draft → committee → debate → amendment → vote → review → assent → publication" bodyClass="!p-2">
          <div className="space-y-1.5">{legislativePipeline(ts).map(s => {
            const tn = s.blocked >= 3 ? 'alert' : s.blocked >= 1 ? 'warn' : 'ok';
            return (<div key={s.stage}>
              <div className="flex items-center justify-between text-[10px]"><span className="text-ink-soft">{s.stage}</span><span className="font-mono tabular-nums text-ink-muted">{s.count} active{s.blocked ? ` · ${s.blocked} blocked` : ''}</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.count * 4)}%`, backgroundColor: TONE[tn] }} /></div>
            </div>);
          })}</div>
        </Panel>
      )}

      {tab === 'Calendar' && (
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

      {tab === 'Oversight inquiries' && (
        <Panel title="Oversight inquiries" meta="executive accountability" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {committees(ts).filter(c => c.inquiries > 0).map(c => (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="truncate text-[11px] text-ink-soft">{c.name} committee</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE.warn }}>{c.inquiries} open</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'Court hierarchy' && (
        <Panel title="Court hierarchy" meta="tier · load · clearance" bodyClass="!p-0">
          <table className="w-full text-[11px]"><thead><tr className="border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
            <th className="px-3 py-1.5">Court</th><th className="px-2 py-1.5">Tier</th><th className="px-2 py-1.5 text-right">Benches</th><th className="px-2 py-1.5 text-right">Load</th><th className="px-2 py-1.5 text-right">Backlog</th><th className="px-3 py-1.5 text-right">Clearance</th></tr></thead>
            <tbody>{courtHierarchyFor(form, ts).map(c => {
              const tn = c.clearance >= 90 ? 'ok' : c.clearance >= 78 ? 'warn' : 'alert';
              return (<tr key={c.name} className="border-b border-line-soft last:border-0">
                <td className="px-3 py-1.5 text-ink">{c.name}</td><td className="px-2 py-1.5 text-ink-muted">{c.tier}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.benches}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-soft">{c.load}</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE.warn }}>{c.backlog}</td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{c.clearance}%</td>
              </tr>);
            })}</tbody></table>
        </Panel>
      )}

      {tab === 'Docket' && (
        <Panel title="National docket" meta="filing → assignment → hearing → ruling → appeal → enforcement" bodyClass="!p-2">
          <div className="space-y-1.5">{judicialDocket(ts).map(s => {
            const tn = s.ageDays >= 90 ? 'alert' : s.ageDays >= 45 ? 'warn' : 'ok';
            return (<div key={s.stage}>
              <div className="flex items-center justify-between text-[10px]"><span className="text-ink-soft">{s.stage}</span><span className="font-mono tabular-nums text-ink-muted">{s.count} cases · mean {s.ageDays}d</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, s.count * 2)}%`, backgroundColor: TONE[tn] }} /></div>
            </div>);
          })}</div>
        </Panel>
      )}

      {tab === 'Constitutional review' && (
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

      {tab === 'Registries' && (
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

      {tab === 'Justice analytics' && (
        <Panel title="Justice analytics" meta="system performance" bodyClass="!p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {courtHierarchyFor(form, ts).slice(0, 4).map(c => (
              <div key={c.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="truncate text-[8px] uppercase tracking-wider text-ink-muted">{c.name}</div>
                <div className="font-mono text-sm tabular-nums" style={{ color: TONE[c.clearance >= 90 ? 'ok' : 'warn'] }}>{c.clearance}%</div>
                <div className="opacity-70"><Spark pts={waveSeries(`ja:${c.name}`, ts, 12, 60, 96)} tone={c.clearance >= 90 ? 'ok' : 'warn'} /></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {(tab === 'Bodies') && (
        <Panel title={`${b.name} — constituent bodies`} meta={`${b.bodies.length} bodies`} bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {b.bodies.map(body => {
              const v = 70 + Math.round(seed(`bd:${b.key}:${body.name}`) * 29);
              const tn = v >= 90 ? 'ok' : v >= 78 ? 'warn' : 'alert';
              return (
                <div key={body.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] text-ink">{body.name}</span><span className="font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{v}%</span></div>
                  <span className="block truncate text-[9px] text-ink-muted">{body.role}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {(tab === 'Authority' || tab === 'Authority chain') && (
        <Panel title="Constitutional authority chain" meta={model.selection} bodyClass="!p-0">
          {model.authorityChain.map(a => (
            <div key={a.rank} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0">
              <span className="grid h-5 w-5 place-items-center rounded-[3px] bg-surface-2 text-[10px] font-bold text-ink-soft">{a.rank}</span>
              <span className="text-[12px] text-ink">{a.office}</span>
            </div>
          ))}
        </Panel>
      )}

      {(tab === 'Constitutional posture' || tab === 'Controls' || tab === 'Electoral cycle') && (
        <Panel title={tab} meta="constitutional safeguards" bodyClass="!p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {sep.checks.map(c => (
              <div key={c.l} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <span className="min-w-0"><span className="block truncate text-[11px] text-ink-soft">{c.l}</span><span className="block truncate text-[9px] text-ink-muted">{c.detail}</span></span>
                <span className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${c.ok ? TONE.ok : TONE.alert} 18%, transparent)`, color: c.ok ? TONE.ok : TONE.alert }}>{c.ok ? 'Held' : 'Breach'}</span>
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
        {model.emergencyDoctrine}. Read-only and advisory — the constituted branch exercises authority through constitutional process. <Link href="/gov/branches" className="text-link underline underline-offset-2">Constitutional overview →</Link>
      </p>
    </div>
  );
}
