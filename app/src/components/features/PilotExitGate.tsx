'use client';

// The pilot's exit gate (spec Part 6 I, roadmap 05, S6-I-11; Health I4
// standalone-and-pilot) on the health regulation console: whether authorised
// users completed the service with real records and verifiable audit
// evidence. Computed by the server from the records each time it is read
// (GET /api/pilot/exit-gate, lib/pilot/exit-gate.ts); this screen only shows
// it. It reports evidence and never declares Health complete.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';

interface Gate {
  computedAt: string; installation: string; met: boolean; note: string; missing: string[];
  scope: { label: string; from: 'edition' | 'health-slots'; institutions: { id: string; name: string }[] };
  items: { key: string; label: string; met: boolean; detail: string; missing: string[] }[];
  procedures: { key: string; title: string; approved?: number; completed: number; samples: number; decisions: { total: number; verified: number } }[];
  officials: { name: string; id?: string; acts: number }[];
}

export function PilotExitGate() {
  const [gate, setGate] = React.useState<Gate | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/pilot/exit-gate', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) setMsg(j.error ?? 'Could not compute the exit gate'); else setGate(j as Gate); }).catch(() => setMsg('Could not compute the exit gate'));
  }, []);
  if (msg) return <p role="status" className="p-4 text-sm text-ink-muted">{msg}</p>;
  if (!gate) return <p className="p-4 text-sm text-ink-muted">Computing from the records…</p>;
  const shown = gate.procedures.filter(p => p.approved || p.completed || p.samples);
  return (
    <div className="space-y-6 p-4">
      <Section title="Pilot exit gate" meta={`${gate.scope.label} · computed ${gate.computedAt.slice(0, 16).replace('T', ' ')} UTC`}>
        <p className="max-w-3xl text-xs text-ink-muted">
          Exit gate of the pilot (roadmap 05): authorised users complete the service with real records and verifiable audit evidence.
          Computed from the records each time this page is read; nobody sets it. {gate.note}
        </p>
        <div className={`mt-3 rounded border p-3 text-sm ${gate.met ? 'border-line' : 'border-line bg-surface'}`} data-testid="pilot-gate-status">
          <p className="text-base font-semibold">{gate.met ? 'Met' : 'Not met'}</p>
          <p className="text-xs text-ink-muted">
            {gate.scope.from === 'edition' ? 'The Institutional Edition' : 'The institutions named for the health registers'}: {gate.scope.institutions.map(i => i.name).join(', ') || 'none'} · {gate.installation} installation
          </p>
          {!gate.met ? (
            <>
              <p className="mt-2 font-medium">Missing ({gate.missing.length})</p>
              <ul className="ms-4 list-disc text-xs">{gate.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </>
          ) : null}
        </div>
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-ink-muted"><tr><th className="py-1 pe-2">Evidence</th><th className="pe-2">Held</th><th>From the records</th></tr></thead>
          <tbody>
            {gate.items.map(i => (
              <tr key={i.key} className="border-t border-line align-top">
                <td className="py-1 pe-2 font-medium">{i.label}</td>
                <td className="pe-2">{i.met ? 'Yes' : 'No'}</td>
                <td>{i.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Per procedure" meta="completed cases that are not samples">
        {shown.length ? (
          <table className="w-full text-left text-xs">
            <thead className="text-ink-muted"><tr><th className="py-1 pe-2">Procedure</th><th className="pe-2">Approved version in force</th><th className="pe-2">Completed (real)</th><th className="pe-2">Samples (not counted)</th><th>Decisions verified</th></tr></thead>
            <tbody>
              {shown.map(p => (
                <tr key={p.key} className="border-t border-line">
                  <td className="py-1 pe-2">{p.title} <span className="text-ink-muted">({p.key})</span></td>
                  <td className="pe-2">{p.approved ? `version ${p.approved}` : 'none'}</td>
                  <td className="pe-2">{p.completed}</td>
                  <td className="pe-2">{p.samples}</td>
                  <td>{p.decisions.verified} of {p.decisions.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-ink-muted">No procedure of the pilot institutions is approved yet (<Link className="underline" href="/gov/law/procedures">Procedures</Link>).</p>}
      </Section>
      <Section title="Officials who acted" meta="on completed cases that are not samples">
        {gate.officials.length ? <ul className="text-xs">{gate.officials.map((o, i) => <li key={i}>{o.name}{o.id ? '' : ' (no verified sign-in)'} · {o.acts} step(s)</li>)}</ul> : <p className="text-xs text-ink-muted">None yet.</p>}
        <p className="mt-2 text-xs text-ink-muted">
          Where each item is fixed: <Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/law/permit-authorities">Permit authorities</Link> · <Link className="underline" href="/gov/configuration/seal-keys">Seal keys</Link> · <Link className="underline" href="/gov/work">Cases</Link> · <Link className="underline" href="/gov/configuration/edition">Institutional Edition and export</Link>
        </p>
      </Section>
    </div>
  );
}
