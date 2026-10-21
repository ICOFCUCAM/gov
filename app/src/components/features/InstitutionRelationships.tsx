'use client';

// Relationships between institutions (plan phase 3; guidance §3.3): which
// institution appoints, funds, instructs, audits or may ask for information
// from which other, within what scope, on which law, between which dates.
// Each institution's relationships are shown both ways (powers it holds, and
// powers others hold over it), with the proposals waiting for a second
// official. Proposed by an administrator citing the law; confirmed by a
// different official, and by an official who can sign at each independent
// institution at either end (/api/org/relationships). Nothing is approved
// by the platform: these are the nation's own facts.

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { RelationshipView, RelationshipType } from '@/lib/data/store/relationships';

interface Choices { types: { key: RelationshipType; label: string; means: string; enforced?: string }[]; instructionKinds: string[]; readTypes: string[]; caseRecordTypes: string[] }
interface Data { relationships: RelationshipView[]; institutions: { id: string; name: string; independent: boolean }[]; executiveOffice: string; choices: Choices }

const field = 'mt-1 w-full rounded-[3px] border border-line bg-surface px-2 py-1 text-[13px]';
const STATUS: Record<RelationshipView['status'], { label: string; tone: PillTone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, approved: { label: 'Approved', tone: 'ok' }, suspended: { label: 'Suspended', tone: 'warn' }, withdrawn: { label: 'Ended', tone: 'neutral' },
};
const cites = (c: { title?: string; instrument: string; num?: string; eId: string }[]) => (c.length ? c.map(x => `${x.title ?? x.instrument} ${x.num ?? x.eId}`).join('; ') : 'none');
const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
const EMPTY = { from: '', to: '', type: 'request_information', recordTypes: '', purposes: '', territories: '', conditions: '', effectiveFrom: '', effectiveTo: '', instrument: '', eId: '', note: '' };

