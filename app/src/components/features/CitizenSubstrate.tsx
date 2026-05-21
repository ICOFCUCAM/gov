'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  submitServiceRequestRow, updateServiceRequestRow, myServiceRequestsRows,
  grantConsentRow, revokeConsentRow, myConsentsRows,
  fileAppealRow, myAppealsRows,
} from '@/lib/db/repos/citizen';
import { openWorkItemRow, workItemsByIds } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { ServiceRequestRow, ConsentRow, AppealRow, WorkItemRow } from '@/lib/db/types';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { useIdentity } from '@/components/identity/useIdentity';
import { ensureCitizenLinkage, refreshIdentity } from '@/services/identity';

/**
 * CitizenSubstrate — the citizen's view of their own persistent records.
 *
 * Three panels:
 *   – Service Requests   submit + status timeline
 *   – Consents           grant + revoke
 *   – Appeals            file appeal
 *
 * RLS on each table restricts visibility to citizen_id = my id, so a
 * citizen literally cannot see anyone else's records — the database
 * enforces it, the client doesn't filter.
 *
 * When the visitor isn't signed in, a sign-in prompt is shown. When
 * they're signed in but no citizen profile is linked, a one-click
 * claim affordance provisions one and re-resolves identity.
 */
export function CitizenSubstrate() {
  const { actor, session, ready } = useIdentity();
  const [requests, setRequests] = React.useState<ServiceRequestRow[]>([]);
  const [consents, setConsents] = React.useState<ConsentRow[]>([]);
  const [appeals, setAppeals] = React.useState<AppealRow[]>([]);
  const [linkedItems, setLinkedItems] = React.useState<Map<string, WorkItemRow>>(new Map());
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [r, c, a] = await Promise.all([
      myServiceRequestsRows(50),
      myConsentsRows(50),
      myAppealsRows(50),
    ]);
    setRequests(r);
    setConsents(c);
    setAppeals(a);

    // Fetch each linked work item so the citizen sees the officer-side
    // execution progress next to their request status.
    const itemIds = Array.from(new Set([
      ...r.map(x => x.linked_work_item_id).filter((x): x is string => !!x),
      ...a.map(x => x.linked_work_item_id).filter((x): x is string => !!x),
    ]));
    if (itemIds.length > 0) {
      const items = await workItemsByIds(itemIds);
      setLinkedItems(new Map(items.map(i => [i.id, i])));
    } else {
      setLinkedItems(new Map());
    }
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  // Realtime: when an officer advances the linked work item, the
  // citizen's progress chip updates without a refresh.
  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_items' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Citizen Wallet — substrate" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel title="Citizen Wallet — substrate" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">
          Sign in to surface your service requests, consents, and appeals.
          The substrate's row-level security ensures you only see records
          linked to your identity.
        </p>
        <a
          href="/sign-in?from=/wallet/substrate"
          className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
        >
          Sign in
        </a>
      </Panel>
    );
  }

  if (!actor) {
    return (
      <Panel title="Citizen Wallet — substrate" meta="profile unlinked" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">
          Signed in as <span className="font-mono">{session.user.email}</span>{' '}
          but no citizen profile is linked yet.
        </p>
        <button
          type="button"
          onClick={async () => {
            await ensureCitizenLinkage(session.user.email ?? null);
            await refreshIdentity();
            await refresh();
          }}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
        >
          Provision citizen profile
        </button>
      </Panel>
    );
  }

  if (actor.kind !== 'citizen') {
    return (
      <Panel title="Citizen Wallet — substrate" meta="officer session" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          You are signed in as an officer ({actor.name}). The Citizen
          Wallet surfaces records linked to a citizen profile. Sign out
          and sign back in with a citizen account to view this panel.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Citizen Wallet · substrate</h2>
        <span className="font-mono text-[10px] text-ink-muted">{actor.name}</span>
      </div>

      <ServiceRequestsPanel citizenId={actor.id} rows={requests} onChange={refresh} linkedItems={linkedItems} />
      <ConsentsPanel citizenId={actor.id} rows={consents} onChange={refresh} />
      <AppealsPanel citizenId={actor.id} rows={appeals} onChange={refresh} linkedItems={linkedItems} />

      <p className="text-[10px] text-ink-muted">
        Each panel reads only your own records. The substrate's row-level
        security policies enforce <span className="font-mono">citizen_id = my id</span> —
        the client cannot widen its own scope.
      </p>
    </div>
  );
}

