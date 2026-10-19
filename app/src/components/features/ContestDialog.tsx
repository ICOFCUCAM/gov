'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { appendAuditEntry } from '@/lib/audit/localVault';
import { civicRef } from '@/lib/civic-ref';

import { nationMessages } from '@/lib/nation/registry';
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
  const m = nationMessages();
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
    const caseId = civicRef('C', receiptId, action, reason, note);
    appendAuditEntry('contestation', { caseId, receiptId, action, reason, note });
    setSubmitted({ caseId, reason });
  }

  return (
    <>
      {trigger ? (
        <span onClick={open} role="button" tabIndex={0} aria-label={m.contest.headline}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') open(); }}
        >
          {trigger}
        </span>
      ) : (
        <Button onClick={open}>{m.contest.headline}</Button>
      )}

      <dialog
        ref={ref}
        className="border border-line rounded-md p-6 max-w-md w-full backdrop:bg-ink/40"
      >
        {submitted ? (
          <div>
            <h3 className="text-xl font-semibold">{m.contest.submitted}</h3>
            <p className="mt-2">
              {m.contest.caseOpened.split(/(\{\w+\})/).map((part, i) =>
                part === '{caseId}' ? <strong key={i}>{submitted.caseId}</strong>
                  : part === '{receiptId}' ? <strong key={i}>{receiptId}</strong> : part)}
            </p>
            <p className="mt-1">
              Reason: <em>{submitted.reason || '(none provided)'}</em>
            </p>
            <Plain>{m.contest.paymentContinues}</Plain>
            <div className="flex gap-3 mt-4">
              <Button onClick={close}>{m.common.close}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h3 className="text-xl font-semibold">{m.contest.headline}</h3>
            <p className="text-ink-muted mb-3">Receipt {receiptId}</p>

            <fieldset className="mb-3">
              <legend className="font-medium mb-1">{m.contest.pickWhat}</legend>
              <div className="space-y-2">
                {[
                  ['question', m.contest.optionAsk],
                  ['contest', m.contest.optionContest],
                  ['complaint', m.contest.optionComplaint],
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
              <legend className="font-medium mb-1">{m.contest.pickWhy}</legend>
              <div className="space-y-2">
                {[
                  ['amount', m.contest.reasonAmount],
                  ['unclear', m.contest.reasonUnclear],
                  ['disagree', m.contest.reasonDisagree],
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
                {m.contest.noteLabel}
              </label>
              <textarea
                id="note"
                name="note"
                className="w-full min-h-[100px] p-3 border border-line rounded-sm bg-surface"
                placeholder="In your own words…"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit">{m.common.submit}</Button>
              <Button type="button" variant="secondary" onClick={close}>
                {m.common.cancel}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
