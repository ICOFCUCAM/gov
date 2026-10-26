'use client';

// The Cabinet office (plan step I5): Cabinet papers, the decisions recorded
// with the meeting's quorum and vote under the nation's adopted rules
// (authenticated by a second official, every correction a new version), the
// government action register (instructions only where the whole government
// may instruct; otherwise requests), the indicators of specification §3.6
// computed from the records, and the Cabinet rules in force. As the signed-in
// official may read them (lib/cabinet, /api/cabinet-office). Petitions and
// correspondence to the executive office are restricted cases of their own
// procedure (Cases). Directives with required responses: Directives.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { SignalTag } from '@/components/ui/SignalTag';
import { LoadingState } from '@/components/ui/States';
import { ServicesPanel, day } from './ServicesPanel';

type Who = { id?: string; name: string };
interface Decision {
  ref: string; submission: string; title: string; legalCategory: string; meetingDate: string; classification: string; sample?: true;
  basis: { title?: string; instrument: string; num?: string; eId: string }[];
  vote: { present: number; quorum: number; members: number; rule: string; consensus: boolean; for?: number; against?: number; abstain?: number; rulesVersion?: number } | { notAdopted: string };
  versions: { n: number; at: string; text: string; reason: string; by: Who; confirmedBy?: Who; decision?: string }[];
  disclosure?: { state: string; reasons: string }; distribution: { to: string }[];
}
interface View {
  office: { id: string; name: string } | null; names: Record<string, string>;
  rules: { version: number; members?: number; quorum?: { numerator: number; denominator: number }; rule?: string; qualified?: { numerator: number; denominator: number } };
  ruleChanges: { pending?: { by: string; at: string } };
  submissions: { ref: string; sponsor: string; title: string; classification: string; state: string; versions: unknown[]; legalReview?: { by: Who }; fiscalReview?: { by: Who } }[];
  decisions: Decision[];
  actions: { ref: string; decision: string; institution: string; description: string; due?: string; kind: string; state: string; updates: { at: string; text: string; by: Who }[] }[];
  indicators?: { submissions: Record<string, number>; daysToDecision: { median: number | null; p90: number | null }; decisionsWithBasis: { withBasisAndSeal: number; of: number }; actions: { completedByDeadline: number; of: number }; overdueByInstitution: Record<string, number>; source: string };
}

function DecisionCard({ d, name }: { d: Decision; name: (id: string) => string }) {
  const v = d.versions[d.versions.length - 1]!;
  return (
    <li className="rounded border border-line p-2 text-xs">
      <p><span className="font-medium">{d.ref}</span>{d.sample ? <SignalTag kind="sample" source="a demonstration record" className="ml-1" /> : null} · {d.title} · paper {d.submission} · {d.legalCategory} · {d.classification}</p>
      <blockquote className="my-1 border-s-2 border-line ps-2">{v.text}</blockquote>
      <p>Meeting {d.meetingDate} · {'notAdopted' in d.vote ? <span className="text-alert">{d.vote.notAdopted} (a demonstration only)</span>
        : <>{d.vote.present} of {d.vote.members} members present, quorum {d.vote.quorum} · {d.vote.rule}{d.vote.consensus ? ' · by consensus' : ` · for ${d.vote.for}, against ${d.vote.against}, abstaining ${d.vote.abstain ?? 0}`} · rules version {d.vote.rulesVersion}</>}</p>
      <p>Recorded by {v.by.name}{v.confirmedBy ? `, authenticated by ${v.confirmedBy.name}` : ''} · {day(v.at)} · version {v.n}{v.decision ? <> · <Link className="underline" href="/verify">sealed</Link></> : null}</p>
      <p className="text-ink-muted">Law: {d.basis.length ? d.basis.map(b => `${b.title ?? b.instrument} ${b.num ?? b.eId}`).join('; ') : 'none cited (demonstration)'} · {d.disclosure ? `${d.disclosure.state}: ${d.disclosure.reasons}` : 'disclosure not recorded yet'} · distributed to {d.distribution.map(x => name(x.to)).join(', ') || 'nobody yet'}</p>
    </li>
  );
}

