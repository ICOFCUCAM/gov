'use client';

// The legislature's workspace (plan phase 7; guidance §2.3, §6.2): the bills
// the clerk keeps, one bill's full record, and the legislative procedure.
// Reads /api/legislature (lib/legislature/register.ts). The legislature's own
// officials see the full record and the clerk's actions; the head of state's
// office sees bills passed and on, to record assent; everyone else sees what
// the chamber makes public. Every step is refused by the server unless the
// signed-in official may take it (lib/auth/roles.ts).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const small = 'text-xs text-ink-muted';

interface Stage { key: string; label: string; kind: string; chamber?: string; vote?: boolean; optional?: boolean }
interface Procedure {
  version: number; title: string; chambers: string[]; stages: Stage[]; state: string; fromReference?: boolean;
  votes: { names: string; majority: string; quorum?: number; membership?: number }; assent: { required: boolean };
  publicRecord: { bills: string; votes: string }; basis: { title?: string; instrument: string; num?: string; eId: string }[];
  author: string; createdAt: string; approvedBy?: string; activeFrom?: string;
}
interface Provision { eId: string; num: string; heading?: string; text: string; parent?: string }
interface Text { n: number; label: string; date: string; digest: string; provisions: Provision[]; by?: string }
interface Kept { values: Record<string, unknown>; correction: string; at: string }
interface Journal { id?: string; kind: string; date: string; stage?: string; text: string; by?: string; history?: Kept[]; corrected?: boolean }
interface Vote { id?: string; stage: string; question: string; date: string; yes: number; no: number; abstain: number; result: string; names?: { name: string; vote: string }[]; division?: boolean; rule?: string; by?: string; history?: Kept[]; corrected?: boolean; on?: string }
interface Amendment { id?: string; number: string; proposer?: string; text: string; outcome: string }
interface Report { committee: string; date: string; recommendation: string; summary: string; reference?: string }
interface Correction { id: string; target: { kind: string; id: string }; values: Record<string, unknown>; reason: string; by: string; at: string; state: string; confirmedBy?: string }
interface Bill {
  id: string; number: string; title: string; summary?: string; sponsor?: string; chamber?: string; state: string; stage: string; procedureVersion?: number;
  texts: Text[]; journal: Journal[]; votes?: Vote[]; amendments: Amendment[]; reports: Report[]; referrals?: { committee: string; date: string }[];
  passed?: { date: string; textVersion: number }; assent?: { outcome: string; date: string; communicated?: boolean; by?: string };
  commencement?: { inForce: string; note?: string } | string; publication?: { date: string; reference: string; actNumber: string };
  certifications?: { digest: string; by: string; at: string }[]; corrections?: Correction[]; law?: { instrument: string; version: string }[];
  full?: boolean; certified?: { at: string; digest: string; current: boolean };
}

const STATE: Record<string, string> = {
  'in-progress': 'Before the chamber', passed: 'Passed', assented: 'Assented', 'assent-withheld': 'Assent withheld',
  published: 'Published as law', withdrawn: 'Withdrawn', lapsed: 'Lapsed', defeated: 'Defeated',
};

