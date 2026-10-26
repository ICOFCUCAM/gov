'use client';

// Every shared console component in every state, on every ground (plan step
// I10, the component-state test): /gov/help/states. Officials and designers
// see how the platform says "loading", "refused", "out of date" and the rest;
// component-states.test.ts renders it and the console accessibility audit
// (app/scripts/audit-console.mjs) runs axe and a keyboard pass over it on a
// desktop and a phone. Everything here is an example: no figure, name or
// time on this page is a record.

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/Field';
import { DataTable, Section } from '@/components/ui/DataSystem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { SignalTag } from '@/components/ui/SignalTag';
import { RefusalText } from '@/components/ui/RefusalText';
import { StateNotice, LoadingState, ErrorSummary, StateWord } from '@/components/ui/States';
import { LIGHT } from '@/lib/theme/tokens';
import { UI_STATES } from '@/lib/ui/states';

/** The grounds a component is drawn on: the console's (inherited from its shell), the light ground and the workspace ground. */
export const GALLERY_GROUNDS = [
  { key: 'console', label: 'Console ground', note: 'Situation Room, the command console and every page in its frame.' },
  { key: 'light', label: 'Light ground', note: 'Citizen, sign-in and administration surfaces.' },
  { key: 'workspace', label: 'Workspace ground', note: 'The institutional workspace palette of the specification (plan step I10); no screen is repainted with it yet.' },
] as const;
type GroundKey = (typeof GALLERY_GROUNDS)[number]['key'];

const groundProps = (k: GroundKey): { className: string; style?: React.CSSProperties } =>
  k === 'workspace' ? { className: 'ws' }
    : k === 'light' ? { className: '', style: LIGHT as unknown as React.CSSProperties }
    : { className: '' };

