// A form reference that is not one library form (lib/forms/page-data.ts
// resolveLibraryForm()): a bare catalogue ID that more than one catalogue
// uses, refused with its candidates (never resolved to one of them), or a
// catalogue entry with no contract in the library (its scope; an excluded
// entry cannot be drafted for publication). Presentational.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';

export interface AmbiguousRef { formId: string; error: string; candidates: { identity: string; title: string; scope?: string; contract: boolean }[] }
export interface EntryInfo { identity: string; catalogue: string; source: string; formId: string; title: string; scope?: string; rule?: string; contract: false; draftable: boolean; note: string }

const SCOPE: Record<string, string> = { excluded: 'Excluded by the approved scope', requires_legal_review: 'Held for a legal review', allowed: 'Allowed' };
const href = (identity: string) => `/gov/law/procedures/forms/${encodeURIComponent(identity)}`;

export function AmbiguousForm({ ambiguous }: { ambiguous: AmbiguousRef }) {
  return (
    <Section title={`${ambiguous.formId} names more than one form`} meta="a bare form ID identifies no form">
      <p role="alert" className="text-sm">{ambiguous.error}</p>
      <ul className="mt-2 space-y-2 text-sm">
        {ambiguous.candidates.map(c => (
          <li key={c.identity} className={`rounded-sm border-s-4 bg-surface-2 px-3 py-2 ${c.scope === 'excluded' ? 'border-alert' : 'border-line'}`}>
            <Link className="font-medium underline" href={href(c.identity)}><bdi dir="ltr">{c.identity}</bdi></Link>
            <span className="block">{c.title}</span>
            <span className="block text-xs text-ink-muted">{c.contract ? 'A contract draft in the form library' : 'No contract in the form library'}{c.scope ? ` · ${SCOPE[c.scope] ?? c.scope}` : ''}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function CatalogueEntryView({ entry }: { entry: EntryInfo }) {
  return (
    <Section title={`${entry.title} · catalogue entry`} meta={`${entry.scope ? SCOPE[entry.scope] ?? entry.scope : 'in the catalogue'} · no contract`}>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
        <dt className="font-medium">Identity</dt><dd><bdi dir="ltr">{entry.identity}</bdi></dd>
        <dt className="font-medium">Catalogue</dt><dd><bdi dir="ltr">{entry.source}</bdi></dd>
        <dt className="font-medium">Form ID</dt><dd><bdi dir="ltr">{entry.formId}</bdi> (the ID alone names no form: other catalogues may use it)</dd>
        {entry.scope ? <><dt className="font-medium">Scope</dt><dd>{SCOPE[entry.scope] ?? entry.scope}{entry.rule ? ` · ${entry.rule}` : ''}</dd></> : null}
        <dt className="font-medium">Contract</dt><dd>None in the form library</dd>
        <dt className="font-medium">Can be drafted</dt><dd>{entry.draftable ? 'Only as its own contract, in a batch the owner approves' : 'No: the approved scope prohibits it'}</dd>
      </dl>
      <p role={entry.scope === 'excluded' ? 'alert' : undefined} className={`mt-2 rounded-sm border-s-4 bg-surface-2 px-3 py-2 text-sm ${entry.scope === 'excluded' ? 'border-alert' : 'border-line'}`}>{entry.note}</p>
    </Section>
  );
}
