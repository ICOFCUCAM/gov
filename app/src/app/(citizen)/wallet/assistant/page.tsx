'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { AgentRequest } from '@/components/ui/AgentRequest';
import { answer } from './answer';

type Msg = { who: 'you' | 'assistant'; text: string; at: string };

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