interface Row { id: string; reference: string; state: string }
const ROWS: Row[] = [
  { id: 'a', reference: 'EXAMPLE-0001', state: 'Waiting for a second official' },
  { id: 'b', reference: 'EXAMPLE-0002', state: 'Decided' },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Ground({ k, label, note }: { k: GroundKey; label: string; note: string }) {
  const [tried, setTried] = React.useState(0);
  const id = (x: string) => `${k}-${x}`;
  const p = groundProps(k);
  return (
    <section aria-labelledby={id('title')} data-ground={k} className={`${p.className} rounded-md border border-line bg-bg p-3 text-ink`} style={p.style}>
      <h2 id={id('title')} className="text-lg font-semibold text-ink">{label}</h2>
      <p className="text-compact text-ink-soft">{note}</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Group title="Buttons: default, disabled, working">
          <div className="flex flex-wrap gap-2" data-state="default">
            <Button onClick={() => setTried(n => n + 1)}>Approve</Button>
            <Button variant="secondary" onClick={() => setTried(n => n + 1)}>Save draft</Button>
            <Button variant="ghost" onClick={() => setTried(n => n + 1)}>Cancel</Button>
          </div>
          <div className="flex flex-wrap gap-2" data-state="disabled">
            <Button disabled title="Needs a second official">Confirm (disabled)</Button>
            <Button busy>Sending</Button>
          </div>
          {tried ? <p role="status" className="text-compact text-ink-soft">Pressed {tried} time{tried === 1 ? '' : 's'} (examples do nothing else).</p> : null}
        </Group>

        <Group title="Fields: help, error, disabled">
          <ErrorSummary errors={[{ field: id('reference'), message: 'Enter the case reference, for example EXAMPLE-0001' }]} />
          <TextField label="Case reference" name={id('reference')} help="As printed on the notice." error="Enter the case reference, for example EXAMPLE-0001" />
          <TextField label="Officer (filled in for you)" name={id('officer')} defaultValue="The signed-in official" disabled />
          <SelectField label="Decision" name={id('decision')} defaultValue="">
            <option value="">Choose…</option><option value="grant">Grant</option><option value="refuse">Refuse</option>
          </SelectField>
        </Group>

        <Group title="Table: records, empty, loading">
          <DataTable<Row> caption={`Example cases (${label.toLowerCase()})`} rowKey={r => r.id} rows={ROWS}
            columns={[{ key: 'ref', header: 'Reference', render: r => <Link className="text-link underline" href="/gov/work/cases/open">{r.reference}</Link> }, { key: 'state', header: 'State', render: r => r.state }]} />
          <DataTable<Row> caption="Cases matching the filters" rowKey={r => r.id} rows={[]} empty="No cases match these filters." columns={[{ key: 'ref', header: 'Reference', render: r => r.reference }]} />
          <DataTable<Row> caption="Cases" rowKey={r => r.id} rows={[]} loading columns={[{ key: 'ref', header: 'Reference', render: r => r.reference }]} />
        </Group>

        <Group title="Status words and markers">
          <p className="flex flex-wrap gap-2" data-state="badges">
            <Pill tone="neutral">Draft</Pill><Pill tone="ok">Approved</Pill><Pill tone="warn">Needs information</Pill><Pill tone="alert">Declined</Pill>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            Figures: <span data-state="sample">12 <SignalTag kind="sample" source="an example on this page" /></span>
            <span data-state="simulated">8 <SignalTag kind="simulated" source="an example on this page" /></span>
            <span data-state="not-connected">— <SignalTag kind="unavailable" source="no source is connected in this example" /></span>
            <span>3 <SignalTag kind="modelled" source="an example scenario" /></span>
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-compact">
            {UI_STATES.map(s => <li key={s.id}><StateWord id={s.id} /></li>)}
          </ul>
        </Group>

        <Group title="Empty and loading">
          <EmptyState title="No cases match these filters." hint="Clear a filter, or open a case." action={<Link className="text-link underline" href="/gov/work/cases/open">Open the cases</Link>} />
          <LoadingState label="Loading the register" />
        </Group>

        <Group title="When something is wrong">
          <StateNotice state="error" title="The decision was not saved." action={<Button variant="secondary" onClick={() => setTried(n => n + 1)}>Try again</Button>}>
            The server did not answer. Nothing was changed; trying again is safe.
          </StateNotice>
          <StateNotice state="unavailable" title="The source system is not responding." source="Example register" lastSuccess={null} />
          <StateNotice state="refused" title="You do not have permission to perform this action.">
            <RefusalText text="Decisions here are signed by the institution named under Who is responsible; ask an official who can sign there." />
          </StateNotice>
          <StateNotice state="stale" title="These figures may be out of date." source="Example source (the time below is an example)" lastSuccess="2026-01-01T00:00:00Z" />
          <StateNotice state="conflict" title="Someone else changed this record.">
            Version 3 (yours) and version 4 (theirs) differ; the record goes to an authorised reviewer.
          </StateNotice>
          <StateNotice state="partial" title="2 of 3 notices were sent.">
            Sent: the applicant, the registry. Not sent: the archive (no connection). Retrying sends only the one that failed.
          </StateNotice>
          <StateNotice state="integrity" title="The seal on this record could not be verified.">
            Do not rely on it as verified; report it under Audit record.
          </StateNotice>
          <StateNotice state="session" title="Your session ended." action={<Link className="text-link underline" href="/sign-in">Sign in again</Link>}>
            Your draft is kept in this browser; sign in to continue where you left off.
          </StateNotice>
          <StateNotice state="waiting" title="Waiting for a second official.">
            A different official who can sign confirms this step; you cannot confirm your own proposal.
          </StateNotice>
          <StateNotice state="offline" title="You're offline.">
            You can keep working; actions are saved and will sync when the connection returns.
          </StateNotice>
        </Group>
      </div>
    </section>
  );
}

export function StateGallery() {
  return (
    <div className="space-y-4">
      <Section title="Every state, on every ground" meta={<SignalTag kind="sample" source="every value on this page is an example, not a record" />}>
        <p className="max-w-3xl text-sm text-ink-soft">
          How the platform shows each state of its shared components: the same words and shapes everywhere, never colour alone, and text that reads at 4.5:1 on every ground.
          The list of states comes from the specification (Part 6 §H) and the plan (§3.3); the colours, type and spacing from the design tokens. Press Tab to see keyboard focus.
        </p>
      </Section>
      {GALLERY_GROUNDS.map(g => <Ground key={g.key} k={g.key} label={g.label} note={g.note} />)}
    </div>
  );
}
