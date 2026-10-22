'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, seed, waveSeries } from '@/components/features/SituationRoom';
import { BranchTile, useBranchRecords, billCounts, recordFigure, indicatorFigure, BILLS_SOURCE, HEARINGS_SOURCE, type BranchFigure } from '@/components/features/BranchRecords';
import { GeneratedStrip, GeneratedText } from '@/components/ui/Generated';
import { constitutionFor } from '@/lib/gov/constitution';
import { instantiateInstitution, systemKindLabel, type InstitutionKind } from '@/lib/institution/blueprint';
import { legislativeState, committeeInquiries, BILL_STAGES } from '@/lib/gov/legislative-engine';
import { judicialState } from '@/lib/gov/judicial-engine';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import {
  branchFor, branchReadiness,
  legislativePipeline, chambersFor, committees, legislativeCalendar,
  judicialDocket, courtHierarchyFor, constitutionalReview, judicialRegistries,
} from '@/lib/gov/branches';
import { useSeparation, separationWord, SeparationCheckList } from '@/components/features/SeparationChecks';
import type { StateForm, NationalConstitution } from '@/lib/api/types';
import { useRenderNow } from '@/lib/clock/render-now';

export function BranchWorkspace({ branchKey }: { branchKey: string }) {
  const [now, setNow] = React.useState(useRenderNow());
  const [form, setForm] = React.useState<StateForm>('republic');
  const [nation, setNation] = React.useState<NationalConstitution | undefined>();
  React.useEffect(() => {
    api.sovereign.get().then(r => { if (r.sovereign?.stateForm) setForm(r.sovereign.stateForm); setNation(r.sovereign?.constitution); }).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const model = constitutionFor(form, nation);
  const b = model.branches.find(x => x.key === branchKey) ?? branchFor(form, branchKey);
  const engine = b.engine ?? 'none';
  const r = branchReadiness(b.key, ts);
  // Separation of powers as observed from the configuration (audit G), not generated.
  const separation = useSeparation();
  const sepTone = !separation.data ? TONE.neutral : separation.data.intact ? TONE.ok : TONE.warn;

  const tabsByEngine: Record<string, string[]> =
    engine === 'legislative' ? ['Chambers', 'Committees', 'Bill pipeline', 'Calendar', 'Oversight inquiries']
      .reduce<{ a: string[] }>((x, l) => ({ a: [...x.a, l] }), { a: [] }).a as unknown as Record<string, string[]>
      : {} as Record<string, string[]>;
  void tabsByEngine;
  const tabs = ['Ecosystem', ...(
    engine === 'legislative' ? ['Live legislature', 'Chambers', 'Committees', 'Bill pipeline', 'Calendar', 'Oversight inquiries']
      : engine === 'judicial' ? ['Live judiciary', 'Court hierarchy', 'Docket', 'Constitutional review', 'Registries', 'Justice analytics']
      : engine === 'audit' ? ['Controls', 'Bodies', 'Authority']
      : engine === 'electoral' ? ['Electoral cycle', 'Bodies', 'Authority']
      : ['Bodies', 'Authority chain', 'Constitutional posture'])];

  const instKind: InstitutionKind =
    b.key === 'legislature' ? 'LEGISLATURE'
      : b.key === 'judiciary' ? 'JUDICIARY'
      : 'GENERIC';
  const firstTab = tabs[0]!;
  const [tab, setTab] = React.useState(firstTab);
  const [selCase, setSelCase] = React.useState<string | null>(null);
  const [selBill, setSelBill] = React.useState<string | null>(null);
  // Reset to the first tab whenever the engine (hence the tab set) changes.
  React.useEffect(() => { setTab(firstTab); }, [firstTab]);

  // Bills from the legislature's record and hearings from the courts' public cause list
  // (components/features/BranchRecords.tsx); everything else here is generated (`sample`).
  const rec = useBranchRecords();
  const bc = rec.bills ? billCounts(rec.bills) : null;
  const gen = (x: Omit<BranchFigure, 'kind'>): BranchFigure => ({ ...x, kind: 'sample' });
  const tele: BranchFigure[] = (() => {
    if (engine === 'legislative') {
      const ch = chambersFor(form, ts); const bl = legislativePipeline(ts); const cm = committees(ts);
      return [
        gen({ l: 'Chambers in session', v: `${ch.filter(c => c.sitting).length}/${ch.length}`, t: 'ok', k: 'cs' }),
        gen({ l: 'Quorum', v: ch.every(c => c.inQuorum) ? 'HELD' : 'AT RISK', t: ch.every(c => c.inQuorum) ? 'ok' : 'warn', k: 'qm' }),
        recordFigure('Bills in pipeline', 'bp', bc ? bc.inProgress : null, BILLS_SOURCE),
        gen({ l: 'Blocked stages', v: String(bl.reduce((a, s) => a + s.blocked, 0)), t: 'warn', k: 'bk' }),
        gen({ l: 'Committees sitting', v: String(cm.filter(c => c.status === 'in session').length), t: 'ok', k: 'cm' }),
        gen({ l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' }),
      ];
    }
    if (engine === 'judicial') {
      const co = courtHierarchyFor(form, ts); const dk = judicialDocket(ts); const cr = constitutionalReview(ts);
      return [
        gen({ l: 'Courts', v: String(co.length), t: 'ok', k: 'ct' }),
        // The courts' own indicator of pending cases (plan step I3), computed from their records, not the docket model.
        indicatorFigure('Open cases', 'oc', rec.courtsBacklog),
        gen({ l: 'Docket model', v: String(dk.reduce((a, s) => a + s.count, 0)), t: 'ok', k: 'dm' }),
        recordFigure('Hearings listed · 7 days', 'hl', rec.hearings, HEARINGS_SOURCE),
        gen({ l: 'Mean clearance', v: `${Math.round(co.reduce((a, c) => a + c.clearance, 0) / co.length)}%`, t: 'ok', k: 'cl' }),
        gen({ l: 'Constitutional review', v: String(cr.length), t: 'warn', k: 'cr' }),
        gen({ l: 'Backlog', v: String(co.reduce((a, c) => a + c.backlog, 0)), t: 'warn', k: 'bl' }),
        gen({ l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' }),
      ];
    }
    return [
      { l: 'Bodies', v: String(b.bodies.length), t: 'ok', k: 'bd', kind: 'reported', src: 'National settings (constitutional form)' },
      gen({ l: 'Constitutional standing', v: `${r.dims[0]!.v}%`, t: 'ok', k: 'st' }),
      gen({ l: 'Independence', v: `${r.dims[2]!.v}%`, t: r.dims[2]!.v >= 80 ? 'ok' : 'warn', k: 'in' }),
      gen({ l: 'Process integrity', v: `${r.dims[3]!.v}%`, t: 'ok', k: 'pi' }),
      gen({ l: 'Accountability', v: `${r.dims[4]!.v}%`, t: 'ok', k: 'ac' }),
      gen({ l: 'Branch posture', v: r.posture, t: r.tone, k: 'po' }),
    ];
  })();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{b.name}</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>{model.label}</span>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: sepTone, color: sepTone, backgroundColor: `color-mix(in srgb, ${sepTone} 12%, transparent)` }}>
          Separation · {separationWord(separation.data)} · <GeneratedText>Readiness {r.total}%</GeneratedText>
        </span>
      </div>

      <p className="text-[11px] text-ink-muted">{b.mandate} · derived from configured constitutional form ({model.label}).</p>

      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${tele.length > 6 ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
        {tele.map(m => <BranchTile key={m.l} m={m} sparkKey={`bw:${b.key}:${m.k}`} ts={ts} />)}
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
            <Panel signal="sample" title="Institutional ecosystem" meta={`${b.name} · instantiated from constitutional archetype`} bodyClass="!p-1.5">
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
              {/* Bills tracked and published from the legislature's record; the sitting figures are generated. */}
              {([
                recordFigure('Bills tracked', 'bt', bc ? bc.total : null, BILLS_SOURCE),
                gen({ l: 'In session', v: `${ls.inSession}`, t: 'ok', k: 'is' }),
                gen({ l: 'Blocked', v: `${ls.blocked}`, t: ls.blocked ? 'alert' : 'ok', k: 'bl' }),
                recordFigure('Published this year', 'py', bc ? bc.publishedThisYear : null, BILLS_SOURCE),
                gen({ l: 'Attendance', v: `${ls.attendancePct}%`, t: ls.attendancePct >= 60 ? 'ok' : 'warn', k: 'at' }),
                gen({ l: 'Quorum', v: ls.quorum ? 'HELD' : 'AT RISK', t: ls.quorum ? 'ok' : 'alert', k: 'qm' }),
              ] as BranchFigure[]).map(s => <BranchTile key={s.l} m={s} size="sm" />)}
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <Panel signal="sample" title="Bill lifecycle ledger" meta="live state machine · draft → published" className="xl:col-span-2" bodyClass="!p-0">
                <div className="max-h-[360px] overflow-y-auto">
                  {ls.bills.map(b => {
                    const open = selBill === b.id;
                    return (
                      <div key={b.id} className="border-b border-line-soft last:border-0">
                        <button onClick={() => setSelBill(open ? null : b.id)} className="focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2/50">
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
                        </button>
                        {open ? (
                          <div className="bg-surface-2/40 px-3 py-2">
                            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Bill file · {b.id}</div>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {[
                                ['Sponsor', b.sponsor],
                                ['Chamber', b.chamber],
                                ['Priority', b.priority],
                                ['Stage', b.stage],
                                ['Clauses', `${8 + Math.round(seed(`bcl:${b.id}`) * 60)}`],
                                ['Amendments', `${Math.round(seed(`bam:${b.id}`) * 22)}`],
                                ['Committee', ['Finance', 'Justice', 'Public Accounts', 'Defence', 'Health'][Math.floor(seed(`bcm:${b.id}`) * 5)]!],
                                ['Last division', b.stage === 'Division' || b.stage === 'Assent' || b.stage === 'Published' ? `${180 + Math.round(seed(`bdv:${b.id}`) * 140)} ayes` : 'pending'],
                              ].map(([l, v]) => (
                                <div key={l} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-1">
                                  <div className="truncate text-[7.5px] uppercase tracking-wider text-ink-muted">{l}</div>
                                  <div className="truncate font-mono text-[10px] text-ink-soft">{v}</div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-1 text-[8.5px] text-ink-muted">Drive this bill through the legislative runtime below — drafting → committee → division → assent.</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <div className="space-y-2">
                <Panel signal="sample" title="Floor division" meta={ls.division ? 'live vote' : 'no bill on the floor'} bodyClass="!p-2">
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
                <Panel signal="sample" title="Political composition" meta="seats by bloc" bodyClass="!p-2">
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

            <Panel signal="sample" title="Oversight inquiries" meta="committee investigations · live" bodyClass="!p-0">
              {inq.map((q, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[11px]">
                  <span className="w-44 shrink-0 truncate text-ink">{q.committee}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{q.subject}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider" style={{ color: q.status === 'reported' ? TONE.ok : TONE.warn }}>{q.status}</span>
                  <span className="w-20 shrink-0 text-right font-mono text-[9px] tabular-nums text-ink-muted">{q.witnessesHeard}w · {q.daysActive}d</span>
                </div>
              ))}
            </Panel>
            <RuntimeQueue scope={`leg:${b.key}`} kind="bill" title="Bill runtime — drafting → committee → division → assent" by="Clerk" />
          </div>
        );
      })()}

      {tab === 'Chambers' && (
        <div className="grid gap-2 md:grid-cols-2">
          {chambersFor(form, ts).map(c => (
            <Panel signal="sample" key={c.name} title={c.name} meta={c.role} bodyClass="!p-2">
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
        <Panel signal="sample" title="Committees" meta="hearings · inquiries" bodyClass="!p-0">
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
        <Panel signal="sample" title="Bill pipeline" meta="draft → committee → debate → amendment → vote → review → assent → publication" bodyClass="!p-2">
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
        <Panel signal="sample" title="Legislative calendar" meta="order paper" bodyClass="!p-0">
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
        <Panel signal="sample" title="Oversight inquiries" meta="executive accountability" bodyClass="!p-1.5">
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

      {tab === 'Live judiciary' && (() => {
        const js = judicialState(ts);
        const sigTone = (l: 'info' | 'watch' | 'risk') => l === 'risk' ? TONE.alert : l === 'watch' ? TONE.warn : TONE.ok;
        const stTone = (c: typeof js.cases[number]) => c.stage === 'Closed' ? TONE.ok : c.backlogged ? TONE.alert : TONE.warn;
        return (
          <div className="space-y-2">
            {/* Hearings from the courts' public cause list; the case figures are generated (court files stay with the courts). */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {([
                gen({ l: 'Open cases', v: `${js.openCases}`, t: 'ok', k: 'oc' }),
                gen({ l: 'Appeals', v: `${js.appeals}`, t: 'warn', k: 'ap' }),
                gen({ l: 'Constitutional', v: `${js.constitutionalMatters}`, t: js.constitutionalMatters ? 'warn' : 'ok', k: 'cm' }),
                gen({ l: 'Mean clearance', v: `${js.meanClearance}%`, t: js.meanClearance >= 80 ? 'ok' : js.meanClearance >= 65 ? 'warn' : 'alert', k: 'mc' }),
                gen({ l: 'Total backlog', v: `${js.totalBacklog}`, t: js.totalBacklog > 900 ? 'alert' : js.totalBacklog > 500 ? 'warn' : 'ok', k: 'tb' }),
                gen({ l: 'Tiers', v: `${js.tiers.length}`, t: 'ok', k: 'ti' }),
                recordFigure('Hearings listed · 7 days', 'hl', rec.hearings, HEARINGS_SOURCE),
              ] as BranchFigure[]).map(s => <BranchTile key={s.l} m={s} size="sm" />)}
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <Panel signal="sample" title="Case pipeline" meta="live · filed → closed" className="xl:col-span-2" bodyClass="!p-0">
                <div className="max-h-[340px] overflow-y-auto">
                  {js.cases.map(c => {
                    const open = selCase === c.id;
                    return (
                      <div key={c.id} className="border-b border-line-soft last:border-0">
                        <button onClick={() => setSelCase(open ? null : c.id)} className="focus-ring flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2/50">
                          <span className="w-14 shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{c.id}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] text-ink">{c.matter}</span>
                            <span className="block truncate text-[8.5px] text-ink-muted">{c.type} · {c.court} · {c.ageDays}d</span>
                          </span>
                          <span className="w-28 shrink-0">
                            <span className="mb-0.5 block text-right text-[9px] font-semibold" style={{ color: stTone(c) }}>
                              {c.stage}{c.backlogged ? ' · backlog' : ''}
                            </span>
                            <span className="block h-1 overflow-hidden rounded-full bg-surface-2">
                              <span className="block h-full" style={{ width: `${c.progressPct}%`, backgroundColor: stTone(c) }} />
                            </span>
                          </span>
                        </button>
                        {open ? (
                          <div className="bg-surface-2/40 px-3 py-2">
                            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Case file · {c.id}</div>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                              {[
                                ['Type', c.type],
                                ['Court', c.court],
                                ['Stage', c.stage],
                                ['Age', `${c.ageDays}d`],
                                ['Evidence items', `${3 + Math.round(seed(`jev:${c.id}`) * 24)}`],
                                ['Hearings held', `${Math.round(seed(`jhh:${c.id}`) * 8)}`],
                                ['Next hearing', `T+${1 + Math.round(seed(`jnh:${c.id}`) * 30)}d`],
                                ['Bench', ['Single judge', 'Three-judge', 'Full bench'][Math.floor(seed(`jb:${c.id}`) * 3)]!],
                              ].map(([l, v]) => (
                                <div key={l} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-1">
                                  <div className="truncate text-[7.5px] uppercase tracking-wider text-ink-muted">{l}</div>
                                  <div className="truncate font-mono text-[10px] text-ink-soft">{v}</div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-1 text-[8.5px] text-ink-muted">Drive this case through its lifecycle in the case runtime below — filing → hearing → judgment → appeal.</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <div className="space-y-2">
                <Panel signal="sample" title="Court hierarchy · backlog propagation" meta="inflow → clearance → carried up" bodyClass="!p-2">
                  <div className="space-y-1">
                    {js.tiers.map(tr => (
                      <div key={tr.tier} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-ink-soft">{tr.tier}</span>
                          <span className="font-mono tabular-nums" style={{ color: TONE[tr.tone] }}>{tr.clearancePct}%</span>
                        </div>
                        <div className="flex justify-between text-[8.5px] text-ink-muted">
                          <span>in {tr.inflow} · clr {tr.cleared}</span>
                          <span>backlog {tr.backlog}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel signal="sample" title="Judicial intelligence" meta="signals" bodyClass="!p-2">
                  <div className="space-y-1">
                    {js.signals.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sigTone(s.level) }} />
                        <span className="min-w-0">
                          <span className="block text-ink" style={{ color: sigTone(s.level) }}>{s.label}</span>
                          <span className="block truncate text-[8.5px] text-ink-muted">{s.detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>

            <Panel signal="sample" title="Regional court analytics" meta="load · clearance · backlog" bodyClass="!p-1.5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {js.regional.map(r => {
                  const rt = r.clearancePct >= 80 ? TONE.ok : r.clearancePct >= 65 ? TONE.warn : TONE.alert;
                  return (
                    <div key={r.region} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                      <div className="truncate text-[9px] font-semibold text-ink">{r.region}</div>
                      <div className="font-mono text-[13px] tabular-nums" style={{ color: rt }}>{r.clearancePct}%</div>
                      <div className="text-[8px] text-ink-muted">load {r.load} · bk {r.backlog}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>
            <RuntimeQueue scope={`jud:${b.key}`} kind="judicial" title="Case runtime — filing → hearing → judgment → appeal" by="Registrar" />
          </div>
        );
      })()}

      {tab === 'Court hierarchy' && (
        <Panel signal="sample" title="Court hierarchy" meta="tier · load · clearance" bodyClass="!p-0">
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
        <Panel signal="sample" title="National docket" meta="filing → assignment → hearing → ruling → appeal → enforcement" bodyClass="!p-2">
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
        <Panel signal="sample" title="Constitutional review" meta="apex jurisdiction" bodyClass="!p-0">
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
        <Panel signal="sample" title="Judicial registries" meta="filings · integrity" bodyClass="!p-1.5">
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
        <Panel signal="sample" title="Justice analytics" meta="system performance" bodyClass="!p-2">
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
        <Panel signal="sample" title={`${b.name} — constituent bodies`} meta={`${b.bodies.length} bodies`} bodyClass="!p-1.5">
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
        <Panel signal="reported" title="Constitutional authority chain" meta={model.selection} bodyClass="!p-0">
          {model.authorityChain.map(a => (
            <div key={a.rank} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0">
              <span className="grid h-5 w-5 place-items-center rounded-[3px] bg-surface-2 text-[10px] font-bold text-ink-soft">{a.rank}</span>
              <span className="text-[12px] text-ink">{a.office}</span>
            </div>
          ))}
        </Panel>
      )}

      {(tab === 'Constitutional posture' || tab === 'Controls' || tab === 'Electoral cycle') && (
        <Panel signal="reported" title={tab} meta="observed from the configuration" bodyClass="!p-1.5">
          <SeparationCheckList data={separation.data} failed={separation.failed} />
        </Panel>
      )}

      <GeneratedStrip what="Branch readiness">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {r.dims.map(d => (
          <div key={d.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{d.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: d.v >= 85 ? TONE.ok : d.v >= 65 ? TONE.warn : TONE.alert }}>{d.v}%</span>
          </div>
        ))}
      </div>
      </GeneratedStrip>

      <p className="text-[10px] text-ink-muted">
        {model.emergencyDoctrine}. Read-only and advisory — the constituted branch exercises authority through constitutional process. <Link href="/gov/branches" className="text-link underline underline-offset-2">Constitutional overview →</Link>
      </p>
    </div>
  );
}
