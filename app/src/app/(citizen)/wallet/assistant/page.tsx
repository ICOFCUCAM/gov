import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';

export default function AssistantPage() {
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
          <Card tight className="bg-surface-2">
            <small className="text-ink-muted">Amina, 14:32</small>
            <p className="mt-1">How do I transfer my child to a school in another county?</p>
          </Card>

          <Card tight>
            <small className="text-ink-muted">Civic Assistant, 14:32</small>
            <p className="mt-1">To transfer a child between counties:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>You'll need the child's current enrollment record.</li>
              <li>You apply to the new school directly, or through your wallet.</li>
              <li>The Ministry of Education confirms within 10 working days.</li>
            </ol>
            <p className="mt-2">Would you like to:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button>Start a transfer</Button>
              <Button variant="secondary">Find schools nearby</Button>
              <Button variant="secondary">👤 Talk to a human officer</Button>
            </div>
            <Plain className="mt-3 text-sm">
              <strong>Sources I used:</strong>
              <br />
              • Education Act §12
              <br />
              • Ministry of Education guidance, v.4
            </Plain>
          </Card>
        </section>

        <form
          className="flex gap-2 mt-3"
          aria-label="Send a message"
        >
          <input
            type="text"
            placeholder="Type your question…"
            aria-label="Type your question"
            className="flex-1 min-h-tap px-3 py-2 border border-line rounded-sm bg-surface"
          />
          <Button type="submit">Send</Button>
        </form>
        <div className="flex gap-2 mt-2">
          <Button variant="secondary" type="button">🎙 Voice</Button>
          <Button variant="secondary" type="button">👤 Talk to human</Button>
        </div>
      </PhoneShell>
    </main>
  );
}
