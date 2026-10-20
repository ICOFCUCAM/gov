'use client';

// Visas and residence permits (lib/immigration/register.ts): how many are
// granted, refused, expired or revoked by kind and category, and a search
// by number or by nationality and travel document for the immigration
// authority's officials (auditors give a purpose). Every search is written
// to the access log. Grants change only through decided immigration cases;
// other institutions check status through the exchange (immigration.status).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Grant { number: string; kind: string; category: string; holder: { name: string; nationality: string; documentNumber: string; birthDate?: string }; validFrom?: string; validUntil?: string; entries?: string; conditions: string[]; state: string; case: string; certificate?: string; history: { state: string; at: string; by: string; reason: string; case?: string }[] }
interface Count { kind: string; category: string; state: string; count: number }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const KIND: Record<string, string> = { visa: 'Visa', 'residence-permit': 'Residence permit' };

export function ImmigrationRegister() {
  const [counts, setCounts] = React.useState<Count[] | null>(null);
  const [q, setQ] = React.useState({ number: '', nationality: '', documentNumber: '', purpose: '' });
  const [found, setFound] = React.useState<Grant[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/immigration?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j as { counts: Count[]; grants: Grant[] };
  };
  React.useEffect(() => { ask({}).then(j => setCounts(j.counts)).catch(e => setMsg((e as Error).message)); }, []);
  const search = async () => { setMsg(null); try { const j = await ask(q); setCounts(j.counts); setFound(j.grants); } catch (e) { setMsg((e as Error).message); } };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Visas and permits</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Visas and residence permits granted or refused by the immigration authority. Applications, extensions and revocations are <Link className="underline" href="/gov/work/cases/open">cases</Link> decided by two officials, with reasons and the right of appeal. These records are restricted: only the immigration authority reads them, and every search is recorded in the access log. Other institutions check whether a document holds a valid grant through the exchange, without seeing the file.</p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {counts ? (
        <Section title="Granted and refused" meta="counts only">
          {counts.length ? (
            <table className="text-sm">
              <thead><tr><th className="pe-4 text-start">Kind</th><th className="pe-4 text-start">Category</th><th className="pe-4 text-start">State</th><th className="text-end">Number</th></tr></thead>
              <tbody>{counts.map(c => <tr key={`${c.kind}${c.category}${c.state}`}><td className="pe-4">{KIND[c.kind] ?? c.kind}</td><td className="pe-4">{c.category}</td><td className="pe-4">{c.state}</td><td className="text-end tabular-nums">{c.count}</td></tr>)}</tbody>
            </table>
          ) : <p className="text-sm text-ink-muted">Nothing granted or refused yet.</p>}
        </Section>
      ) : null}
      <Section title="Find" meta="by number, or by nationality and travel document">
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm">Visa or permit number<input className={field} value={q.number} onChange={e => setQ(x => ({ ...x, number: e.target.value }))} /></label>
          <label className="text-sm">Nationality (3 letters)<input className={field} value={q.nationality} maxLength={3} onChange={e => setQ(x => ({ ...x, nationality: e.target.value }))} /></label>
          <label className="text-sm">Travel document number<input className={field} value={q.documentNumber} onChange={e => setQ(x => ({ ...x, documentNumber: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={search}>Search</Button>
      </Section>
      {found ? (
        <Section title="Found" meta={`${found.length}`}>
          {found.length ? found.map(g => (
            <details key={g.number} className="mb-2 rounded border border-line p-2 text-sm" open={found.length === 1}>
              <summary className="cursor-pointer"><strong>{g.number}</strong> · {KIND[g.kind] ?? g.kind} · {g.category} · {g.state}{g.validUntil ? ` · until ${g.validUntil}` : ''}</summary>
              <p className="mt-1">{g.holder.name} · {g.holder.nationality} · {g.holder.documentNumber}{g.holder.birthDate ? ` · born ${g.holder.birthDate}` : ''}</p>
              {g.conditions.length ? <p className="text-xs">Conditions: {g.conditions.join('; ')}</p> : null}
              <p className="text-xs"><Link className="underline" href={`/gov/cases/${g.case}`}>Case</Link>{g.certificate ? <> · document <Link className="underline" href={`/verify/${encodeURIComponent(g.certificate)}`}>{g.certificate}</Link></> : null}</p>
              <ol className="mt-1 space-y-0.5 text-xs text-ink-muted">{g.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString()} · {h.state} · {h.by} · {h.reason}</li>)}</ol>
            </details>
          )) : <p className="text-sm text-ink-muted">Nothing matches.</p>}
        </Section>
      ) : null}
    </div>
  );
}
