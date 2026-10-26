'use client';

// The civil register (lib/civil/register.ts, design §8.4): how many persons
// and events it holds, a search by names, date of birth or registration
// number, and each person's versions and registrations. Every search is
// written to the access log. Registrations and corrections are made only
// through civil registration cases (Cases).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Version { n: number; names: { given: string; family: string }; sex: string; birth?: { date: string; place: { text?: string; region?: string } }; status: string; at: string; by: string; reason: string }
interface Person { id: string; identifiers: Record<string, string>; versions: Version[]; matching: { other: string; decided?: string }[] }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function CivilRegister() {
  const [size, setSize] = React.useState<{ persons: number; births: number; deaths: number; marriages: number } | null>(null);
  const [q, setQ] = React.useState({ family: '', given: '', birthDate: '', registration: '', purpose: '' });
  const [found, setFound] = React.useState<Person[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/civil?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j as { size: typeof size; persons: Person[] };
  };
  React.useEffect(() => { ask({ purpose: '' }).then(j => setSize(j.size)).catch(e => setMsg((e as Error).message)); }, []);
  const search = async () => { setMsg(null); try { const j = await ask(q); setSize(j.size); setFound(j.persons); } catch (e) { setMsg((e as Error).message); } };
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">Civil registry</h2>
      <p className="max-w-3xl text-sm text-ink-muted">The people this registry has registered and their births, deaths and marriages. Registrations and corrections are made through <Link className="underline" href="/gov/work/cases/open">cases</Link>, decided by two officials. Every search here is recorded in the access log.</p>
      {size ? <p className="text-sm">{size.persons} persons · {size.births} births · {size.deaths} deaths · {size.marriages} marriages registered</p> : null}
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      <Section title="Search" meta="names, date of birth or registration number">
        <div className="grid gap-2 md:grid-cols-5">
          <label className="text-sm">Family name<input className={field} value={q.family} onChange={e => setQ(x => ({ ...x, family: e.target.value }))} /></label>
          <label className="text-sm">Given names<input className={field} value={q.given} onChange={e => setQ(x => ({ ...x, given: e.target.value }))} /></label>
          <label className="text-sm">Date of birth<input type="date" className={field} value={q.birthDate} onChange={e => setQ(x => ({ ...x, birthDate: e.target.value }))} /></label>
          <label className="text-sm">Registration number<input className={field} value={q.registration} onChange={e => setQ(x => ({ ...x, registration: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={search}>Search</Button>
      </Section>
      {found ? (
        <Section title="Persons found" meta={`${found.length}`}>
          {found.length ? found.map(p => {
            const v = p.versions[p.versions.length - 1]!;
            return (
              <details key={p.id} className="mb-2 rounded border border-line p-2 text-sm">
                <summary className="cursor-pointer"><strong>{v.names.given} {v.names.family}</strong> · born {v.birth?.date ?? '—'} · {p.identifiers.birthRegistration ?? 'no birth registration'} · {v.status}</summary>
                <ol className="mt-2 space-y-1">{p.versions.map(x => <li key={x.n}>Version {x.n}: {x.names.given} {x.names.family}, {x.birth?.date ?? ''} · {x.reason} · {x.by} · {new Date(x.at).toLocaleDateString()}</li>)}</ol>
                {p.matching.length ? <p className="mt-1 text-xs">Adjudicated matches: {p.matching.map(m => `${m.decided ?? 'open'}`).join(', ')}</p> : null}
              </details>
            );
          }) : <p className="text-sm text-ink-muted">Nobody matches.</p>}
        </Section>
      ) : null}
    </div>
  );
}
