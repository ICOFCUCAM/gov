'use client';

// Budget and treasury (plan step I5): the finance register as the signed-in
// official may read it (lib/finance, /api/finance): appropriations with the
// balance computed from the records (released, committed, paid, reconciled,
// available), the commitments against them, the payment orders with the
// official of each step (instructed, verified, approved by two, executed with
// the bank's reference, reconciled), payee accounts (masked) and cash
// forecasts (reported, never shown as the nation's cash). Budget calls,
// ceilings and bids beside them. Nothing is changed here: every change is a
// step of a case (Cases), under the procedures listed below.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { SignalTag } from '@/components/ui/SignalTag';
import { LoadingState } from '@/components/ui/States';
import { ServicesPanel, money, day } from './ServicesPanel';

type Who = { id?: string; name: string };
type Step = { by: Who; at: string; case: string };
interface Balance { amountMinor: number; releasedMinor: number; committedMinor: number; paidMinor: number; reconciledMinor: number; availableMinor: number; currency: string }
interface Appropriation { id: string; ref: string; period: string; institution: string; programme: string; economicCode?: string; fund?: string; state: string; currency: string; basis: { title?: string; instrument: string; num?: string; eId: string }[]; balance: Balance; versions: { n: number; at: string; change: string; reason: string }[]; sample?: true }
interface Commitment { id: string; ref: string; appropriationRef: string; institution: string; supplier: { number: string; name: string }; contract?: string; description: string; amountMinor: number; remainingMinor: number; currency: string; state: string; at: string; by: string; sample?: true }
interface Payment {
  id: string; ref: string; commitmentRef: string; institution: string; payee: { number: string; name: string }; account: { masked: string; ref: string }; invoice: { ref: string; date: string; certification?: string };
  amountMinor: number; currency: string; purpose: string; state: string; tier?: { tier: string; rule: { key: string; version: number } } | { none: string };
  instructed: Step; verified?: Step & { note: string }; approved?: Step & { confirmedBy: Who; decision?: string }; executed?: Step & { bankReference: string; valueDate: string }; reconciled?: Step & { statementReference: string };
  ended?: Step & { kind: string; reason: string }; sample?: true;
}
interface Payee { ref: string; organisation: { number: string; name: string }; bank: string; masked: string; state: string; requested: Step; verified?: Step & { method: string }; approved?: Step & { confirmedBy: Who }; effectiveAt?: string }
interface Forecast { ref: string; institution: string; period: string; version: number; currency: string; inflows: { category: string; amountMinor: number }[]; outflows: { category: string; amountMinor: number }[]; state: string; basis: string }
interface View {
  authority: { id: string; name: string } | null; names: Record<string, string>;
  calls: { ref: string; period: string; currency: string; closesOn?: string }[];
  ceilings: { institution: string; period: string; amountMinor: number; currency: string; version: number }[];
  bids: { ref: string; institution: string; period: string; programme: string; requestedMinor: number; allocationMinor?: number; currency: string; state: string }[];
  appropriations: Appropriation[]; commitments: Commitment[]; payments: Payment[]; payees: Payee[]; forecasts: Forecast[];
  rules: { paymentTiers: string };
}

const th = 'px-2 py-1 text-left font-medium';
const td = 'px-2 py-1 align-top';
const Sample = ({ on }: { on?: true }) => (on ? <SignalTag kind="sample" source="a demonstration record" className="ml-1" /> : null);
const stepLine = (label: string, s?: Step, extra?: string) => (s ? <li><span className="font-medium">{label}</span> · {s.by.name} · {day(s.at)}{extra ? ` · ${extra}` : ''}</li> : <li className="text-ink-muted">{label} · not yet</li>);

