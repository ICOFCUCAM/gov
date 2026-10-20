'use client';

// The records an institution's application holds in the platform's real
// registers (apps/_shared/register-sources.ts), shown above its simulation
// screens. Each figure is read once through the register's own route, which
// applies the read rule and writes the access log; a refused read says why and
// who keeps the register, a failed one says "Not connected". The simulation
// screens below stay reachable: marked Sample in demo and training, folded away
// and marked "Not connected" in production (SimulatedView).

import * as React from 'react';
import Link from 'next/link';
import { SignalTag } from '@/components/ui/SignalTag';
import { recordSourcesFor, readOutcome, type AppIdentity, type RecordFigure, type RecordSource } from './register-sources';
import type { InstallationMode } from '@/lib/ops/mode';

type Read = { state: 'loading' } | { state: 'ok'; figures: RecordFigure[] } | { state: 'no'; kind: 'refused' | 'sign-in' | 'not-connected'; text: string };

function useRead(src: RecordSource): Read {
  const [r, setR] = React.useState<Read>({ state: 'loading' });
  React.useEffect(() => {
    let live = true;
    // Read once: some registers log every read, so the panel never polls.
    fetch(src.url, { credentials: 'same-origin' })
      .then(async res => {
        const body = await res.json().catch(() => null) as unknown;
        if (!live) return;
        if (!res.ok) {
          const err = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
          setR({ state: 'no', ...readOutcome(res.status, typeof err === 'string' ? err : undefined, src) });
        } else setR({ state: 'ok', figures: src.read(body) });
      })
      .catch(() => { if (live) setR({ state: 'no', ...readOutcome(0, undefined, src) }); });
    return () => { live = false; };
  }, [src]);
  return r;
}

function SourceCard({ src, samples }: { src: RecordSource; samples: boolean }) {
  const r = useRead(src);
  return (
    <div className="rounded-[3px] border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
          <span className="truncate">{src.label}</span>
          {r.state === 'ok' && samples && src.mayHoldSamples ? <SignalTag kind="sample" source="This installation also keeps example records here (demo or training); they carry the Sample marker on the register's own screen" /> : null}
          {r.state === 'no' && r.kind === 'not-connected' ? <SignalTag kind="unavailable" source={r.text} /> : null}
        </span>
        <Link href={src.screen} className="shrink-0 text-[10px] text-link underline underline-offset-2">Open →</Link>
      </div>
      {r.state === 'loading' ? <p role="status" className="mt-1 text-[11px] text-ink-muted">Reading…</p>
        : r.state === 'no' ? <p className="mt-1 text-[11px] text-ink-muted">{r.text}</p>
          : (
            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              {r.figures.map(f => (
                <React.Fragment key={f.label}>
                  <dt className="truncate text-ink-muted">{f.label}</dt>
                  <dd className="text-right font-mono tabular-nums text-ink">{f.value.toLocaleString()}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
    </div>
  );
}

export function RegisterRecords({ app, mode }: { app: AppIdentity; mode: InstallationMode }) {
  const sources = React.useMemo(() => recordSourcesFor(app), [app.id, app.kind, app.archetypeOrBranch, app.instanceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const samples = mode !== 'production';
  const titleId = React.useId();
  if (sources.length === 0) {
    return (
      <section aria-label="Records in the platform" className="mb-2 rounded-[3px] border border-line bg-surface p-2 text-[11px] text-ink-muted">
        No register in the platform holds this institution&apos;s records yet; everything below comes from a simulation engine.
      </section>
    );
  }
  return (
    <section aria-labelledby={titleId} className="mb-2 rounded-[3px] border border-line bg-bg p-2">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">Records in the platform</h2>
        <span className="text-[10px] text-ink-muted">Read through each register&apos;s own rules; personal records are opened on the register&apos;s screen, where each read is logged.</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {sources.map(s => <SourceCard key={s.key} src={s} samples={samples} />)}
      </div>
    </section>
  );
}

/**
 * The application's simulation screens. Demo and training: shown, under a
 * Sample strip. Production: folded away, said to be not connected, opened only
 * on request (and only then rendered), so no simulated figure reads as the nation's.
 */
export function SimulatedView({ mode, children }: { mode: InstallationMode; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  if (mode !== 'production') {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 rounded-[3px] border border-dashed border-line px-2 py-1 text-[10px] text-ink-muted">
          <SignalTag kind="sample" source="Simulation engine (generated until the institution's records are kept in the platform)" />
          The screens below come from a simulation engine; the records above are the platform&apos;s own.
        </div>
        {children}
      </div>
    );
  }
  return (
    <details className="rounded-[3px] border border-dashed border-line" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="focus-ring flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] text-ink-soft">
        <SignalTag kind="unavailable" source="These screens are not connected to this nation's records" />
        Simulation screens: not connected to this nation&apos;s records. Open to see them as a simulation.
      </summary>
      {open ? <div className="p-2">{children}</div> : null}
    </details>
  );
}
