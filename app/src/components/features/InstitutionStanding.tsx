'use client';

// An institution's constitutional standing (plan phase 1; guidance §2.1,
// §7.1–7.2): what kind of public body it is, its branch, the law that
// establishes it, from when, its independence recorded dimension by dimension,
// what the law forbids and the records it owns. Shown on the institution's
// own registry screen (Ministries & agencies). During first-run setup an
// administrator records it; afterwards a change is proposed citing the law
// and confirmed by a different official — by the institution itself when it
// is independent (/api/org/ministries/{id}/standing).

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import type { IndependenceDimension, InstitutionStanding, InstitutionTerms, InstitutionProhibition } from '@/lib/api/types';

interface Cite { title?: string; instrument: string; num?: string; eId: string }
type Terms = InstitutionTerms & { basis?: Cite[] };
interface Version { values: InstitutionTerms; basis: Cite[]; by: string; at: string; expiresAt?: string; confirmed?: { by: string; at: string }; outcome?: string }
interface View {
  institution: { id: string; name: string; status: string };
  terms: Terms; independent: boolean; scheduled: Version[]; pending: Version | null; history: Version[];
  confirmBy: { id: string; name: string } | null; setupRunning: boolean;
  choices: { standings: { key: InstitutionStanding; label: string; means: string }[]; dimensions: { key: IndependenceDimension; label: string; question: string }[]; branches: { key: string; label: string }[] };
}

const field = 'mt-1 w-full rounded-[3px] border border-line bg-surface px-2 py-1 text-[13px]';
const KIND_LABEL: Record<InstitutionProhibition['kind'], string> = { direction: 'May not be directed', 'data-access': 'May not reach', 'non-delegable': 'May not delegate' };
const cites = (c?: Cite[]) => (c?.length ? c.map(x => `${x.title ?? x.instrument} ${x.num ?? x.eId}`).join('; ') : 'none recorded');

