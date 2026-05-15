'use client';

import * as React from 'react';
import { Button } from './Button';
import type { PermitDecision } from '@/lib/api/types';

export interface WorkflowAction {
  decision: PermitDecision;
  label: string;
  variant?: 'primary' | 'secondary' | 'warn';
  needsNote?: boolean;
  confirm?: string;
}

const DEFAULT_ACTIONS: WorkflowAction[] = [
  { decision: 'approve', label: 'Approve', variant: 'primary', confirm: 'Approve this application?' },
  { decision: 'request-info', label: 'Request information', variant: 'secondary', needsNote: true },
  { decision: 'escalate', label: 'Escalate', variant: 'secondary', needsNote: true },
  { decision: 'decline', label: 'Decline', variant: 'warn', needsNote: true, confirm: 'Decline this application?' },
];

/**
 * Workflow action bar. Each action is an explicit, named decision.
 * Decline / request-info / escalate require a note (the citizen sees a
 * reason; the audit trail records it). Approve/decline confirm.
 * The deciding officer's name is attached by the caller — named
 * accountability is not optional.
 */
export function WorkflowBar({
  busy,
  disabled,
  onDecision,
  actions = DEFAULT_ACTIONS,
}: {
  busy?: boolean;
  disabled?: boolean;
  onDecision: (decision: PermitDecision, note?: string) => void;
  actions?: WorkflowAction[];
}) {
  const [pending, setPending] = React.useState<WorkflowAction | null>(null);
  const [note, setNote] = React.useState('');

  function start(a: WorkflowAction) {
    if (a.needsNote || a.confirm) {
      setPending(a);
      setNote('');
    } else {
      onDecision(a.decision);
    }
  }

  function commit() {
    if (!pending) return;
    onDecision(pending.decision, note.trim() || undefined);
    setPending(null);
  }

  if (pending) {
    return (
      <div className="rounded-md border border-line bg-surface p-4">
        <p className="font-medium">{pending.confirm ?? pending.label}</p>
        {pending.needsNote ? (
          <div className="mt-2">
            <label htmlFor="wf-note" className="mb-1 block text-sm">
              Reason for the citizen (shown on their receipt)
            </label>
            <textarea
              id="wf-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              required
              className="min-h-[80px] w-full rounded-sm border border-line bg-surface p-3"
              placeholder="Plain language…"
            />
          </div>
        ) : null}
        <div className="mt-3 flex gap-3">
          <Button
            onClick={commit}
            disabled={busy || (pending.needsNote && note.trim().length === 0)}
          >
            {busy ? 'Submitting…' : `Confirm: ${pending.label}`}
          </Button>
          <Button variant="secondary" onClick={() => setPending(null)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Decision">
      {actions.map(a => (
        <Button
          key={a.decision}
          variant={a.variant ?? 'secondary'}
          disabled={busy || disabled}
          onClick={() => start(a)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
