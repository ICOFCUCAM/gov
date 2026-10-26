'use client';

// Rates and tariffs (lib/law/rules.ts): rate tables and tariff schedules as
// versioned data citing the law, with tests that must pass, approved by a
// second official of the owning authority who can sign there. CivicOS ships
// none: until one is approved, assessments are entered with reasons.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Rule { key: string; title: string; kind: string; owner: string; version: number; effectiveFrom: string; effectiveTo?: string; state: string; digest: string; citations: { title?: string; num?: string; eId: string }[]; tests: { name: string }[]; draftedBy: string; approvedBy?: string; rate?: number; bands?: { from: number; to?: number; rate: number }[]; lines?: { code: string; rate: number }[]; amounts?: { code: string; amountMinor: number }[]; means?: { limitMinor: number; baseMinor: number; perMemberMinor: number; taperRate: number } }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 font-mono text-xs';
const EXAMPLE = JSON.stringify({ key: 'tax.income', title: 'Income tax rates', kind: 'rate-bands', owner: 'tax', effectiveFrom: '2027-01-01', bands: [{ from: 0, to: 100000, rate: 0 }, { from: 100000, rate: 10 }], citations: [{ instrument: '/eli/…', eId: 'sch_1' }], tests: [{ name: 'above the threshold', input: { amountMinor: 200000 }, expectMinor: 10000 }] }, null, 2);

export function RulesBoard() {
  const [list, setList] = React.useState<Rule[]>([]);
  const [inForce, setInForce] = React.useState<Record<string, number | null>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const load = React.useCallback(() => {
    fetch('/api/rules', { cache: 'no-store' }).then(r => r.json()).then(j => { setList(j.rules ?? []); setInForce(j.inForce ?? {}); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  const send = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/rules', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    load();
  };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Rates and tariffs</h1>
      <p className="max-w-3xl text-sm text-ink-muted">The rate tables and tariff schedules tax and customs apply, as versioned data. Each version cites the provisions of law it implements and carries tests that must pass; a different official who can sign at the owning authority approves it, and it applies from its date. The platform ships no rates: until one is approved, the official enters the amount with reasons.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Rules" meta={`${list.length} versions`}>
        {list.length ? (
          <ul className="space-y-2 text-sm">
            {list.slice().sort((a, b) => a.key.localeCompare(b.key) || b.version - a.version).map(r => (
              <li key={`${r.key}@${r.version}`} className="rounded border border-line p-2">
                <p><strong>{r.title}</strong> <span className="font-mono text-xs">{r.key} v{r.version}</span> · {r.kind} · {r.owner} · from {r.effectiveFrom}{r.effectiveTo ? ` to ${r.effectiveTo}` : ''} · {r.state}{inForce[r.key] === r.version ? ' · in force' : ''}</p>
                <p className="text-xs text-ink-muted">Cites {r.citations.map(c => `${c.title ?? ''} ${c.num ?? c.eId}`).join('; ') || 'nothing yet'} · {r.tests.length} tests · <span className="font-mono">{r.digest.slice(0, 12)}</span> · drafted by {r.draftedBy}{r.approvedBy ? `, approved by ${r.approvedBy}` : ''}</p>
                <p className="text-xs">{r.rate !== undefined ? `${r.rate}%` : r.bands ? r.bands.map(b => `${b.from}–${b.to ?? '…'}: ${b.rate}%`).join(' · ') : r.amounts ? r.amounts.map(a => `${a.code}: ${a.amountMinor}`).join(' · ') : r.means ? `base ${r.means.baseMinor}, each further member ${r.means.perMemberMinor}, taper ${r.means.taperRate}% of means, nothing from ${r.means.limitMinor}` : `${r.lines?.length ?? 0} tariff lines`}</p>
                {r.state === 'draft' ? <span className="mt-1 flex gap-2"><Button onClick={() => void send({ op: 'approve', key: r.key, version: r.version }, 'Approved.')}>Approve</Button><Button variant="secondary" onClick={() => { const reason = window.prompt('Why is it withdrawn?'); if (reason) void send({ op: 'withdraw', key: r.key, version: r.version, reason }, 'Withdrawn.'); }}>Withdraw</Button></span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No rule has been recorded. Assessments and duties are entered by officials with their reasons until one is approved.</p>}
      </Section>
      <Section title="Draft a version" meta="the owning authority's officials">
        <label className="block text-sm">Rule (JSON: key, title, kind flat-rate | rate-bands | tariff | tiers | fixed-amounts | means-tested, owner, effectiveFrom, rate | bands | lines | tiers | amounts | means, citations, tests; a tiers test gives expectTier)
          <textarea className={field} rows={12} value={draft} placeholder={EXAMPLE} onChange={e => setDraft(e.target.value)} />
        </label>
        <Button className="mt-2" onClick={() => { try { void send({ op: 'draft', rule: JSON.parse(draft) }, 'Drafted: its tests passed. A different official approves it.'); } catch { setMsg('The rule is not valid JSON'); } }}>Record the draft</Button>
      </Section>
    </div>
  );
}
