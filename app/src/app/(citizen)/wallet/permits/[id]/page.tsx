import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Plain } from '@/components/ui/Plain';
import { Timeline } from '@/components/ui/Timeline';
import { PermitStatusBadge } from '@/components/ui/StatusBadge';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { ContestDialog } from '@/components/features/ContestDialog';
import { AgentRequest } from '@/components/ui/AgentRequest';
import { getPermit } from '@/lib/data/store';

import { nationMessages, nationLocale } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
import { rich } from '@/lib/i18n/rich';
export const dynamic = 'force-dynamic';

export default async function PermitDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const m = nationMessages();
  const permit = getPermit(params.id);

  if (!permit) {
    return (
      <main className="bg-bg min-h-screen">
        <PhoneShell
          activeTab="/wallet/services"
          header={
            <>
              <Link href="/wallet/permits" className="underline underline-offset-2">← {m.pages.permits}</Link>
              <span className="font-mono text-xs">{params.id}</span>
            </>
          }
        >
          <p>{m.detail.notFoundPermit}</p>
        </PhoneShell>
      </main>
    );
  }

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet/permits" className="underline underline-offset-2">← {m.pages.permits}</Link>
            <span className="font-mono text-xs">{permit.id}</span>
          </>
        }
      >
        <Card tight>
          <div className="flex justify-between items-baseline gap-2">
            <h2 className="text-xl font-semibold">{permit.title}</h2>
            <PermitStatusBadge status={permit.status} />
          </div>
          <div className="text-sm text-ink-muted mt-1">
            {permit.municipality}
            {permit.officerName ? ` · ${fill(m.detail.officer, { name: permit.officerName })}` : ''}
            {permit.decisionDue
              ? ` · ${fill(m.pages.decisionDue, { date: new Date(permit.decisionDue).toLocaleDateString(nationLocale()) })}`
              : ''}
          </div>
        </Card>

        {permit.status === 'needs-info' ? (
          <Plain>
            <strong>{m.detail.actionNeeded}</strong> {m.detail.actionNeededText}
          </Plain>
        ) : null}

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.detail.details}</h3>
          <Card tight>
            <dl className="text-sm space-y-1">
              {Object.entries(permit.fields).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-muted capitalize">{k}</dt>
                  <dd>{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {permit.aiClass ? (
          <section>
            <h3 className="font-semibold text-lg mb-2">{m.receipt.wasAIInvolved}</h3>
            <CopilotPanel decisionClass={permit.aiClass}>
              <p>
                {rich(m.detail.aiPermit, { bold: <strong>{m.detail.aiPermitBold}</strong> })}
              </p>
            </CopilotPanel>
          </section>
        ) : null}

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.detail.progress}</h3>
          <Timeline entries={permit.timeline} />
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.receipt.ifSomethingWrong}</h3>
          <div className="flex flex-wrap items-start gap-3">
            <ContestDialog receiptId={permit.id} />
            <AgentRequest subjectId={permit.id} />
          </div>
          <p className="text-sm text-ink-muted mt-2">
            {m.detail.neverDelays}
          </p>
        </section>
      </PhoneShell>
    </main>
  );
}
