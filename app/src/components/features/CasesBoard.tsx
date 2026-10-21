'use client';

// Open cases under the nation's procedures (lib/casework, design §6.5): the
// cases the official may read, without personal fields, with their stage,
// priority and the next deadline. Each opens its own page.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { RefusalText } from '@/components/ui/RefusalText';
import { OpenCaseForm } from './casework/OpenCaseForm';

interface Row { id: string; ref: string; package: { key: string; version: number }; stage: string; priority: string; owner: string; deadlines: { key: string; label: string; due: string; met?: string; lapsed?: string }[]; pending?: { action: string }; assignee?: { name: string }; openedAt: string; closedAt?: string }

export function CasesBoard() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    fetch(`/api/cases?open=${open}`, { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setRows(j.cases as Row[]); }).catch(e => setErr((e as Error).message));
  }, [open]);
  const next = (r: Row) => r.deadlines.filter(d => !d.met).sort((a, b) => a.due.localeCompare(b.due))[0];
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Cases</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Applications and other cases under the procedures your institution has approved. Each step is taken by an authorised official and kept in the case&apos;s history.</p>
      <OpenCaseForm />
      <label className="text-sm"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} /> Open cases only</label>
      {err ? <p role="alert" className="text-sm text-alert"><RefusalText text={err} /></p> : null}
      <Section title={open ? 'Open' : 'All'} meta={rows ? `${rows.length} cases` : 'loading'}>
        {rows?.length ? (
          <table className="w-full text-left text-sm">
            <thead><tr><th scope="col">Reference</th><th scope="col">Procedure</th><th scope="col">Stage</th><th scope="col">Priority</th><th scope="col">Next deadline</th><th scope="col">Assigned</th></tr></thead>
            <tbody>
              {rows.map(r => {
                const d = next(r);
                return (
                  <tr key={r.id} className="border-t border-line">
                    <td><Link className="underline underline-offset-2" href={`/gov/cases/${r.id}`}>{r.ref}</Link></td>
                    <td>{r.package.key}</td>
                    <td>{r.stage}{r.pending ? ` (waiting: ${r.pending.action})` : ''}</td>
                    <td>{r.priority}</td>
                    <td>{d ? `${d.label}: ${d.due}${d.lapsed ? ' (passed)' : ''}` : '—'}</td>
                    <td>{r.assignee?.name ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : rows ? <p className="text-sm text-ink-muted">No cases.</p> : null}
      </Section>
    </div>
  );
}
