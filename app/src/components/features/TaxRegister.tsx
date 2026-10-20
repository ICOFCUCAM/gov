'use client';

// The tax register (lib/tax/register.ts) for the tax authority: counts, and a
// taxpayer opened by TIN or register reference with returns, assessments and
// account balances. Tax secrecy: other institutions cannot read it, auditors
// give a purpose, and every search is in the access log. Registrations,
// returns, assessments and objections are cases under approved procedures.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/nation/registry';

interface Account { entries: { at: string; kind: string; amountMinor: number; currency: string; reference: string; reason: string; by: string }[]; balanceMinor: number }
interface Taxpayer { tin: string; party: { kind: string; id: string; name: string }; taxTypes: string[]; state: string; registeredAt: string; case: string;
  returns: { id: string; taxType: string; period: string; state: string; versions: { n: number; baseMinor: number; currency: string; filedAt: string }[] }[];
  assessments: { reference: string; taxType: string; period: string; amountMinor: number; currency: string; state: string; case: string; method: { kind: string; rule?: string; version?: number; reasons?: string } }[];
  accounts: Record<string, Account> }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const money = (minor: number, currency: string) => formatMoney(minor / 100, { currency });

export function TaxRegister() {
  const [counts, setCounts] = React.useState<{ taxpayers: Record<string, number>; returns: Record<string, number>; assessments: Record<string, number> } | null>(null);
  const [q, setQ] = React.useState({ tin: '', party: '', purpose: '' });
  const [found, setFound] = React.useState<Taxpayer[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/tax?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j;
  };
  React.useEffect(() => { ask({}).then(j => setCounts(j.counts)).catch(e => setMsg((e as Error).message)); }, []);
  const search = async () => { setMsg(null); try { const j = await ask(q); setCounts(j.counts); setFound(j.taxpayers); } catch (e) { setMsg((e as Error).message); } };
  const line = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none';
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Tax</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Taxpayers, returns, assessments and tax accounts. Registration, returns, assessments and objections are <Link className="underline" href="/gov/work/cases/open">cases</Link> under approved procedures; assessments use the approved rate table (<Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>) or an amount the assessor enters with reasons. Tax records are confidential: only the tax authority reads them and every search is recorded in the access log.</p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {counts ? <p className="text-sm">Taxpayers: {line(counts.taxpayers)}. Returns: {line(counts.returns)}. Assessments: {line(counts.assessments)}.</p> : null}
      <Section title="Find a taxpayer" meta="by TIN or register reference">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">TIN<input className={field} value={q.tin} onChange={e => setQ(x => ({ ...x, tin: e.target.value }))} /></label>
          <label className="text-sm">Register reference<input className={field} value={q.party} onChange={e => setQ(x => ({ ...x, party: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={search}>Search</Button>
      </Section>
      {found ? found.length ? found.map(t => (
        <Section key={t.tin} title={`${t.tin} · ${t.party.name}`} meta={`${t.party.kind} · ${t.state} · ${t.taxTypes.join(', ')}`}>
          {t.taxTypes.map(type => (
            <div key={type} className="mb-3 text-sm">
              <p><strong>{type}</strong>: balance {money(t.accounts[type]?.balanceMinor ?? 0, t.assessments[0]?.currency ?? 'USD')} (positive is owed)</p>
              <ul className="text-xs text-ink-muted">{(t.accounts[type]?.entries ?? []).map((e, i) => <li key={i}>{e.at.slice(0, 10)} · {e.kind} · {money(e.amountMinor, e.currency)} · {e.reference} · {e.reason}</li>)}</ul>
            </div>
          ))}
          <p className="text-sm font-medium">Returns</p>
          <ul className="text-xs">{t.returns.map(r => <li key={r.id}>{r.taxType} {r.period} · {r.state} · {r.versions.length} version(s), latest base {money(r.versions.at(-1)!.baseMinor, r.versions.at(-1)!.currency)}</li>)}</ul>
          <p className="mt-2 text-sm font-medium">Assessments</p>
          <ul className="text-xs">{t.assessments.map(a => <li key={a.reference}>{a.reference} · {a.taxType} {a.period} · {money(a.amountMinor, a.currency)} · {a.state} · {a.method.kind === 'rule' ? `rule ${a.method.rule} v${a.method.version}` : `entered: ${a.method.reasons}`} · <Link className="underline" href={`/gov/cases/${a.case}`}>case</Link></li>)}</ul>
        </Section>
      )) : <p className="text-sm text-ink-muted">Nobody matches.</p> : null}
    </div>
  );
}
