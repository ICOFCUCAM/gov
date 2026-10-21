'use client';

// Transitions and emergencies (plan phase 6; guidance §4): what is in force
// (caretaker periods, states of emergency, courts' rulings, powers moved
// between national and regional institutions), every recorded transition with
// its versions and the step waiting for a second official, decisions a ruling
// flagged for legal assessment, and the country's own rules
// (/api/constitution/transitions, lib/transitions). The screen says plainly
// that these are the nation's legal events: the platform records them.

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { TransitionView } from '@/lib/transitions/events';
import type { TransitionKind, TransitionStatus } from '@/lib/transitions/state';

interface Named { id: string; name: string }
interface Data {
  notice: string;
  kinds: { key: TransitionKind; label: string; means: string }[];
  stages: { stage: number; label: string; outcomes: string[] }[];
  effects: { key: string; label: string; blocks: boolean }[];
  transitions: TransitionView[];
  inForce: {
    caretaker: { id: string; ref: string; name: string; from: string; to?: string }[];
    emergencies: { id: string; ref: string; declaredBy: string; regions: string[]; from: string; expires: string }[];
    rulings: { id: string; ref: string; court: string; effect: string; target: { instrument: string; eId?: string } | null; from: string; finality: string }[];
    competences: { competence: string; holderName: string; previousName: string; regions: string[]; from: string; ref: string; direction?: string }[];
  };
  rules: { caretakerProcedures: string[]; caretakerDecisions: string[]; caretakerDirectives: string[]; impeachmentStages: string[]; emergencyMaxDays: number; emergencyDeclarers: string[]; adopted: boolean;
    changes: { pending?: { by: string; at: string } } };
  reference: { caretaker: string[]; note: string };
  warnings: string[];
  flagged: { decision: string; subject: string; institution: string; at: string; ruling: string; effect: string; madeBeforeEffect: boolean; citation?: string }[];
  pastTerm: { id: string; title: string; holderName: string; termEnded: string }[];
  regions: string[];
  institutions: Named[];
}

