import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PermitStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { listPermits } from '@/lib/data/store';
import { nationMessages, nationLocale } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
export const dynamic = 'force-dynamic';

export default function PermitsPage() {
  const m = nationMessages();
  const x = m.pages;
  const permits = listPermits();

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{x.permits}</strong>
            <Link href="/wallet/permits/new" className="underline underline-offset-2">{x.newShort}</Link>
          </>
        }
      >
        {permits.length === 0 ? (
          <EmptyState
            title={x.noPermits}
            hint={x.noPermitsHint}
            action={
              <Link href="/wallet/permits/new">
                <Button>{x.applyPermit}</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {permits.map(p => (
              <Link
                key={p.id}
                href={`/wallet/permits/${p.id}`}
                className="block no-underline text-ink"
              >
                <Card tight className="hover:bg-surface-2 transition-colors">
                  <div className="flex justify-between items-baseline gap-2">
                    <strong>{p.title}</strong>
                    <span className="font-mono text-xs text-ink-muted">{p.id}</span>
                  </div>
                  <div className="text-sm text-ink-muted">
                    {p.municipality} ·{' '}
                    {p.decisionDue
                      ? fill(x.decisionDue, { date: new Date(p.decisionDue).toLocaleDateString(nationLocale()) })
                      : x.noDecisionDate}
                  </div>
                  <div className="mt-2">
                    <PermitStatusBadge status={p.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Link href="/wallet/permits/new">
            <Button>{x.applyNewPermit}</Button>
          </Link>
        </div>
      </PhoneShell>
    </main>
  );
}
