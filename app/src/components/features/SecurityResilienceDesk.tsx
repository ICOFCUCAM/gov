'use client';

// Cyber and resilience for the console (plan step I12; lib/security): the
// bodies the nation named for cybersecurity, critical infrastructure,
// security accreditation and clearances, and national security directives;
// where the classification scheme and this installation's accreditation
// stand; the procedures and their state; the security records the signed-in
// official may see listed (number, kind, status and whether it is marked:
// never its terms); one record read with a stated purpose (the server checks
// need to know, the purpose, the action and, for a marked record, a valid
// clearance, and writes every attempt to the access log); the security
// directives of the official's institution as issuer or recipient; its
// cross-domain transfer records.
//
// Metadata only. There is no intelligence register here, and nothing records
// a source, a target or who carried out an attack: those parts of the
// catalogue wait for the nation's legal review. Cases move only through their
// own pages; the platform's own security advisories stay in the Update Center.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

interface Body { slot: string; label: string; institution: string | null; name: string | null }
interface Level { key: string; label: string; handling: string }
interface Classification { scheme: { name: string; levels: Level[]; caveats: string[] } | null; accreditation: { level: string; statement: string; label: string } | null; version: number; waiting: boolean; highest: string; statement: string }
interface Pending { values: { scheme: Classification['scheme']; accreditation: { level: string; statement: string } | null }; by: string; at: string; expiresAt: string }
interface Listing { number: string; kind: string; register: string; owner: string; case: string; status: string; marked: boolean; summary?: string; validUntil?: string; updatedAt: string; sample?: true }
interface Directive { ref: string; issuer: string; status: string; markingLabel: string; versions: { n: number; title: string; kind: string; force: string; recipients: string[]; effectiveFrom: string; expiresOn?: string; challengeRoute: string }[]; pending?: { title: string; by: { name: string } }; acknowledgements: { institution: string; version: number }[]; compliance: { institution: string; state: string; note: string }[] }
interface Transfer { ref: string; fromDomain: string; toDomain: string; dataClass: string; purpose: string; policy: string; validation: { result: string }; decision?: { outcome: string; by: { name: string } }; receipt?: { reference: string }; recordedBy: { name: string }; at: string }
interface Overview {
  bodies: Body[]; classification: Classification; classificationChanges: { pending?: Pending }; procedures: { key: string; title: string; slot: string; state: string }[];
  counts: Record<string, number | Record<string, number>>; records: Listing[]; directives: Directive[]; transfers: Transfer[];
  labels: { kinds: Record<string, string> }; names: Record<string, string>;
}

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function SecurityResilienceDesk() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [purpose, setPurpose] = React.useState('');
  const [view, setView] = React.useState<'full' | 'recipient'>('full');
  const [opened, setOpened] = React.useState<{ number: string; text: string } | null>(null);
  const [levels, setLevels] = React.useState('');
  const [schemeName, setSchemeName] = React.useState('');
  const [caveats, setCaveats] = React.useState('');
  const [accLevel, setAccLevel] = React.useState('');
  const [accStatement, setAccStatement] = React.useState('');
  const [instrument, setInstrument] = React.useState('');
  const [eId, setEId] = React.useState('');

  const load = React.useCallback(async () => {
    const r = await fetch('/api/security', { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (r.ok && j) setData(j); else setMsg(j?.error ?? 'Could not read the security records');
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/security', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Recorded.' : `Refused: ${j.error ?? r.status}`);
    if (r.ok) void load();
  };
  const read = async (number: string) => {
    const r = await fetch(`/api/security?record=${encodeURIComponent(number)}&view=${view}&purpose=${encodeURIComponent(purpose)}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    setOpened({ number, text: r.ok ? JSON.stringify(j.record, null, 2) : `Refused: ${j.error ?? r.status} (the attempt is in the access log)` });
  };
  const propose = () => {
    const scheme = schemeName.trim() ? { name: schemeName, levels: levels.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]).map(([key, label, handling]) => ({ key, label, handling })), caveats: caveats.split('\n').map(x => x.trim()).filter(Boolean) } : undefined;
    const accreditation = accLevel.trim() ? { level: accLevel, statement: accStatement } : undefined;
    void post({ op: 'propose-classification', ...(scheme ? { scheme } : {}), ...(accreditation ? { accreditation } : {}), legalBasis: [{ instrument, eId }] });
  };

  const names = data?.names ?? {};
  const c = data?.classification;
  const pending = data?.classificationChanges.pending;
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Cyber and resilience</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        National cyber incidents, vulnerability coordination, supplier security, security exceptions and exercises; critical infrastructure designations,
        dependencies, risk assessments and resilience plans; clearance decisions; national security directives and cross-domain transfers. Each is kept by the
        body the nation names under <Link className="underline" href="/gov/configuration/responsible#who-is-responsible">Who is responsible</Link>, as metadata only:
        nothing marked above this installation&apos;s accreditation is held here. A clearance never opens a record by itself: need to know, a stated purpose and the
        action are checked each time, and every read is in the <Link className="underline" href="/gov/access-log">access log</Link>. The platform&apos;s own security
        advisories are in the <Link className="underline" href="/updates/security">Update Center</Link>.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Responsible bodies" meta="each optional; none is named by default">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{(data?.bodies ?? []).map(b => (
          <li key={b.slot} className="rounded border border-line p-2"><span className="font-medium">{b.label}</span>: {b.name ?? <span className="text-ink-muted">not named: no case opens until the nation names its body</span>}</li>
        ))}</ul>
      </Section>

      <Section title="Classification and accreditation" meta={c ? `version ${c.version}${c.waiting ? ' · a change waits for a second official' : ''}` : 'loading'}>
        <p className="text-sm"><strong>{c?.statement ?? 'loading'}</strong></p>
        {c?.scheme ? (
          <table className="mt-2 w-full text-left text-xs">
            <caption className="text-left text-ink-muted">{c.scheme.name}, lowest level first{c.scheme.caveats.length ? ` · caveats: ${c.scheme.caveats.join(', ')}` : ''}</caption>
            <thead><tr><th scope="col">Level</th><th scope="col">Handling</th><th scope="col">Held here</th></tr></thead>
            <tbody>{c.scheme.levels.map((l, i) => {
              const top = c.accreditation ? c.scheme!.levels.findIndex(x => x.key === c.accreditation!.level) : -1;
              return <tr key={l.key} className="border-t border-line"><td>{l.label}</td><td>{l.handling}</td><td>{i <= top ? 'Yes' : 'No: a reference to an accredited system only'}</td></tr>;
            })}</tbody>
          </table>
        ) : null}
        {pending ? (
          <div className="mt-2 rounded border border-line p-2 text-xs">
            <p>Proposed by {pending.by} on {pending.at.slice(0, 10)}: {pending.values.scheme ? `scheme "${pending.values.scheme.name}" (${pending.values.scheme.levels.length} levels)` : 'no scheme'}; {pending.values.accreditation ? `accredited up to ${pending.values.accreditation.level}` : 'no accreditation'}. Lapses {pending.expiresAt.slice(0, 16).replace('T', ' ')}.</p>
            <div className="mt-1 flex gap-2"><Button variant="secondary" onClick={() => void post({ op: 'confirm-classification' })}>Confirm (a different official)</Button><Button variant="secondary" onClick={() => void post({ op: 'withdraw-classification', reason: 'Withdrawn' })}>Withdraw</Button></div>
          </div>
        ) : (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">Propose the scheme or the accreditation (an administrator, citing the law; a different official confirms)</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label>Scheme name and version<input className={field} value={schemeName} onChange={e => setSchemeName(e.target.value)} /></label>
              <label>Handling caveats, one per line<textarea className={field} value={caveats} onChange={e => setCaveats(e.target.value)} /></label>
              <label className="sm:col-span-2">Levels, lowest first: key | label | handling, one per line<textarea className={field} rows={3} value={levels} onChange={e => setLevels(e.target.value)} /></label>
              <label>Accredited up to (a level key)<input className={field} value={accLevel} onChange={e => setAccLevel(e.target.value)} /></label>
              <label>Accreditation decision reference<input className={field} value={accStatement} onChange={e => setAccStatement(e.target.value)} /></label>
              <label>Legal basis: instrument (laws register id)<input className={field} value={instrument} onChange={e => setInstrument(e.target.value)} /></label>
              <label>Provision (eId)<input className={field} value={eId} onChange={e => setEId(e.target.value)} /></label>
            </div>
            <Button className="mt-2" variant="secondary" onClick={propose}>Propose</Button>
          </details>
        )}
      </Section>

      <Section title="Procedures" meta="reference drafts until two officials of the responsible body approve them">
        <ul className="grid gap-1 text-sm md:grid-cols-2">{(data?.procedures ?? []).map(p => (
          <li key={p.key} className="rounded border border-line p-2">{p.title} <span className="text-xs text-ink-muted">({p.key}) · {p.state}</span></li>
        ))}</ul>
        <p className="mt-1 text-xs"><Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/law/permit-authorities">Who decides (permit authorities)</Link></p>
      </Section>

      <Section title="Security records you may see" meta="number, kind, status and marking only; terms only through a logged read">
        <div className="mb-2 flex flex-wrap items-end gap-2 text-xs">
          <label className="min-w-64 flex-1">Purpose of the read (required)<input className={field} value={purpose} onChange={e => setPurpose(e.target.value)} /></label>
          <label>View<select className={field} value={view} onChange={e => setView(e.target.value as 'full' | 'recipient')}><option value="full">Full record (keeping body)</option><option value="recipient">Recipient view</option></select></label>
        </div>
        {data?.records.length ? <ul className="text-sm">{data.records.map(r => (
          <li key={r.number} className="flex flex-wrap items-center gap-2 border-t border-line py-1">
            <strong>{r.number}</strong> · {data.labels.kinds[r.kind] ?? r.kind} ({r.register}) · {r.status}{r.validUntil ? ` · until ${r.validUntil}` : ''} · {r.marked ? 'marked' : 'not classified'} · kept by {names[r.owner] ?? r.owner}
            {r.summary ? <span className="text-ink-muted">· {r.summary}</span> : <span className="text-ink-muted">· summary shown only to a named, cleared official</span>}
            {r.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}
            <Button variant="secondary" onClick={() => void read(r.number)}>Read</Button>
          </li>
        ))}</ul> : <p className="text-sm text-ink-muted">No security record your institution keeps or receives.</p>}
        {opened ? <pre className="mt-2 max-h-80 overflow-auto rounded border border-line p-2 text-xs" aria-label={`Record ${opened.number}`}>{opened.text}</pre> : null}
      </Section>

      <Section title="National security directives" meta="your institution's, as issuer or recipient; never shown to anyone else">
        {data?.directives.length ? <ul className="text-sm">{data.directives.map(d => {
          const v = d.versions.at(-1);
          return (
            <li key={d.ref} className="border-t border-line py-1">
              <strong>{d.ref}</strong> · {v?.title ?? d.pending?.title} · {d.status}{v ? ` · ${v.kind} · ${v.force.replace('-', ' ')} · from ${v.effectiveFrom}${v.expiresOn ? ` to ${v.expiresOn}` : ''} · ${d.markingLabel}` : ' · waiting for a second official'}
              {v ? <p className="text-xs text-ink-muted">Recipients: {v.recipients.map(x => names[x] ?? x).join(', ')} · acknowledged by {d.acknowledgements.length} · compliance reports {d.compliance.length} · challenge: {v.challengeRoute}</p> : null}
              {v ? <Button variant="secondary" onClick={() => void post({ op: 'directive-acknowledge', ref: d.ref })}>Acknowledge receipt (not agreement)</Button> : null}
            </li>
          );
        })}</ul> : <p className="text-sm text-ink-muted">No security directive for your institution.</p>}
      </Section>

      <Section title="Cross-domain transfers" meta="metadata only; the transfer itself is made by the approved cross-domain solution">
        {data?.transfers.length ? <ul className="text-sm">{data.transfers.map(t => (
          <li key={t.ref} className="border-t border-line py-1"><strong>{t.ref}</strong> · {t.fromDomain} → {t.toDomain} · class {t.dataClass || 'not classified'} · {t.policy} · validation {t.validation.result} · {t.decision ? `${t.decision.outcome} by ${t.decision.by.name}` : 'waiting for the release decision'}{t.receipt ? ` · receipt ${t.receipt.reference}` : ''}</li>
        ))}</ul> : <p className="text-sm text-ink-muted">No transfer recorded by your institution.</p>}
      </Section>

      <Section title="Not built here" meta="the nation's legal review first">
        <p className="text-sm">Intelligence mandates, sensitive authorisations, intelligence products and their oversight records are not held by this platform: they wait for the nation&apos;s legal review. Nothing here records a source, a collection method, a target or who carried out an attack, and nothing computes a score about a person.</p>
      </Section>
    </div>
  );
}
