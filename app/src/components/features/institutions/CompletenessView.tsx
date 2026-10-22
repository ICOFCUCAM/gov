'use client';

// Completeness per item for one institution (plan I2; lib/onboarding/completeness.ts):
// each item's state, evidence, accountable owner, date and next action, by
// dimension. No percentage: a critical item that is not verified holds
// activation in production and is shown first.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { useInstitution, InstitutionPicker, readJson } from './InstitutionPicker';
import type { InstitutionCompleteness, ItemState } from '@/lib/onboarding/completeness';

const TONE: Record<ItemState, PillTone> = { verified: 'ok', in_progress: 'warn', not_started: 'neutral', blocked: 'alert', not_applicable: 'neutral', not_assessed: 'neutral' };

export function CompletenessView() {
  const inst = useInstitution();
  const [c, setC] = React.useState<InstitutionCompleteness | null>(null);
  const [labels, setLabels] = React.useState<{ dimensions: Record<string, string>; states: Record<string, string> } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!inst.id) return;
    void readJson<{ completeness: InstitutionCompleteness; labels: { dimensions: Record<string, string>; states: Record<string, string> } }>(`/api/org/ministries/${inst.id}/completeness`)
      .then(r => { setErr(r.error ?? null); setC(r.data?.completeness ?? null); setLabels(r.data?.labels ?? null); });
  }, [inst.id]);
  const dims = c ? [...new Set(c.items.map(i => i.dimension))] : [];
  return (
    <div className="space-y-5">
      <InstitutionPicker {...inst} />
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {c && labels ? (
        <>
          <div className="rounded-[3px] border border-line bg-surface p-3 text-sm">
            <p className="font-medium">
              Activation {c.gate.applies ? (c.gate.open ? 'is open: every critical item is verified.' : 'is held until the critical items below are verified.') : 'gate is shown but not applied in a demonstration or training installation.'}
            </p>
            {c.gate.failing.length ? (
              <ul className="mt-1 list-disc ps-5 text-xs">
                {c.gate.failing.map(f => <li key={f.key}><strong>{f.label}</strong> · owner: {f.owner}{f.next ? ` · next: ${f.next}` : ''}</li>)}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-ink-muted">{Object.entries(c.counts).filter(([, n]) => n).map(([k, n]) => `${labels.states[k]} ${n}`).join(' · ')}. Never a single percentage: a critical safeguard that fails is never averaged away.</p>
          </div>
          {dims.map(d => (
            <Section key={d} title={labels.dimensions[d] ?? d}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="text-start text-xs text-ink-muted"><th className="py-1 text-start font-medium">Item</th><th className="text-start font-medium">State</th><th className="text-start font-medium">Owner</th><th className="text-start font-medium">Date</th><th className="text-start font-medium">Next action</th></tr></thead>
                  <tbody>
                    {c.items.filter(i => i.dimension === d).map(i => (
                      <tr key={i.key} className="border-t border-line-soft align-top">
                        <td className="py-1.5 pe-3"><Link href={i.href} className="underline">{i.label}</Link>{i.critical ? <Pill tone="alert" className="ms-1">critical</Pill> : null}{i.evidence ? <span className="block text-xs text-ink-muted">{i.evidence}</span> : null}</td>
                        <td className="pe-3"><Pill tone={TONE[i.state]}>{labels.states[i.state]}</Pill></td>
                        <td className="pe-3 text-xs">{i.owner}</td>
                        <td className="pe-3 text-xs">{i.date ?? '—'}</td>
                        <td className="text-xs">{i.next ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ))}
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Reading completeness…</p> : null}
    </div>
  );
}