export function InstitutionRelationships() {
  const [d, setD] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState('');
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [change, setChange] = React.useState<{ id: string; op: 'suspend' | 'end' | 'propose'; instrument: string; eId: string } | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/org/relationships', { cache: 'no-store' });
    if (!r.ok) { setErr(`Could not read the relationships (${r.status})`); return; }
    setErr(null); setD((await r.json()) as Data);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/org/relationships', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const out = (await r.json().catch(() => ({}))) as { error?: string; waitingFor?: string[] };
      if (!r.ok) throw new Error(out.error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: out.waitingFor?.length ? `${done} Still waiting for: ${out.waitingFor.map(nameOf).join(', ')}.` : done });
      setOpen(false); setChange(null); await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const nameOf = (id: string) => (d && id === d.executiveOffice ? 'The executive office (whole government)' : d?.institutions.find(i => i.id === id)?.name ?? id);
  const typeOf = (k: string) => d?.choices.types.find(t => t.key === k);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void post({
      op: 'propose', from: form.from, to: form.to, type: form.type,
      scope: { recordTypes: lines(form.recordTypes), purposes: lines(form.purposes), territories: lines(form.territories) },
      conditions: lines(form.conditions), ...(form.effectiveFrom ? { effectiveFrom: form.effectiveFrom } : {}), ...(form.effectiveTo ? { effectiveTo: form.effectiveTo } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
      legalBasis: form.instrument.trim() ? [{ instrument: form.instrument.trim(), eId: form.eId.trim() }] : [],
    }, 'Proposed: a different official confirms it before it applies (and each independent institution at either end).');
  }

  if (err) return <p role="alert" className="text-sm text-alert">{err}</p>;
  if (!d) return <p className="text-sm text-ink-muted">Loading…</p>;
  const shown = d.relationships.filter(r => !focus || r.terms.from === focus || r.terms.to === focus);
  const waiting = d.relationships.filter(r => r.pending);
  const isRead = d.choices.readTypes.includes(form.type);

  const row = (r: RelationshipView) => {
    const t = typeOf(r.terms.type);
    const s = STATUS[r.status];
    return (
      <li key={r.id} className="rounded-[3px] border border-line p-2 text-[13px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p><strong>{r.fromName}</strong> {t?.label.toLowerCase() ?? r.terms.type} <strong>{r.toName}</strong></p>
          <span className="flex gap-1">
            <Pill tone={s.tone}>{s.label}{r.version ? ` · version ${r.version}` : ''}</Pill>
            {r.status === 'approved' ? <Pill tone={r.inForce ? 'ok' : 'warn'}>{r.inForce ? 'In force' : 'Not in force today'}</Pill> : null}
          </span>
        </div>
        <p className="text-[12px] text-ink-muted">
          {t?.means}{t?.enforced ? ` ${t.enforced}` : ' Recorded; the platform does not act on it yet.'}
        </p>
        <dl className="mt-1 grid gap-x-3 text-[12px] sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">Covers</dt>
          <dd>{r.terms.scope.recordTypes.length ? r.terms.scope.recordTypes.join(', ') : r.terms.type === 'instruct' ? 'every kind of instruction' : 'nothing listed'}{r.terms.scope.purposes.length ? ` · for: ${r.terms.scope.purposes.join(', ')}` : ''}{r.terms.scope.territories.length ? ` · in: ${r.terms.scope.territories.join(', ')}` : ''}</dd>
          <dt className="font-semibold">Conditions</dt><dd>{r.terms.conditions.length ? r.terms.conditions.join('; ') : 'none recorded'}</dd>
          <dt className="font-semibold">Law</dt><dd>{cites(r.basis)}</dd>
          <dt className="font-semibold">Applies</dt><dd>from {r.terms.effectiveFrom}{r.terms.effectiveTo ? ` to ${r.terms.effectiveTo}` : ''}</dd>
        </dl>
        {r.pending ? (
          <div className="mt-1 rounded-[3px] border border-line p-2">
            <p><strong>Waiting for confirmation:</strong> {STATUS[r.pending.values.status].label.toLowerCase()} from {r.pending.values.effectiveFrom} · proposed by {r.pending.by} · law {cites(r.pending.basis)}</p>
            {r.confirmFrom.length ? <p className="text-[12px] text-ink-muted">Confirmed by an official who can sign at {r.confirmFrom.map(c => `${c.name}${r.endorsed.includes(c.id) ? ' (done)' : ''}`).join(' and ')}</p> : <p className="text-[12px] text-ink-muted">Confirmed by a different official (an administrator or one who can sign)</p>}
            <div className="mt-1 flex gap-2">
              <Button disabled={busy} onClick={() => void post({ op: 'confirm', id: r.id }, 'Confirmed.')}>Confirm</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'withdraw', id: r.id }, 'Withdrawn.')}>Withdraw the proposal</Button>
            </div>
          </div>
        ) : r.status !== 'draft' || r.history.length ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {r.status === 'approved' ? <Button variant="secondary" onClick={() => setChange({ id: r.id, op: 'suspend', instrument: '', eId: '' })}>Propose suspending it</Button> : null}
            {r.status === 'approved' || r.status === 'suspended' ? <Button variant="secondary" onClick={() => setChange({ id: r.id, op: 'end', instrument: '', eId: '' })}>Propose ending it</Button> : null}
            {r.status !== 'approved' ? <Button variant="secondary" onClick={() => setChange({ id: r.id, op: 'propose', instrument: '', eId: '' })}>{r.status === 'draft' ? 'Propose it again' : 'Propose approving it again'}</Button> : null}
          </div>
        ) : null}
        {change?.id === r.id ? (
          <form className="mt-1 grid gap-2 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void post({ op: change.op, id: r.id, legalBasis: change.instrument.trim() ? [{ instrument: change.instrument.trim(), eId: change.eId.trim() }] : [] }, 'Proposed: a different official confirms it.'); }}>
            <label>Legal basis: law (id from Laws)<input className={field} value={change.instrument} onChange={e => setChange({ ...change, instrument: e.target.value })} placeholder="/eli/…" /></label>
            <label>Provision (e.g. sec_3)<input className={field} value={change.eId} onChange={e => setChange({ ...change, eId: e.target.value })} /></label>
            <div className="flex items-end gap-2"><Button type="submit" disabled={busy}>Propose</Button><Button type="button" variant="secondary" onClick={() => setChange(null)}>Cancel</Button></div>
          </form>
        ) : null}
        {r.history.length ? (
          <details className="mt-1 text-[12px] text-ink-muted">
            <summary className="cursor-pointer">Versions ({r.history.length})</summary>
            <ul className="mt-1 space-y-0.5">
              {r.history.map((h, i) => <li key={i}>{h.version ? `Version ${h.version}` : h.outcome}{h.superseded ? ' (superseded)' : ''} · {STATUS[h.values.status].label.toLowerCase()} from {h.values.effectiveFrom} · proposed by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by}` : ''} · law {cites(h.basis)}{h.outcome !== 'adopted' ? ` · ${h.outcome}` : ''}</li>)}
            </ul>
          </details>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card tight>
        <div className="flex flex-wrap items-end gap-3 text-[13px]">
          <label>Institution<select className={field} value={focus} onChange={e => setFocus(e.target.value)}>
            <option value="">Every institution</option>
            {d.institutions.map(i => <option key={i.id} value={i.id}>{i.name}{i.independent ? ' (independent)' : ''}</option>)}
          </select></label>
          <Button variant="secondary" onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Propose a relationship'}</Button>
        </div>
        {msg ? <p role="status" className={`mt-2 text-[12px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
        {open ? (
          <form className="mt-2 grid gap-2 text-[13px] md:grid-cols-3" onSubmit={submit}>
            <label>Holds the power (from)<select className={field} value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required>
              <option value="">Choose…</option>
              {form.type === 'instruct' ? <option value={d.executiveOffice}>The executive office (whole government)</option> : null}
              {d.institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></label>
            <label>Kind<select className={field} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {d.choices.types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select><span className="block text-[11px] text-ink-muted">{typeOf(form.type)?.means}</span></label>
            <label>Over (to)<select className={field} value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required>
              <option value="">Choose…</option>
              {d.institutions.map(i => <option key={i.id} value={i.id}>{i.name}{i.independent ? ' (independent)' : ''}</option>)}
            </select></label>
            <label>{form.type === 'instruct' ? `Kinds of directive covered (one per line; empty: all of ${d.choices.instructionKinds.join(', ')})` : `Records covered (one per line: ${d.choices.caseRecordTypes.join(', ')} or a procedure's key)`}
              <textarea className={field} rows={3} value={form.recordTypes} onChange={e => setForm(f => ({ ...f, recordTypes: e.target.value }))} required={isRead} /></label>
            <label>Purposes a read may state (one per line){isRead ? '' : ' — optional'}<textarea className={field} rows={3} value={form.purposes} onChange={e => setForm(f => ({ ...f, purposes: e.target.value }))} required={isRead} /></label>
            <label>Territory (one per line, optional)<textarea className={field} rows={3} value={form.territories} onChange={e => setForm(f => ({ ...f, territories: e.target.value }))} /></label>
            <label className="md:col-span-2">Conditions the law sets (one per line)<textarea className={field} rows={2} value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} /></label>
            <label>Note<input className={field} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></label>
            <label>Applies from<input type="date" className={field} value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} /><span className="block text-[11px] text-ink-muted">Empty: today</span></label>
            <label>Ends on (optional)<input type="date" className={field} value={form.effectiveTo} onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} /></label>
            <span />
            <label>Legal basis: law (id from Laws)<input className={field} value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} placeholder="/eli/…" required /></label>
            <label>Provision (e.g. sec_18)<input className={field} value={form.eId} onChange={e => setForm(f => ({ ...f, eId: e.target.value }))} required /></label>
            <div className="flex items-end"><Button type="submit" disabled={busy}>Propose</Button></div>
          </form>
        ) : null}
      </Card>

      {waiting.length ? (
        <Card tight>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Waiting for a second official ({waiting.length})</h3>
          <ul className="mt-2 space-y-1 text-[13px]">
            {waiting.map(r => <li key={r.id}>{r.fromName} {typeOf(r.terms.type)?.label.toLowerCase()} {r.toName} · proposed by {r.pending!.by} · lapses {r.pending!.expiresAt.slice(0, 16).replace('T', ' ')}</li>)}
          </ul>
        </Card>
      ) : null}

      {focus ? (
        <>
          <Card tight>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Powers {nameOf(focus)} holds over others</h3>
            <ul className="mt-2 space-y-2">{shown.filter(r => r.terms.from === focus).map(row)}</ul>
            {shown.some(r => r.terms.from === focus) ? null : <p className="mt-1 text-[13px] text-ink-muted">None recorded.</p>}
          </Card>
          <Card tight>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Powers others hold over {nameOf(focus)}</h3>
            <ul className="mt-2 space-y-2">{shown.filter(r => r.terms.to === focus).map(row)}</ul>
            {shown.some(r => r.terms.to === focus) ? null : <p className="mt-1 text-[13px] text-ink-muted">None recorded.</p>}
          </Card>
        </>
      ) : (
        <Card tight>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Every relationship ({shown.length})</h3>
          {shown.length ? <ul className="mt-2 space-y-2">{shown.map(row)}</ul> : <p className="mt-1 text-[13px] text-ink-muted">None recorded. The platform ships none: each comes from the nation&apos;s law, proposed citing it and confirmed by a second official.</p>}
        </Card>
      )}
    </div>
  );
}