export function InstitutionStandingPanel({ id, onChange }: { id: string; onChange?: () => void }) {
  const [v, setV] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ standing: string; branch: string; effectiveFrom: string; dims: Record<string, { protected: boolean; actor: string; note: string } | undefined>; prohibitions: string; records: string; instrument: string; eId: string; change: string; name: string; into: string }>(
    { standing: '', branch: '', effectiveFrom: '', dims: {}, prohibitions: '', records: '', instrument: '', eId: '', change: '', name: '', into: '' });

  const load = React.useCallback(async () => {
    const r = await fetch(`/api/org/ministries/${encodeURIComponent(id)}/standing`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = (await r.json()) as View;
    setV(d);
    setForm(f => ({
      ...f, standing: d.terms.standing, branch: d.terms.branch ?? '', effectiveFrom: '',
      dims: Object.fromEntries(d.choices.dimensions.map(x => { const r0 = d.terms.independence[x.key]; return [x.key, r0 ? { protected: r0.protected, actor: r0.actor ?? '', note: r0.note ?? '' } : undefined]; })),
      prohibitions: d.terms.prohibitions.map(p => `${p.kind}: ${p.text}`).join('\n'), records: d.terms.records.join('\n'),
    }));
  }, [id]);
  React.useEffect(() => { setOpen(false); setMsg(null); void load(); }, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/org/ministries/${encodeURIComponent(id)}/standing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: done }); setOpen(false); await load(); onChange?.();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v) return;
    const independence = Object.fromEntries(Object.entries(form.dims).map(([k, d]) => [k, d ? { protected: d.protected, ...(d.actor.trim() ? { actor: d.actor.trim() } : {}), ...(d.note.trim() ? { note: d.note.trim() } : {}) } : null]));
    const prohibitions = form.prohibitions.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = /^(direction|data-access|non-delegable)\s*:\s*(.+)$/.exec(l);
      return m ? { kind: m[1], text: m[2] } : { kind: 'direction', text: l };
    });
    const legalBasis = form.instrument.trim() ? [{ instrument: form.instrument.trim(), eId: form.eId.trim() }] : [];
    const change = form.change === 'rename' ? { kind: 'rename', name: form.name } : form.change === 'deactivate' ? { kind: 'deactivate' } : form.change === 'merge' ? { kind: 'merge', into: form.into } : undefined;
    const body = {
      op: v.setupRunning ? 'record' : 'propose', standing: form.standing, ...(form.branch ? { branch: form.branch } : {}),
      ...(form.effectiveFrom ? { effectiveFrom: form.effectiveFrom } : {}), independence, prohibitions,
      records: form.records.split('\n').map(l => l.trim()).filter(Boolean), legalBasis, ...(change && !v.setupRunning ? { change } : {}),
    };
    void post(body, v.setupRunning ? 'Recorded (first-run setup).' : `Proposed: ${v.confirmBy ? `an official who can sign at ${v.confirmBy.name}` : 'a different official'} confirms it before it takes effect.`);
  }

  if (!v) return null;
  const t = v.terms;
  const standingLabel = (k: string) => v.choices.standings.find(s => s.key === k)?.label ?? k;
  return (
    <Card tight>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Constitutional standing</h3>
        <Pill tone={v.independent ? 'warn' : 'neutral'}>{v.independent ? 'Independent' : 'Within the government\'s reach'}</Pill>
      </div>
      <dl className="mt-2 grid gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Standing</dt><dd>{standingLabel(t.standing)}{t.branch ? ` · branch: ${v.choices.branches.find(b => b.key === t.branch)?.label ?? t.branch}` : ''} · from {t.effectiveFrom}</dd>
        <dt className="font-semibold">Set up by</dt><dd>{cites(t.basis)}</dd>
        <dt className="font-semibold">Independence</dt>
        <dd>
          <ul className="space-y-0.5">
            {v.choices.dimensions.map(d => {
              const r = t.independence[d.key];
              return <li key={d.key}><span className="text-ink-soft">{d.label}:</span> {r ? `${r.protected ? 'protected by law' : 'not protected'}${r.actor ? ` · ${r.actor}` : ''}${r.note ? ` · ${r.note}` : ''}${r.basis?.length ? ` · ${cites(r.basis as Cite[])}` : ''}` : 'nothing recorded'}</li>;
            })}
          </ul>
        </dd>
        <dt className="font-semibold">The law forbids</dt><dd>{t.prohibitions.length ? t.prohibitions.map(p => `${KIND_LABEL[p.kind]}: ${p.text}`).join(' · ') : 'nothing recorded'}</dd>
        <dt className="font-semibold">Records it owns</dt><dd>{t.records.length ? t.records.join(', ') : 'nothing recorded'}</dd>
      </dl>
      <p className="mt-2 text-[11px] text-ink-muted">
        {v.independent
          ? 'Officials serving the whole government do not reach this institution\'s queue, cases, documents, site archive or accounts; it receives requests and communications, never instructions.'
          : 'These are the nation\'s own facts: the platform records them and enforces them, it never chooses them.'}
        {v.setupRunning ? ' During first-run setup an administrator records them directly.' : ' A change is proposed citing the law and takes effect when a different official confirms it.'}
      </p>
      {v.scheduled.length ? <p className="mt-1 text-[12px]">Scheduled: {v.scheduled.map(s => `${standingLabel(s.values.standing)} from ${s.values.effectiveFrom}`).join('; ')}</p> : null}
      {v.pending ? (
        <div className="mt-2 rounded-[3px] border border-line p-2 text-[13px]">
          <p><strong>Waiting for confirmation:</strong> {standingLabel(v.pending.values.standing)} from {v.pending.values.effectiveFrom}
            {v.pending.values.change ? ` · ${v.pending.values.change.kind === 'rename' ? `rename to ${v.pending.values.change.name}` : v.pending.values.change.kind === 'merge' ? 'merge into another institution' : 'deactivate'}` : ''}</p>
          <p className="text-[12px] text-ink-muted">Proposed by {v.pending.by} · basis {cites(v.pending.basis)}{v.confirmBy ? ` · confirmed by an official who can sign at ${v.confirmBy.name}` : ''}</p>
          <div className="mt-1 flex gap-2">
            <Button disabled={busy} onClick={() => void post({ op: 'confirm' }, 'Confirmed.')}>Confirm</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'withdraw' }, 'Withdrawn.')}>Withdraw</Button>
          </div>
        </div>
      ) : null}
      {msg ? <p role="status" className={`mt-1 text-[12px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
      {!v.pending ? (
        <div className="mt-2">
          <Button variant="secondary" onClick={() => setOpen(o => !o)}>{open ? 'Close' : v.setupRunning ? 'Record its standing' : 'Propose a change'}</Button>
        </div>
      ) : null}
      {open ? (
        <form className="mt-2 grid gap-2 text-[13px] md:grid-cols-3" onSubmit={submit}>
          <label>Standing<select className={field} value={form.standing} onChange={e => setForm(f => ({ ...f, standing: e.target.value }))}>
            {v.choices.standings.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            <span className="block text-[11px] text-ink-muted">{v.choices.standings.find(s => s.key === form.standing)?.means}</span></label>
          <label>Branch<select className={field} value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
            <option value="">Not stated</option>{v.choices.branches.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select></label>
          <label>Applies from<input type="date" className={field} value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} /><span className="block text-[11px] text-ink-muted">Empty: today</span></label>
          <fieldset className="md:col-span-3">
            <legend className="font-semibold">Independence, one dimension at a time</legend>
            {v.choices.dimensions.map(d => {
              const cur = form.dims[d.key];
              return (
                <div key={d.key} className="mt-1 grid gap-2 md:grid-cols-[1.2fr_auto_1fr_1fr]">
                  <span className="text-ink-soft">{d.question}</span>
                  <select aria-label={`${d.label}: recorded`} className={field} value={cur ? (cur.protected ? 'yes' : 'no') : ''} onChange={e => setForm(f => ({ ...f, dims: { ...f.dims, [d.key]: e.target.value ? { protected: e.target.value === 'yes', actor: cur?.actor ?? '', note: cur?.note ?? '' } : undefined } }))}>
                    <option value="">Nothing recorded</option><option value="yes">Protected by law</option><option value="no">Not protected</option>
                  </select>
                  <input aria-label={`${d.label}: who acts`} className={field} placeholder="Who acts (e.g. who appoints)" value={cur?.actor ?? ''} disabled={!cur} onChange={e => setForm(f => ({ ...f, dims: { ...f.dims, [d.key]: { ...cur!, actor: e.target.value } } }))} />
                  <input aria-label={`${d.label}: note`} className={field} placeholder="Note" value={cur?.note ?? ''} disabled={!cur} onChange={e => setForm(f => ({ ...f, dims: { ...f.dims, [d.key]: { ...cur!, note: e.target.value } } }))} />
                </div>
              );
            })}
          </fieldset>
          <label className="md:col-span-2">What the law forbids (one per line: direction: …, data-access: …, non-delegable: …)<textarea className={field} rows={3} value={form.prohibitions} onChange={e => setForm(f => ({ ...f, prohibitions: e.target.value }))} /></label>
          <label>Records it owns (one per line)<textarea className={field} rows={3} value={form.records} onChange={e => setForm(f => ({ ...f, records: e.target.value }))} /></label>
          <label>Legal basis: law (id from Laws){v.setupRunning ? ' — optional during setup' : ''}<input className={field} value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label>Provision (e.g. sec_3)<input className={field} value={form.eId} onChange={e => setForm(f => ({ ...f, eId: e.target.value }))} /></label>
          {!v.setupRunning ? (
            <label>Also (optional)<select className={field} value={form.change} onChange={e => setForm(f => ({ ...f, change: e.target.value }))}>
              <option value="">No structural change</option><option value="rename">Rename it</option><option value="deactivate">Deactivate it</option><option value="merge">Merge it into another</option></select>
              {form.change === 'rename' ? <input aria-label="New name" className={field} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="New name" /> : null}
              {form.change === 'merge' ? <input aria-label="Merge into (institution id)" className={field} value={form.into} onChange={e => setForm(f => ({ ...f, into: e.target.value }))} placeholder="Institution id" /> : null}
            </label>
          ) : null}
          <div className="md:col-span-3"><Button type="submit" disabled={busy}>{v.setupRunning ? 'Record' : 'Propose'}</Button></div>
        </form>
      ) : null}
      {v.history.length ? (
        <details className="mt-2 text-[12px] text-ink-muted">
          <summary className="cursor-pointer">Earlier versions ({v.history.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {[...v.history].reverse().map((h, i) => <li key={i}>{h.outcome} · {standingLabel(h.values.standing)} from {h.values.effectiveFrom} · proposed by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by}` : ''} · basis {cites(h.basis)}</li>)}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
