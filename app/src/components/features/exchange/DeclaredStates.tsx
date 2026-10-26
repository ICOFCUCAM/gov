'use client';

// When a service is unavailable (/gov/exchange/states; plan I9,
// lib/federation/degraded.ts): every exchange service and every dependency
// the platform can run without, its state now (computed from the facts each
// time) and what the platform does while it is not available, declared in
// advance. Read only.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { DeclaredCapability } from '@/lib/federation/degraded';

const TONE: Record<DeclaredCapability['state'], PillTone> = { available: 'ok', degraded: 'warn', unavailable: 'alert', 'not-configured': 'neutral' };
const LABEL: Record<DeclaredCapability['state'], string> = { available: 'Available', degraded: 'Degraded', unavailable: 'Unavailable', 'not-configured': 'Not configured' };

export function DeclaredStates() {
  const [d, setD] = React.useState<{ at: string; capabilities: DeclaredCapability[] } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/exchange/states', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setD(j); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  const group = (kind: DeclaredCapability['kind']) => (d?.capabilities ?? []).filter(c => c.kind === kind);
  const table = (list: DeclaredCapability[], label: string) => (
    // Reachable by keyboard when it scrolls sideways (WCAG 2.1.1; plan I10 console audit).
    <div tabIndex={0} role="region" aria-label={`${label} (table)`} className="focus-ring overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr><th scope="col">Capability</th><th scope="col">State now</th><th scope="col">While it is not available</th><th scope="col">What keeps working</th></tr></thead>
        <tbody>
          {list.map(c => (
            <tr key={c.key} className="border-t border-line align-top">
              <td>{c.label}<div className="font-mono text-xs text-ink-muted">{c.key}</div></td>
              <td><Pill tone={TONE[c.state]}>{LABEL[c.state]}</Pill><div className="text-xs text-ink-muted">{c.why}</div></td>
              <td className="text-xs">{c.whileUnavailable}<div className="text-ink-muted">Enforced in {c.enforcedIn}</div></td>
              <td className="text-xs">{c.continues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        What the platform does when something it can run without is not there, said in advance: a check that cannot be made is answered
        &ldquo;not connected&rdquo; or &ldquo;unable to verify&rdquo;, never as a negative answer, and a case step that needs it is held, never
        refused and never treated as passed. States are read from the configuration each time this page opens.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {d ? (
        <>
          <Section title="Dependencies" meta={`as of ${d.at.slice(0, 16).replace('T', ' ')} UTC`}>{table(group('dependency'), 'Dependencies')}</Section>
          <Section title="Exchange services" meta={`${group('exchange-service').length} services`}>{table(group('exchange-service'), 'Exchange services')}</Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
    </div>
  );
}