export function CabinetOffice() {
  const [v, setV] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/cabinet-office', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load the Cabinet register'); setV(j as View); }).catch(e => setMsg((e as Error).message));
  }, []);
  const name = (id: string) => v?.names[id] ?? id;
  const r = v?.rules;
  return (
    <div className="space-y-5 p-4">
      <h2 className="text-xl font-semibold">Cabinet office</h2>
      <p className="max-w-3xl text-sm text-ink-muted">
        Cabinet papers reviewed for law and cost by different officials and circulated; decisions recorded with the meeting&apos;s quorum and vote under the
        nation&apos;s own rules, authenticated by a second official and corrected only by a new version; actions assigned to institutions without transferring
        their powers. Petitions and correspondence to the executive office are answered or referred under their own procedure. Directives that ask for a
        response list who has not answered: <Link className="underline" href="/gov/directives">Directives</Link>.
      </p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {!v && !msg ? <LoadingState label="Loading the Cabinet office" /> : null}
      {v ? (
        <p className="text-sm">Kept by {v.office ? <strong>{v.office.name}</strong> : <span className="text-alert">no cabinet office named yet</span>} · Cabinet rules: {r?.version ? `${r.members} members, quorum ${r.quorum?.numerator}/${r.quorum?.denominator}, ${r.rule}${r.qualified ? ` ${r.qualified.numerator}/${r.qualified.denominator}` : ''} (version ${r.version})` : 'not adopted (ship unset)'}{v.ruleChanges.pending ? ` · a change by ${v.ruleChanges.pending.by} waits for a second official` : ''}</p>
      ) : null}
      {v ? (
        <Section title="Decisions" meta={`${v.decisions.length} recorded`}>
          {v.decisions.length ? <ul className="space-y-2">{v.decisions.map(d => <DecisionCard key={d.ref} d={d} name={name} />)}</ul> : <p className="text-xs text-ink-muted">None recorded.</p>}
        </Section>
      ) : null}
      {v ? (
        <Section title="Action register" meta={`${v.actions.length} actions`}>
          {v.actions.length ? <ul className="space-y-1 text-xs">{v.actions.map(a => <li key={a.ref}>{a.ref} · {name(a.institution)} · {a.kind} · {a.description}{a.due ? ` · by ${a.due}` : ''} · {a.state}{a.updates.length ? ` · last report ${day(a.updates[a.updates.length - 1]!.at)}` : ''} · decision {a.decision}</li>)}</ul> : <p className="text-xs text-ink-muted">None assigned.</p>}
        </Section>
      ) : null}
      {v ? (
        <Section title="Cabinet papers" meta={`${v.submissions.length} submitted`}>
          {v.submissions.length ? <ul className="space-y-1 text-xs">{v.submissions.map(s => <li key={s.ref}>{s.ref} · {name(s.sponsor)} · {s.title} · {s.classification} · {s.state}{s.legalReview ? ` · legal review ${s.legalReview.by.name}` : ''}{s.fiscalReview ? ` · fiscal review ${s.fiscalReview.by.name}` : ''}</li>)}</ul> : <p className="text-xs text-ink-muted">None submitted.</p>}
        </Section>
      ) : null}
      {v?.indicators ? (
        <Section title="Indicators" meta={v.indicators.source}>
          <ul className="text-xs">
            <li>Papers received {v.indicators.submissions.received}, returned {v.indicators.submissions.returned}, decided {v.indicators.submissions.decided}</li>
            <li>Days from submission to decision: median {v.indicators.daysToDecision.median?.toFixed(1) ?? '—'}, 90th percentile {v.indicators.daysToDecision.p90?.toFixed(1) ?? '—'}</li>
            <li>Decisions with a legal basis and a sealed record: {v.indicators.decisionsWithBasis.withBasisAndSeal} of {v.indicators.decisionsWithBasis.of}</li>
            <li>Actions completed by their deadline: {v.indicators.actions.completedByDeadline} of {v.indicators.actions.of}</li>
            <li>Overdue actions: {Object.entries(v.indicators.overdueByInstitution).map(([i, n]) => `${name(i)} ${n}`).join(', ') || 'none'}</li>
          </ul>
        </Section>
      ) : null}
      <ServicesPanel group="cabinet" {...(v ? { names: v.names } : {})} />
    </div>
  );
}
