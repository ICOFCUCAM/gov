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

import { nationMessages } from '@/lib/nation/registry';
import { DEMO_CITIZEN } from '@/lib/nation/persona';
type Msg = { who: 'you' | 'assistant'; text: string; at: string };

export default function AssistantPage() {
  const tx = nationMessages();
  const [log, setLog] = React.useState<Msg[]>([
    { who: 'you', text: tx.assistant.sampleQuestion, at: '14:32' },
    { who: 'assistant', text: answer(tx.assistant.sampleQuestion, tx), at: '14:32' },
  ]);
  const [q, setQ] = React.useState('');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    const at = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLog(l => [...l, { who: 'you', text: t, at }, { who: 'assistant', text: answer(t, tx), at }]);
    setQ('');
  };

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/assistant"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {tx.common.home}</Link>
            <strong>{tx.assistant.title}</strong>
            <span />
          </>
        }
      >
        <CopilotPanel decisionClass="A">
          <p className="text-ink-muted m-0">
            {tx.assistant.classANotice}
          </p>
        </CopilotPanel>

        <section className="space-y-3" aria-label={tx.assistant.conversation}>
          {log.map((m, i) => (
            <Card tight key={i} className={m.who === 'you' ? 'bg-surface-2' : undefined}>
              <small className="text-ink-muted">{m.who === 'you' ? DEMO_CITIZEN.name.split(' ')[0] : tx.assistant.title}, {m.at}</small>
              <p className="mt-1 whitespace-pre-line">{m.text}</p>
              {m.who === 'assistant' && i === log.length - 1 ? (
                <>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <Link href="/wallet/permits/new"><Button>{tx.assistant.startTransfer}</Button></Link>
                    <Link href="/wallet/services"><Button variant="secondary">{tx.assistant.findSchools}</Button></Link>
                    <AgentRequest subjectId="assistant" label={`👤 ${tx.common.talkToHuman}`} />
                  </div>
                  <Plain className="mt-3 text-sm">
                    <strong>{tx.assistant.sources}:</strong>
                    <br />• {tx.assistant.sourceAct}
                    <br />• {tx.assistant.sourceGuidance}
                  </Plain>
                </>
              ) : null}
            </Card>
          ))}
        </section>

        <form className="flex gap-2 mt-3" aria-label={tx.assistant.sendAria} onSubmit={send}>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={tx.assistant.placeholder}
            aria-label={tx.assistant.placeholder}
            className="flex-1 min-h-tap px-3 py-2 border border-line rounded-sm bg-surface"
          />
          <Button type="submit">{tx.assistant.send}</Button>
        </form>
        <div className="mt-2">
          <AgentRequest subjectId="assistant-foot" label={`👤 ${tx.common.talkToHuman}`} />
        </div>
      </PhoneShell>
    </main>
  );
}