const field = 'mt-1 w-full rounded-[3px] border border-line bg-surface px-2 py-1 text-[13px]';
const STATUS: Record<TransitionStatus, { label: string; tone: PillTone }> = {
  waiting: { label: 'Waiting for a second official', tone: 'warn' }, scheduled: { label: 'Applies later', tone: 'neutral' }, 'in-force': { label: 'In force', tone: 'ok' },
  expired: { label: 'Expired', tone: 'neutral' }, ended: { label: 'Ended', tone: 'neutral' }, closed: { label: 'Closed', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' }, lapsed: { label: 'Not confirmed in time', tone: 'alert' },
};
/** The fields each kind asks for (the rest are left out). */
const FIELDS: Record<TransitionKind, string[]> = {
  assumption: ['office', 'person', 'effectiveFrom', 'reference'],
  acting: ['office', 'person', 'effectiveFrom', 'effectiveTo', 'reason'],
  delegation: ['institution', 'delegator', 'person', 'powers', 'effectiveFrom', 'effectiveTo', 'reason'],
  succession: ['office', 'person', 'actingInstitution', 'trigger', 'effectiveFrom', 'reference'],
  caretaker: ['institution', 'effectiveFrom', 'effectiveTo', 'reason'],
  dissolution: ['institution', 'actingInstitution', 'effectiveFrom', 'reference', 'arrangements'],
  impeachment: ['office', 'person', 'effectiveFrom', 'reason'],
  'judicial-review': ['actingInstitution', 'reference', 'instrument', 'eId', 'effect', 'finality', 'effectiveFrom', 'decisions'],
  emergency: ['actingInstitution', 'trigger', 'regions', 'powers', 'effectiveFrom', 'effectiveTo', 'renews', 'suspensions', 'arrangements'],
  competence: ['competence', 'institution', 'actingInstitution', 'direction', 'regions', 'effectiveFrom', 'arrangements'],
  conflict: ['person', 'interest', 'cases'],
};
const LABEL: Record<string, string> = {
  office: 'Office', person: 'Person (official account id, or a name)', delegator: 'Delegating official (account id)', institution: 'Institution concerned',
  actingInstitution: 'Institution that acts (decides, declares, rules, receives the power)', effectiveFrom: 'From (YYYY-MM-DD)', effectiveTo: 'Until (YYYY-MM-DD)',
  reason: 'Reasons', reference: 'Reference (case, instrument, proclamation)', trigger: 'Trigger the law recognises', arrangements: 'Arrangements (transfers, elections, oversight)',
  powers: 'Powers (one per line)', regions: 'Regions (one per line; empty: the whole territory)', cases: 'Cases stepped aside from (references, one per line)', interest: 'Interest declared',
  competence: 'Power or service', direction: 'Direction', instrument: 'Law ruled on (id from Laws)', eId: 'Provision (empty: the whole law)', effect: 'Effect', finality: 'Finality',
  decisions: 'Decisions ruled on (ids, one per line)', renews: 'Renews (reference of the earlier declaration)', suspensions: 'Permit types whose mapping is suspended (one per line)',
};
const LINES = new Set(['powers', 'regions', 'cases', 'decisions', 'suspensions']);
const lines = (v?: string) => (v ?? '').split('\n').map(x => x.trim()).filter(Boolean);

export function TransitionsRegister() {
  const [d, setD] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [offices, setOffices] = React.useState<{ id: string; title: string; derived?: boolean }[]>([]);
  const [kind, setKind] = React.useState<TransitionKind>('acting');
  const [f, setF] = React.useState<Record<string, string>>({});
  const [act, setAct] = React.useState<{ id: string; op: 'end' | 'advance'; f: Record<string, string> } | null>(null);
  const [rules, setRules] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    const r = await fetch('/api/constitution/transitions', { cache: 'no-store' });
    if (!r.ok) { setErr(`Could not read the transitions (${r.status})`); return; }
    setErr(null); setD((await r.json()) as Data);
  }, []);
  React.useEffect(() => {
    void load();
    fetch('/api/offices', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => { if (j?.offices) setOffices(j.offices); }).catch(() => undefined);
  }, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/constitution/transitions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const out = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(out.error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: done }); setAct(null); await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  if (err) return <p role="alert" className="text-sm text-alert">{err}</p>;
  if (!d) return <p className="text-sm text-ink-muted">Loading…</p>;
  const nameOf = (id: string) => (id === 'executive-office' ? 'The whole government' : d.institutions.find(i => i.id === id)?.name ?? id);
  const law = (x: Record<string, string>) => (x.lawInstrument ? [{ instrument: x.lawInstrument.trim(), eId: (x.lawEId ?? '').trim() }] : []);
  const institutionSelect = (k: string, value: string, set: (v: string) => void, whole = false) => (
    <select className={field} value={value} onChange={e => set(e.target.value)}>
      <option value="">Choose…</option>
      {whole ? <option value="executive-office">The whole government</option> : null}
      {d.institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
    </select>
  );

  const input = (k: string) => {
    const set = (v: string) => setF(x => ({ ...x, [k]: v }));
    const v = f[k] ?? '';
    let control: React.ReactNode;
    if (k === 'office') control = <select className={field} value={v} onChange={e => set(e.target.value)}><option value="">Choose…</option>{offices.filter(o => !o.derived).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select>;
    else if (k === 'institution' || k === 'actingInstitution') control = institutionSelect(k, v, set, k === 'institution' ? kind === 'caretaker' : kind === 'emergency');
    else if (k === 'effect') control = <select className={field} value={v} onChange={e => set(e.target.value)}><option value="">Choose…</option>{d.effects.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}</select>;
    else if (k === 'finality') control = <select className={field} value={v} onChange={e => set(e.target.value)}><option value="final">Final</option><option value="under-appeal">Under appeal</option><option value="stayed">Stayed</option></select>;
    else if (k === 'direction') control = <select className={field} value={v} onChange={e => set(e.target.value)}><option value="">Choose…</option><option value="devolution">Devolution (to a region)</option><option value="recentralisation">Recentralisation (to the nation)</option><option value="transfer">Other transfer</option></select>;
    else if (LINES.has(k)) control = <textarea className={field} rows={2} value={v} onChange={e => set(e.target.value)} />;
    else control = <input className={field} value={v} onChange={e => set(e.target.value)} />;
    return <label key={k} className="text-[13px]">{LABEL[k] ?? k}{control}</label>;
  };

  const submit = () => {
    const body: Record<string, unknown> = { op: 'propose', kind, legalBasis: law(f) };
    for (const k of FIELDS[kind]) {
      const v = f[k]?.trim();
      if (!v) continue;
      if (k === 'instrument' || k === 'eId') continue;
      if (k === 'person' || k === 'delegator') body[k] = /\s/.test(v) ? { name: v } : { accountId: v };
      else if (LINES.has(k)) body[k] = lines(v);
      else body[k] = v;
    }
    if (kind === 'judicial-review' && f.instrument) body.target = { instrument: f.instrument.trim(), ...(f.eId?.trim() ? { eId: f.eId.trim() } : {}) };
    void post(body, kind === 'conflict' ? 'Declared: you step aside from those cases now; another official acknowledges it.' : 'Recorded: a different official confirms it before it takes effect.');
  };

  const actionForm = (t: TransitionView) => {
    if (!act || act.id !== t.id) return null;
    const set = (k: string, v: string) => setAct(a => (a ? { ...a, f: { ...a.f, [k]: v } } : a));
    const stage = d.stages.find(s => s.stage === t.next?.stage);
    return (
      <form className="mt-2 grid gap-2 md:grid-cols-4" onSubmit={e => { e.preventDefault(); void post(act.op === 'end'
        ? { op: 'end', id: t.id, reason: act.f.reason, ...(act.f.effectiveTo ? { effectiveTo: act.f.effectiveTo } : {}), legalBasis: law(act.f) }
        : { op: 'advance', id: t.id, stage: t.next?.stage, outcome: act.f.outcome, reason: act.f.reason, legalBasis: law(act.f) }, act.op === 'end' ? 'Proposed: it ends when a different official confirms.' : 'Stage recorded: a different official of the same institution confirms it.'); }}>
        {act.op === 'advance' && stage ? (
          <label className="text-[13px]">Outcome of stage {stage.stage}<select className={field} value={act.f.outcome ?? ''} onChange={e => set('outcome', e.target.value)}><option value="">Choose…</option>{stage.outcomes.map(o => <option key={o} value={o}>{o}</option>)}</select></label>
        ) : <label className="text-[13px]">Ends on (YYYY-MM-DD)<input className={field} value={act.f.effectiveTo ?? ''} placeholder="today" onChange={e => set('effectiveTo', e.target.value)} /></label>}
        <label className="text-[13px]">Reasons<input className={field} value={act.f.reason ?? ''} onChange={e => set('reason', e.target.value)} /></label>
        <label className="text-[13px]">Legal basis: law<input className={field} value={act.f.lawInstrument ?? ''} placeholder="/eli/…" onChange={e => set('lawInstrument', e.target.value)} /></label>
        <label className="text-[13px]">Provision<input className={field} value={act.f.lawEId ?? ''} onChange={e => set('lawEId', e.target.value)} /></label>
        <div className="flex items-end gap-2 md:col-span-4"><Button type="submit" disabled={busy}>Record</Button><Button type="button" variant="secondary" onClick={() => setAct(null)}>Cancel</Button></div>
      </form>
    );
  };

  const terms = (t: TransitionView) => {
    const x = t.terms;
    const rows: [string, React.ReactNode][] = [];
    if (t.names.office) rows.push(['Office', t.names.office]);
    if (x.person) rows.push(['Person', x.person.name]);
    if (x.delegator) rows.push(['Delegated by', x.delegator.name]);
    if (t.names.institution) rows.push(['Institution', t.names.institution]);
    if (t.names.actingInstitution) rows.push(['Acting institution', t.names.actingInstitution]);
    if (t.stageLabel) rows.push(['Stage', `${t.stageLabel}${x.outcome ? ` · ${x.outcome}` : ''}`]);
    if (x.effect) rows.push(['Ruling', `${d.effects.find(e => e.key === x.effect)?.label ?? x.effect}${x.target ? ` · ${x.target.instrument}${x.target.eId ? ` ${x.target.eId}` : ''}` : ''}${x.finality && x.finality !== 'final' ? ` · ${x.finality}` : ''}`]);
    if (x.competence) rows.push(['Power', `${x.competence} · ${x.direction ?? 'transfer'}`]);
    if (x.regions?.length) rows.push(['Regions', x.regions.join(', ')]);
    else if (x.kind === 'emergency' || x.kind === 'competence') rows.push(['Regions', 'The whole territory']);
    if (x.powers?.length) rows.push(['Powers', x.powers.join('; ')]);
    if (x.cases?.length) rows.push(['Steps aside from', x.cases.join(', ')]);
    if (x.interest) rows.push(['Interest', x.interest]);
    if (x.trigger) rows.push(['Trigger', x.trigger]);
    if (x.reference) rows.push(['Reference', x.reference]);
    if (x.reason) rows.push(['Reasons', x.reason]);
    if (x.arrangements) rows.push(['Arrangements', x.arrangements]);
    if (x.endReason) rows.push(['Ended', x.endReason]);
    rows.push(['Law', t.basis.length ? t.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ') : 'none cited (a declaration only restricts its declarant)']);
    return <dl className="mt-1 grid gap-x-3 text-[12px] sm:grid-cols-[auto_1fr]">{rows.map(([k, v]) => <React.Fragment key={k}><dt className="font-semibold">{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>;
  };

  const card = (t: TransitionView) => (
    <li key={t.id} className="rounded-[3px] border border-line p-3 text-[13px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p><strong>{t.ref}</strong> · {t.kindLabel}</p>
        <Pill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Pill>
      </div>
      <p className="text-[12px] text-ink-muted">From {t.terms.effectiveFrom}{t.terms.effectiveTo ? ` to ${t.terms.effectiveTo}` : ''} · recorded by {t.createdBy}{t.names.home ? ` · for ${t.names.home}` : ''}</p>
      {terms(t)}
      {t.pending ? (
        <div className="mt-2 rounded-[3px] border border-line p-2">
          <p className="text-[12px]"><strong>Waiting for a second official:</strong> {t.pending.values.status === 'ended' ? `end it (${t.pending.values.endReason ?? ''})` : t.pending.values.stage && t.kind === 'impeachment' ? `stage ${t.pending.values.stage} · ${t.pending.values.outcome}` : 'the record above'} · proposed by {t.pending.by} · until {t.pending.expiresAt.slice(0, 16).replace('T', ' ')}</p>
          <div className="mt-1 flex gap-2">
            <Button disabled={busy} onClick={() => void post({ op: 'confirm', id: t.id }, 'Confirmed.')}>Confirm</Button>
            {t.kind !== 'conflict' || t.history.some(h => h.outcome === 'adopted') ? <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'withdraw', id: t.id }, 'Withdrawn (kept in the history).')}>Withdraw</Button> : null}
          </div>
        </div>
      ) : null}
      {!t.pending && t.status === 'in-force' ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {t.next ? <Button variant="secondary" disabled={busy} onClick={() => setAct({ id: t.id, op: 'advance', f: {} })}>Record stage {t.next.stage}: {t.next.label}{t.next.institution ? ` (${t.next.institution})` : ''}</Button> : null}
          {t.kind !== 'judicial-review' ? <Button variant="secondary" disabled={busy} onClick={() => setAct({ id: t.id, op: 'end', f: {} })}>{t.kind === 'conflict' ? 'Ask to lift the recusal' : t.kind === 'impeachment' ? 'Discontinue' : 'End early'}</Button> : null}
        </div>
      ) : null}
      {actionForm(t)}
      {t.history.length ? (
        <details className="mt-1 text-[12px] text-ink-muted">
          <summary className="cursor-pointer">Versions ({t.history.length})</summary>
          <ul className="mt-1 space-y-0.5">{t.history.map((h, i) => <li key={i}>{h.version ? `Version ${h.version}` : h.outcome} · {h.values.status === 'ended' ? 'ended' : h.values.stage ? `stage ${h.values.stage} ${h.values.outcome ?? ''}` : 'recorded'} · by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by} (${h.confirmed.independence})` : ''} · {h.at.slice(0, 10)}</li>)}</ul>
        </details>
      ) : null}
    </li>
  );

  const active = d.transitions.filter(t => ['waiting', 'scheduled', 'in-force'].includes(t.status));
  const earlier = d.transitions.filter(t => !['waiting', 'scheduled', 'in-force'].includes(t.status));
  const r = d.rules;
  const rulesBody = () => {
    const body: Record<string, unknown> = { op: 'rules-propose', legalBasis: law(rules) };
    for (const k of ['caretakerProcedures', 'caretakerDecisions', 'caretakerDirectives', 'emergencyDeclarers']) if (rules[k] !== undefined) body[k] = lines(rules[k]);
    if (rules.emergencyMaxDays) body.emergencyMaxDays = Number(rules.emergencyMaxDays);
    if ([1, 2, 3, 4, 5, 6, 7].some(n => rules[`stage${n}`] !== undefined)) body.impeachmentStages = [1, 2, 3, 4, 5, 6, 7].map(n => rules[`stage${n}`] ?? r.impeachmentStages[n - 1] ?? '');
    return body;
  };

  return (
    <div className="space-y-4">
      <Card tight>
        <p className="text-[13px]"><strong>The legal process is the nation&apos;s.</strong> {d.notice}</p>
        {msg ? <p role="status" className={`mt-2 text-[12px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
      </Card>

      <Card tight>
        <h2 className="text-sm font-semibold">In force today</h2>
        <ul className="mt-1 space-y-0.5 text-[13px]">
          <li><strong>Caretaker periods:</strong> {d.inForce.caretaker.length ? d.inForce.caretaker.map(c => `${c.name} since ${c.from} (${c.ref})`).join('; ') : 'none'}</li>
          <li><strong>States of emergency:</strong> {d.inForce.emergencies.length ? d.inForce.emergencies.map(e => `${e.declaredBy}: ${e.regions.length ? e.regions.join(', ') : 'the whole territory'}, ${e.from} to ${e.expires} (${e.ref})`).join('; ') : 'none'}</li>
          <li><strong>Courts&apos; rulings:</strong> {d.inForce.rulings.length ? d.inForce.rulings.map(x => `${x.court}: ${d.effects.find(e => e.key === x.effect)?.label ?? x.effect}${x.target ? ` ${x.target.instrument}${x.target.eId ? ` ${x.target.eId}` : ''}` : ''} from ${x.from}${x.finality !== 'final' ? ` (${x.finality})` : ''}`).join('; ') : 'none'}</li>
          <li><strong>Powers moved:</strong> {d.inForce.competences.length ? d.inForce.competences.map(c => `${c.competence}: ${c.holderName}${c.previousName ? ` (was ${c.previousName})` : ''}${c.regions.length ? ` in ${c.regions.join(', ')}` : ''} from ${c.from}`).join('; ') : 'none'}</li>
        </ul>
        <p className="mt-2 text-[12px] text-ink-muted">An emergency never lifts audit, access logging, two-official rules or privacy rules, and grants no permission on this platform. A caretaker period restricts only what the nation&apos;s adopted rules list.</p>
        {d.warnings.length ? <ul className="mt-2 space-y-0.5 text-[12px] text-warn">{d.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
      </Card>

      <Card tight>
        <h2 className="text-sm font-semibold">Record a legal event</h2>
        <p className="text-[12px] text-ink-muted">{d.kinds.find(k => k.key === kind)?.means}</p>
        <form className="mt-2 grid gap-2 md:grid-cols-3" onSubmit={e => { e.preventDefault(); submit(); }}>
          <label className="text-[13px]">What happened<select className={field} value={kind} onChange={e => { setKind(e.target.value as TransitionKind); setF({}); }}>{d.kinds.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label>
          {FIELDS[kind].map(input)}
          <label className="text-[13px]">Legal basis: law (id from Laws){kind === 'conflict' ? ' — optional' : ''}<input className={field} value={f.lawInstrument ?? ''} placeholder="/eli/…" onChange={e => setF(x => ({ ...x, lawInstrument: e.target.value }))} /></label>
          <label className="text-[13px]">Provision<input className={field} value={f.lawEId ?? ''} placeholder="e.g. art_12" onChange={e => setF(x => ({ ...x, lawEId: e.target.value }))} /></label>
          <div className="flex items-end"><Button type="submit" disabled={busy}>{kind === 'conflict' ? 'Declare' : 'Record'}</Button></div>
        </form>
      </Card>

      <section aria-labelledby="tr-current">
        <h2 id="tr-current" className="mb-2 text-sm font-semibold">Waiting, applying later or in force</h2>
        {active.length ? <ul className="space-y-2">{active.map(card)}</ul> : <p className="text-[12px] text-ink-muted">None recorded.</p>}
      </section>

      {earlier.length ? (
        <section aria-labelledby="tr-history">
          <h2 id="tr-history" className="mb-2 text-sm font-semibold">Ended, expired or closed</h2>
          <ul className="space-y-2">{earlier.map(card)}</ul>
        </section>
      ) : null}

      <Card tight>
        <h2 className="text-sm font-semibold">Decisions a court&apos;s ruling touches</h2>
        <p className="text-[12px] text-ink-muted">Flagged for legal assessment, never changed or deleted: whether each must be reopened depends on the ruling&apos;s remedy and the procedural law.</p>
        {d.flagged.length ? (
          <ul className="mt-1 space-y-0.5 text-[12px]">{d.flagged.map((x, i) => <li key={i}>{x.subject} · {x.institution} · decided {x.at.slice(0, 10)}{x.madeBeforeEffect ? ' (before the ruling took effect)' : ''} · {x.citation ?? 'ruled on directly'} · {x.ruling} ({x.effect})</li>)}</ul>
        ) : <p className="mt-1 text-[12px] text-ink-muted">None.</p>}
      </Card>

      <Card tight>
        <h2 className="text-sm font-semibold">The country&apos;s rules for transitions</h2>
        <p className="text-[12px] text-ink-muted">
          {r.adopted ? 'Adopted by the nation.' : 'None adopted: a caretaker period restricts nothing, impeachment stages and emergencies cannot be recorded until the nation names who acts.'}
          {' '}Caretaker restrictions: {[...r.caretakerProcedures, ...r.caretakerDecisions, ...r.caretakerDirectives].join(', ') || 'none'} ·
          impeachment stages: {r.impeachmentStages.map((x, i) => `${i + 1} ${x ? nameOf(x) : '—'}`).join(', ')} ·
          emergencies declared by {r.emergencyDeclarers.map(nameOf).join(', ') || 'nobody named'}{r.emergencyMaxDays ? `, at most ${r.emergencyMaxDays} days before renewal` : ''}.
        </p>
        <p className="mt-1 text-[12px] text-ink-muted">Reference draft, not approved — restrictions a caretaker period may carry: {d.reference.caretaker.join('; ')}. {d.reference.note}</p>
        {r.changes.pending ? (
          <div className="mt-2 text-[13px]">
            <p>Waiting for a second official · proposed by {r.changes.pending.by}</p>
            <div className="mt-1 flex gap-2">
              <Button disabled={busy} onClick={() => void post({ op: 'rules-confirm' }, 'Confirmed.')}>Confirm</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'rules-withdraw' }, 'Withdrawn.')}>Withdraw</Button>
            </div>
          </div>
        ) : (
          <form className="mt-2 grid gap-2 text-[13px] md:grid-cols-3" onSubmit={e => { e.preventDefault(); void post(rulesBody(), 'Proposed: a different administrator confirms it.'); }}>
            <label>Caretaker: procedures refused (keys, one per line)<textarea className={field} rows={2} placeholder="keep" onChange={e => setRules(x => ({ ...x, caretakerProcedures: e.target.value }))} /></label>
            <label>Caretaker: decisions refused (one per line)<textarea className={field} rows={2} placeholder="keep" onChange={e => setRules(x => ({ ...x, caretakerDecisions: e.target.value }))} /></label>
            <label>Caretaker: directive kinds refused (one per line)<textarea className={field} rows={2} placeholder="keep" onChange={e => setRules(x => ({ ...x, caretakerDirectives: e.target.value }))} /></label>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <label key={n}>Stage {n}: {d.stages[n - 1]?.label}
                {institutionSelect(`stage${n}`, rules[`stage${n}`] ?? r.impeachmentStages[n - 1] ?? '', v => setRules(x => ({ ...x, [`stage${n}`]: v })))}
              </label>
            ))}
            <label>Who may declare an emergency (ids, one per line; executive-office for the whole government)<textarea className={field} rows={2} placeholder="keep" onChange={e => setRules(x => ({ ...x, emergencyDeclarers: e.target.value }))} /></label>
            <label>Longest emergency before renewal (days)<input className={field} placeholder="keep" onChange={e => setRules(x => ({ ...x, emergencyMaxDays: e.target.value }))} /></label>
            <label>Legal basis: law<input className={field} placeholder="/eli/…" onChange={e => setRules(x => ({ ...x, lawInstrument: e.target.value }))} /></label>
            <label>Provision<input className={field} onChange={e => setRules(x => ({ ...x, lawEId: e.target.value }))} /></label>
            <div className="flex items-end"><Button type="submit" disabled={busy}>Propose</Button></div>
          </form>
        )}
      </Card>
    </div>
  );
}