function ServiceRequestsPanel({
  citizenId, rows, onChange, linkedItems,
}: {
  citizenId: string;
  rows: ServiceRequestRow[];
  onChange: () => Promise<void>;
  linkedItems: Map<string, WorkItemRow>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Panel
      title="Service Requests"
      meta={`${rows.length}`}
      bodyClass="!p-0"
    >
      <div className="flex justify-end border-b border-line-soft px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          {open ? 'cancel' : '+ submit request'}
        </button>
      </div>
      {open ? (
        <ServiceRequestComposer
          citizenId={citizenId}
          onDone={async () => { await onChange(); setOpen(false); }}
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-ink-muted">No service requests on file.</p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {rows.map(r => {
            const linked = r.linked_work_item_id ? linkedItems.get(r.linked_work_item_id) : null;
            return (
              <div key={r.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{r.ref}</span>
                <span className="w-28 shrink-0 truncate font-mono text-link">{r.target_charter_id}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.title ?? r.service}</span>
                {linked ? (
                  <span
                    className="w-28 shrink-0 truncate rounded-[3px] border px-1.5 py-0.5 text-right text-[8.5px] uppercase tracking-wider"
                    style={{
                      borderColor: linked.closed ? TONE.ok : TONE.link,
                      color: linked.closed ? TONE.ok : TONE.link,
                    }}
                    title={`Linked work item: ${linked.ref}`}
                  >
                    ⊳ {linked.current_stage}
                  </span>
                ) : <span className="w-28 shrink-0" />}
                <span className="w-24 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: r.resolved_at ? TONE.ok : r.acknowledged_at ? TONE.warn : TONE.link }}>
                  {r.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function ServiceRequestComposer({
  citizenId, onDone,
}: { citizenId: string; onDone: () => Promise<void> }) {
  const [target, setTarget] = React.useState('ministry-health');
  const [service, setService] = React.useState('birth-cert');
  const [title, setTitle] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const ref = `SR-${Date.now()}`;
      const row = await submitServiceRequestRow({
        ref, citizenId,
        targetCharterId: target.trim(), service: service.trim(),
        title: title.trim() || null,
      });
      if (!row) { setError('submit failed'); return; }

      // Auto-bridge: open an internal work item in the target charter's
      // scope so officer queues pick the request up alongside other work.
      // The link is patched back onto the service request so a viewer
      // can navigate either direction. Failure here doesn't roll back
      // the request — the citizen's record is still on file.
      const workRef = `WI-${ref}`;
      const wi = await openWorkItemRow({
        ref: workRef,
        scope: `${target.trim()}:intake`,
        workflowId: 'approval',
        kind: 'approval',
        title: row.title ?? `Service request · ${row.service}`,
        currentStage: 'Submitted',
        priority: 'priority',
        originatingCharterId: target.trim(),
        citizenId,
        meta: { origin: 'service-request', serviceRequestRef: ref, persistent: '1' },
      }).catch(() => null);
      if (wi) {
        await updateServiceRequestRow({ ref, linkedWorkItemId: wi.id });
      }

      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-b border-line-soft bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">To charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={target} onChange={e => setTarget(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Service</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 value={service} onChange={e => setService(e.currentTarget.value)} required />
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Title</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
               value={title} onChange={e => setTitle(e.currentTarget.value)} />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'submitting…' : 'submit'}
        </button>
      </div>
    </form>
  );
}

function ConsentsPanel({
  citizenId, rows, onChange,
}: { citizenId: string; rows: ConsentRow[]; onChange: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  return (
    <Panel title="Consents" meta={`${rows.length}`} bodyClass="!p-0">
      <div className="flex justify-end border-b border-line-soft px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          {open ? 'cancel' : '+ grant consent'}
        </button>
      </div>
      {open ? (
        <ConsentComposer
          citizenId={citizenId}
          onDone={async () => { await onChange(); setOpen(false); }}
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-ink-muted">No consents on file.</p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {rows.map(c => (
            <div key={c.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
              <span className="w-28 shrink-0 truncate font-mono text-link">{c.target_charter_id}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-ink">{c.scope}</span>
              <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                style={{
                  color: c.status === 'granted' ? TONE.ok
                       : c.status === 'revoked' ? TONE.alert
                       : c.status === 'expired' ? TONE.warn
                       : TONE.link
                }}>
                {c.status}
              </span>
              {c.status === 'granted' ? (
                <button type="button"
                  className="w-16 shrink-0 focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                  disabled={busyId === c.id}
                  onClick={async () => {
                    setBusyId(c.id);
                    try { await revokeConsentRow(c.id); await onChange(); }
                    finally { setBusyId(null); }
                  }}>
                  revoke
                </button>
              ) : <span className="w-16 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ConsentComposer({
  citizenId, onDone,
}: { citizenId: string; onDone: () => Promise<void> }) {
  const [target, setTarget] = React.useState('ministry-health');
  const [scope, setScope] = React.useState('health.records');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const row = await grantConsentRow(citizenId, target.trim(), scope.trim());
      if (!row) { setError('grant failed'); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-line-soft bg-surface p-3 text-[11px]">
      <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
             value={target} onChange={e => setTarget(e.currentTarget.value)} placeholder="target charter" required />
      <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
             value={scope} onChange={e => setScope(e.currentTarget.value)} placeholder="scope (e.g. health.records)" required />
      <button type="submit" disabled={busy}
              className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
        {busy ? '…' : 'grant'}
      </button>
      {error ? <p className="col-span-3 text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
    </form>
  );
}

function AppealsPanel({
  citizenId, rows, onChange, linkedItems,
}: {
  citizenId: string;
  rows: AppealRow[];
  onChange: () => Promise<void>;
  linkedItems: Map<string, WorkItemRow>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Panel title="Appeals" meta={`${rows.length}`} bodyClass="!p-0">
      <div className="flex justify-end border-b border-line-soft px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          {open ? 'cancel' : '+ file appeal'}
        </button>
      </div>
      {open ? (
        <AppealComposer
          citizenId={citizenId}
          onDone={async () => { await onChange(); setOpen(false); }}
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-ink-muted">No appeals on file.</p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {rows.map(a => {
            const linked = a.linked_work_item_id ? linkedItems.get(a.linked_work_item_id) : null;
            return (
              <div key={a.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-28 shrink-0 truncate font-mono text-ink-soft">{a.ref}</span>
                <span className="w-32 shrink-0 truncate font-mono text-link">{a.originating_charter_id}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{a.ground}</span>
                <span className="w-24 shrink-0 truncate text-right text-ink-soft">{a.decision ?? '—'}</span>
                {linked ? (
                  <span
                    className="w-28 shrink-0 truncate rounded-[3px] border px-1.5 py-0.5 text-right text-[8.5px] uppercase tracking-wider"
                    style={{
                      borderColor: linked.closed ? TONE.ok : TONE.link,
                      color: linked.closed ? TONE.ok : TONE.link,
                    }}
                  >
                    ⊳ {linked.current_stage}
                  </span>
                ) : <span className="w-28 shrink-0" />}
                <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: a.decided_at ? TONE.ok : TONE.warn }}>
                  {a.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function AppealComposer({
  citizenId, onDone,
}: { citizenId: string; onDone: () => Promise<void> }) {
  const [originating, setOriginating] = React.useState('ministry-health');
  const [ground, setGround] = React.useState('procedural-error');
  const [decisionRef, setDecisionRef] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const row = await fileAppealRow({
        ref: `AP-${Date.now()}`,
        citizenId, originatingCharterId: originating.trim(), ground: ground.trim(),
        originatingDecisionRef: decisionRef.trim() || null,
      });
      if (!row) { setError('file appeal failed'); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-b border-line-soft bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Originating charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={originating} onChange={e => setOriginating(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Ground</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 value={ground} onChange={e => setGround(e.currentTarget.value)} required />
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Originating decision ref (optional)</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={decisionRef} onChange={e => setDecisionRef(e.currentTarget.value)} />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'filing…' : 'file appeal'}
        </button>
      </div>
    </form>
  );
}
