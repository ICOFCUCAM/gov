'use client';

// Where setup stands (/api/onboarding/status): one row per track with its
// progress; opening a track shows its checks, each linking to the page that
// does the work. Changes begun by one official and waiting for a second are
// listed together so they can be found and confirmed. Read-only: every change
// is made on the linked page, under its own rules.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { OnboardingStatus, Track, TrackState } from '@/lib/onboarding/status';

const STATE: Record<TrackState, { label: string; tone: PillTone }> = {
  done: { label: 'Done', tone: 'ok' },
  'in-progress': { label: 'In progress', tone: 'warn' },
  'not-started': { label: 'Not started', tone: 'neutral' },
  blocked: { label: 'Blocked', tone: 'alert' },
};

function TrackRow({ t, open, toggle }: { t: Track; open: boolean; toggle: () => void }) {
  const done = t.checks.filter(c => c.done).length;
  return (
    <li id={`track-${t.key}`} className="rounded-md border border-line bg-surface">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-start gap-3 p-3 text-start">
        <span className="mt-0.5 w-5 text-ink-muted" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{t.title}</span>
            <Pill tone={STATE[t.state].tone}>{STATE[t.state].label}</Pill>
            {t.samplesOnly ? <Pill>Demo and training only</Pill> : null}
            {t.samplesCounted ? <Pill tone="warn" title="This installation is seeded with sample records; a check may be done only because of them">Counts sample records</Pill> : null}
          </span>
          <span className="mt-1 block text-xs text-ink-muted">{t.why}</span>
        </span>
        <span className="text-xs text-ink-muted">{done} of {t.checks.length}</span>
      </button>
      {open ? (
        <div className="border-t border-line-soft px-3 pb-3 pt-2 ps-11">
          {t.blockedBy ? <p role="alert" className="mb-2 text-sm text-alert">{t.blockedBy}</p> : null}
          <ul className="space-y-2">
            {t.checks.map(c => (
              <li key={c.label} className="flex items-start gap-2 text-sm">
                <span aria-hidden className={c.done ? 'text-ok' : 'text-ink-muted'}>{c.done ? '✓' : '○'}</span>
                <span className="flex-1">
                  <Link href={c.href} className="underline">{c.label}</Link>
                  <span className="sr-only">{c.done ? ' (done)' : ' (not done)'}</span>
                  {c.detail ? <span className="block text-xs text-ink-muted">{c.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs"><Link href={t.href} className="underline">Open {t.title.toLowerCase()}</Link></p>
        </div>
      ) : null}
    </li>
  );
}

export function OnboardingHub() {
  const [s, setS] = React.useState<OnboardingStatus | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch('/api/onboarding/status', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`); return j as OnboardingStatus; })
      .then(j => { setS(j); setErr(null); setOpen(o => o ?? j.tracks.find(t => t.state !== 'done')?.key ?? null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);

  if (err) return <p role="alert" className="text-sm text-alert">{err}</p>;
  if (!s) return <p className="text-sm text-ink-muted">Reading where setup stands…</p>;

  const blocked = s.tracks.filter(t => t.state === 'blocked');
  return (
    <div className="space-y-6">
      <Section title="Setting up the government" meta={`${s.done} of ${s.total} tracks done · ${s.mode} installation`}>
        <p className="mb-3 text-sm text-ink-muted">
          Each track is one part of running a government on the platform. Work through them in any order; the
          checks read the live records, so they turn done as the work is done. Open a track to see what is left
          and go straight to the page that does it.
        </p>
        <div className="mb-4 h-2 w-full rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={s.total} aria-valuenow={s.done} aria-label="Tracks done">
          <div className="h-2 rounded-full bg-ok" style={{ width: `${s.total ? (100 * s.done) / s.total : 0}%` }} />
        </div>
        <ol className="space-y-2">
          {s.tracks.map(t => <TrackRow key={t.key} t={t} open={open === t.key} toggle={() => setOpen(o => (o === t.key ? null : t.key))} />)}
        </ol>
        <p className="mt-3 text-xs"><button type="button" onClick={load} className="underline">Check again</button></p>
      </Section>

      <Section title="Waiting for a second official" meta={`${s.waiting.length} waiting`}>
        {s.waiting.length ? (
          <ul className="divide-y divide-line-soft">
            {s.waiting.map((w, i) => (
              <li key={`${w.what}-${i}`} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                <Link href={w.href} className="font-medium underline">{w.what}</Link>
                <span className="text-xs text-ink-muted">proposed by {w.proposedBy}{w.at ? ` · ${w.at.slice(0, 16).replace('T', ' ')}` : ''}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Nothing is waiting. A change one official begins (a law, a procedure, a rate, a rule set, a website) appears here until a different official confirms it.</p>
        )}
      </Section>

      {blocked.length ? (
        <Section title="Blocked by the environment" meta="set by whoever runs the servers">
          <ul className="space-y-1 text-sm">
            {blocked.map(t => <li key={t.key}><a href={`#track-${t.key}`} className="underline">{t.title}</a>: {t.blockedBy}</li>)}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
