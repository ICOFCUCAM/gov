import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { ReceiptHeader } from '@/components/ui/Receipt';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { ContestDialog } from '@/components/features/ContestDialog';
import { SupportActions } from './SupportActions';
import type { Receipt } from '@/lib/types';
import { DEMO_CITIZEN, DEMO_OFFICERS, homePlace, money, nationPaymentRail } from '@/lib/nation/persona';

import { nationMessages } from '@/lib/nation/registry';
// Mock receipt lookup. Production: server fetch with sovereign-controlled auth.
const receiptsFor = (): Record<string, Receipt> => ({
  'R-3F9A2': {
    id: 'R-3F9A2',
    title: 'Child grant — April 2026',
    summary: `Deposited to ${nationPaymentRail()} ending 4421`,
    amount: money(2400),
    date: '2026-05-14T09:14:00.000Z',
    officerName: DEMO_OFFICERS.caseworker,
    officerId: '4423',
    aiClass: 'B',
    reasoning: [`Base grant: ${money(2000)}`, `Drought supplement: ${money(400)}`],
    hash: '3F9A2…b41c',
    contestable: true,
  },
});

interface PageProps {
  params: { id: string };
}

export default function ReceiptPage({ params }: PageProps) {
  const m = nationMessages();
  const receipt = receiptsFor()[params.id];

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
          <h3 className="font-semibold text-lg">{m.receipt.whatHappened}</h3>
          <p>
            The Ministry of Social Protection approved your monthly child grant.
            Eligibility was verified by{' '}
            <strong>Officer {receipt.officerName} (ID {receipt.officerId})</strong>.
          </p>
        </section>

        {receipt.reasoning ? (
          <section>
            <h3 className="font-semibold text-lg">{m.receipt.whyThisAmount}</h3>
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
            <h3 className="font-semibold text-lg">{m.receipt.wasAIInvolved}</h3>
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
          <h3 className="font-semibold text-lg">{m.receipt.ifSomethingWrong}</h3>
          <div className="mb-2 flex flex-wrap gap-3">
            <ContestDialog receiptId={receipt.id} />
          </div>
          <p className="mb-3 text-sm text-ink-muted">
            {m.receipt.continuationGuarantee}
          </p>
          <SupportActions receiptId={receipt.id} hash={receipt.hash} />
        </section>
      </PhoneShell>
    </main>
  );
}
