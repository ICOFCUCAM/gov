// What a library form is and what it waits for (lib/forms/library): its
// source, the catalogue row a CivicOS contract answers, the procedure and
// stage it belongs to or the stage it is intended for, who completes it, the
// values the nation's law decides (named, none set), the country decisions,
// every deviation with the rule that requires it, and what the loader
// reported. Presentational: the designer and the form page pass what the API
// (?form=) or lib/forms/page-data.ts gave.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';

export interface LibraryInfo {
  specId: string;
  owner: string;
  awaits: string | null;
  notes: { field?: string; kind: string; note: string }[];
  deviations: { id?: string; field?: string; what: string; why: string; rule?: string }[];
  catalogue?: { source: string; id: string; part: number; section: string; line: number };
  procedure?: { key: string; stage: string; action?: string; document?: string; also?: string[] } | null;
  exchange?: string | null;
  filledBy?: string;
  nationValues?: { key: string; kind: string; source: string; decision: string }[];
  countryDecisions?: string[];
  items?: number;
}

const KIND: Record<string, string> = { fee: 'Fee', days: 'Day count', period: 'Period', threshold: 'Threshold', hours: 'Continuing education' };

export function LibraryDetails({ title, library }: { title: string; library: LibraryInfo }) {
  const c = library.catalogue;
  return (
    <Section title={`${title} · form library`} meta={c ? `catalogue ${c.id} · contract draft` : library.awaits ? `waits for ${library.awaits}` : 'attached to its procedure'}>
      {c ? (
        <div className="space-y-2 text-sm">
          <p className="text-ink-muted">A field contract CivicOS wrote for the catalogue row <bdi dir="ltr">{c.id}</bdi> (Part {c.part} §{c.section}, <bdi dir="ltr">{c.source.split('/').pop()}</bdi> line {c.line}), answering {library.items ?? 0} catalogue passages, each quoted with what meets it. It is a draft: nothing in it is approved, and every value the nation&apos;s law decides is left unset.</p>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr]">
            <dt className="font-medium">Belongs to</dt>
            <dd>{library.procedure ? <>the reference procedure <bdi dir="ltr">{library.procedure.key}</bdi>{library.procedure.also?.length ? <> (and <bdi dir="ltr">{library.procedure.also.join(', ')}</bdi>)</> : null}, stage <bdi dir="ltr">{library.procedure.stage}</bdi>{library.procedure.action ? <>, step <bdi dir="ltr">{library.procedure.action}</bdi></> : null}{library.procedure.document ? <>, as its document <bdi dir="ltr">{library.procedure.document}</bdi></> : null}</> : library.exchange ? <>the exchange service <bdi dir="ltr">{library.exchange}</bdi> and the public check</> : 'no procedure yet'}</dd>
            <dt className="font-medium">Waits for</dt><dd>{library.awaits}</dd>
            <dt className="font-medium">Responsible</dt><dd>{library.owner} (from Who is responsible; never a ministry by name)</dd>
            {library.filledBy ? <><dt className="font-medium">Completed by</dt><dd>{library.filledBy}</dd></> : null}
          </dl>
          {library.nationValues?.length ? <div><strong>Values the nation&apos;s law decides (none set)</strong><ul className="list-disc ps-5">{library.nationValues.map(v => <li key={v.key}>{KIND[v.kind] ?? v.kind}: {v.decision} <span className="text-ink-muted">(<bdi dir="ltr">{v.key}</bdi>, {v.source === 'rule' ? 'an approved rule' : v.source === 'procedure' ? 'the procedure\'s day count' : 'a setting'}: unset)</span></li>)}</ul></div> : null}
          {library.countryDecisions?.length ? <div><strong>Country decisions</strong><ul className="list-disc ps-5">{library.countryDecisions.map(d => <li key={d}>{d}</li>)}</ul></div> : null}
        </div>
      ) : <p className="text-sm text-ink-muted">Loaded from the specification&apos;s or the field series&apos; form contract, field for field. It is a draft: its sector step attaches it to a procedure the responsible institution approves.</p>}
      {library.deviations.length ? <div className="text-sm"><strong>Deviations, each with its reason</strong><ul className="list-disc ps-5">{library.deviations.map((d, i) => <li key={i}>{d.field ? <bdi dir="ltr">{d.field}</bdi> : null} {d.what}: {d.why}{d.rule ? <span className="text-ink-muted"> ({d.rule})</span> : null}</li>)}</ul></div> : null}
      {library.notes.length ? <div className="text-sm"><strong>What the loader reported</strong><ul className="list-disc ps-5">{library.notes.map((n, i) => <li key={i}>{n.field ? <bdi dir="ltr">{n.field}</bdi> : null} ({n.kind}) {n.note}</li>)}</ul></div> : null}
    </Section>
  );
}
