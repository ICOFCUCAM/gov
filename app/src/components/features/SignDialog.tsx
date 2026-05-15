'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { ClassBanner } from '@/components/ui/ClassBanner';
import { appendAuditEntry } from '@/lib/audit/localVault';
import type { DecisionClass } from '@/lib/types';

export interface SignDialogProps {
  decisionId: string;
  officerName: string;
  summary: string;
  decisionClass: DecisionClass;
}

/**
 * Officer signature ceremony (Companion 153 §7).
 * Two-factor confirmation (token + biometric, stubbed in prototype).
 * The signature is the operative binding act.
 */
export function SignDialog({
  decisionId,
  officerName,
  summary,
  decisionClass,
}: SignDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [signed, setSigned] = React.useState(false);

  function open() {
    ref.current?.showModal();
    setSigned(false);
  }

  function close() {
    ref.current?.close();
  }

  function sign() {
    appendAuditEntry('signature', {
      decisionId,
      officerName,
      summary,
      decisionClass,
    });
    setSigned(true);
  }

  return (
    <>
      <Button onClick={open}>I sign this decision ({officerName})</Button>

      <dialog
        ref={ref}
        className="border border-line rounded-md p-6 max-w-md w-full backdrop:bg-ink/40"
      >
        {signed ? (
          <div>
            <h3 className="text-xl font-semibold">Signed</h3>
            <Plain>
              Decision <strong>{decisionId}</strong> signed by{' '}
              <strong>{officerName}</strong>. Citizen receipt issued. Recorded
              to the Audit Vault. Contestable for 30 days.
            </Plain>
            <Button className="mt-4" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold">Sign decision</h3>
            <p className="text-ink-muted mb-2">You are about to sign:</p>
            <Plain>
              Case <strong>{decisionId}</strong>
              <br />
              {summary}
            </Plain>

            <p className="mt-3 mb-1 text-sm text-ink-muted">AI involvement:</p>
            <ClassBanner decisionClass={decisionClass} />
            <p className="text-sm text-ink-muted mt-2">
              Your name will appear on this decision as the deciding officer.
            </p>

            <h4 className="font-semibold mt-4 mb-2">
              Confirm with token + biometric
            </h4>
            <div className="flex gap-3 flex-wrap">
              <Button variant="secondary" type="button">
                👤 Look at the camera
              </Button>
              <Button variant="secondary" type="button">
                🔑 Tap your security key
              </Button>
            </div>

            <p className="text-sm text-ink-muted mt-3">
              Signing issues the citizen receipt, schedules disbursement via
              CivicPay, logs to the Audit Vault, and makes this decision
              contestable for 30 days.
            </p>

            <div className="flex gap-3 mt-4">
              <Button onClick={sign}>Sign</Button>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
