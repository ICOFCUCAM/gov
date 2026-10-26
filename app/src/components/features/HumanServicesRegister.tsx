'use client';

// Human services registers (plan step I6): identity, passports and travel
// documents, labour and employment, social protection. Each page shows who
// keeps the register (the institution the nation named, or that none is
// named yet), its procedures, counts only (no person), and a search for that
// institution's officials (auditors give a purpose; a purpose is asked for any
// search of a person). Every search is written to the access log by the route.
// Records change only through decided cases; other institutions learn only an
// exchange answer.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

type Kind = 'identity' | 'passports' | 'labour' | 'social-protection';
interface Search { key: string; label: string }
const SPEC: Record<Kind, { title: string; intro: string; searches: Search[]; exchange: string }> = {
  identity: {
    title: 'National identity',
    intro: 'Identity records, the credentials issued on them and the determinations made when two records may be the same person. A possible duplicate is a flag an official decides with reasons; records are never merged. Credentials are issued, produced and delivered through decided cases, and a lost or stolen report is not proof of fraud. No biometric data is held.',
    searches: [{ key: 'number', label: 'Register or credential number' }, { key: 'civilRegistration', label: 'Civil register entry' }, { key: 'familyName', label: 'Family name' }, { key: 'birthDate', label: 'Date of birth (with the family name)' }],
    exchange: 'identity.verify',
  },
  passports: {
    title: 'Passports and travel documents',
    intro: 'Travel documents from application to collection: the fee from the approved schedule, identity checked with the identity authority, the issuance decision by two officials, production with quality checks, custody and collection, and every later status. Document numbers are searched only with a stated purpose. No biometric template is kept.',
    searches: [{ key: 'number', label: 'Register or document number' }, { key: 'identity', label: 'Holder\'s identity record' }],
    exchange: 'travel-document.status',
  },
  labour: {
    title: 'Labour and employment',
    intro: 'Employers and their workplaces, employment registered, vacancies and jobseekers, workplace inspections with their findings, corrective orders and responses, injury notifications (medical evidence only as a sealed document), mediation and notices. A complaint is an allegation until findings support it.',
    searches: [{ key: 'employer', label: 'Employer (labour register or organisation number)' }, { key: 'case', label: 'Case' }],
    exchange: 'employer.standing',
  },
  'social-protection': {
    title: 'Social protection',
    intro: 'Claimants and households, benefit claims with every assessment, the approved rule version that calculated each amount, payment instructions approved by a second official, overpayments and appeals. An amount comes only from an approved rule and can be recalculated from what was recorded; no score cuts support.',
    searches: [{ key: 'claimant', label: 'Claimant (register or identity number)' }, { key: 'claim', label: 'Claim number' }, { key: 'reproduce', label: 'Recalculate assessment number (with a claim)' }],
    exchange: '',
  },
};
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
type Json = Record<string, unknown>;

function Counts({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? <ul className="text-sm">{value.map((v, i) => <li key={i}>{Object.values(v as Json).join(' · ')}</li>)}</ul> : <p className="text-sm text-ink-muted">None yet.</p>;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Json);
    if (!entries.length) return <p className="text-sm text-ink-muted">None yet.</p>;
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
        {entries.map(([k, v]) => <React.Fragment key={k}><dt className="text-ink-muted">{k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}</dt><dd className="tabular-nums">{typeof v === 'object' ? <Counts value={v} /> : String(v)}</dd></React.Fragment>)}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

export function HumanServicesRegister({ kind }: { kind: Kind }) {
  const spec = SPEC[kind];
  const [data, setData] = React.useState<Json | null>(null);
  const [q, setQ] = React.useState<Record<string, string>>({});
  const [found, setFound] = React.useState<Json | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/${kind}?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j as Json;
  };
  React.useEffect(() => { ask({}).then(setData).catch(e => setMsg((e as Error).message)); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const search = async () => { setMsg(null); try { const j = await ask(q); setData(j); setFound(j); } catch (e) { setMsg((e as Error).message); } };
  const authority = data?.authority as { name: string } | null | undefined;
  const procedures = (data?.procedures as { key: string; title: string }[] | undefined) ?? [];
  const records = found ? (found.records ?? found.documents ?? found.found ?? null) : null;
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{spec.title}</h1>
      <p className="max-w-3xl text-sm text-ink-muted">{spec.intro} These records are restricted: only the institution that keeps them reads them, and every search is recorded in the <Link className="underline" href="/gov/access-log">access log</Link>.{spec.exchange ? <> Other institutions learn only the answer of the exchange service <code>{spec.exchange}</code>.</> : null}</p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {data ? (
        <>
          <Section title="Who keeps it" meta={authority ? 'named by the nation' : 'not named'}>
            <p className="text-sm">{authority ? authority.name : <>No institution is named yet. Name it under <Link className="underline" href="/gov/configuration#who-is-responsible">Who is responsible</Link>; until then no case opens and nothing is recorded.</>}</p>
            {'feeSchedule' in data ? <p className="mt-1 text-sm">Fee schedule: {data.feeSchedule ? `passports.fees version ${(data.feeSchedule as Json).version}, ${(data.feeSchedule as Json).lines} lines` : <>none approved (<Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>): no fee is calculated or typed until one is</>}</p> : null}
            {'programmes' in data ? <p className="mt-1 text-sm">Programmes with an approved rule in force: {(data.programmes as { programme: string; version: number }[]).map(p => `${p.programme} (rule version ${p.version})`).join(', ') || <>none (<Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>): no claim can be assessed until one is</>}</p> : null}
          </Section>
          <Section title="Procedures" meta="drafts until the nation approves them">
            <ul className="text-sm">{procedures.map(p => <li key={p.key}><span className="font-mono text-xs">{p.key}</span> · {p.title}</li>)}</ul>
            <p className="mt-1 text-xs text-ink-muted"><Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/work/cases/open">Open cases</Link></p>
          </Section>
          <Section title="Counts" meta="no person, no number">
            <Counts value={data.counts} />
            {Array.isArray(data.reconciliation) ? <><h3 className="mt-2 text-sm font-semibold">Production reconciliation by batch</h3><Counts value={data.reconciliation} /></> : null}
          </Section>
        </>
      ) : null}
      <Section title="Find" meta="logged">
        <div className="grid gap-2 md:grid-cols-4">
          {spec.searches.map(s => <label key={s.key} className="text-sm">{s.label}<input className={field} value={q[s.key] ?? ''} onChange={e => setQ(x => ({ ...x, [s.key]: e.target.value }))} /></label>)}
          <label className="text-sm">Purpose<input className={field} value={q.purpose ?? ''} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={search}>Search</Button>
      </Section>
      {found ? (
        <Section title="Found" meta="the full record">
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded border border-line p-2 text-xs">{JSON.stringify({ records, ...(found.reproduced ? { reproduced: found.reproduced } : {}) }, null, 2)}</pre>
        </Section>
      ) : null}
    </div>
  );
}
