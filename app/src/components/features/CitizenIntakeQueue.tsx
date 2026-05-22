'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  listServiceRequestsRows, updateServiceRequestRow,
  listAppealsRows, decideAppealRow,
} from '@/lib/db/repos/citizen';
import { recordEscalationRow } from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { ServiceRequestRow, AppealRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { getBoolPref, setPref } from '@/lib/prefs';
import { ageMinutes } from '@/lib/format';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

/**
 * CitizenIntakeQueue — the officer-side counterpart to CitizenSubstrate.
 *
 * Service requests and appeals from citizens land in the relevant
 * charter's view (RLS-scoped by target_charter_id / originating_charter_id
 * via the broader work-item policy). Officers ack/progress/resolve
 * service requests and decide appeals inline.
 *
 * RLS today on these tables is the citizens-self policy (citizen sees
 * own records). For officers to see requests addressed to their
 * charter we'd need an additional officer-side policy — left as a
 * follow-up. Today this surface relies on the service-role-equivalent
 * platform-tier visibility OR a small RLS extension landing later.
 */
export function CitizenIntakeQueue() {
  const { actor, session, ready } = useIdentity();
  const [requests, setRequests] = React.useState<ServiceRequestRow[]>([]);
  const [appeals, setAppeals]   = React.useState<AppealRow[]>([]);
  const [openOnly, setOpenOnly] = React.useState(() => getBoolPref('intake.openOnly', true));
  React.useEffect(() => { setPref('intake.openOnly', openOnly); }, [openOnly]);
  const [selectedReqs, setSelectedReqs] = React.useState<Set<string>>(new Set());
  const [selectedAppeals, setSelectedAppeals] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkReport, setBulkReport] = React.useState<{ ok: number; failed: number } | null>(null);
  const [bulkAppealDecision, setBulkAppealDecision] = React.useState('upheld');
  const [bulkAppealReason, setBulkAppealReason] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const charter = actor?.kind === 'officer' ? actor.charterId ?? undefined : undefined;
    const [r, a] = await Promise.all([
      listServiceRequestsRows({ target: charter, openOnly, limit: 80 }),
      listAppealsRows({ originating: charter, openOnly, limit: 80 }),
    ]);
    setRequests(r);
    setAppeals(a);
  }, [available, actor?.kind, actor?.charterId, openOnly]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Citizen Intake Queue" />;
  }

  if (!session) {
    return (
      <Panel title="Citizen Intake Queue" meta="signed out" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          Sign in as an officer to handle citizen-side intake for your charter.
        </p>
      </Panel>
    );
  }
  if (!actor) {
    return (
      <Panel title="Citizen Intake Queue" meta="unlinked" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          Signed in but no officer profile is linked to {session.user.email}.
        </p>
      </Panel>
    );
  }
  if (actor.kind !== 'officer') {
    return (
      <Panel title="Citizen Intake Queue" meta="not an officer" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          This surface handles inbound citizen requests from the officer side.
          Citizens use <span className="font-mono">/wallet/substrate</span> to file requests and appeals.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Citizen Intake Queue" badge="officer-side · RLS-scoped" />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.currentTarget.checked)} />
            open only
          </label>
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['kind','ref','service_or_ground','target_or_originating','status','submitted_or_filed','resolved_or_decided'],
                [
                  ...requests.map(r => ['request', r.ref, r.service, r.target_charter_id, r.status, r.submitted_at, r.resolved_at ?? '']),
                  ...appeals.map(a => ['appeal', a.ref, a.ground ?? '', a.originating_charter_id, a.status, a.filed_at, a.decided_at ?? '']),
                ],
              );
              downloadCsv('civicos-intake', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-muted">
        scope: {actor.name} · {actor.role ?? 'officer'} · {actor.charterId ?? '—'}
      </p>

      {selectedReqs.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">
            {selectedReqs.size} selected
          </span>
          <span className="text-ink-muted">·</span>
          {(['in-progress','resolved','rejected'] as const).map(status => (
            <button key={status} type="button" disabled={bulkBusy}
              className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
              onClick={async () => {
                setBulkBusy(true);
                let ok = 0, failed = 0;
                for (const ref of selectedReqs) {
                  try { (await updateServiceRequestRow({ ref, status })) ? ok++ : failed++; } catch { failed++; }
                }
                setBulkReport({ ok, failed }); setSelectedReqs(new Set()); setBulkBusy(false);
                await refresh();
              }}>
              bulk {status}
            </button>
          ))}
          <button type="button"
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
            onClick={() => { setSelectedReqs(new Set()); setBulkReport(null); }}>
            clear
          </button>
          {bulkReport ? <span className="font-mono text-ink-muted">· last: {bulkReport.ok} ok / {bulkReport.failed} failed</span> : null}
        </div>
      ) : null}

      <Panel title="Service requests" meta={`${requests.length}`} bodyClass="!p-0">
        {requests.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No service requests in scope.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <input type="checkbox" aria-label={`select ${r.ref}`}
                  checked={selectedReqs.has(r.ref)}
                  onChange={e => {
                    const next = new Set(selectedReqs);
                    if (e.currentTarget.checked) next.add(r.ref); else next.delete(r.ref);
                    setSelectedReqs(next);
                  }} />
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{r.ref}</span>
                <span className="w-32 shrink-0 truncate font-mono text-link">{r.service}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.title ?? r.domain ?? '—'}</span>
                {(() => {
                  const ageH = (Date.now() - new Date(r.submitted_at).getTime()) / 3_600_000;
                  const overdue = !r.acknowledged_at && !r.resolved_at && !r.cancelled_at && ageH >= 48;
                  return (
                    <span className="w-14 shrink-0 text-right font-mono tabular-nums"
                      title={overdue ? 'past 48h SLA, unacknowledged' : undefined}
                      style={{ color: overdue ? TONE.alert : undefined }}>
                      {ageH >= 1 ? `${Math.round(ageH)}h` : `${ageMinutes(r.submitted_at)}m`}{overdue ? ' ⚠' : ''}
                    </span>
                  );
                })()}
                <span
                  className="w-24 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: r.cancelled_at ? TONE.neutral : r.resolved_at ? TONE.ok : r.acknowledged_at ? TONE.warn : TONE.link }}
                >
                  {r.status}
                </span>
                <div className="flex w-44 shrink-0 justify-end gap-1">
                  {!r.acknowledged_at && !r.cancelled_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        setBusyId(r.id);
                        try { await updateServiceRequestRow({ ref: r.ref, status: 'in-progress' }); await refresh(); }
                        finally { setBusyId(null); }
                      }}>
                      ack
                    </button>
                  ) : null}
                  {!r.resolved_at && !r.cancelled_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        const note = window.prompt('Resolution note for the citizen (optional):') ?? '';
                        setBusyId(r.id);
                        try {
                          await updateServiceRequestRow({
                            ref: r.ref, status: 'resolved',
                            payloadPatch: note.trim() ? { resolution_note: note.trim() } : undefined,
                          });
                          await refresh();
                        } finally { setBusyId(null); }
                      }}>
                      resolve
                    </button>
                  ) : null}
                  {!r.resolved_at && !r.cancelled_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        setBusyId(r.id);
                        try { await updateServiceRequestRow({ ref: r.ref, status: 'rejected' }); await refresh(); }
                        finally { setBusyId(null); }
                      }}>
                      reject
                    </button>
                  ) : null}
                  {!r.resolved_at && !r.cancelled_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === r.id} title="raise an escalation for this request"
                      onClick={async () => {
                        setBusyId(r.id);
                        try {
                          await recordEscalationRow({
                            sourceCharterId: r.target_charter_id, severity: 'minor',
                            reason: `service request ${r.ref} escalated from intake`,
                            payload: { service_request_ref: r.ref },
                          });
                          await refresh();
                        } finally { setBusyId(null); }
                      }}>
                      escalate
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {selectedAppeals.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">
            {selectedAppeals.size} appeals selected
          </span>
          <select className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]"
                  value={bulkAppealDecision} onChange={e => setBulkAppealDecision(e.currentTarget.value)}>
            <option value="upheld">upheld</option>
            <option value="rejected">rejected</option>
            <option value="remanded">remanded</option>
          </select>
          <input className="min-w-[200px] flex-1 rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]"
                 placeholder="bulk reasoning"
                 value={bulkAppealReason} onChange={e => setBulkAppealReason(e.currentTarget.value)} />
          <button type="button" disabled={bulkBusy || !bulkAppealReason.trim()}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              let ok = 0, failed = 0;
              for (const ref of selectedAppeals) {
                try { (await decideAppealRow(ref, bulkAppealDecision, bulkAppealReason.trim(), true)) ? ok++ : failed++; }
                catch { failed++; }
              }
              setBulkReport({ ok, failed });
              setSelectedAppeals(new Set());
              setBulkAppealReason('');
              setBulkBusy(false);
              await refresh();
            }}>
            decide all
          </button>
          <button type="button"
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
            onClick={() => { setSelectedAppeals(new Set()); setBulkReport(null); }}>
            clear
          </button>
        </div>
      ) : null}

      <Panel title="Appeals" meta={`${appeals.length}`} bodyClass="!p-0">
        {appeals.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No appeals in scope.</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {appeals.map(a => (
              <div key={a.id} className="flex items-start gap-2 border-b border-line-soft last:border-0">
                <input type="checkbox" className="ml-3 mt-2" aria-label={`select ${a.ref}`}
                  checked={selectedAppeals.has(a.ref)}
                  onChange={e => {
                    const next = new Set(selectedAppeals);
                    if (e.currentTarget.checked) next.add(a.ref); else next.delete(a.ref);
                    setSelectedAppeals(next);
                  }} />
              <AppealRowEditor
                appeal={a}
                busy={busyId === a.id}
                onDecide={async (decision, reasoning) => {
                  setBusyId(a.id);
                  try { await decideAppealRow(a.ref, decision, reasoning, true); await refresh(); }
                  finally { setBusyId(null); }
                }}
              />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Service requests transition <span className="font-mono">submitted → in-progress → resolved/rejected</span>.
        Appeals are decided with a verdict and reasoning; the publish flag is on by default
        so decisions enter the public record.
      </p>
    </div>
  );
}

function AppealRowEditor({
  appeal, busy, onDecide,
}: {
  appeal: AppealRow;
  busy: boolean;
  onDecide: (decision: string, reasoning: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [decision, setDecision] = React.useState('upheld');
  const [reasoning, setReasoning] = React.useState('');

  return (
    <div className="border-b border-line-soft last:border-0">
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
        <span className="w-28 shrink-0 truncate font-mono text-ink-soft">{appeal.ref}</span>
        <span className="w-32 shrink-0 truncate font-mono text-link">{appeal.originating_charter_id}</span>
        <span className="min-w-0 flex-1 truncate text-ink">{appeal.ground}</span>
        <span className="w-24 shrink-0 truncate text-right text-ink-soft">{appeal.decision ?? '—'}</span>
        <span
          className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
          style={{ color: appeal.withdrawn_at ? TONE.neutral : appeal.decided_at ? TONE.ok : TONE.warn }}
        >
          {appeal.status}
        </span>
        {!appeal.decided_at && !appeal.withdrawn_at ? (
          <button type="button"
            className="w-16 shrink-0 focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink"
            onClick={() => setOpen(o => !o)}>
            {open ? 'cancel' : 'decide'}
          </button>
        ) : <span className="w-16 shrink-0" />}
      </div>
      {open ? (
        <form
          className="grid grid-cols-[160px_1fr_auto] gap-2 bg-surface px-3 py-2 text-[11px]"
          onSubmit={async e => {
            e.preventDefault();
            if (!reasoning.trim()) return;
            await onDecide(decision, reasoning.trim());
            setOpen(false);
          }}
        >
          <select className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={decision} onChange={e => setDecision(e.currentTarget.value)}>
            <option value="upheld">upheld</option>
            <option value="rejected">rejected</option>
            <option value="remanded">remanded</option>
          </select>
          <input className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 placeholder="reasoning"
                 value={reasoning} onChange={e => setReasoning(e.currentTarget.value)} required />
          <button type="submit" disabled={busy}
                  className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
            {busy ? '…' : 'decide'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
