'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import type { AuditEntry } from '@/lib/api/types';

export function AuditView() {
  const [events, setEvents] = React.useState<AuditEntry[] | null>(null);
  const [verify, setVerify] = React.useState<{
    ok: boolean;
    checked: number;
    brokenAtSeq?: number;
  } | null>(null);

  const load = React.useCallback(async () => {
    const { events } = await api.audit.list();
    setEvents(events);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runVerify() {
    setVerify(await api.audit.verify());
  }

  if (events === null) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card tight>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Chain integrity</h2>
            <p className="text-sm text-ink-muted">
              The audit trail is hash-chained. Verification replays the chain
              and reports the first broken link, if any.
            </p>
          </div>
          <Button onClick={runVerify}>Verify chain</Button>
        </div>
        {verify ? (
          <p className="mt-3 text-sm">
            {verify.ok ? (
              <Pill tone="ok">
                ✓ Intact — {verify.checked} events verified
              </Pill>
            ) : (
              <Pill tone="alert">
                Broken at sequence {verify.brokenAtSeq}
              </Pill>
            )}
          </p>
        ) : null}
      </Card>

      {events.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          hint="Decisions, payments and applications appear here as they happen. Act in the officer console or the citizen wallet, then return."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="p-3">Seq</th>
                <th className="p-3">When</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Resource</th>
                <th className="p-3">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-t border-line">
                  <td className="p-3 font-mono text-xs">{e.seq}</td>
                  <td className="p-3 text-ink-muted">
                    {new Date(e.at).toLocaleString()}
                  </td>
                  <td className="p-3">{e.actor}</td>
                  <td className="p-3 font-mono text-xs">{e.action}</td>
                  <td className="p-3 font-mono text-xs">{e.resource}</td>
                  <td className="p-3">
                    {e.outcome === 'ok' ? (
                      <Pill tone="ok">ok</Pill>
                    ) : (
                      <Pill tone="alert">{e.outcome}</Pill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
