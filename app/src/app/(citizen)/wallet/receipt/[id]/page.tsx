import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { ReceiptHeader } from '@/components/ui/Receipt';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { Plain } from '@/components/ui/Plain';
import { Button } from '@/components/ui/Button';
import { ContestDialog } from '@/components/features/ContestDialog';
import type { Receipt } from '@/lib/types';

// Mock receipt lookup. Production: server fetch with sovereign-controlled auth.
const RECEIPTS: Record<string, Receipt> = {
  'R-3F9A2': {
    id: 'R-3F9A2',
    title: 'Child grant — April 2026',
    summary: 'Deposited to M-Pesa ending 4421',
    amount: '2,400 KES',
    date: '2026-05-14T09:14:00.000Z',
    officerName: 'K. Otieno',
    officerId: '4423',
    aiClass: 'B',
    reasoning: ['Base grant: 2,000 KES', 'Drought supplement: 400 KES'],
    hash: '3F9A2…b41c',
    contestable: true,
  },
};

interface PageProps {
  params: { id: string };
}

export default function ReceiptPage({ params }: PageProps) {
  const receipt = RECEIPTS[params.id];

  if (!receipt) {
    return (
      <main className="bg-bg min-h-screen">
        <PhoneShell
          activeTab="/wallet"
          header={
            <>
              <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
              <span className="font-mono text-xs">{params.id}</span>
            </>
          }
        >
          <p>Receipt not found.</p>
        </PhoneShell>
      </main>
    );
  }

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <span className="font-mono text-xs">{receipt.id}</span>
          </>
        }
      >
        <ReceiptHeader receipt={receipt} />

        <section>
          <h3 className="font-semibold text-lg">What happened</h3>
          <p>
            The Ministry of Social Protection approved your monthly child grant.
            Eligibility was verified by{' '}
            <strong>Officer {receipt.officerName} (ID {receipt.officerId})</strong>.
          </p>
        </section>

        {receipt.reasoning ? (
          <section>
            <h3 className="font-semibold text-lg">Why this amount</h3>
            <ul className="list-disc pl-5 space-y-1">
              {receipt.reasoning.map(r => (
                <li key={r}>{r}</li>
              ))}
              <li><strong>Total: {receipt.amount}</strong></li>
            </ul>
          </section>
        ) : null}

        {receipt.aiClass ? (
          <section>
            <h3 className="font-semibold text-lg">Was AI involved?</h3>
            <CopilotPanel decisionClass={receipt.aiClass}>
              <p>
                An AI Copilot helped Officer {receipt.officerName} by drafting an
                eligibility summary. <strong>The officer signed the decision.</strong>
              </p>
              <p className="text-ink-muted text-sm">
                The AI did not decide. The officer did.
              </p>
            </CopilotPanel>
          </section>
        ) : null}

        <section>
          <h3 className="font-semibold text-lg">If something's wrong</h3>
          <div className="flex flex-wrap gap-3 mb-2">
            <ContestDialog receiptId={receipt.id} />
            <Button variant="secondary">Talk to an agent</Button>
            <Button variant="secondary">Submit a complaint</Button>
          </div>
          <p className="text-sm text-ink-muted">
            If you contest, your payment continues while we review. You will not
            be punished for contesting.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-lg">Proof</h3>
          <Plain>
            This receipt is signed and permanent. Hash:{' '}
            <code className="font-mono text-sm">{receipt.hash}</code>.{' '}
            <Link href="#" className="text-link underline underline-offset-2">
              Verify signature
            </Link>.
          </Plain>
        </section>
      </PhoneShell>
    </main>
  );
}
