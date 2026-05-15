'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { Timeline } from '@/components/ui/Timeline';
import { PermitStatusBadge } from '@/components/ui/StatusBadge';
import { CopilotPanel } from '@/components/ui/CopilotPanel';
import { WorkflowBar } from '@/components/ui/WorkflowBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import type { Permit, PermitDecision } from '@/lib/api/types';

const OFFICER = 'K. Otieno';
const OPEN_STATES = new Set(['submitted', 'in-review', 'needs-info']);

export function OfficerWorkspace() {
  const [permits, setPermits] = React.useState<Permit[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'open' | 'all'>('open');
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { permits } = await api.permits.list();
      setPermits(permits);
      setSelectedId(prev => prev ?? permits.find(p => OPEN_STATES.has(p.status))?.id ?? permits[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the queue');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const queue = (permits ?? []).filter(p =>
    filter === 'open' ? OPEN_STATES.has(p.status) : true,
  );
  const selected = (permits ?? []).find(p => p.id === selectedId) ?? null;

  const all = permits ?? [];
  const openCount = all.filter(p => OPEN_STATES.has(p.status)).length;
  const slaRisk = all.filter(p => OPEN_STATES.has(p.status) && p.decisionDue && new Date(p.decisionDue).getTime() - Date.now() < 3 * 86400_000).length;
  const decidedToday = all.filter(p => (p.status === 'approved' || p.status === 'declined') && (p.timeline?.[p.timeline.length - 1] ? new Date(p.timeline[p.timeline.length - 1]!.at).toDateString() === new Date().toDateString() : false)).length;
  const stats = [
    { l: 'Open queue', v: String(openCount), c: openCount ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
    { l: 'SLA at risk', v: String(slaRisk), c: slaRisk ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
    { l: 'Decided today', v: String(decidedToday), c: 'rgb(var(--c-ok))' },
    { l: 'Total caseload', v: String(all.length), c: 'rgb(var(--c-ink))' },
    { l: 'Desk posture', v: slaRisk ? 'PRIORITISE' : openCount ? 'ACTIVE' : 'CLEAR', c: slaRisk ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
  ];

  async function decide(decision: PermitDecision, note?: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const { permit } = await api.permits.decide(selected.id, {
        decision,
        officerName: OFFICER,
        note,
        aiClass: 'B',
      });
      setPermits(prev =>
        (prev ?? []).map(p => (p.id === permit.id ? permit : p)),
      );
      setToast(
        decision === 'approve'
          ? `Approved — ${permit.title}. Citizen receipt issued.`
          : decision === 'decline'
            ? `Declined — reason recorded and sent to the citizen.`
            : decision === 'escalate'
              ? `Escalated for senior review.`
              : `Information requested from the citizen.`,
      );
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision could not be saved');
    } finally {
      setBusy(false);
    }
  }

  if (permits === null) {
    return <p className="text-ink-muted">Loading your queue…</p>;
  }

  return (
    <div>
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-[3px] border border-ok bg-[#e7f1ec] px-4 py-2 text-sm text-ok"
        >
          {toast}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {stats.map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-ink-muted">Show:</span>
        <Button
          variant={filter === 'open' ? 'primary' : 'secondary'}
          onClick={() => setFilter('open')}
        >
          Open ({(permits ?? []).filter(p => OPEN_STATES.has(p.status)).length})
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          All ({permits.length})
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Queue */}
        <div aria-label="Queue" className="space-y-2">
          {queue.length === 0 ? (
            <EmptyState title="Queue clear" hint="No cases need you right now." />
          ) : (
            queue.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                aria-current={p.id === selectedId ? 'true' : undefined}
                className={
                  'block w-full rounded-[3px] border p-3 text-left ' +
                  (p.id === selectedId
                    ? 'border-ink bg-surface'
                    : 'border-line bg-surface hover:bg-surface-2')
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-sm">{p.title}</strong>
                  <span className="font-mono text-xs text-ink-muted">{p.id}</span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {p.applicantName} · {p.municipality}
                </div>
                <div className="mt-2">
                  <PermitStatusBadge status={p.status} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail + decision */}
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-alert" role="alert">{error}</p>
          ) : null}

          {!selected ? (
            <EmptyState title="Select a case" hint="Pick a case from the queue." />
          ) : (
            <>
              <Card tight>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  <PermitStatusBadge status={selected.status} />
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {selected.applicantName} · {selected.municipality}
                  {selected.decisionDue
                    ? ` · decision due ${new Date(selected.decisionDue).toLocaleDateString()}`
                    : ''}
                </div>
              </Card>

              <section>
                <h3 className="mb-1 font-semibold">Application details</h3>
                <Card tight>
                  <dl className="space-y-1 text-sm">
                    {Object.entries(selected.fields).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="capitalize text-ink-muted">{k}</dt>
                        <dd>{v || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </section>

              <CopilotPanel decisionClass="B">
                <p>
                  <strong>Summary.</strong> Application fields are complete.
                  {selected.status === 'needs-info'
                    ? ' Citizen was previously asked for more information.'
                    : ' No blocking issues detected.'}
                </p>
                <p className="text-sm text-ink-muted">
                  This is advisory. You decide and sign. The AI does not
                  decide.
                </p>
              </CopilotPanel>

              <section>
                <h3 className="mb-2 font-semibold">Your decision</h3>
                {selected.status === 'approved' ||
                selected.status === 'declined' ? (
                  <Plain>
                    This case is closed ({selected.status}). Decisions are
                    final here; the citizen can still contest through their
                    wallet.
                  </Plain>
                ) : (
                  <WorkflowBar busy={busy} onDecision={decide} />
                )}
                <p className="mt-2 text-xs text-ink-muted">
                  Signing officer: <strong>{OFFICER}</strong>. Every decision is
                  named and written to the audit trail.
                </p>
              </section>

              <section>
                <h3 className="mb-2 font-semibold">Progress</h3>
                <Timeline entries={selected.timeline} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
