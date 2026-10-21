'use client';

// The constitutional profile (plan phase 5; guidance §7.4): the version in
// force, the parts it bundles with their versions and digests, the draft in
// progress with each step and who took it, every earlier version, disputes
// and the frozen parts, and the nation's own steps (/api/constitution/profile,
// lib/constitution/profile.ts). The screen says plainly that the legal process
// is the nation's: a two-person approval here records that process, it does
// not replace it.

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { ConstitutionalProfile as Profile, ProfileStatus, PartKey } from '@/lib/constitution/profile-state';

interface LivePart { key: PartKey; label: string; version: number; digest: string; summary: string; waiting: number }
interface Pending { by: string; at: string; values: { consultation: string; approvals: number; legalReviewInstitution?: string } }
interface Data {
  notice: string;
  setupComplete: boolean;
  inForce: { id: string; version: number; digest: string; title: string; effectiveFrom: string; status: ProfileStatus } | null;
  live: { parts: LivePart[]; digest: string };
  drift: PartKey[];
  frozen: { part: PartKey; profile: string; version: number; grounds: string }[];
  profiles: Profile[];
  process: { consultation: 'optional' | 'required'; approvals: number; legalReviewInstitution?: string; adopted: boolean; changes: { pending?: Pending } };
  labels: { status: Record<ProfileStatus, string>; parts: Record<PartKey, string> };
  institutions: { id: string; name: string }[];
}

const field = 'mt-1 w-full rounded-[3px] border border-line bg-surface px-2 py-1 text-[13px]';
const TONE: Partial<Record<ProfileStatus, PillTone>> = { active: 'ok', scheduled: 'ok', disputed: 'alert', suspended_pending_review: 'alert', withdrawn: 'neutral', set_aside: 'neutral', superseded: 'neutral' };
const short = (d: string) => d.slice(0, 12);
const ON_THE_WAY: ProfileStatus[] = ['draft', 'legal_review', 'consultation', 'security_validation', 'approval', 'scheduled', 'disputed', 'suspended_pending_review'];

type Action = { id: string; op: string; f: Record<string, string> };

