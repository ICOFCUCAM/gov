'use client';

// Independent oversight for the console (plan step I8; lib/oversight): the
// bodies the nation named (ombudsman, human rights institution,
// anti-corruption commission, public audit office, data-protection
// authority), their cases as the case list shows them, and, for a case, its
// findings with their versions, the responses of the institution concerned
// beside them (never changing them), follow-up, evidence requests made under
// an approved relationship, referrals (the case reference only) and the
// data-protection authority's requests to a controller.
//
// The person who raised a matter is never shown here: the page says that a
// protected identity exists, its role and whether the person is anonymous.
// Reading it is a separate act of the assigned or specifically authorised
// official, stating a purpose; the server checks it and writes every read and
// refusal to the access log. Cases move only through their own pages.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

interface Actor { id?: string; name: string; institution?: string }
interface Version { n: number; at: string; by: Actor; reason: string; criteria?: string; condition: string; cause?: string; effect?: string; evidence: string[]; recommendation: string }
interface Finding {
  number: string; body: string; concerns: string; stage: 'draft' | 'communicated' | 'issued'; versions: Version[]; decision?: string; sample?: true;
  responses: { n: number; at: string; by: Actor; position: string; text: string; action?: string; evidence: string[] }[];
  followUps: { n: number; at: string; by: Actor; status: string; note: string }[];
  case: { id: string; ref: string };
}
interface Evidence { number: string; to: string; relationship: { id: string; version: number; type: string }; purpose: string; requested: string; due?: string; at: string; submissions: { n: number; at: string; by: Actor; description: string; document?: { id: string; sha256?: string } }[]; closed?: unknown; case: { ref: string } }
interface Referral { number: string; to: string; kind: string; reason: string; at: string; case: { ref: string } }
interface Controller { number: string; controller: string; kind: string; records: { register: string; id: string }[]; purpose: string; asked: string; at: string; answer?: { at: string; outcome: string; reasons: string; by: Actor }; case: { ref: string } }
interface Body { slot: string; label: string; institution: string | null; name: string | null }
interface Overview { bodies: Body[]; findings: Finding[]; evidence: Evidence[]; referrals: Referral[]; controller: Controller[]; counts: Record<string, number>; names: Record<string, string>; labels: { stages: Record<string, string>; positions: string[] } }
interface CaseRow { id: string; ref: string; stage: string; package: { key: string }; source?: string; owner: string }
interface Detail { case: { id: string; ref: string; owner: string; stage: string; procedure: string; assignee?: string; sample?: true }; findings: Finding[]; evidence: Evidence[]; referrals: Referral[]; controller: Controller[]; identities: { id: string; role: string; anonymous: boolean }[] }

const PROCEDURES: [string, string][] = [
  ['ombudsman.complaint', 'Ombudsman complaints'], ['human-rights.complaint', 'Human rights complaints'], ['integrity.disclosure', 'Protected disclosures'],
  ['audit.engagement', 'Audit engagements'], ['data-protection.rights-request', 'Data-protection requests'], ['data-protection.investigation', 'Data-protection investigations'],
];
const ROLE: Record<string, string> = { complainant: 'complainant', whistleblower: 'person making a protected disclosure', witness: 'protected witness', 'data-subject': 'data subject' };
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

function FindingCard({ f, names, stages, onRespond }: { f: Finding; names: Record<string, string>; stages: Record<string, string>; onRespond: (finding: string, position: string, text: string) => Promise<string> }) {
  const v = f.versions.at(-1)!;
  const [position, setPosition] = React.useState('accepted');
  const [text, setText] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <li className="rounded border border-line p-2">
      <p className="flex flex-wrap items-center gap-2 text-sm"><strong>{f.number}</strong> · concerns {names[f.concerns] ?? f.concerns} · {stages[f.stage] ?? f.stage} · version {v.n}{f.versions.length > 1 ? ' (earlier versions kept)' : ''}{f.decision ? ' · sealed decision' : ''}{f.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</p>
      <dl className="mt-1 grid gap-x-3 text-xs sm:grid-cols-[max-content_1fr]">
        {v.criteria ? <><dt className="text-ink-muted">Criteria</dt><dd>{v.criteria}</dd></> : null}
        <dt className="text-ink-muted">Condition</dt><dd>{v.condition}</dd>
        {v.cause ? <><dt className="text-ink-muted">Cause</dt><dd>{v.cause}</dd></> : null}
        {v.effect ? <><dt className="text-ink-muted">Effect</dt><dd>{v.effect}</dd></> : null}
        <dt className="text-ink-muted">Evidence</dt><dd>{v.evidence.length ? v.evidence.join('; ') : 'none listed'}</dd>
        <dt className="text-ink-muted">Recommendation</dt><dd>{v.recommendation} <span className="text-ink-muted">(a recommendation, never an order)</span></dd>
        <dt className="text-ink-muted">Reasons</dt><dd>{v.reason} · {v.by.name}, {v.at.slice(0, 10)}</dd>
      </dl>
      <div className="mt-2 text-xs">
        <p className="font-medium">Response of the institution concerned</p>
        {f.responses.length ? <ul>{f.responses.map(r => <li key={r.n} className="border-t border-line py-1">{r.position.replace('-', ' ')} · {r.text}{r.action ? ` · will: ${r.action}` : ''} · {r.by.name}{r.by.institution ? ` (${names[r.by.institution] ?? r.by.institution})` : ''}, {r.at.slice(0, 10)}</li>)}</ul> : <p className="text-ink-muted">{f.stage === 'draft' ? 'Not yet sent for a response.' : 'No response yet.'}</p>}
        {f.stage !== 'draft' ? (
          <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void onRespond(f.number, position, text).then(setMsg); }}>
            <label className="text-xs">Position<select className={field} value={position} onChange={e => setPosition(e.target.value)}><option value="accepted">Accepted</option><option value="partly-accepted">Partly accepted</option><option value="disputed">Disputed</option></select></label>
            <label className="min-w-64 flex-1 text-xs">Response and reasons<input className={field} value={text} onChange={e => setText(e.target.value)} /></label>
            <Button type="submit" variant="secondary">Answer for the institution concerned</Button>
            {msg ? <span role="status">{msg}</span> : null}
          </form>
        ) : null}
        <p className="mt-1 text-ink-muted">A response sits beside the finding and never changes it; only the body corrects its finding, as a new version.</p>
      </div>
      {f.followUps.length ? <div className="mt-2 text-xs"><p className="font-medium">Follow-up</p><ul>{f.followUps.map(u => <li key={u.n} className="border-t border-line py-1">{u.status.replace('-', ' ')} · {u.note} · {u.by.name}, {u.at.slice(0, 10)}</li>)}</ul></div> : null}
    </li>
  );
}

