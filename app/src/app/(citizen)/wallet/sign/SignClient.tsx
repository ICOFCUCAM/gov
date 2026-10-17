'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { api } from '@/lib/api/client';
import type { SignatureResult } from '@/lib/api/types';
import { DEMO_CITIZEN } from '@/lib/nation/persona';
import { nationMessages, nationLocale } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
const DOC = {
  id: 'DOC-FIRE-ANNEX-4F21',
  title: 'Fire-safety annex — Bakery permit PM-4F21',
};

export function SignClient() {
  const m = nationMessages();
  const x = m.pages;
  const [step, setStep] = React.useState<'review' | 'confirm' | 'done'>('review');
  const [busy, setBusy] = React.useState(false);
  const [face, setFace] = React.useState(false);
  const [key, setKey] = React.useState(false);
  const [result, setResult] = React.useState<SignatureResult | null>(null);

  async function doSign() {
    setBusy(true);
    try {
      const { result } = await api.signatures.sign({
        documentId: DOC.id,
        documentTitle: DOC.title,
        signerName: DEMO_CITIZEN.name,
      });
      setResult(result);
      setStep('done');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done' && result) {
    return (
      <div className="space-y-4">
        <Card tight>
          <h3 className="font-semibold">{x.signed}</h3>
          <Plain>
            {x.signedIntro.split('{title}').map((part, i) => (
              <React.Fragment key={i}>{i > 0 ? <strong>{DOC.title}</strong> : null}{part}</React.Fragment>
            ))}
          </Plain>
          <dl className="text-sm space-y-1 mt-3">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{x.signature}</dt>
              <dd className="font-mono">{result.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{x.signedAt}</dt>
              <dd>{new Date(result.signedAt).toLocaleString(nationLocale())}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{x.hash}</dt>
              <dd className="font-mono">{result.hash}</dd>
            </div>
          </dl>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card tight>
        <h3 className="font-semibold">{DOC.title}</h3>
        <p className="text-sm text-ink-muted">{fill(x.documentId, { id: DOC.id })}</p>
        <p className="text-sm mt-2">
          {x.signExplain}
        </p>
      </Card>

      {step === 'review' ? (
        <Button onClick={() => setStep('confirm')}>{x.continueToSign}</Button>
      ) : (
        <Card tight>
          <h4 className="font-semibold">{x.confirmSignature}</h4>
          <p className="text-sm text-ink-muted mb-3">
            {x.twoFactors}
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => setFace(true)} disabled={face} aria-pressed={face}>
              {face ? x.faceVerified : x.lookCamera}
            </Button>
            <Button variant="secondary" onClick={() => setKey(true)} disabled={key} aria-pressed={key}>
              {key ? x.keyVerified : x.tapKey}
            </Button>
          </div>
          {!(face && key) ? (
            <p className="mt-2 text-sm text-ink-muted">{x.bothRequired}</p>
          ) : null}
          <div className="flex gap-3 mt-4">
            <Button onClick={doSign} disabled={busy || !face || !key}>
              {busy ? x.signing : x.sign}
            </Button>
            <Button variant="secondary" onClick={() => { setStep('review'); setFace(false); setKey(false); }}>
              {m.common.cancel}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
