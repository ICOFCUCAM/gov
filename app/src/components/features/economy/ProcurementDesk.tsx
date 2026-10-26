'use client';

// Public procurement (plan step I5): each procuring institution's plans,
// tenders and contracts as the signed-in official may read them
// (lib/procurement, /api/procurement). A tender shows every published
// version (criteria frozen, hashed), its bids by receipt only until they are
// opened, the opening record (the committee members present, what was opened,
// what came late and stayed sealed), the declarations of interest and how
// each was managed, the evaluation with reasons, the award and any challenge
// before the review body, and its contract with variations and payment
// certifications. Nothing is changed here: every step is a case step.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { ServicesPanel, money, day } from './ServicesPanel';

type Who = { id?: string; name: string };
interface Bid { ref: string; supplier: { number: string; name: string }; receivedAt: string; late: boolean; state: string; manifest: { sha256: string }; opened?: { priceMinor: number; currency: string; summary: string } }
interface Tender {
  id: string; ref: string; institution: string; planItem: string; title: string; method: string; currency: string; state: string; publishedAt?: string; sample?: true;
  versions: { n: number; at: string; reason: string; deadline: string; criteriaDigest: string; criteria: { id: string; description: string; kind: string; weight?: number }[] }[];
  committee?: { members: Who[]; appointedBy: Who; at: string };
  declarations: { member: Who | string; interest: string; managed?: { outcome: string } }[];
  opening?: { at: string; officials: Who[]; opened: string[]; late: string[]; withdrawn: string[]; record: string };
  evaluation?: { at: string; by: Who[]; results: { bid: string; criterion: string; result: string; score?: number; reasons: string }[]; recommendation: { bid: string; reasons: string } };
  award?: { bid: string; supplier: { name: string; number: string }; valueMinor: number; currency: string; reasons: string; by: Who; confirmedBy?: Who; annulled?: { reason: string } };
  challenges: { ref: string; state: string; interim?: { measure: string }; outcome?: { result: string; remedy?: string } }[];
  contract?: string; bids: Bid[];
}
interface View {
  reviewBody: { id: string; name: string } | null; names: Record<string, string>; rules: { methodThresholds: string };
  plans: { ref: string; institution: string; description: string; method: string; estimatedMinor: number; currency: string; state: string; budget?: { appropriation: string } }[];
  tenders: Tender[];
  contracts: { ref: string; tender: string; supplier: { name: string; number: string }; valueMinor: number; currency: string; state: string; versions: { n: number; change: string; reasons: string }[]; certifications: { ref: string; invoiceRef: string; amountMinor: number; by: Who }[] }[];
}

const memberName = (m: Who | string) => (typeof m === 'string' ? m : m.name);

