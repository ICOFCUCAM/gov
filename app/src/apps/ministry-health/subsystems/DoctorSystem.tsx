'use client';

// Domain 3 — Doctor Systems · Clinical Workstation.
// Patient-centric clinical command: queue spine + the selected patient's
// deep live chart (timeline, diagnoses, vitals trend, care plan,
// medications, labs, pending orders), an AI clinical assistant, active
// alerts and a clinical action bar. Distinct clinician-blue rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { clinicianWorkstation } from '@/lib/gov/health-operations';
import { CommandHeader, CommandPanel, RingGauge, TrendChart, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import { InstitutionChainStrip, DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { facilities, recordLineage, chainIntegrity } from '@/lib/gov/institution-chain';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);
const ACC = ACCENT.doctor!;
const TABS = ['Overview', 'History', 'Examination', 'Diagnosis', 'Treatment plan', 'Results', 'Documents', 'Billing'];
const ACTIONS = ['New consultation', 'Quick note', 'Order lab', 'Order imaging', 'Prescription', 'Referral', 'Discharge plan', 'Print summary', 'More actions'];

export function DoctorSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const [sel, setSel] = React.useState<string | undefined>(undefined);
  const [tab, setTab] = React.useState('Overview');
  const [act, setAct] = React.useState<string | null>(null);
  const [actNote, setActNote] = React.useState('');
  const [actLog, setActLog] = React.useState<{ a: string; at: string }[]>([]);
  const clock = new Date(now).toLocaleTimeString('en-GB', { hour12: false });
  const w = clinicianWorkstation(id, ts, sel);
  const p = w.patient;
  // The doctor serves the state THROUGH a hospital: enrolled at a facility,
  // every clinical record held there first, then rolled to the Ministry of
  // Health and synchronised to the national system.
  const epoch = Math.max(0, Math.floor(ts));
  const hList = facilities('HEALTH', epoch);
  const myHospital = hList[Math.abs([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % hList.length] ?? hList[0]!;
  const lineage = recordLineage(`MRN-${p.mrn}`, p.attending, myHospital, 'HEALTH', epoch);
  const hIntegrity = chainIntegrity('HEALTH', epoch);
  const dispatchScope = `health:${myHospital.id}`;
  const rb: Tone = p.riskBand === 'High' ? 'alert' : p.riskBand === 'Moderate' ? 'warn' : 'ok';
  const norm = (s: number[]) => { const mn = Math.min(...s), sp = Math.max(...s) - mn || 1; return s.map(v => ((v - mn) / sp) * 100); };

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#070b12' }}>
      <CommandHeader index={3} title="Doctor Workstation" subtitle="Sovereign Healthcare System"
        postureLabel="SHIFT · Morning" postureTone="ok" now={now} role={role} accent={ACC} />

      {/* Patient header card */}
      <div className="flex flex-wrap items-center gap-4 rounded-[4px] border px-3 py-2.5"
        style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: `linear-gradient(100deg,#0a0f18,color-mix(in srgb,${ACC} 7%,#0a0f18))` }}>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-bold"
          style={{ color: ACC, border: `1px solid ${ACC}`, boxShadow: `0 0 14px color-mix(in srgb,${ACC} 40%,transparent)` }}>
          {p.name.split(' ').map(x => x[0]).join('')}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">{p.name}</span>
            {p.vip ? <span className="rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb,${ACC} 22%,transparent)`, color: ACC }}>VIP</span> : null}
            {p.highRisk ? <span className="rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb,${C('alert')} 20%,transparent)`, color: C('alert') }}>High risk</span> : null}
          </div>
          <div className="text-[9px] text-ink-muted">MRN: {p.mrn} · {p.age}Y · {p.sex} · Blood {p.blood}</div>
          <div className="text-[9px]" style={{ color: C('warn') }}>Allergies: {p.allergies}</div>
        </div>
        {[
          ['Location', `${p.ward} · ${p.bed}`], ['Attending', p.attending],
          ['Admitted', `${p.admittedDaysAgo}d ago`], ['Insurance', p.insurance],
        ].map(([l, v]) => (
          <div key={l} className="min-w-0">
            <div className="text-[7.5px] uppercase tracking-[0.16em] text-ink-muted">{l}</div>
            <div className="truncate text-[10px] text-ink-soft">{v}</div>
          </div>
        ))}
        <div className="ml-auto flex flex-col items-center">
          <RingGauge value={p.riskScore} label={`${p.riskBand} risk`} tone={rb} size={84} sub="score" />
        </div>
      </div>

      {/* Bureaucratic chain — doctor → hospital → ministry → national */}
      <InstitutionChainStrip accent={ACC} ministryKey="HEALTH" facility={myHospital}
        actorName={p.attending} lineage={lineage} integrity={hIntegrity} />

      {/* Chart tabs */}
      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        {TABS.map(tn => (
          <button key={tn} onClick={() => setTab(tn)}
            className="focus-ring px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] transition-colors"
            style={{ color: tab === tn ? ACC : 'rgb(var(--c-ink-muted))', borderBottom: `2px solid ${tab === tn ? ACC : 'transparent'}` }}>
            {tn}
          </button>
        ))}
      </div>

      {/* Body grid — spec 3-column composition (≈30 / 35 / 25) */}
      <div className="grid gap-[14px] xl:grid-cols-[1.1fr_1.5fr_1fr]">
        {/* Col 1 — timeline + medications */}
        <div className="space-y-2">
        <CommandPanel title="Patient timeline" meta="today" accent={ACC}>
          <div className="space-y-2">
            {p.timeline.map((e, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 rounded-full" style={{ background: C(e.tone) }} />
                  {i < p.timeline.length - 1 ? <span className="w-px flex-1" style={{ background: 'rgb(var(--c-line))' }} /> : null}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="text-[9px] text-ink-muted">May 16, {e.at}</div>
                  <div className="text-[10px] font-medium text-ink">{e.kind}</div>
                  <div className="text-[9px] text-ink-soft">{e.detail}</div>
                  <div className="text-[8px] text-ink-muted">{e.by}</div>
                </div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Medications" meta={`${p.medications.length}`} accent={ACC}>
          <div className="space-y-0.5">
            {p.medications.map(m => (
              <div key={m.drug} className="flex items-center gap-2 text-[9.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{m.drug}</span>
                <span className="shrink-0 font-mono text-[8px] text-ink-muted">{m.route} · {m.freq}</span>
                <span className="w-10 shrink-0 text-right font-mono text-[8px] tabular-nums text-ink-muted">{m.time}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <DispatchChannel scope={dispatchScope} now={now} accent={ACC}
          selfTier="ACTOR" selfName={`${p.attending} · ${myHospital.id}`} toTier="FACILITY"
          title={`Hospital dispatch · ${myHospital.id}`} />
        </div>

        {/* Col 2 — complaint · diagnoses · notes · labs */}
        <div className="space-y-2">
          <CommandPanel title="Chief complaint" accent={ACC}>
            <p className="text-[10px] italic text-ink-soft">“{p.chiefComplaint}”</p>
          </CommandPanel>
          <CommandPanel title="Diagnoses" accent={ACC}>
            <div className="space-y-1">
              {p.diagnoses.map((d, i) => (
                <div key={d.code} className="flex items-center gap-2 text-[10px]">
                  <span className="w-4 text-center font-mono text-ink-muted">{i + 1}</span>
                  <span className="w-12 shrink-0 font-mono text-ink-muted">{d.code}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{d.name}</span>
                  <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase" style={{ background: `color-mix(in srgb,${d.rank === 'Primary' ? C('alert') : C('info')} 16%,transparent)`, color: d.rank === 'Primary' ? C('alert') : C('info') }}>{d.rank}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Recent notes" accent={ACC}>
            <div className="space-y-1.5">
              {p.notes.map((n, i) => (
                <div key={i} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1">
                  <div className="text-[8px] text-ink-muted">{n.at}</div>
                  <div className="text-[9.5px] text-ink-soft">{n.text}</div>
                  <div className="text-[8px] text-ink-muted">— {n.by}</div>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Recent lab results" meta="View all" accent={ACC}>
            <div className="space-y-0.5">
              {p.labs.map(l => (
                <div key={l.test} className="flex items-center gap-2 text-[9.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{l.test}</span>
                  <span className="shrink-0 font-mono tabular-nums text-ink-muted">{l.value} {l.unit}</span>
                  <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: C(l.tone) }}>{l.flag}</span>
                  <span className="w-10 shrink-0 text-right text-[7.5px] text-ink-muted">{l.day}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          {/* center continues — vitals · care plan · pending orders */}
          <CommandPanel title="Vital signs trend" meta="last 24h" accent={ACC} live>
            <TrendChart height={150}
              series={p.vitals.map(v => ({ name: v.label.split(' ')[0]!, points: norm(v.series), tone: v.tone }))} />
            <div className="mt-1 grid grid-cols-2 gap-1">
              {p.vitals.map(v => (
                <div key={v.label} className="flex items-center justify-between rounded-[2px] border border-line-soft px-1.5 py-0.5">
                  <span className="text-[8px] text-ink-muted">{v.label}</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: C(v.tone) }}>{v.value}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Care plan" meta={`${p.carePlanPct}% complete`} accent={ACC}>
            <div className="space-y-1">
              {p.carePlan.map(c => (
                <div key={c.task} className="flex items-center gap-2 text-[9.5px]">
                  <span className="grid h-3 w-3 place-items-center rounded-[2px] border" style={{ borderColor: c.done ? C('ok') : 'rgb(var(--c-line))', background: c.done ? C('ok') : 'transparent' }}>{c.done ? <span className="text-[6px] text-black">✓</span> : null}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{c.task}</span>
                  <span className="shrink-0 text-[8px] text-ink-muted">{c.done ? 'Completed' : `Due ${c.due}`}</span>
                </div>
              ))}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${p.carePlanPct}%`, background: C('ok') }} /></div>
            </div>
          </CommandPanel>
          <CommandPanel title="Pending orders" meta={`${p.orders.length}`} accent={ACC} live>
            <div className="space-y-0.5">
              {p.orders.map(o => (
                <div key={o.name} className="flex items-center gap-2 text-[9.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{o.name}</span>
                  <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: C(o.tone) }}>{o.priority}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
        </div>

        {/* Col 3 — AI · alerts · queue */}
        <div className="space-y-2">
          <CommandPanel title="AI clinical assistant" meta="beta" accent={ACC} live>
            <div className="text-[9.5px] text-ink-soft">{p.ai.summary}</div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-wider" style={{ color: C(rb) }}>Risk assessment</div>
            <div className="text-[9px]" style={{ color: C(rb) }}>{p.ai.riskAssessment}</div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-wider text-ink-muted">Recommended</div>
            <ul className="space-y-0.5">{p.ai.recommended.map((r, i) => <li key={i} className="flex items-center gap-1 text-[9px] text-ink-soft"><span style={{ color: C('ok') }}>✓</span>{r}</li>)}</ul>
            <button className="focus-ring mt-1.5 w-full rounded-[3px] border py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors" style={{ borderColor: ACC, color: ACC }}>Run full analysis</button>
          </CommandPanel>
          <CommandPanel title="Active alerts" meta={`${p.alerts.length}`} accent={ACC} live>
            <div className="space-y-1">
              {p.alerts.map(a => (
                <div key={a.title} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1" style={{ borderLeft: `3px solid ${C(a.tone)}` }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[9.5px] font-medium text-ink">{a.title}</div>
                    <div className="text-[8px] text-ink-muted">{a.sub}</div>
                  </div>
                  <span className="shrink-0 text-[7.5px] text-ink-muted">{a.ago}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
          <CommandPanel title="Patient queue" meta="my patients" accent={ACC}>
            <div className="space-y-1">
              {w.queue.map((q, i) => (
                <button key={q.id} onClick={() => setSel(q.id)}
                  className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1 text-left transition-colors"
                  style={{ borderColor: q.id === p.id ? C(q.tone) : 'rgb(var(--c-line-soft))', background: q.id === p.id ? 'rgb(var(--c-surface-2))' : 'transparent', borderLeft: `3px solid ${C(q.tone)}` }}>
                  <span className="w-4 text-center text-[8px] font-bold" style={{ color: C(q.tone) }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[9.5px] text-ink">{q.name}</div>
                    <div className="truncate text-[8px] text-ink-muted">{q.ward}</div>
                  </div>
                  <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: C(q.tone) }}>{q.acuity}</span>
                  <span className="shrink-0 font-mono text-[8px] tabular-nums text-ink-muted">{q.time}</span>
                </button>
              ))}
            </div>
          </CommandPanel>
        </div>
      </div>

      {/* Clinical action bar — functional */}
      <div className="rounded-[3px] border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 70%,transparent)', background: '#0a0f18' }}>
        <div className="flex flex-wrap gap-1.5">
          {ACTIONS.map(a => (
            <button key={a} type="button" onClick={() => { setAct(a); setActNote(''); }}
              className="focus-ring cursor-pointer rounded-[3px] border px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-ink"
              style={{ borderColor: `color-mix(in srgb,${ACC} 35%,#1d2a36)` }}
              onMouseEnter={e => { e.currentTarget.style.background = `color-mix(in srgb,${ACC} 14%,transparent)`; e.currentTarget.style.color = ACC; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; }}>
              {a}
            </button>
          ))}
        </div>
        {actLog.length ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t pt-1 text-[8px] text-ink-muted" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
            <span className="font-bold uppercase tracking-[0.14em]" style={{ color: ACC }}>Session activity</span>
            {actLog.slice(-6).map((l, i) => (
              <span key={i} className="inline-flex items-center gap-1"><span className="font-mono text-ink-soft">{l.at}</span> {l.a} <span style={{ color: C('ok') }}>✓</span></span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Action modal — performs the clinical action */}
      {act ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(2,5,10,0.72)' }}
          onClick={() => setAct(null)}>
          <div className="w-full max-w-md rounded-[6px] border p-3" style={{ borderColor: `color-mix(in srgb,${ACC} 40%,#1d2a36)`, background: '#0a0f18', boxShadow: `0 0 30px color-mix(in srgb,${ACC} 25%,transparent)` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: ACC }}>{act}</div>
              <button type="button" onClick={() => setAct(null)} className="focus-ring text-[12px] text-ink-muted hover:text-ink">✕</button>
            </div>
            <div className="mt-1 text-[9px] text-ink-muted">Patient · {p.name} · {p.mrn} · {p.ward} {p.bed}</div>
            <textarea autoFocus value={actNote} onChange={e => setActNote(e.target.value)}
              placeholder={`Detail for "${act}"…`}
              className="focus-ring mt-2 h-24 w-full resize-none rounded-[3px] border bg-[#070b12] p-2 text-[10px] text-ink-soft"
              style={{ borderColor: 'color-mix(in srgb,#1d2a36 70%,transparent)' }} />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setAct(null)}
                className="focus-ring rounded-[3px] border px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-ink-muted hover:text-ink"
                style={{ borderColor: 'color-mix(in srgb,#1d2a36 70%,transparent)' }}>Cancel</button>
              <button type="button"
                onClick={() => { setActLog(l => [...l, { a: act, at: clock }]); setAct(null); }}
                className="focus-ring rounded-[3px] px-3 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: `color-mix(in srgb,${ACC} 22%,transparent)`, color: ACC, border: `1px solid ${ACC}` }}>
                Confirm {act}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RuntimeQueue
        scope={`${id}:doctor`}
        kind="encounter"
        title="Clinical encounter runtime — triage → assess → treat → disposition"
        by="Attending Clinician"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