async function call<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${r.status})`);
  return j as T;
}

/** Provisions from plain lines: "1 Short title: This Act may be cited…" or "1. Every public body…". */
export function provisionsFromLines(text: string): Provision[] {
  const seen = new Set<string>();
  return text.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
    const m = /^(\d+[A-Za-z]?|[A-Za-z]{1,3}\d*)[.):]?\s+(.*)$/.exec(line);
    const num = m ? m[1]! : String(i + 1);
    let eId = `sec_${num.toLowerCase().replace(/[^a-z0-9]/g, '') || i + 1}`;
    while (seen.has(eId)) eId = `${eId}_${i + 1}`;
    seen.add(eId);
    return { eId, num, text: m ? m[2]! : line };
  });
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-line bg-surface-2 p-3 text-sm">{children}</p>;
}

// ── Bills ───────────────────────────────────────────────────────────────────

export function BillsWorkspace() {
  const [data, setData] = React.useState<{ bills: Bill[]; legislature: { id: string; name: string } | null; procedure: Procedure | null; ownOfficial: boolean } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [f, setF] = React.useState({ title: '', number: '', sponsor: '', chamber: '', summary: '', date: '', text: '' });
  const load = React.useCallback(() => call<NonNullable<typeof data>>('/api/legislature/bills').then(setData).catch(e => setMsg(e.message)), []);
  React.useEffect(() => { void load(); }, [load]);

  const introduce = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await call<{ bill: Bill }>('/api/legislature/bills', { title: f.title, number: f.number || undefined, sponsor: f.sponsor || undefined, chamber: f.chamber || undefined, summary: f.summary || undefined, date: f.date || undefined, provisions: provisionsFromLines(f.text) });
      setMsg(`${r.bill.number} introduced.`);
      setF({ title: '', number: '', sponsor: '', chamber: '', summary: '', date: '', text: '' });
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not introduce the bill'); } finally { setBusy(false); }
  };
  const stageLabel = (b: Bill) => (b.full ? data?.procedure?.stages.find(s => s.key === b.stage)?.label ?? b.stage : b.stage);

  return (
    <div className="space-y-6">
      {!data ? null : !data.legislature ? (
        <Notice>No legislature is named yet. Its record is kept by the institution the nation names for the legislature under <Link className="underline" href="/gov/configuration/responsible">Who is responsible</Link>.</Notice>
      ) : !data.procedure ? (
        <Notice>{data.legislature.name} has not approved its legislative procedure yet, so no bill can be introduced. <Link className="underline" href="/gov/legislature/procedure">Draft it from the reference</Link>; a different official who can sign there approves it.</Notice>
      ) : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Bills" meta={data ? `${data.bills.length} ${data.bills.length === 1 ? 'bill' : 'bills'}${data.legislature ? ` · kept by ${data.legislature.name}` : ''}` : 'loading'}>
        {data?.bills.length ? (
          <ul className="divide-y divide-line">
            {data.bills.map(b => (
              <li key={b.id} className="py-2">
                <Link className="font-medium underline-offset-2 hover:underline" href={`/gov/legislature/bills/${encodeURIComponent(b.id)}`}>{b.number} — {b.title}</Link>
                <p className={small}>{STATE[b.state] ?? b.state} · {stageLabel(b)}{b.sponsor ? ` · introduced by ${b.sponsor}` : ''}{b.full ? '' : ' · as the chamber publishes it'}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No bills recorded. Nothing is entered for the legislature.</p>}
      </Section>
      {data?.ownOfficial && data.procedure ? (
        <Section title="Introduce a bill" meta={`under procedure version ${data.procedure.version}`}>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-sm">Long title<input className={field} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} /></label>
            <label className="text-sm">Number (optional)<input className={field} value={f.number} onChange={e => setF(x => ({ ...x, number: e.target.value }))} placeholder="Given automatically when empty" /></label>
            <label className="text-sm">Introduced by<input className={field} value={f.sponsor} onChange={e => setF(x => ({ ...x, sponsor: e.target.value }))} /></label>
            <label className="text-sm">Chamber
              <select className={field} value={f.chamber} onChange={e => setF(x => ({ ...x, chamber: e.target.value }))}>
                {data.procedure.chambers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Date introduced<input type="date" className={field} value={f.date} onChange={e => setF(x => ({ ...x, date: e.target.value }))} /></label>
            <label className="text-sm">Summary<input className={field} value={f.summary} onChange={e => setF(x => ({ ...x, summary: e.target.value }))} /></label>
          </div>
          <label className="mt-2 block text-sm">Text as introduced, one section per line (&quot;1 This Act may be cited as …&quot;)
            <textarea className={`${field} h-32 font-mono`} value={f.text} onChange={e => setF(x => ({ ...x, text: e.target.value }))} />
          </label>
          <div className="mt-2"><Button disabled={busy || !f.title || !f.text.trim()} onClick={() => void introduce()}>Introduce</Button></div>
        </Section>
      ) : null}
    </div>
  );
}

// ── One bill ────────────────────────────────────────────────────────────────

export function BillRecord({ id }: { id: string }) {
  const [data, setData] = React.useState<{ bill: Bill; full: boolean; certification?: { digest: string; by: string; at: string; current: boolean } | null; procedure?: Procedure | null; ownOfficial?: boolean } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const url = `/api/legislature/bills/${encodeURIComponent(id)}`;
  const load = React.useCallback(() => call<NonNullable<typeof data>>(url).then(setData).catch(e => setMsg(e.message)), [url]);
  React.useEffect(() => { void load(); }, [load]);

  const act = async (body: Record<string, unknown>, done: string, path = url) => {
    setBusy(true); setMsg(null);
    try { await call(path, body); setMsg(done); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Refused'); } finally { setBusy(false); }
  };

  if (!data) return <p className="text-sm text-ink-muted">{msg ?? 'Loading…'}</p>;
  const b = data.bill;
  const p = data.procedure ?? null;
  const label = (k?: string) => (data.full ? p?.stages.find(s => s.key === k)?.label ?? k ?? '' : k ?? '');
  const own = !!data.ownOfficial && data.full;
  const commencement = typeof b.commencement === 'string' ? b.commencement : b.commencement?.inForce;

  return (
    <div className="space-y-6">
      <div>
        <p className={small}><Link className="underline" href="/gov/legislature">Bills</Link> · {b.number}</p>
        <h2 className="text-lg font-semibold">{b.title}</h2>
        <p className="text-sm">{STATE[b.state] ?? b.state} · {label(b.stage)}{b.sponsor ? ` · introduced by ${b.sponsor}` : ''}{b.chamber ? ` · ${b.chamber}` : ''}{b.procedureVersion ? ` · procedure version ${b.procedureVersion}` : ''}</p>
        {b.summary ? <p className="mt-1 text-sm">{b.summary}</p> : null}
        {!data.full ? <p className={small}>As the chamber publishes it. The full record is kept by the legislature&apos;s own officials.</p> : null}
      </div>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Clerk's certification" meta={data.certification ? (data.certification.current ? 'current' : 'stale: the record changed since') : b.certified ? (b.certified.current ? 'current' : 'stale') : 'not certified'}>
        {data.certification || b.certified ? (
          <p className="text-sm">Certified {(data.certification?.at ?? b.certified!.at).slice(0, 10)}{data.certification ? ` by ${data.certification.by}` : ''} · <span className="font-mono text-xs break-all">{data.certification?.digest ?? b.certified!.digest}</span></p>
        ) : <p className="text-sm text-ink-muted">The clerk has not certified this record.</p>}
        {b.law?.length ? <p className="mt-1 text-sm">In the laws register: {b.law.map(l => <Link key={l.version} className="underline" href="/gov/law">{l.instrument}</Link>)}</p> : null}
        {own ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void act({ op: 'certify' }, 'Record certified.')}>Certify the record as it stands</Button>
            {b.state === 'published' ? <Button disabled={busy} onClick={() => void act({ op: 'transmit' }, 'Sent to the laws register: a different official of the law-register authority confirms it.')}>Send the enacted text to the laws register</Button> : null}
          </div>
        ) : null}
      </Section>

      <Section title="Text" meta={`${b.texts.length} ${b.texts.length === 1 ? 'version' : 'versions'}`}>
        <ul className="space-y-2">
          {[...b.texts].reverse().map((t, i) => (
            <li key={t.n} className="rounded border border-line p-2">
              <details open={i === 0}>
                <summary className="cursor-pointer text-sm font-medium">Version {t.n}: {t.label} · {t.date}{b.passed?.textVersion === t.n ? ' · text as passed' : ''} <span className="font-mono text-xs">{t.digest.slice(0, 12)}</span></summary>
                <ol className="mt-2 space-y-1 text-sm">{t.provisions.map(pr => <li key={pr.eId}><strong>{pr.num}</strong>{pr.heading ? ` ${pr.heading}` : ''} {pr.text !== pr.heading ? pr.text : ''}</li>)}</ol>
                <a className="mt-1 inline-block text-xs underline" href={`${url}/akn?version=${t.n}`}>Akoma Ntoso file</a>
              </details>
            </li>
          ))}
        </ul>
        {own && b.state === 'in-progress' ? <NewText bill={b} busy={busy} act={act} /> : null}
      </Section>

      <Section title="Proceedings" meta="the journal, in order">
        <ol className="space-y-1 text-sm">
          {b.journal.map((j, i) => (
            <li key={j.id ?? i}>
              <span className="tabular-nums">{j.date}</span> · {j.text}{j.by ? <span className={small}> · recorded by {j.by}</span> : null}
              {j.history?.length || j.corrected ? <span className={small}> · corrected{j.history?.length ? ` (earlier: ${j.history.map(h => `${String(h.values.date)} ${String(h.values.text)}`).join('; ')})` : ''}</span> : null}
              {own && j.id && !['certification', 'transmitted', 'correction'].includes(j.kind) ? (
                <button className="ms-2 text-xs underline" disabled={busy} onClick={() => {
                  const text = window.prompt('Corrected entry', j.text);
                  const reason = text ? window.prompt('Why is the record corrected? (the chamber\'s decision or the error found)') : null;
                  if (text && reason) void act({ op: 'correct', target: { kind: 'journal', id: j.id }, values: { text }, reason }, 'Correction proposed: a different official who can sign confirms it.');
                }}>Propose a correction</button>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Votes" meta={b.votes ? `${b.votes.length} recorded` : 'not published'}>
        {b.votes?.length ? (
          <ul className="space-y-2 text-sm">
            {b.votes.map((v, i) => (
              <li key={v.id ?? i} className="rounded border border-line p-2">
                <p>{v.date} · {label(v.stage)} · {v.question}</p>
                <p className="font-medium">{v.yes} yes, {v.no} no, {v.abstain} abstained — {v.result}{v.rule ? <span className={small}> ({v.rule})</span> : null}</p>
                {v.names?.length ? <p className={small}>{v.names.map(m => `${m.name} (${m.vote})`).join(', ')}</p> : null}
                {v.history?.length ? <p className={small}>Corrected; earlier: {v.history.map(h => `${String(h.values.yes)}/${String(h.values.no)}/${String(h.values.abstain)} ${String(h.values.result)}`).join('; ')}</p> : v.corrected ? <p className={small}>Corrected</p> : null}
                {v.by ? <p className={small}>Recorded by {v.by}</p> : null}
                {own && v.id ? <VoteCorrection voteId={v.id} busy={busy} act={act} /> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No votes recorded.</p>}
        {own && b.state === 'in-progress' ? <RecordVote bill={b} procedure={p} busy={busy} act={act} /> : null}
      </Section>

      {b.corrections?.length ? (
        <Section title="Corrections" meta="through the chamber's process">
          <ul className="space-y-2 text-sm">
            {b.corrections.map(c => (
              <li key={c.id} className="rounded border border-line p-2">
                <p>{c.target.kind === 'vote' ? 'Recorded vote' : 'Journal entry'} · {Object.entries(c.values).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', ')}</p>
                <p className={small}>{c.reason} · proposed by {c.by} · {c.state}{c.confirmedBy ? `, confirmed by ${c.confirmedBy}` : ''}</p>
                {own && c.state === 'waiting' ? (
                  <div className="mt-1 flex gap-2">
                    <Button disabled={busy} onClick={() => void act({ op: 'confirm-correction', correction: c.id }, 'Correction confirmed; the earlier version is kept.')}>Confirm</Button>
                    <Button variant="secondary" disabled={busy} onClick={() => void act({ op: 'withdraw-correction', correction: c.id }, 'Withdrawn.')}>Withdraw</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Amendments" meta={`${b.amendments.length}`}>
        {b.amendments.length ? (
          <ul className="space-y-2 text-sm">
            {b.amendments.map(m => (
              <li key={m.number}>
                <strong>{m.number}</strong>{m.proposer ? ` · ${m.proposer}` : ''} · {m.outcome}<span className="block">{m.text}</span>
                {own && m.outcome === 'pending' && b.state === 'in-progress' ? (
                  <span className="mt-1 flex gap-2">
                    {['agreed', 'negatived', 'withdrawn'].map(o => <Button key={o} variant="secondary" disabled={busy} onClick={() => void act({ op: 'decide-amendment', amendment: m.id ?? m.number, outcome: o }, `Amendment ${m.number} ${o}.`)}>{o[0]!.toUpperCase() + o.slice(1)}</Button>)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No amendments.</p>}
        {own && b.state === 'in-progress' ? <ProposeAmendment busy={busy} act={act} /> : null}
      </Section>

      <Section title="Committees" meta={`${b.referrals?.length ?? 0} referrals · ${b.reports.length} reports`}>
        {b.referrals?.length ? <ul className="text-sm">{b.referrals.map((r, i) => <li key={i}>{r.date} · referred to {r.committee}</li>)}</ul> : null}
        {b.reports.length ? <ul className="mt-2 space-y-1 text-sm">{b.reports.map((r, i) => <li key={i}><strong>{r.committee}</strong> · {r.date} · {r.recommendation}{r.reference ? ` · ${r.reference}` : ''}<span className="block">{r.summary}</span></li>)}</ul> : null}
        {!b.referrals?.length && !b.reports.length ? <p className="text-sm text-ink-muted">No committee referral recorded.</p> : null}
        {own && b.state === 'in-progress' ? <Committees bill={b} busy={busy} act={act} /> : null}
      </Section>

      <Section title="Passage, assent and publication" meta={STATE[b.state] ?? b.state}>
        <ul className="space-y-1 text-sm">
          <li>Passed: {b.passed ? `${b.passed.date} (text version ${b.passed.textVersion})` : '—'}</li>
          <li>Assent: {b.assent ? `${b.assent.outcome} ${b.assent.date}${b.assent.communicated ? ' (as communicated to the chamber)' : ''}${b.assent.by ? ` · recorded by ${b.assent.by}` : ''}` : p && !p.assent.required ? 'not needed under this procedure' : '—'}</li>
          <li>In force from: {commencement ?? '—'}</li>
          <li>Published: {b.publication ? `act ${b.publication.actNumber} · ${b.publication.reference} · ${b.publication.date}` : '—'}</li>
        </ul>
        {data.full ? <Steps bill={b} procedure={p} own={own} busy={busy} act={act} url={url} /> : null}
      </Section>
    </div>
  );
}

type Act = (body: Record<string, unknown>, done: string, path?: string) => Promise<void>;

function NewText({ bill, busy, act }: { bill: Bill; busy: boolean; act: Act }) {
  const [f, setF] = React.useState({ label: '', text: '' });
  const agreed = bill.amendments.filter(m => m.outcome === 'agreed' && m.id).map(m => m.id!);
  return (
    <details className="mt-3"><summary className="cursor-pointer text-sm">Record a new version of the text</summary>
      <label className="mt-2 block text-sm">Which version<input className={field} value={f.label} onChange={e => setF(x => ({ ...x, label: e.target.value }))} placeholder="As amended in committee" /></label>
      <label className="mt-2 block text-sm">Text, one section per line<textarea className={`${field} h-28 font-mono`} value={f.text} onChange={e => setF(x => ({ ...x, text: e.target.value }))} /></label>
      <Button className="mt-2" disabled={busy || !f.label || !f.text.trim()} onClick={() => void act({ op: 'text', label: f.label, provisions: provisionsFromLines(f.text), amendments: agreed }, 'New version recorded; the earlier ones are kept.')}>Record version</Button>
    </details>
  );
}

function RecordVote({ bill, procedure, busy, act }: { bill: Bill; procedure: Procedure | null; busy: boolean; act: Act }) {
  const [f, setF] = React.useState({ question: '', yes: '', no: '', abstain: '', division: false, names: '', on: 'bill', amendment: '' });
  const names = f.names.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name, vote] = l.split(/\s*[,;|]\s*/); return { name: name ?? '', vote: (vote ?? '').toLowerCase() }; });
  return (
    <details className="mt-3"><summary className="cursor-pointer text-sm">Record a vote (the clerk)</summary>
      <p className={small}>Majority: {procedure?.votes.majority ?? '—'}{procedure?.votes.quorum ? ` · quorum ${procedure.votes.quorum}` : ''} · names {procedure?.votes.names ?? '—'}. The result follows these rules.</p>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <label className="text-sm">On<select className={field} value={f.on} onChange={e => setF(x => ({ ...x, on: e.target.value }))}><option value="bill">The bill</option><option value="amendment">An amendment</option></select></label>
        {f.on === 'amendment' ? <label className="text-sm">Amendment<select className={field} value={f.amendment} onChange={e => setF(x => ({ ...x, amendment: e.target.value }))}><option value="">—</option>{bill.amendments.filter(m => m.outcome === 'pending').map(m => <option key={m.number} value={m.id ?? m.number}>{m.number}</option>)}</select></label> : null}
        <label className="text-sm">Yes<input inputMode="numeric" className={field} value={f.yes} onChange={e => setF(x => ({ ...x, yes: e.target.value }))} /></label>
        <label className="text-sm">No<input inputMode="numeric" className={field} value={f.no} onChange={e => setF(x => ({ ...x, no: e.target.value }))} /></label>
        <label className="text-sm">Abstained<input inputMode="numeric" className={field} value={f.abstain} onChange={e => setF(x => ({ ...x, abstain: e.target.value }))} /></label>
      </div>
      <label className="mt-2 block text-sm">Question (optional)<input className={field} value={f.question} onChange={e => setF(x => ({ ...x, question: e.target.value }))} /></label>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.division} onChange={e => setF(x => ({ ...x, division: e.target.checked }))} /> A division (names recorded where the standing orders say)</label>
      <label className="mt-2 block text-sm">Names, one per line (&quot;Name, yes&quot;)<textarea className={`${field} h-20`} value={f.names} onChange={e => setF(x => ({ ...x, names: e.target.value }))} /></label>
      <Button className="mt-2" disabled={busy} onClick={() => void act({ op: 'vote', on: f.on, ...(f.on === 'amendment' ? { amendment: f.amendment } : {}), question: f.question || undefined, yes: Number(f.yes || 0), no: Number(f.no || 0), abstain: Number(f.abstain || 0), division: f.division, ...(names.length ? { names } : {}) }, 'Vote recorded.')}>Record vote</Button>
    </details>
  );
}

function VoteCorrection({ voteId, busy, act }: { voteId: string; busy: boolean; act: Act }) {
  const [f, setF] = React.useState({ yes: '', no: '', abstain: '', reason: '' });
  return (
    <details className="mt-1"><summary className="cursor-pointer text-xs">Propose a correction</summary>
      <div className="mt-1 grid gap-2 md:grid-cols-4">
        {(['yes', 'no', 'abstain'] as const).map(k => <label key={k} className="text-xs">{k}<input inputMode="numeric" className={field} value={f[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} /></label>)}
        <label className="text-xs">Why<input className={field} value={f.reason} onChange={e => setF(x => ({ ...x, reason: e.target.value }))} /></label>
      </div>
      <Button className="mt-1" variant="secondary" disabled={busy || !f.reason} onClick={() => void act({ op: 'correct', target: { kind: 'vote', id: voteId }, reason: f.reason, values: Object.fromEntries((['yes', 'no', 'abstain'] as const).filter(k => f[k] !== '').map(k => [k, Number(f[k])])) }, 'Correction proposed: a different official who can sign confirms it.')}>Propose</Button>
    </details>
  );
}

function ProposeAmendment({ busy, act }: { busy: boolean; act: Act }) {
  const [f, setF] = React.useState({ number: '', proposer: '', text: '' });
  return (
    <details className="mt-3"><summary className="cursor-pointer text-sm">Record an amendment moved</summary>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <label className="text-sm">Number<input className={field} value={f.number} onChange={e => setF(x => ({ ...x, number: e.target.value }))} /></label>
        <label className="text-sm">Moved by<input className={field} value={f.proposer} onChange={e => setF(x => ({ ...x, proposer: e.target.value }))} /></label>
      </div>
      <label className="mt-2 block text-sm">Text<textarea className={`${field} h-16`} value={f.text} onChange={e => setF(x => ({ ...x, text: e.target.value }))} /></label>
      <Button className="mt-2" disabled={busy || !f.text} onClick={() => void act({ op: 'amendment', number: f.number || undefined, proposer: f.proposer || undefined, text: f.text }, 'Amendment recorded.')}>Record</Button>
    </details>
  );
}

function Committees({ bill, busy, act }: { bill: Bill; busy: boolean; act: Act }) {
  const [f, setF] = React.useState({ committee: '', recommendation: 'proceed', summary: '', reference: '' });
  const referred = [...new Set((bill.referrals ?? []).map(r => r.committee))];
  return (
    <details className="mt-3"><summary className="cursor-pointer text-sm">Refer to a committee, or record its report</summary>
      <label className="mt-2 block text-sm">Committee<input className={field} list="committees" value={f.committee} onChange={e => setF(x => ({ ...x, committee: e.target.value }))} /></label>
      <datalist id="committees">{referred.map(c => <option key={c} value={c} />)}</datalist>
      <Button className="mt-2" variant="secondary" disabled={busy || !f.committee} onClick={() => void act({ op: 'refer', committee: f.committee }, 'Referral recorded.')}>Refer</Button>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <label className="text-sm">Recommendation<select className={field} value={f.recommendation} onChange={e => setF(x => ({ ...x, recommendation: e.target.value }))}>
          <option value="proceed">Proceed</option><option value="proceed-with-amendments">Proceed with amendments</option><option value="not-proceed">Do not proceed</option><option value="no-recommendation">No recommendation</option>
        </select></label>
        <label className="text-sm">Report reference<input className={field} value={f.reference} onChange={e => setF(x => ({ ...x, reference: e.target.value }))} /></label>
      </div>
      <label className="mt-2 block text-sm">Summary of the report<textarea className={`${field} h-16`} value={f.summary} onChange={e => setF(x => ({ ...x, summary: e.target.value }))} /></label>
      <Button className="mt-2" disabled={busy || !f.committee || !f.summary} onClick={() => void act({ op: 'report', committee: f.committee, recommendation: f.recommendation, summary: f.summary, reference: f.reference || undefined }, 'Report recorded.')}>Record report</Button>
    </details>
  );
}

function Steps({ bill, procedure, own, busy, act, url }: { bill: Bill; procedure: Procedure | null; own: boolean; busy: boolean; act: Act; url: string }) {
  const [f, setF] = React.useState({ stage: '', inForce: '', reference: '', actNumber: '', outcome: 'assented', closeOutcome: 'withdrawn', reason: '' });
  const at = procedure?.stages.findIndex(s => s.key === bill.stage) ?? -1;
  const later = procedure?.stages.slice(at + 1) ?? [];
  const last = procedure?.stages.at(-1)?.key === bill.stage;
  const enacted = bill.state === 'assented' || (bill.state === 'passed' && procedure && !procedure.assent.required);
  return (
    <div className="mt-3 space-y-3">
      {own && bill.state === 'in-progress' ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Next stage<select className={field} value={f.stage} onChange={e => setF(x => ({ ...x, stage: e.target.value }))}><option value="">—</option>{later.map(s => <option key={s.key} value={s.key}>{s.label}{s.optional ? ' (may be passed over)' : ''}</option>)}</select></label>
          <Button variant="secondary" disabled={busy || !f.stage} onClick={() => void act({ op: 'stage', stage: f.stage }, 'Stage recorded.')}>Move to stage</Button>
          {last ? <Button disabled={busy} onClick={() => void act({ op: 'pass' }, 'Passed.')}>Record passage</Button> : null}
        </div>
      ) : null}
      {bill.state === 'passed' && procedure?.assent.required ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Assent<select className={field} value={f.outcome} onChange={e => setF(x => ({ ...x, outcome: e.target.value }))}><option value="assented">Given</option><option value="withheld">Withheld</option></select></label>
          <Button disabled={busy} onClick={() => void act({ outcome: f.outcome }, 'Assent recorded.', `${url}/assent`)}>Record assent</Button>
          <span className={small}>Recorded by the head of state&apos;s office (or by the clerk as communicated, where the nation names none).</span>
        </div>
      ) : null}
      {own && (enacted || bill.state === 'published') && !bill.commencement ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">In force from<input type="date" className={field} value={f.inForce} onChange={e => setF(x => ({ ...x, inForce: e.target.value }))} /></label>
          <Button variant="secondary" disabled={busy || !f.inForce} onClick={() => void act({ op: 'commence', inForce: f.inForce }, 'Commencement recorded.')}>Record commencement</Button>
        </div>
      ) : null}
      {own && enacted ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Publication reference<input className={field} value={f.reference} onChange={e => setF(x => ({ ...x, reference: e.target.value }))} /></label>
          <label className="text-sm">Act number<input className={field} value={f.actNumber} onChange={e => setF(x => ({ ...x, actNumber: e.target.value }))} /></label>
          <Button disabled={busy || !f.reference || !f.actNumber} onClick={() => void act({ op: 'publish', reference: f.reference, actNumber: f.actNumber }, 'Published.')}>Record publication</Button>
        </div>
      ) : null}
      {own && bill.state === 'in-progress' ? (
        <details><summary className="cursor-pointer text-sm">Withdrawn, lapsed or defeated</summary>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-sm">Outcome<select className={field} value={f.closeOutcome} onChange={e => setF(x => ({ ...x, closeOutcome: e.target.value }))}><option value="withdrawn">Withdrawn</option><option value="lapsed">Lapsed</option><option value="defeated">Defeated</option></select></label>
            <label className="text-sm">Why<input className={field} value={f.reason} onChange={e => setF(x => ({ ...x, reason: e.target.value }))} /></label>
            <Button variant="warn" disabled={busy || !f.reason} onClick={() => void act({ op: 'close', outcome: f.closeOutcome, reason: f.reason }, 'Recorded; the record stays.')}>Record</Button>
          </div>
        </details>
      ) : null}
    </div>
  );
}

// ── The legislative procedure ───────────────────────────────────────────────

export function LegislativeProcedurePanel() {
  const [data, setData] = React.useState<{ procedures: Procedure[]; active: Procedure | null; legislature: { id: string; name: string } | null; choices: { stageKinds: string[]; majorities: { key: string; label: string }[] } } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [f, setF] = React.useState({ title: '', chambers: '', stages: '', names: 'on-division', majority: 'simple', quorum: '', membership: '', assent: true, bills: 'introduced', votes: 'names', instrument: '', eId: '' });
  const load = React.useCallback(() => call<NonNullable<typeof data>>('/api/legislature/procedure').then(d => {
    setData(d);
    const base = d.active ?? d.procedures.find(p => p.state === 'reference')!;
    setF(x => (x.stages ? x : {
      ...x, title: base.state === 'reference' ? '' : base.title, chambers: base.chambers.join(', '),
      stages: base.stages.map(s => [s.key, s.label, s.kind, s.chamber, s.vote ? 'vote' : '', s.optional ? 'optional' : ''].filter(Boolean).join(' | ')).join('\n'),
      names: base.votes.names, majority: base.votes.majority, quorum: base.votes.quorum ? String(base.votes.quorum) : '', membership: base.votes.membership ? String(base.votes.membership) : '',
      assent: base.assent.required, bills: base.publicRecord.bills, votes: base.publicRecord.votes,
    }));
  }).catch(e => setMsg(e.message)), []);
  React.useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try { await call('/api/legislature/procedure', body); setMsg(done); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Refused'); } finally { setBusy(false); }
  };
  const draft = () => {
    const stages = f.stages.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]).map(parts => {
      const [key, label, kind, ...rest] = parts;
      const chamber = rest.find(x => x && x !== 'vote' && x !== 'optional');
      return { key, label: label || key, kind: kind || 'other', ...(chamber ? { chamber } : {}), ...(rest.includes('vote') ? { vote: true } : {}), ...(rest.includes('optional') ? { optional: true } : {}) };
    });
    void post({
      op: 'draft', fromReference: !data?.active, title: f.title || undefined, chambers: f.chambers.split(',').map(c => c.trim()).filter(Boolean), stages,
      votes: { names: f.names, majority: f.majority, ...(f.quorum ? { quorum: Number(f.quorum) } : {}), ...(f.membership ? { membership: Number(f.membership) } : {}) },
      assent: { required: f.assent }, publicRecord: { bills: f.bills, votes: f.votes },
      legalBasis: f.instrument ? [{ instrument: f.instrument.trim(), eId: f.eId.trim() }] : [],
    }, 'Drafted: a different official who can sign at the legislature approves it.');
  };
  const describeP = (p: Procedure) => `${p.stages.map(s => `${s.label}${s.vote ? ' (vote)' : ''}${s.optional ? ' (optional)' : ''}`).join(' → ')}`;

  return (
    <div className="space-y-6">
      {data && !data.legislature ? <Notice>No legislature is named yet: name it under <Link className="underline" href="/gov/configuration/responsible">Who is responsible</Link>. Only its own officials draft and approve its procedure.</Notice> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Procedure in force" meta={data?.active ? `version ${data.active.version} · from ${data.active.activeFrom}` : 'none approved'}>
        {data?.active ? (
          <div className="space-y-1 text-sm">
            <p><strong>{data.active.title}</strong> · {data.active.chambers.join(', ')}</p>
            <p>{describeP(data.active)}</p>
            <p className={small}>Majority {data.active.votes.majority}{data.active.votes.quorum ? ` · quorum ${data.active.votes.quorum}` : ''}{data.active.votes.membership ? ` · ${data.active.votes.membership} seats` : ''} · names {data.active.votes.names} · assent {data.active.assent.required ? 'needed' : 'not needed'} · public: bills {data.active.publicRecord.bills}, votes {data.active.publicRecord.votes}</p>
            <p className={small}>Drafted by {data.active.author}, approved by {data.active.approvedBy}{data.active.basis.length ? ` · rests on ${data.active.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}` : ''}</p>
          </div>
        ) : <p className="text-sm text-ink-muted">No legislative procedure is approved, so no bill can be introduced. The reference below is a starting point, never the nation&apos;s procedure.</p>}
      </Section>
      <Section title="Versions" meta="every version kept">
        <ul className="space-y-2 text-sm">
          {(data?.procedures ?? []).map(p => (
            <li key={p.version} className="rounded border border-line p-2">
              <p><strong>{p.state === 'reference' ? 'Reference (shipped, not approved)' : `Version ${p.version}`}</strong> · {p.state}{p.fromReference ? ' · drafted from the reference' : ''} · {p.title}</p>
              <p className={small}>{describeP(p)}</p>
              {p.state !== 'reference' ? <p className={small}>Drafted by {p.author} on {p.createdAt.slice(0, 10)}{p.approvedBy ? ` · approved by ${p.approvedBy}, from ${p.activeFrom}` : ''}</p> : null}
              {p.state === 'draft' ? (
                <div className="mt-1 flex gap-2">
                  <Button disabled={busy} onClick={() => void post({ op: 'approve', version: p.version }, 'Approved.')}>Approve</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void post({ op: 'withdraw', version: p.version, reason: 'Withdrawn' }, 'Withdrawn and kept.')}>Withdraw</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={data?.active ? 'Draft the next version' : 'Draft the procedure from the reference'} meta="the standing orders' own words">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">Title<input className={field} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="Standing orders of …" /></label>
          <label className="text-sm">Chambers (comma separated)<input className={field} value={f.chambers} onChange={e => setF(x => ({ ...x, chambers: e.target.value }))} /></label>
        </div>
        <label className="mt-2 block text-sm">Stages, in order: key | name | kind | chamber | vote | optional
          <textarea className={`${field} h-32 font-mono`} value={f.stages} onChange={e => setF(x => ({ ...x, stages: e.target.value }))} />
        </label>
        <p className={small}>Kinds: {data?.choices.stageKinds.join(', ')}. &quot;vote&quot;: the bill moves on only once a vote there is carried; &quot;optional&quot;: the standing orders let a bill pass over it.</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <label className="text-sm">Members&apos; names with votes<select className={field} value={f.names} onChange={e => setF(x => ({ ...x, names: e.target.value }))}><option value="always">Always</option><option value="on-division">On a division</option><option value="never">Never</option></select></label>
          <label className="text-sm">Majority<select className={field} value={f.majority} onChange={e => setF(x => ({ ...x, majority: e.target.value }))}>{(data?.choices.majorities ?? []).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
          <label className="text-sm">Quorum (members)<input inputMode="numeric" className={field} value={f.quorum} onChange={e => setF(x => ({ ...x, quorum: e.target.value }))} /></label>
          <label className="text-sm">Seats<input inputMode="numeric" className={field} value={f.membership} onChange={e => setF(x => ({ ...x, membership: e.target.value }))} /></label>
          <label className="text-sm">The public sees bills<select className={field} value={f.bills} onChange={e => setF(x => ({ ...x, bills: e.target.value }))}><option value="introduced">From introduction</option><option value="passed">Once passed</option><option value="enacted">Once enacted</option><option value="none">Not here</option></select></label>
          <label className="text-sm">The public sees votes<select className={field} value={f.votes} onChange={e => setF(x => ({ ...x, votes: e.target.value }))}><option value="names">With names</option><option value="counts">Counts only</option><option value="none">Not here</option></select></label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.assent} onChange={e => setF(x => ({ ...x, assent: e.target.checked }))} /> A passed bill needs assent before it is enacted</label>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="text-sm">Rests on (laws register instrument, optional)<input className={field} value={f.instrument} onChange={e => setF(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision<input className={field} value={f.eId} onChange={e => setF(x => ({ ...x, eId: e.target.value }))} placeholder="art_1" /></label>
        </div>
        <Button className="mt-2" disabled={busy || !f.chambers.trim()} onClick={draft}>Draft</Button>
      </Section>
    </div>
  );
}
