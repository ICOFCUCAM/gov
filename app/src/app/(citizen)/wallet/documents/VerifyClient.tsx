'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { Pill } from '@/components/ui/Pill';
import { TextField } from '@/components/ui/Field';
import { api } from '@/lib/api/client';
import type { VerifyResult } from '@/lib/api/types';

import { nationMessages, nationLocale } from '@/lib/nation/registry';
export function VerifyClient() {
  const x = nationMessages().pages;
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
        {x.verifyIntro.split(/(\{valid\}|\{revoked\})/).map((part, i) =>
          part === '{valid}' ? <code key={i}>VC-DEMO</code> : part === '{revoked}' ? <code key={i}>REV-DEMO</code> : part)}
      </Plain>

      <form onSubmit={onSubmit}>
        <TextField
          label={x.documentCode}
          name="code"
          required
          placeholder="VC-XXXX"
        />
        <Button type="submit" disabled={busy}>
          {busy ? x.checking : x.verify}
        </Button>
      </form>

      {result ? (
        <Card tight>
          <div className="flex items-center gap-2 mb-2">
            {result.valid ? (
              <Pill tone="ok">{x.valid}</Pill>
            ) : result.revoked ? (
              <Pill tone="alert">{x.revoked}</Pill>
            ) : (
              <Pill tone="alert">{x.notValid}</Pill>
            )}
          </div>
          {result.valid ? (
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{x.subject}</dt>
                <dd>{result.subject}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{x.issuer}</dt>
                <dd>{result.issuer}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{x.type}</dt>
                <dd>{result.credentialType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{x.issued}</dt>
                <dd>
                  {result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString(nationLocale())
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