function TenderCard({ t, name }: { t: Tender; name: (id: string) => string }) {
  const v = t.versions[t.versions.length - 1]!;
  return (
    <li className="rounded border border-line p-2 text-xs">
      <p><span className="font-medium">{t.ref}</span>{t.sample ? <span className="ml-1 rounded border border-line px-1 text-[10px] uppercase">Sample</span> : null} · <span className="font-medium">{t.state}</span> · {t.title} · {name(t.institution)} · plan item {t.planItem} · {t.method}</p>
      <p className="text-ink-muted">Version {v.n} · submissions closed at {v.deadline.slice(0, 16).replace('T', ' ')} · criteria {v.criteria.map(c => `${c.id} (${c.kind}${c.weight ? `, weight ${c.weight}` : ''})`).join(', ')} · criteria hash {v.criteriaDigest.slice(0, 12)}</p>
      <p className="mt-1 font-medium">Bids</p>
      <ul>
        {t.bids.length ? t.bids.map(b => (
          <li key={b.ref}>{b.ref} · {b.supplier.name} ({b.supplier.number}) · received {b.receivedAt.slice(0, 16).replace('T', ' ')}{b.late ? ' (late: recorded, not opened)' : ''} · {b.state}
            {b.opened ? <> · {money(b.opened.priceMinor, b.opened.currency)}</> : <span className="text-ink-muted"> · sealed (hash {b.manifest.sha256.slice(0, 12)})</span>}</li>
        )) : <li className="text-ink-muted">None received.</li>}
      </ul>
      {t.committee ? <p className="mt-1">Committee: {t.committee.members.map(m => m.name).join(', ')} (appointed by {t.committee.appointedBy.name})</p> : null}
      {t.declarations.length ? <p>Declarations of interest: {t.declarations.map(d => `${memberName(d.member)}: ${d.interest === 'none' ? 'none' : `declared${d.managed ? `, ${d.managed.outcome}` : ', not managed yet'}`}`).join('; ')}</p> : null}
      {t.opening ? (
        <div className="mt-1 rounded bg-surface-2 p-1">
          <p className="font-medium">Opening, {t.opening.at.slice(0, 16).replace('T', ' ')}</p>
          <p>Opened together by {t.opening.officials.map(o => o.name).join(' and ')} · opened {t.opening.opened.join(', ') || 'none'} · late, left sealed: {t.opening.late.join(', ') || 'none'} · withdrawn: {t.opening.withdrawn.join(', ') || 'none'}</p>
          <p className="text-ink-muted">{t.opening.record}</p>
        </div>
      ) : null}
      {t.evaluation ? <p className="mt-1">Evaluation by {t.evaluation.by.map(o => o.name).join(' and ')}: {t.evaluation.results.length} results with reasons · recommends {t.evaluation.recommendation.bid}: {t.evaluation.recommendation.reasons}</p> : null}
      {t.award ? <p className="mt-1">Award: {t.award.supplier.name} · {money(t.award.valueMinor, t.award.currency)} · by {t.award.by.name}{t.award.confirmedBy ? ` and ${t.award.confirmedBy.name}` : ''}{t.award.annulled ? ` · annulled: ${t.award.annulled.reason}` : ''}</p> : null}
      {t.challenges.map(c => <p key={c.ref} className="text-alert">Complaint {c.ref} before the review body · {c.state}{c.interim ? ` · interim measure: ${c.interim.measure}` : ''}{c.outcome ? ` · ${c.outcome.result}${c.outcome.remedy ? ` (${c.outcome.remedy})` : ''}` : ''}</p>)}
      {t.contract ? <p className="mt-1">Contract {t.contract}</p> : null}
      <p className="mt-1"><Link className="underline" href={`/api/procurement?ocds=${encodeURIComponent(t.ref)}`}>Open contracting release (OCDS)</Link></p>
    </li>
  );
}

export function ProcurementDesk() {
  const [v, setV] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/procurement', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load the procurement register'); setV(j as View); }).catch(e => setMsg((e as Error).message));
  }, []);
  const name = (id: string) => v?.names[id] ?? id;
  return (
    <div className="space-y-5 p-4">
      <h1 className="text-xl font-semibold">Procurement</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        Each institution&apos;s own procurement, under procedures it adopts and a second official approves: a plan item funded from its budget, a tender published
        once and changed only by an addendum before the deadline, bids sealed until two committee members open them together, an evaluation by members who
        declared their interests, with reasons for every result, and an award by officials who did not evaluate. Complaints go to the review body, never to the
        institution that decided. Changes are case steps: <Link className="underline" href="/gov/work/cases/open">Cases</Link>.
      </p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {v ? <p className="text-sm">Review body: {v.reviewBody ? <strong>{v.reviewBody.name}</strong> : <span className="text-alert">not named yet</span>} · method thresholds: {v.rules.methodThresholds}</p> : null}
      {v ? (
        <Section title="Tenders" meta={`${v.tenders.length} recorded`}>
          {v.tenders.length ? <ul className="space-y-2">{v.tenders.map(t => <TenderCard key={t.id} t={t} name={name} />)}</ul> : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}
      {v ? (
        <Section title="Plans" meta={`${v.plans.length} plan items`}>
          {v.plans.length ? <ul className="space-y-1 text-xs">{v.plans.map(p => <li key={p.ref}>{p.ref} · {name(p.institution)} · {p.description} · {p.method} · estimate {money(p.estimatedMinor, p.currency)}{p.budget ? ` · funded from ${p.budget.appropriation}` : ''} · {p.state}</li>)}</ul> : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}
      {v ? (
        <Section title="Contracts" meta={`${v.contracts.length} signed`}>
          {v.contracts.length ? <ul className="space-y-1 text-xs">{v.contracts.map(k => <li key={k.ref}>{k.ref} · {k.supplier.name} · {money(k.valueMinor, k.currency)} · version {k.versions.length} · {k.state} · {k.certifications.length} payment certification(s){k.certifications.length ? `: ${k.certifications.map(c => `${c.ref} invoice ${c.invoiceRef} ${money(c.amountMinor, k.currency)} by ${c.by.name}`).join('; ')}` : ''} · tender {k.tender}</li>)}</ul> : <p className="text-xs text-ink-muted">None signed.</p>}
        </Section>
      ) : null}
      <ServicesPanel group="procurement" {...(v ? { names: v.names } : {})} />
      <p className="text-xs text-ink-muted">Times shown are as recorded ({day(new Date().toISOString())}).</p>
    </div>
  );
}