export function BudgetTreasury() {
  const [v, setV] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/finance', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load the finance register'); setV(j as View); }).catch(e => setMsg((e as Error).message));
  }, []);
  const name = (id: string) => v?.names[id] ?? id;
  return (
    <div className="space-y-5 p-4">
      <h2 className="text-xl font-semibold">Budget and treasury</h2>
      <p className="max-w-3xl text-sm text-ink-muted">
        The budget and the money it allows, as the finance register holds them: appropriations the law makes, released for commitment; commitments against
        what is available; payments verified, approved by two officials, executed with the bank&apos;s own reference and reconciled against the statement, each
        step by a different person. Every amount here is a recorded decision or a bank confirmation; balances are computed from those records whenever this
        page is read. Changes are steps of a case: <Link className="underline" href="/gov/work/cases/open">Cases</Link>.
      </p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {!v && !msg ? <LoadingState label="Loading budget and treasury" /> : null}
      {v ? (
        <p className="text-sm">
          Kept by {v.authority ? <strong>{v.authority.name}</strong> : <span className="text-alert">no finance authority named yet</span>} (<Link className="underline" href="/gov/configuration/responsible#who-is-responsible">Who is responsible</Link>) ·
          payment approval tiers: {v.rules.paymentTiers}
        </p>
      ) : null}

      {v ? (
        <Section title="Appropriations" meta={`${v.appropriations.length} recorded`}>
          {v.appropriations.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead><tr className="border-b border-line"><th className={th}>Appropriation</th><th className={th}>Institution · programme</th><th className={th}>Law</th><th className={th}>Appropriated</th><th className={th}>Released</th><th className={th}>Committed</th><th className={th}>Paid</th><th className={th}>Available</th></tr></thead>
                <tbody>
                  {v.appropriations.map(a => (
                    <tr key={a.id} className="border-b border-line">
                      <td className={td}><span className="font-medium">{a.ref}</span><Sample on={a.sample} /><br /><span className="text-ink-muted">{a.period} · {a.state} · version {a.versions.length}</span></td>
                      <td className={td}>{name(a.institution)}<br /><span className="text-ink-muted">{a.programme}{a.economicCode ? ` · ${a.economicCode}` : ''}</span></td>
                      <td className={td}>{a.basis.map(b => `${b.title ?? b.instrument} ${b.num ?? b.eId}`).join('; ')}</td>
                      <td className={td}>{money(a.balance.amountMinor, a.currency)}</td>
                      <td className={td}>{money(a.balance.releasedMinor, a.currency)}</td>
                      <td className={td}>{money(a.balance.committedMinor, a.currency)}</td>
                      <td className={td}>{money(a.balance.paidMinor, a.currency)}<br /><span className="text-ink-muted">reconciled {money(a.balance.reconciledMinor, a.currency)}</span></td>
                      <td className={td}><span className="font-medium">{money(a.balance.availableMinor, a.currency)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-ink-muted">None recorded. An appropriation enters only from the appropriation law, under the appropriation procedure.</p>}
        </Section>
      ) : null}

      {v ? (
        <Section title="Commitments" meta={`${v.commitments.length} recorded`}>
          {v.commitments.length ? (
            <ul className="space-y-2 text-xs">
              {v.commitments.map(c => (
                <li key={c.ref} className="rounded border border-line p-2">
                  <p><span className="font-medium">{c.ref}</span><Sample on={c.sample} /> · {c.state} · against {c.appropriationRef} · {name(c.institution)}</p>
                  <p>{c.description}</p>
                  <p className="text-ink-muted">Supplier {c.supplier.name} ({c.supplier.number}){c.contract ? ` · contract ${c.contract}` : ''} · committed {money(c.amountMinor, c.currency)} · left to pay {money(c.remainingMinor, c.currency)} · approved {day(c.at)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}

      {v ? (
        <Section title="Payments" meta={`${v.payments.length} payment orders · each step by a different person`}>
          {v.payments.length ? (
            <ul className="space-y-2 text-xs">
              {v.payments.map(p => (
                <li key={p.ref} className="rounded border border-line p-2">
                  <p><span className="font-medium">{p.ref}</span><Sample on={p.sample} /> · <span className="font-medium">{p.state}</span> · {money(p.amountMinor, p.currency)} to {p.payee.name} ({p.payee.number}) · account {p.account.masked}</p>
                  <p className="text-ink-muted">Commitment {p.commitmentRef} · invoice {p.invoice.ref} of {p.invoice.date}{p.invoice.certification ? ` · certified ${p.invoice.certification}` : ''} · {p.purpose}
                    {p.tier ? ` · tier ${'tier' in p.tier ? `${p.tier.tier} (${p.tier.rule.key} v${p.tier.rule.version})` : p.tier.none}` : ''}</p>
                  <ol className="mt-1 list-inside list-decimal">
                    {stepLine('Instructed', p.instructed)}
                    {stepLine('Verified', p.verified)}
                    {p.approved ? <li><span className="font-medium">Approved</span> · {p.approved.by.name} and {p.approved.confirmedBy.name} · {day(p.approved.at)}{p.approved.decision ? <> · <Link className="underline" href={`/verify?id=${encodeURIComponent(p.approved.decision)}`}>sealed decision</Link></> : null}</li> : <li className="text-ink-muted">Approved · not yet</li>}
                    {stepLine('Executed', p.executed, p.executed ? `bank ${p.executed.bankReference}, value ${p.executed.valueDate}` : undefined)}
                    {stepLine('Reconciled', p.reconciled, p.reconciled ? `statement ${p.reconciled.statementReference}` : undefined)}
                  </ol>
                  {p.ended ? <p className="text-alert">{p.ended.kind} by {p.ended.by.name}: {p.ended.reason}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}

      {v ? (
        <Section title="Payee accounts" meta="verified by another person, approved by two officials; numbers never shown">
          {v.payees.length ? (
            <ul className="space-y-1 text-xs">
              {v.payees.map(p => <li key={p.ref}><span className="font-medium">{p.ref}</span> · {p.organisation.name} ({p.organisation.number}) · {p.bank} {p.masked} · {p.state} · requested by {p.requested.by.name}{p.verified ? `, verified by ${p.verified.by.name} (${p.verified.method})` : ''}{p.approved ? `, approved by ${p.approved.by.name} and ${p.approved.confirmedBy.name}` : ''}</li>)}
            </ul>
          ) : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}

      {v ? (
        <Section title="Budget preparation" meta={`${v.calls.length} calls · ${v.ceilings.length} ceilings · ${v.bids.length} bids`}>
          <ul className="space-y-1 text-xs">
            {v.calls.map(c => <li key={c.ref}>Call {c.ref} · budget period {c.period} · {c.currency}{c.closesOn ? ` · submissions close ${c.closesOn}` : ''}</li>)}
            {v.ceilings.map(c => <li key={`${c.institution}${c.period}`}>Ceiling · {name(c.institution)} · {c.period} · {money(c.amountMinor, c.currency)} (version {c.version})</li>)}
            {v.bids.map(b => <li key={b.ref}>Bid {b.ref} · {name(b.institution)} · {b.programme} · requested {money(b.requestedMinor, b.currency)}{b.allocationMinor !== undefined ? ` · allocated ${money(b.allocationMinor, b.currency)}` : ''} · {b.state}</li>)}
            {!v.calls.length && !v.ceilings.length && !v.bids.length ? <li className="text-ink-muted">No budget call issued yet.</li> : null}
          </ul>
        </Section>
      ) : null}

      {v ? (
        <Section title="Cash forecasts" meta="reported by institutions; never the nation's cash">
          {v.forecasts.length ? (
            <ul className="space-y-1 text-xs">
              {v.forecasts.map(f => <li key={f.ref}>{f.ref} · {name(f.institution)} · {f.period} · version {f.version} · in {money(f.inflows.reduce((s, x) => s + x.amountMinor, 0), f.currency)}, out {money(f.outflows.reduce((s, x) => s + x.amountMinor, 0), f.currency)} · {f.state} · <span className="rounded border border-line px-1">{f.basis}</span></li>)}
            </ul>
          ) : <p className="text-xs text-ink-muted">None reported.</p>}
        </Section>
      ) : null}

      <ServicesPanel group="finance" {...(v ? { names: v.names } : {})} />
    </div>
  );
}