export function ConstitutionalProfile() {
  const [d, setD] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', effectiveFrom: '', constraints: '', consult: [] as string[] });
  const [action, setAction] = React.useState<Action | null>(null);
  const [proc, setProc] = React.useState({ consultation: '', approvals: '', legalReviewInstitution: '', instrument: '', eId: '' });

  const load = React.useCallback(async () => {
    const r = await fetch('/api/constitution/profile', { cache: 'no-store' });
    if (!r.ok) { setErr(`Could not read the constitutional profile (${r.status})`); return; }
    setErr(null); setD((await r.json()) as Data);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/constitution/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const out = (await r.json().catch(() => ({}))) as { error?: string; result?: { passed?: boolean } };
      if (!r.ok) throw new Error(out.error ?? `Request failed (${r.status})`);
      setMsg({ ok: out.result?.passed !== false, text: out.result?.passed === false ? 'Security validation did not pass: see the checks below.' : done });
      setAction(null); await load();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  if (err) return <p role="alert" className="text-sm text-alert">{err}</p>;
  if (!d) return <p className="text-sm text-ink-muted">Loading…</p>;
  const nameOf = (id: string) => d.institutions.find(i => i.id === id)?.name ?? id;
  const partLabel = (k: PartKey) => d.labels.parts[k] ?? k;
  const current = d.profiles.filter(p => ON_THE_WAY.includes(p.status));
  const earlier = d.profiles.filter(p => !ON_THE_WAY.includes(p.status));
  const set = (k: string, v: string) => setAction(a => (a ? { ...a, f: { ...a.f, [k]: v } } : a));
  const open = (id: string, op: string) => setAction({ id, op, f: {} });

  /** The inputs and the request for each step. */
  const form = (p: Profile) => {
    if (!action || action.id !== p.id) return null;
    const f = action.f;
    const input = (k: string, label: string, ph?: string) => <label key={k} className="text-[13px]">{label}<input className={field} value={f[k] ?? ''} placeholder={ph} onChange={e => set(k, e.target.value)} /></label>;
    const select = (k: string, label: string, opts: [string, string][]) => (
      <label key={k} className="text-[13px]">{label}<select className={field} value={f[k] ?? ''} onChange={e => set(k, e.target.value)}><option value="">Choose…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    );
    const spec: Record<string, { fields: React.ReactNode[]; body: () => Record<string, unknown>; done: string }> = {
      submit: { fields: [input('instrument', 'Legal basis: law (id from Laws)', '/eli/…'), input('eId', 'Provision (e.g. art_1)')], body: () => ({ legalBasis: f.instrument ? [{ instrument: f.instrument.trim(), eId: (f.eId ?? '').trim() }] : [] }), done: 'Sent to legal review.' },
      review: { fields: [select('outcome', 'Outcome', [['cleared', 'Cleared'], ['returned', 'Returned to the draft']]), input('note', 'Note')], body: () => ({ outcome: f.outcome, note: f.note }), done: 'Legal review recorded.' },
      consult: { fields: [select('response', 'Response', [['agree', 'Agrees'], ['object', 'Objects'], ['no-comment', 'No comment']]), input('note', 'Note (required to object)')], body: () => ({ response: f.response, note: f.note }), done: 'Response recorded.' },
      approve: { fields: [input('authorisedBy', 'The act that authorises it under the nation\'s law', 'e.g. Constitution (Amendment) Act, assent 1 Dec'), input('note', 'Note')], body: () => ({ authorisedBy: f.authorisedBy, note: f.note }), done: 'Approval recorded.' },
      dispute: { fields: [input('grounds', 'Grounds: the disputed powers and provisions')], body: () => ({ grounds: f.grounds }), done: 'Dispute recorded: the parts it touches are frozen.' },
      resolve: { fields: [select('outcome', 'Decision', [['upheld', 'Upheld: the change stands'], ['set-aside', 'Set aside']]), input('reference', 'The decision (body, reference, date)'), input('note', 'Note')], body: () => ({ outcome: f.outcome, reference: f.reference, note: f.note }), done: 'Decision recorded.' },
      withdraw: { fields: [input('reason', 'Reason')], body: () => ({ reason: f.reason }), done: 'Withdrawn (kept in the history).' },
    };
    const s = spec[action.op];
    if (!s) return null;
    return (
      <form className="mt-2 grid gap-2 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void post({ op: action.op, id: p.id, ...s.body() }, s.done); }}>
        {s.fields}
        <div className="flex items-end gap-2"><Button type="submit" disabled={busy}>Record</Button><Button type="button" variant="secondary" onClick={() => setAction(null)}>Cancel</Button></div>
      </form>
    );
  };

  const steps = (p: Profile) => {
    const b: React.ReactNode[] = [];
    const btn = (op: string, label: string, direct?: boolean) => <Button key={op} variant="secondary" disabled={busy} onClick={() => (direct ? void post({ op, id: p.id }, `${label}: done.`) : open(p.id, op))}>{label}</Button>;
    if (p.status === 'draft') b.push(btn('submit', 'Send to legal review'));
    if (p.status === 'legal_review') b.push(btn('review', 'Record the legal review'));
    if (p.status === 'consultation') b.push(btn('consult', 'Answer for my institution'));
    if (p.status === 'security_validation') b.push(btn('validate', 'Run security validation', true));
    if (p.status === 'approval') b.push(btn('approve', 'Approve'));
    if (['draft', 'legal_review', 'consultation', 'security_validation', 'approval'].includes(p.status)) b.push(btn('refresh', 'Capture the parts again', true));
    if (['legal_review', 'consultation', 'security_validation', 'approval', 'scheduled', 'active'].includes(p.status)) b.push(btn('dispute', p.status === 'active' ? 'Record a review' : 'Record a dispute'));
    if (p.status === 'disputed' || p.status === 'suspended_pending_review') b.push(btn('resolve', 'Record the decision'));
    if (['draft', 'legal_review', 'consultation', 'security_validation', 'approval', 'scheduled', 'disputed'].includes(p.status)) b.push(btn('withdraw', 'Withdraw'));
    return b.length ? <div className="mt-2 flex flex-wrap gap-2">{b}</div> : null;
  };

  const card = (p: Profile) => (
    <li key={p.id} className="rounded-[3px] border border-line p-3 text-[13px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p><strong>Version {p.version}</strong> · {p.title}</p>
        <Pill tone={TONE[p.status] ?? 'warn'}>{d.labels.status[p.status]}</Pill>
      </div>
      <p className="text-[12px] text-ink-muted">
        Applies from {p.effectiveFrom} · digest {short(p.digest)} · drafted by {p.drafted.by}
        {p.previous ? ` · follows version ${p.previous.version}` : ' · the first version'} · touches {p.touches.length ? p.touches.map(partLabel).join(', ') : 'nothing'}
      </p>
      <dl className="mt-1 grid gap-x-3 text-[12px] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Law</dt><dd>{p.basis.length ? p.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ') : 'not cited yet (needed to leave the draft)'}</dd>
        {p.consult.length ? <><dt className="font-semibold">Consulted</dt><dd>{p.consult.map(i => { const c = p.consultations.find(x => x.institution === i); return `${nameOf(i)}: ${c ? `${c.response} (${c.by})` : 'waiting'}`; }).join('; ')}</dd></> : null}
        {p.legalReview ? <><dt className="font-semibold">Legal review</dt><dd>{p.legalReview.outcome} by {p.legalReview.by}{p.legalReview.note ? ` · ${p.legalReview.note}` : ''}</dd></> : null}
        {p.security ? <><dt className="font-semibold">Security validation</dt><dd>by {p.security.by}: {p.security.checks.map(c => `${c.ok ? '✓' : c.blocking ? '✗' : '!'} ${c.label}${c.detail ? ` (${c.detail})` : ''}`).join(' · ')}</dd></> : null}
        <dt className="font-semibold">Approvals</dt><dd>{p.approvals.length ? p.approvals.map(a => `${a.by} under ${a.authorisedBy}`).join('; ') : 'none yet'} (needs {Math.max(2, d.process.approvals)}, each a different person from the drafter)</dd>
        {p.constraints ? <><dt className="font-semibold">Migration and rollback</dt><dd>{p.constraints}</dd></> : null}
        {p.disputes.length ? <><dt className="font-semibold">Disputes</dt><dd>{p.disputes.map((x, i) => <span key={i} className="block">{x.raisedBy}: {x.grounds} · frozen: {x.frozen.map(partLabel).join(', ')}{x.resolution ? ` · ${x.resolution.outcome} by ${x.resolution.reference} (recorded by ${x.resolution.by})` : ' · waiting for a recorded decision'}</span>)}</dd></> : null}
      </dl>
      <details className="mt-1 text-[12px] text-ink-muted">
        <summary className="cursor-pointer">Parts ({p.parts.length}) and steps ({p.events.length})</summary>
        <ul className="mt-1 space-y-0.5">{p.parts.map(x => <li key={x.key}>{x.label}: version {x.version} · {short(x.digest)} · {x.summary}</li>)}</ul>
        <ol className="mt-1 space-y-0.5">{p.events.map(e => <li key={e.seq}>{e.at.slice(0, 16).replace('T', ' ')} · {e.step} by {e.by}{e.institution ? ` (${nameOf(e.institution)})` : ''}{e.outcome ? ` · ${e.outcome}` : ''}{e.reference ? ` · ${e.reference}` : ''}{e.note ? ` · ${e.note}` : ''}</li>)}</ol>
      </details>
      {steps(p)}
      {form(p)}
    </li>
  );

  return (
    <div className="space-y-4">
      <Card tight>
        <p className="text-[13px]"><strong>The legal process is the nation&apos;s.</strong> {d.notice}</p>
        {msg ? <p role="status" className={`mt-2 text-[12px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
      </Card>

      <Card tight>
        <h2 className="text-sm font-semibold">In force</h2>
        {d.inForce ? (
          <p className="text-[13px]">Version {d.inForce.version} · {d.inForce.title} · from {d.inForce.effectiveFrom} · digest {short(d.inForce.digest)}{d.inForce.status === 'suspended_pending_review' ? ' · under review: it stays in force until a recorded decision' : ''}</p>
        ) : <p className="text-[13px] text-ink-muted">No constitutional profile has been approved. Decisions and the access log record none until one is active; each part still applies as recorded.</p>}
        {d.drift.length ? <p className="mt-1 text-[12px] text-warn">Changed through their own process since it was approved: {d.drift.map(partLabel).join(', ')}. Draft a new version to approve them together.</p> : null}
        {d.frozen.length ? <p className="mt-1 text-[12px] text-alert">Frozen by a dispute: {d.frozen.map(f => `${partLabel(f.part)} (version ${f.version})`).join(', ')}. Only withdrawing a waiting proposal is open there.</p> : null}
        <h3 className="mt-3 text-[13px] font-semibold">The parts as they stand · digest {short(d.live.digest)}</h3>
        <ul className="mt-1 space-y-0.5 text-[12px]">
          {d.live.parts.map(x => <li key={x.key}><strong>{x.label}</strong>: version {x.version} · {short(x.digest)} · {x.summary}{x.waiting ? ` · ${x.waiting} change(s) waiting` : ''}</li>)}
        </ul>
        <p className="mt-1 text-[12px] text-ink-muted">Each part keeps its own change process (Who is responsible, Offices, Relationships, Ministries &amp; agencies, the country&apos;s rules); the profile records which versions were approved together.</p>
      </Card>

      <Card tight>
        <h2 className="text-sm font-semibold">Draft a new version</h2>
        {!d.setupComplete ? <p className="text-[12px] text-ink-muted">Available once first-run setup is complete.</p> : (
          <form className="mt-2 grid gap-2 text-[13px] md:grid-cols-3" onSubmit={e => { e.preventDefault(); void post({ op: 'draft', title: draft.title, ...(draft.effectiveFrom ? { effectiveFrom: draft.effectiveFrom } : {}), consult: draft.consult, ...(draft.constraints ? { constraints: draft.constraints } : {}) }, 'Drafted: the parts as they stand are captured.'); }}>
            <label>Title (the amendment or order it carries out)<input className={field} value={draft.title} onChange={e => setDraft(x => ({ ...x, title: e.target.value }))} required /></label>
            <label>Applies from (YYYY-MM-DD)<input className={field} value={draft.effectiveFrom} onChange={e => setDraft(x => ({ ...x, effectiveFrom: e.target.value }))} placeholder="today" /></label>
            <label>Migration and rollback constraints<input className={field} value={draft.constraints} onChange={e => setDraft(x => ({ ...x, constraints: e.target.value }))} /></label>
            <fieldset className="md:col-span-3">
              <legend>Institutions to consult{d.process.consultation === 'required' ? ' (the nation requires at least one)' : ' (optional)'}</legend>
              <div className="flex flex-wrap gap-3">
                {d.institutions.map(i => (
                  <label key={i.id} className="flex items-center gap-1 text-[12px]">
                    <input type="checkbox" checked={draft.consult.includes(i.id)} onChange={e => setDraft(x => ({ ...x, consult: e.target.checked ? [...x.consult, i.id] : x.consult.filter(c => c !== i.id) }))} />{i.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div><Button type="submit" disabled={busy}>Draft</Button></div>
          </form>
        )}
      </Card>

      <section aria-labelledby="cp-current">
        <h2 id="cp-current" className="mb-2 text-sm font-semibold">On the way, in force or disputed</h2>
        {current.length ? <ul className="space-y-2">{current.map(card)}</ul> : <p className="text-[12px] text-ink-muted">None.</p>}
      </section>

      {earlier.length ? (
        <section aria-labelledby="cp-history">
          <h2 id="cp-history" className="mb-2 text-sm font-semibold">History</h2>
          <ul className="space-y-2">{earlier.map(card)}</ul>
        </section>
      ) : null}

      <Card tight>
        <h2 className="text-sm font-semibold">The nation&apos;s steps</h2>
        <p className="text-[12px] text-ink-muted">
          Consultation {d.process.consultation} · {d.process.approvals} approvals{d.process.legalReviewInstitution ? ` · legal review by ${nameOf(d.process.legalReviewInstitution)}` : ''} · {d.process.adopted ? 'adopted by the nation' : 'platform defaults'}.
          The nation may add steps (require consultation, more approvers, name who does the legal review); the platform minimum (two approvers, each different from the drafter) always holds.
        </p>
        {d.process.changes.pending ? (
          <div className="mt-2 text-[13px]">
            <p>Waiting: consultation {d.process.changes.pending.values.consultation}, {d.process.changes.pending.values.approvals} approvals · proposed by {d.process.changes.pending.by}</p>
            <div className="mt-1 flex gap-2">
              <Button disabled={busy} onClick={() => void post({ op: 'process-confirm' }, 'Confirmed.')}>Confirm</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'process-withdraw' }, 'Withdrawn.')}>Withdraw</Button>
            </div>
          </div>
        ) : (
          <form className="mt-2 grid gap-2 text-[13px] md:grid-cols-5" onSubmit={e => { e.preventDefault(); void post({ op: 'process-propose', ...(proc.consultation ? { consultation: proc.consultation } : {}), ...(proc.approvals ? { approvals: Number(proc.approvals) } : {}), ...(proc.legalReviewInstitution ? { legalReviewInstitution: proc.legalReviewInstitution } : {}), legalBasis: proc.instrument ? [{ instrument: proc.instrument.trim(), eId: proc.eId.trim() }] : [] }, 'Proposed: a different official confirms it.'); }}>
            <label>Consultation<select className={field} value={proc.consultation} onChange={e => setProc(x => ({ ...x, consultation: e.target.value }))}><option value="">Keep</option><option value="optional">Optional</option><option value="required">Required</option></select></label>
            <label>Approvals (2–9)<input className={field} value={proc.approvals} onChange={e => setProc(x => ({ ...x, approvals: e.target.value }))} placeholder="keep" /></label>
            <label>Legal review by<select className={field} value={proc.legalReviewInstitution} onChange={e => setProc(x => ({ ...x, legalReviewInstitution: e.target.value }))}><option value="">Keep</option>{d.institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
            <label>Legal basis: law<input className={field} value={proc.instrument} onChange={e => setProc(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
            <label>Provision<input className={field} value={proc.eId} onChange={e => setProc(x => ({ ...x, eId: e.target.value }))} /></label>
            <div><Button type="submit" disabled={busy}>Propose</Button></div>
          </form>
        )}
      </Card>
    </div>
  );
}