export function OversightDesk() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [cases, setCases] = React.useState<Record<string, CaseRow[]>>({});
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [purpose, setPurpose] = React.useState('');
  const [identity, setIdentity] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/oversight', { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (r.ok && j) setData(j); else setMsg(j?.error ?? 'Could not read the oversight records');
    const out: Record<string, CaseRow[]> = {};
    for (const [p] of PROCEDURES) {
      const c = await fetch(`/api/cases?procedure=${p}&limit=50`, { cache: 'no-store' });
      const cj = await c.json().catch(() => null);
      out[p] = c.ok && cj?.cases ? cj.cases : [];
    }
    setCases(out);
  }, []);
  const open = React.useCallback(async (id: string) => {
    setIdentity(null);
    const r = await fetch(`/api/oversight?case=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (r.ok && j) setDetail(j); else setMsg(j?.error ?? 'You may not read this case');
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    // Open the first case named in the address (?case=), else the first ombudsman complaint.
    const want = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('case') : null;
    const first = want ?? Object.values(cases).flat()[0]?.id;
    if (first && !detail) void open(first);
  }, [cases, detail, open]);

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/oversight', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, j };
  };
  const respond = async (finding: string, position: string, text: string) => {
    const { ok, j } = await post({ op: 'respond', finding, position, text });
    if (ok && detail) await open(detail.case.id);
    return ok ? 'Recorded beside the finding.' : j.error;
  };
  const readIdentity = async (id: string) => {
    const { ok, j } = await post({ op: 'read-identity', id, purpose });
    setIdentity(ok ? `${j.result.anonymous ? 'Anonymous' : j.result.name}${j.result.contact ? ` · ${j.result.contact.method}: ${j.result.contact.value}` : ''} · consents to sharing: ${j.result.consentToShare ? 'yes' : 'no'} (this read is in the access log)` : `Refused: ${j.error}${/Sign in/.test(j.error ?? '') ? '' : ' (the refusal is in the access log)'}`);
  };

  const names = data?.names ?? {};
  const stages = data?.labels.stages ?? {};
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Independent oversight</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        Complaints, protected disclosures, audit engagements and data-protection requests, each worked only by the independent body the nation names under{' '}
        <Link className="underline" href="/gov/configuration/responsible#who-is-responsible">Who is responsible</Link>. Officials serving the whole government, auditors and administrators do not read or act on these cases.
        Findings are recommendations with reasons; the institution concerned answers beside them. Evidence and records are asked for only under an approved{' '}
        <Link className="underline" href="/gov/configuration/relationships">relationship</Link>, and every read is in the <Link className="underline" href="/gov/access-log">access log</Link>.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Oversight bodies" meta="each optional; none is named by default">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{(data?.bodies ?? []).map(b => (
          <li key={b.slot} className="rounded border border-line p-2"><span className="font-medium">{b.label}</span>: {b.name ?? <span className="text-ink-muted">not named: nobody works these cases until the nation names its body</span>}</li>
        ))}</ul>
      </Section>

      <Section title="Cases" meta="as the case list shows them: no protected identity, no complaint text">
        <div className="grid gap-2 md:grid-cols-2">{PROCEDURES.map(([p, title]) => (
          <div key={p} className="rounded border border-line p-2 text-sm">
            <p className="font-medium">{title}</p>
            {cases[p]?.length ? <ul>{cases[p]!.map(c => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 border-t border-line py-1">
                <button type="button" className="underline" onClick={() => void open(c.id)}>{c.ref}</button> · {c.stage}{c.source === 'sample' ? <SignalTag kind="sample" source="a sample case" /> : null}
                <Link className="text-xs underline" href={`/gov/cases/${c.id}`}>case page</Link>
              </li>
            ))}</ul> : <p className="text-xs text-ink-muted">No case you may read.</p>}
          </div>
        ))}</div>
      </Section>

      {detail ? (
        <Section title={`Case ${detail.case.ref}`} meta={`${detail.case.procedure} · ${detail.case.stage}${detail.case.assignee ? ` · assigned to ${detail.case.assignee}` : ''}`}>
          <div className="rounded border border-line p-2 text-sm">
            <p className="font-medium">Protected identity</p>
            {detail.identities.length ? detail.identities.map(i => (
              <div key={i.id} className="mt-1">
                <p>The {ROLE[i.role] ?? i.role} {i.anonymous ? 'asked to stay anonymous: no name or contact is kept' : 'is kept apart from the case'} ({i.id}). <strong>Not shown here, in the case list, a search or an export.</strong></p>
                {!i.anonymous ? (
                  <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void readIdentity(i.id); }}>
                    <label className="min-w-64 flex-1 text-xs">Purpose (the assigned or authorised official only)<input className={field} value={purpose} onChange={e => setPurpose(e.target.value)} /></label>
                    <Button type="submit" variant="secondary">Read the protected identity</Button>
                  </form>
                ) : null}
              </div>
            )) : <p className="text-ink-muted">No protected identity recorded for this case.</p>}
            {identity ? <p role="status" className="mt-1 text-xs">{identity}</p> : null}
          </div>

          <div>
            <p className="text-sm font-medium">Findings and recommendations</p>
            {detail.findings.length ? <ul className="mt-1 space-y-2">{detail.findings.map(f => <FindingCard key={f.number} f={f} names={names} stages={stages} onRespond={respond} />)}</ul> : <p className="text-sm text-ink-muted">No finding recorded.</p>}
          </div>

          {detail.evidence.length ? (
            <div className="text-sm">
              <p className="font-medium">Evidence requests</p>
              <ul>{detail.evidence.map(e => (
                <li key={e.number} className="border-t border-line py-1"><strong>{e.number}</strong> · to {names[e.to] ?? e.to} · under relationship {e.relationship.id} version {e.relationship.version} ({e.relationship.type.replace('_', ' ')}) · purpose: {e.purpose}{e.due ? ` · asked by ${e.due}` : ''}
                  <p className="text-xs">{e.requested}</p>
                  <p className="text-xs text-ink-muted">{e.submissions.length ? e.submissions.map(s => `${s.description}${s.document ? ` (document ${s.document.id}${s.document.sha256 ? `, sha256 ${s.document.sha256.slice(0, 12)}…` : ''})` : ''} · ${s.by.name}, ${s.at.slice(0, 10)}`).join(' · ') : 'Nothing submitted yet.'}</p>
                </li>
              ))}</ul>
            </div>
          ) : null}

          {detail.controller.length ? (
            <div className="text-sm">
              <p className="font-medium">Requests to the controller</p>
              <p className="text-xs text-ink-muted">The authority never reads the records: it asks the institution that controls them, under an approved relationship, and reads the access log only for the records the case names.</p>
              <ul>{detail.controller.map(q => (
                <li key={q.number} className="border-t border-line py-1"><strong>{q.number}</strong> · {q.kind} · controller {names[q.controller] ?? q.controller} · records {q.records.map(r => `${r.register}:${r.id}`).join(', ')} · purpose: {q.purpose}
                  <p className="text-xs">{q.asked}</p>
                  <p className="text-xs">{q.answer ? `Answered: ${q.answer.outcome} · ${q.answer.reasons} · ${q.answer.by.name}, ${q.answer.at.slice(0, 10)}` : <span className="text-ink-muted">Waiting for the controller&apos;s answer.</span>}</p>
                </li>
              ))}</ul>
            </div>
          ) : null}

          {detail.referrals.length ? (
            <div className="text-sm">
              <p className="font-medium">Referrals</p>
              <ul>{detail.referrals.map(r => <li key={r.number} className="border-t border-line py-1"><strong>{r.number}</strong> · {r.kind} · to {names[r.to] ?? r.to} · {r.reason} <span className="text-xs text-ink-muted">(the case reference only; nothing of the file passes)</span></li>)}</ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section title="Counts" meta="no content">
        <p className="text-sm">{data ? `${data.counts.findings ?? 0} finding(s), ${data.counts.issued ?? 0} issued, ${data.counts.responses ?? 0} response(s), ${data.counts.evidenceRequests ?? 0} evidence request(s), ${data.counts.referrals ?? 0} referral(s), ${data.counts.controllerRequests ?? 0} request(s) to a controller` : 'loading'}</p>
      </Section>
    </div>
  );
}
