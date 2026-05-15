'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { Pill } from '@/components/ui/Pill';
import { TextField } from '@/components/ui/Field';
import { api } from '@/lib/api/client';
import type { VerifyResult } from '@/lib/api/types';

export function VerifyClient() {
  const [result, setResult] = React.useState<VerifyResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '');
    if (!code) return;
    setBusy(true);
    try {
      setResult(await api.documents.verify(code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Plain>
        Paste or scan a document code to check it was really issued by the
        state and has not been altered. Try <code>VC-DEMO</code> (valid),{' '}
        <code>REV-DEMO</code> (revoked), or anything else (invalid).
      </Plain>

      <form onSubmit={onSubmit}>
        <TextField
          label="Document code"
          name="code"
          required
          placeholder="VC-XXXX"
        />
        <Button type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Verify'}
        </Button>
      </form>

      {result ? (
        <Card tight>
          <div className="flex items-center gap-2 mb-2">
            {result.valid ? (
              <Pill tone="ok">✓ Valid</Pill>
            ) : result.revoked ? (
              <Pill tone="alert">Revoked</Pill>
            ) : (
              <Pill tone="alert">Not valid</Pill>
            )}
          </div>
          {result.valid ? (
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Subject</dt>
                <dd>{result.subject}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Issuer</dt>
                <dd>{result.issuer}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Type</dt>
                <dd>{result.credentialType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Issued</dt>
                <dd>
                  {result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm">{result.reason}</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
