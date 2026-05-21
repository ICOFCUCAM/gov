'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { myReceiptTimelineRows, type ReceiptEvent } from '@/lib/db/repos/citizen';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { buildCsv, downloadCsv, downloadJson } from '@/lib/csv-download';
import { ageMinutes } from '@/lib/format';

/**
 * /wallet/receipts — the citizen's unified substrate receipts.
 *
 * Every record the substrate has linked to the signed-in citizen:
 * service requests filed, consents granted, appeals lodged, and the
 * workflow steps officers took on linked work items. Sorted newest-first.
 *
 * The right-to-take-your-data is baked into the substrate via the
 * `civicos_my_receipt_timeline` SECURITY DEFINER RPC, which scopes to
 * auth.uid() server-side. This surface just renders the timeline and
 * lets the citizen export it (CSV / JSON).
 */
export default function ReceiptsPage() {
  const { actor, session, ready } = useIdentity();
  const [events, setEvents] = React.useState<ReceiptEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      setEvents(await myReceiptTimelineRows(200));
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'service_requests' as const },
      { table: 'consents' as const },
      { table: 'appeals' as const },
      { table: 'work_item_steps' as const },
    ], []),
    refresh,
  );

  const exportCsv = React.useCallback(() => {
    const csv = buildCsv(
      ['at', 'kind', 'ref', 'charter', 'status', 'detail'],
      events.map(e => [e.at, e.kind, e.ref, e.charter, e.status, e.detail]),
    );
    downloadCsv('civicos-receipts', csv);
  }, [events]);

  const exportJson = React.useCallback(() => {
    if (!actor) return;
    downloadJson(`civicos-receipts-${actor.id.slice(0, 8)}`, {
      generated_at: new Date().toISOString(),
      citizen: { id: actor.id, name: actor.name },
      events,
    });
  }, [events, actor]);

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/receipts"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Receipts</strong>
            <span />
          </>
        }
      >
        <Card tight>
          <h3 className="font-semibold mb-1">Everything the state has on you</h3>
          <p className="text-sm text-ink-muted">
            Service requests you filed, consents you granted, appeals you lodged,
            and every workflow step an officer took on something linked to you.
            Sorted newest-first. RLS enforces that you only see your own records.
          </p>
        </Card>

        {!available ? (
          <Card tight><p className="text-sm text-ink-muted">Substrate not configured.</p></Card>
        ) : !session ? (
          <Card tight><p className="text-sm">
            <Link href="/sign-in?from=/wallet/receipts" className="underline">Sign in</Link> to view your receipts.
          </p></Card>
        ) : !actor || actor.kind !== 'citizen' ? (
          <Card tight><p className="text-sm text-ink-muted">
            Signed in but no citizen profile is linked. Visit{' '}
            <Link href="/wallet/substrate" className="underline">/wallet/substrate</Link>{' '}
            to provision one.
          </p></Card>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => { void refresh(); }} disabled={loading}>
                {loading ? 'refreshing…' : 'refresh'}
              </Button>
              <Button variant="secondary" onClick={exportCsv} disabled={events.length === 0}>
                csv
              </Button>
              <Button variant="secondary" onClick={exportJson} disabled={events.length === 0}>
                json
              </Button>
            </div>

            <section>
              <h3 className="font-semibold text-lg mb-2">
                {events.length === 0 ? 'No receipts yet' : `${events.length} receipts`}
              </h3>
              <ul className="space-y-2">
                {events.map((e, i) => (
                  <Card tight key={`${e.kind}:${e.ref}:${i}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        {e.kind}
                      </span>
                      <span className="font-mono text-sm">{e.ref}</span>
                      <span className="ml-auto text-xs text-ink-muted">
                        {ageMinutes(e.at)}m ago
                      </span>
                    </div>
                    <div className="text-sm text-ink">{e.detail}</div>
                    <div className="text-xs text-ink-muted">
                      {e.charter} · {e.status}
                    </div>
                  </Card>
                ))}
              </ul>
            </section>

            <Card tight>
              <p className="text-xs text-ink-muted">
                Receipts are read directly from the substrate via
                <code className="font-mono"> civicos_my_receipt_timeline</code>,
                a SECURITY DEFINER RPC scoped to <code className="font-mono">auth.uid()</code>.
                Officers cannot see your receipts; civil society cannot see them
                without your account.
              </p>
            </Card>
          </>
        )}
      </PhoneShell>
    </main>
  );
}
