'use client';

// One form in its three channels (plan §3.1): self-service as the applicant
// sees it (a preview here: applicants send it from their own sign-in),
// assisted at an office and from a paper form (recorded by the signed-in
// official through /api/cases, with the identity evidence seen or the date
// the paper form was received), and the printed form. The same definition
// and the same checks in each.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import type { Channel, FormView } from '@/lib/forms/contract';
import { FormRenderer, type Submission, type SubmitResult } from './FormRenderer';
import { PrintForm } from './PrintForm';

const LABEL: Record<Channel | 'print', string> = { 'self-service': 'Self-service', assisted: 'Assisted at an office', paper: 'From a paper form', print: 'Printed form' };

export function FormChannels({ view, status, sample, initial = 'self-service' }: { view: FormView; status: { label: string; note?: string }; sample: boolean; initial?: Channel | 'print' }) {
  const [c, setC] = React.useState<Channel | 'print'>(initial);
  const submit = async (s: Submission): Promise<SubmitResult> => {
    const r = await fetch('/api/cases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ procedure: view.procedure.key, channel: c, fields: s.fields, declaration: s.declaration, assisted: s.assisted, paper: s.paper, locale: s.locale, idempotencyKey: s.idempotencyKey }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, receipt: j.receipt } : { ok: false, error: j.error ?? `Not recorded (${r.status})`, ...(j.fieldErrors ? { fieldErrors: j.fieldErrors } : {}) };
  };
  return (
    <div className="space-y-4 p-4">
      <header className="space-y-1">
        <p className="text-sm"><Link className="underline" href="/gov/law/procedures/forms">Forms</Link></p>
        <h1 className="text-xl font-semibold">{view.procedure.title}</h1>
        <p className="text-sm text-ink-muted"><bdi dir="ltr">{view.procedure.key}</bdi> · procedure version {view.procedure.version} ({view.procedure.state}) · form {view.form?.version ?? 'none'} · register status: <strong>{status.label}</strong>{status.note ? ` · ${status.note}` : ''}</p>
      </header>
      <Section title="Channel" meta="one definition, the same checks">
        <div role="tablist" aria-label="Channel" className="flex flex-wrap gap-2">
          {(['self-service', 'assisted', 'paper', 'print'] as const).map(x => (
            <button key={x} role="tab" type="button" aria-selected={c === x} className={`min-h-tap rounded-sm border px-3 text-sm focus-ring ${c === x ? 'border-ink bg-surface-2 font-semibold' : 'border-line'}`} onClick={() => setC(x)}>{LABEL[x]}</button>
          ))}
          <Link className="inline-flex min-h-tap items-center px-2 text-sm underline" href={`/gov/law/procedures/forms/${encodeURIComponent(view.procedure.key)}/print?version=${view.procedure.version}`}>Open the printable form</Link>
        </div>
      </Section>
      <div role="tabpanel" aria-label={LABEL[c]} className="rounded-sm border border-line bg-bg p-4">
        {c === 'print' ? <PrintForm view={view} />
          : c === 'self-service' ? <FormRenderer key="self" view={view} channel="self-service" preview sample={sample} />
          : <FormRenderer key={c} view={view} channel={c} sample={sample} {...(view.procedure.state === 'approved' ? { submit } : { preview: true })} />}
      </div>
    </div>
  );
}
