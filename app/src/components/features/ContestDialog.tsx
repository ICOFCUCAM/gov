'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { appendAuditEntry } from '@/lib/audit/localVault';

export interface ContestDialogProps {
  receiptId: string;
  trigger?: React.ReactNode;
}

/**
 * Three-step contestation (Companion 152 §3.3).
 * In production, the case opens to the responsible office's queue;
 * in this prototype, it persists to the local Audit Vault stub.
 */
export function ContestDialog({ receiptId, trigger }: ContestDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [submitted, setSubmitted] = React.useState<{
    caseId: string;
    reason: string;
  } | null>(null);

  function open() {
    ref.current?.showModal();
    setSubmitted(null);
  }

  function close() {
    ref.current?.close();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const action = String(data.get('action') ?? '');
    const reason = String(data.get('reason') ?? '');
    const note = String(data.get('note') ?? '');
    // Deterministic case id — reproducible from the contestation content
    // (the platform's no-randomness doctrine; also avoids collisions).
    const h = Math.abs([...`${receiptId}|${action}|${reason}|${note}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
    const caseId = 'C-' + (7000 + (h % 2999));
    appendAuditEntry('contestation', { caseId, receiptId, action, reason, note });
    setSubmitted({ caseId, reason });
  }

  return (
    <>
      {trigger ? (
        <span onClick={open} role="button" tabIndex={0} aria-label="Question this decision"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') open(); }}
        >
          {trigger}
        </span>
      ) : (
        <Button onClick={open}>Question this decision</Button>
      )}

      <dialog
        ref={ref}
        className="border border-line rounded-md p-6 max-w-md w-full backdrop:bg-ink/40"
      >
        {submitted ? (
          <div>
            <h3 className="text-xl font-semibold">Submitted</h3>
            <p className="mt-2">
              Case <strong>{submitted.caseId}</strong> opened for receipt{' '}
              <strong>{receiptId}</strong>.
            </p>
            <p className="mt-1">
              Reason: <em>{submitted.reason || '(none provided)'}</em>
            </p>
            <Plain>
              Your payment continues while we review. We will let you know within
              5 working days.
            </Plain>
            <div className="flex gap-3 mt-4">
              <Button onClick={close}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h3 className="text-xl font-semibold">Question this decision</h3>
            <p className="text-ink-muted mb-3">Receipt {receiptId}</p>

            <fieldset className="mb-3">
              <legend className="font-medium mb-1">What do you want to do?</legend>
              <div className="space-y-2">
                {[
                  ['question', 'Ask a question'],
                  ['contest', 'Contest the decision'],
                  ['complaint', 'Submit a complaint'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-start gap-2 p-3 border border-line rounded-sm hover:bg-surface-2 cursor-pointer"
                  >
                    <input type="radio" name="action" value={value} required className="mt-1" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mb-3">
              <legend className="font-medium mb-1">Why?</legend>
              <div className="space-y-2">
                {[
                  ['amount', 'The amount is wrong'],
                  ['unclear', "I'm not sure why this was decided"],
                  ['disagree', 'I disagree with the decision'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-start gap-2 p-3 border border-line rounded-sm hover:bg-surface-2 cursor-pointer"
                  >
                    <input type="radio" name="reason" value={value} required className="mt-1" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-4">
              <label htmlFor="note" className="block font-medium mb-1">
                Anything you want to tell us? (optional)
              </label>
              <textarea
                id="note"
                name="note"
                className="w-full min-h-[100px] p-3 border border-line rounded-sm bg-surface"
                placeholder="In your own words…"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
