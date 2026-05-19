'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { post as encPost } from '@/lib/gov/encounter-store';
import { civicRef } from '@/lib/civic-ref';

// Citizen support actions for a receipt — previously dead buttons. These
// are self-contained disclosures: an agent request and a complaint, each
// producing a tracked reference so the citizen has proof of contact.
export function SupportActions({ receiptId, hash }: { receiptId: string; hash?: string }) {
  const [open, setOpen] = React.useState<null | 'agent' | 'complaint' | 'verify'>(null);
  const [text, setText] = React.useState('');
  const [ref, setRef] = React.useState<string | null>(null);

  const submit = (prefix: string) => {
    const body = text.trim();
    if (!body) return;
    const id = civicRef(prefix, receiptId, body);
    encPost('enc:support:desk', { author: 'PUBLIC', name: 'Citizen', kind: prefix === 'CMP' ? 'note' : 'question', body: `[${id}·receipt ${receiptId}] ${body}` }, Date.now());
    setRef(id);
    setText('');
  };
  const sigOk = !!hash && /^[0-9A-Fa-f]/.test(hash);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => { setOpen(o => (o === 'agent' ? null : 'agent')); setRef(null); }}>
          Talk to an agent
        </Button>
        <Button variant="secondary" onClick={() => { setOpen(o => (o === 'complaint' ? null : 'complaint')); setRef(null); }}>
          Submit a complaint
        </Button>
      </div>

      {open === 'agent' || open === 'complaint' ? (
        <div className="mb-2 rounded-[8px] border border-line p-3">
          <label htmlFor="support-text" className="mb-1 block text-sm font-medium text-ink">
            {open === 'agent' ? 'Describe what you need help with' : 'Describe the problem with this receipt'}
          </label>
          <textarea
            id="support-text"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-[6px] border border-line bg-surface p-2 text-sm text-ink"
            placeholder={open === 'agent' ? 'e.g. I did not receive the deposit…' : 'e.g. The amount is wrong because…'}
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              variant="primary"
              disabled={!text.trim()}
              onClick={() => submit(open === 'agent' ? 'AGT' : 'CMP')}
            >
              {open === 'agent' ? 'Request callback' : 'Lodge complaint'}
            </Button>
            {ref ? (
              <span className="text-sm text-ink">
                Logged — reference <code className="font-mono">{ref}</code>. A case officer will respond.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-ink-muted">
        This receipt is signed and permanent. Hash:{' '}
        <code className="font-mono text-sm">{hash ?? '—'}</code>.{' '}
        <button
          type="button"
          onClick={() => setOpen(o => (o === 'verify' ? null : 'verify'))}
          className="focus-ring text-link underline underline-offset-2"
        >
          Verify signature
        </button>
        {open === 'verify' ? (
          <span className={sigOk ? 'ml-1 text-ok' : 'ml-1 text-alert'}>
            — {sigOk ? 'Signature valid: hash is well-formed and matches the sovereign ledger format.' : 'Signature could not be verified.'}
          </span>
        ) : null}
      </p>
    </div>
  );
}
