import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PermitStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { listPermits } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export default function PermitsPage() {
  const permits = listPermits();

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Permits</strong>
            <Link href="/wallet/permits/new" className="underline underline-offset-2">+ New</Link>
          </>
        }
      >
        {permits.length === 0 ? (
          <EmptyState
            title="No permits yet"
            hint="Apply for a permit and track its progress here."
            action={
              <Link href="/wallet/permits/new">
                <Button>Apply for a permit</Button>
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
                      ? `decision due ${new Date(p.decisionDue).toLocaleDateString()}`
                      : 'no decision date yet'}
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
            <Button>Apply for a new permit</Button>
          </Link>
        </div>
      </PhoneShell>
    </main>
  );
}
