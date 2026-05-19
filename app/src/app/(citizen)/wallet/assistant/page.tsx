'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { AgentRequest } from '@/components/ui/AgentRequest';

type Msg = { who: 'you' | 'assistant'; text: string; at: string };

// Deterministic, source-grounded answers. The assistant finds information;
// it never drafts binding decisions (CopilotPanel decisionClass A).
function answer(q: string): string {
  const s = q.toLowerCase();
  if (s.includes('school') || s.includes('transfer')) return 'To transfer a child between counties: bring the current enrollment record, apply to the new school (directly or via your wallet), and the Ministry of Education confirms within 10 working days. Use "Start a transfer" below.';
  if (s.includes('permit') || s.includes('business')) return 'Permits are applied for in the wallet. Open Permits → Apply, describe the premises and purpose; most decisions are returned within the statutory window with a tracked reference.';
  if (s.includes('grant') || s.includes('benefit') || s.includes('child')) return 'Child grant eligibility is assessed automatically each cycle. You can see the next payment and contest any decision from its receipt.';
  if (s.includes('tax')) return 'Your tax draft is prepared for review — nothing is filed until you confirm. Open the draft from your wallet receipts.';
  if (s.includes('id') || s.includes('identity') || s.includes('address')) return 'Identity and address changes are handled under Identity. Selective disclosure lets you prove a fact without revealing the underlying record.';
  return 'I can help you find civic information — schools, permits, grants, tax, identity. For a binding decision, use a case panel or talk to a human officer below.';
}

export default function AssistantPage() {
  const [log, setLog] = React.useState<Msg[]>([
    { who: 'you', text: 'How do I transfer my child to a school in another county?', at: '14:32' },
    { who: 'assistant', text: answer('school transfer'), at: '14:32' },
  ]);
  const [q, setQ] = React.useState('');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    const at = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLog(l => [...l, { who: 'you', text: t, at }, { who: 'assistant', text: answer(t), at }]);
    setQ('');
  };

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/assistant"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Civic Assistant</strong>
            <span />
          </>
        }
      >
        <CopilotPanel decisionClass="A">
          <p className="text-ink-muted m-0">
            I help you find information. I will not draft binding decisions
            here. For decisions, return to the case panel or talk to a human
            officer.
          </p>
        </CopilotPanel>

        <section className="space-y-3" aria-label="Conversation">
          {log.map((m, i) => (
            <Card tight key={i} className={m.who === 'you' ? 'bg-surface-2' : undefined}>
              <small className="text-ink-muted">{m.who === 'you' ? 'Amina' : 'Civic Assistant'}, {m.at}</small>
              <p className="mt-1 whitespace-pre-line">{m.text}</p>
              {m.who === 'assistant' && i === log.length - 1 ? (
                <>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <Link href="/wallet/permits/new"><Button>Start a transfer</Button></Link>
                    <Link href="/wallet/services"><Button variant="secondary">Find schools nearby</Button></Link>
                    <AgentRequest subjectId="assistant" label="👤 Talk to a human officer" />
                  </div>
                  <Plain className="mt-3 text-sm">
                    <strong>Sources I used:</strong>
                    <br />• Education Act §12
                    <br />• Ministry of Education guidance, v.4
                  </Plain>
                </>
              ) : null}
            </Card>
          ))}
        </section>

        <form className="flex gap-2 mt-3" aria-label="Send a message" onSubmit={send}>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type your question…"
            aria-label="Type your question"
            className="flex-1 min-h-tap px-3 py-2 border border-line rounded-sm bg-surface"
          />
          <Button type="submit">Send</Button>
        </form>
        <div className="mt-2">
          <AgentRequest subjectId="assistant-foot" label="👤 Talk to a human officer" />
        </div>
      </PhoneShell>
    </main>
  );
}
