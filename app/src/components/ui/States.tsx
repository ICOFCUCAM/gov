import * as React from 'react';
import { cn } from '@/lib/utils';
import { uiState, type StateTone } from '@/lib/ui/states';
import { Skeleton } from '@/components/ui/Skeleton';

// The shared state panels (plan step I10; specification Part 6 §H): every
// console screen says what is happening in the same way — a word and a shape
// beside the colour, a live region so screen readers hear it, the reason and
// the next action. Nothing here invents a fact: a last successful update is
// shown only when the caller has one, otherwise "none recorded".
// The catalogue of states is lib/ui/states.ts; /gov/help/states shows them all.

export type NoticeState = 'error' | 'unavailable' | 'refused' | 'conflict' | 'stale' | 'partial' | 'integrity' | 'session' | 'waiting' | 'offline';

/** Text colour of a tone's word: the ground's own status inks (4.5:1, tokens.test.ts). */
export const TONE_TEXT: Record<StateTone, string> = {
  neutral: 'text-ink-soft',
  info: 'text-link',
  ok: 'text-ok',
  warn: 'text-warn',
  alert: 'text-alert',
};
const TONE_EDGE: Record<StateTone, string> = {
  neutral: 'border-s-line',
  info: 'border-s-link',
  ok: 'border-s-ok',
  warn: 'border-s-warn',
  alert: 'border-s-alert',
};

/** The word and shape of a state, as one label (the shape is decoration; the word is read). */
export function StateWord({ id, className }: { id: string; className?: string }) {
  const s = uiState(id);
  return (
    <span data-state-word={s.id} className={cn('inline-flex items-center gap-1 font-semibold', TONE_TEXT[s.tone], className)}>
      <span aria-hidden>{s.shape}</span>{s.word}
    </span>
  );
}

const when = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

/**
 * One state panel. `lastSuccess` (unavailable, stale): the actual time of the
 * last successful update, or null when none was recorded — never a guess.
 * `source`: the system or register the state is about.
 */
export function StateNotice({ state, title, children, action, lastSuccess, source, className }: {
  state: NoticeState;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  lastSuccess?: string | null;
  source?: string;
  className?: string;
}) {
  const s = uiState(state);
  const role = s.live === 'alert' ? 'alert' : s.live === 'status' ? 'status' : undefined;
  const dated = state === 'unavailable' || state === 'stale';
  return (
    <div role={role} aria-label={`${s.word}: ${title}`} data-state={s.id}
      className={cn('rounded-sm border border-line border-s-4 bg-surface px-3 py-2 text-sm text-ink', TONE_EDGE[s.tone], className)}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <StateWord id={s.id} />
        <span className="font-medium">{title}</span>
      </p>
      {children ? <div className="mt-1 text-ink-soft">{children}</div> : null}
      {source || dated ? (
        <p className="mt-1 text-xs text-ink-muted">
          {source ? <>Source: {source}{dated ? ' · ' : ''}</> : null}
          {dated ? (lastSuccess ? <>Last successful update: <time dateTime={lastSuccess}>{when(lastSuccess)}</time></> : 'Last successful update: none recorded') : null}
        </p>
      ) : null}
      {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/** Loading: a live status with its words, and the shape of what is coming. */
export function LoadingState({ label, rows = 3, className }: { label: string; rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-state="loading" className={cn('space-y-2', className)}>
      <p className="text-sm text-ink-soft"><StateWord id="loading" /> <span>{label}</span></p>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-3.5" />)}
    </div>
  );
}

/** Validation errors: a summary at the top, each linked to its field (specification Part 6 §E). */
export function ErrorSummary({ errors, title = 'Check your answers' }: { errors: { field: string; message: string }[]; title?: string }) {
  if (!errors.length) return null;
  return (
    <div role="alert" aria-label={title} data-state="validation" tabIndex={-1}
      className="rounded-sm border border-line border-s-4 border-s-alert bg-surface px-3 py-2 text-sm text-ink">
      <p className="flex items-baseline gap-2"><StateWord id="validation" /><span className="font-medium">{errors.length === 1 ? 'One answer needs correcting' : `${errors.length} answers need correcting`}</span></p>
      <ul className="mt-1 list-disc ps-5">
        {errors.map(e => <li key={e.field}><a className="text-link underline" href={`#${e.field}`}>{e.message}</a></li>)}
      </ul>
    </div>
  );
}
