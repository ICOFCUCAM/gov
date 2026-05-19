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

export const dynamic = 'force-dynamic';

export default function PermitDetailPage({ params }: { params: { id: string } }) {
  const permit = getPermit(params.id);

  if (!permit) {
    return (
      <main className="bg-bg min-h-screen">
        <PhoneShell
          activeTab="/wallet/services"
          header={
            <>
              <Link href="/wallet/permits" className="underline underline-offset-2">← Permits</Link>
              <span className="font-mono text-xs">{params.id}</span>
            </>
          }
        >
          <p>Permit not found.</p>
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
            <Link href="/wallet/permits" className="underline underline-offset-2">← Permits</Link>
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
            {permit.officerName ? ` · Officer ${permit.officerName}` : ''}
            {permit.decisionDue
              ? ` · decision due ${new Date(permit.decisionDue).toLocaleDateString()}`
              : ''}
          </div>
        </Card>

        {permit.status === 'needs-info' ? (
          <Plain>
            <strong>Action needed.</strong> The officer asked for more
            information. You can respond here, on paper at any office, or
            through an agent — whichever works for you.
          </Plain>
        ) : null}

        <section>
          <h3 className="font-semibold text-lg mb-2">Details</h3>
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
            <h3 className="font-semibold text-lg mb-2">Was AI involved?</h3>
            <CopilotPanel decisionClass={permit.aiClass}>
              <p>
                An AI Copilot helped the reviewing officer by drafting a
                summary. <strong>The officer signs every decision.</strong> The
                AI does not decide.
              </p>
            </CopilotPanel>
          </section>
        ) : null}

        <section>
          <h3 className="font-semibold text-lg mb-2">Progress</h3>
          <Timeline entries={permit.timeline} />
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">If something's wrong</h3>
          <div className="flex flex-wrap items-start gap-3">
            <ContestDialog receiptId={permit.id} />
            <AgentRequest subjectId={permit.id} />
          </div>
          <p className="text-sm text-ink-muted mt-2">
            Questioning a decision never delays or penalises your application.
          </p>
        </section>
      </PhoneShell>
    </main>
  );
}
