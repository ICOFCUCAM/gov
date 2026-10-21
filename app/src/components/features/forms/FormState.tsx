// The states a form shows explicitly (spec Part 6 §H "States that must be
// designed explicitly"; plan §3.3): loading, empty, error, refused with its
// reason, waiting for a second official, sample, not connected, offline
// (answers saved on this device) and stale (the form changed since the
// answers were saved). Each says what happened and what to do next, in
// words, never by colour alone.

import * as React from 'react';
import { RefusalText } from '@/components/ui/RefusalText';
import { SignalTag } from '@/components/ui/SignalTag';

export type FormStateKind = 'loading' | 'empty' | 'error' | 'refused' | 'waiting' | 'sample' | 'not-connected' | 'offline' | 'stale';
export const FORM_STATES: FormStateKind[] = ['loading', 'empty', 'error', 'refused', 'waiting', 'sample', 'not-connected', 'offline', 'stale'];

const TITLE: Record<FormStateKind, string> = {
  loading: 'Loading the form',
  empty: 'This form has no questions for the applicant',
  error: 'The form could not be loaded',
  refused: 'This was not accepted',
  waiting: 'Waiting for a second official',
  sample: 'Sample',
  'not-connected': 'Not connected',
  offline: 'You are offline',
  stale: 'This form has changed',
};
const TEXT: Record<FormStateKind, string> = {
  loading: 'One moment.',
  empty: 'An official completes this procedure\'s details at its steps.',
  error: 'Check the connection and try again. Nothing you entered is lost.',
  refused: 'Nothing was recorded.',
  waiting: 'The procedure this form belongs to is a draft. It is used only once an official who can sign at the responsible institution, other than its author, approves it.',
  sample: 'This is a demonstration installation: what is entered here is a sample, never a real record.',
  'not-connected': 'No approved version of this procedure is in force, so applications cannot be taken yet.',
  offline: 'Your answers are saved on this device. Send them when you are connected again: sending twice never makes a second application.',
  stale: 'The form was updated since your answers were saved. Your answers are kept: check each page before you send.',
};
const TONE: Record<FormStateKind, string> = {
  loading: 'border-line', empty: 'border-line', error: 'border-alert', refused: 'border-alert', waiting: 'border-warn',
  sample: 'border-warn', 'not-connected': 'border-line', offline: 'border-warn', stale: 'border-warn',
};

export function FormState({ kind, detail, action }: { kind: FormStateKind; detail?: string; action?: React.ReactNode }) {
  const urgent = kind === 'error' || kind === 'refused';
  return (
    <div role={urgent ? 'alert' : 'status'} data-form-state={kind} aria-busy={kind === 'loading' || undefined}
      className={`rounded-sm border-s-4 ${TONE[kind]} bg-surface-2 px-4 py-3 text-sm text-ink`}>
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        {kind === 'sample' ? <SignalTag kind="sample" source="Demonstration installation" /> : kind === 'not-connected' ? <SignalTag kind="unavailable" source="No approved procedure" /> : null}
        {TITLE[kind]}
      </p>
      <p className="mt-1 text-ink-soft">{detail ? <RefusalText text={detail} /> : TEXT[kind]}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
