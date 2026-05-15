'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { api } from '@/lib/api/client';
import type { SignatureResult } from '@/lib/api/types';

const DOC = {
  id: 'DOC-FIRE-ANNEX-4F21',
  title: 'Fire-safety annex — Bakery permit PM-4F21',
};

export function SignClient() {
  const [step, setStep] = React.useState<'review' | 'confirm' | 'done'>('review');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<SignatureResult | null>(null);

  async function doSign() {
    setBusy(true);
    try {
      const { result } = await api.signatures.sign({
        documentId: DOC.id,
        documentTitle: DOC.title,
        signerName: 'Amina Hassan Mwangi',
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
          <h3 className="font-semibold">Signed</h3>
          <Plain>
            You signed <strong>{DOC.title}</strong>. This signature is
            non-repudiable and recorded to the Audit Vault.
          </Plain>
          <dl className="text-sm space-y-1 mt-3">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Signature</dt>
              <dd className="font-mono">{result.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Signed at</dt>
              <dd>{new Date(result.signedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Hash</dt>
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
        <p className="text-sm text-ink-muted">Document {DOC.id}</p>
        <p className="text-sm mt-2">
          By signing, you confirm the fire-safety annex is accurate and submit
          it to your bakery permit application.
        </p>
      </Card>

      {step === 'review' ? (
        <Button onClick={() => setStep('confirm')}>Continue to sign</Button>
      ) : (
        <Card tight>
          <h4 className="font-semibold">Confirm your signature</h4>
          <p className="text-sm text-ink-muted mb-3">
            Two factors keep your signature yours. Your biometric never leaves
            this device.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary">👤 Look at the camera</Button>
            <Button variant="secondary">🔑 Tap your security key</Button>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={doSign} disabled={busy}>
              {busy ? 'Signing…' : 'Sign'}
            </Button>
            <Button variant="secondary" onClick={() => setStep('review')}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
