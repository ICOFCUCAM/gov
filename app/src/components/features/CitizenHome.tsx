'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { workItemsByIds } from '@/lib/db/repos/work-items';
import {
  myServiceRequestsRows, myConsentsRows, myAppealsRows, myExpiringConsents,
  type ExpiringConsent,
} from '@/lib/db/repos/citizen';
import { substrateAvailable } from '@/lib/db/client';
import type { ServiceRequestRow, ConsentRow, AppealRow, WorkItemRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { WatchedRecords } from '@/components/features/WatchedRecords';
import { submitServiceRequestRow, updateServiceRequestRow } from '@/lib/db/repos/citizen';
import { openWorkItemRow } from '@/lib/db/repos/work-items';
import { TONE as TONE2 } from '@/components/features/SituationRoom';
import { ageMinutes } from '@/lib/format';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

/**
 * CitizenHome — personal landing for a signed-in citizen.
 *
 * Five-tile pressure summary at the top; the rest is recent records
 * with current officer-side progress where it exists. Lives at
 * /wallet/home (symmetric to /gov/home for officers) so the citizen's
 * own session can land somewhere meaningful instead of wading through
 * the full wallet shell.
 */
export function CitizenHome() {
  const { actor, session, ready } = useIdentity();
  const [requests, setRequests] = React.useState<ServiceRequestRow[]>([]);
  const [consents, setConsents] = React.useState<ConsentRow[]>([]);
  const [appeals, setAppeals] = React.useState<AppealRow[]>([]);
  const [linkedItems, setLinkedItems] = React.useState<Map<string, WorkItemRow>>(new Map());
  const [expiring, setExpiring] = React.useState<ExpiringConsent[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [r, c, a, exp] = await Promise.all([
      myServiceRequestsRows(20),
      myConsentsRows(20),
      myAppealsRows(20),
      myExpiringConsents(14),
    ]);
    setRequests(r); setConsents(c); setAppeals(a); setExpiring(exp);
    const ids = Array.from(new Set([
      ...r.map(x => x.linked_work_item_id).filter((x): x is string => !!x),
      ...a.map(x => x.linked_work_item_id).filter((x): x is string => !!x),
    ]));
    setLinkedItems(ids.length > 0
      ? new Map((await workItemsByIds(ids)).map(i => [i.id, i]))
      : new Map());
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_items' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Wallet Home" />;
  }
  if (!session) {
    return (
      <Panel title="Wallet Home" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">Sign in to see your wallet at a glance.</p>
        <a href="/sign-in?from=/wallet/home"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }
  if (!actor || actor.kind !== 'citizen') {
    return (
      <Panel title="Wallet Home" meta={actor?.kind ?? 'unlinked'} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          This surface is for citizens. Officers use{' '}
          <a href="/gov/home" className="font-mono text-link underline">/gov/home</a>.
        </p>
      </Panel>
    );
  }

  const openRequests = requests.filter(r => !r.resolved_at);
  const activeConsents = consents.filter(c => c.status === 'granted');
  const openAppeals = appeals.filter(a => !a.decided_at);
  const inProgress = openRequests.filter(r => r.acknowledged_at).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Wallet Home" badge="personal · realtime" />
        <div className="flex items-center gap-2">
          <a href="/wallet/substrate"
             className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            full wallet →
          </a>
          <a href="/gov/me"
             className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            profile
          </a>
          <span className="font-mono text-[10px] text-ink-muted">{actor.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="Open requests" value={String(openRequests.length)} href="/wallet/substrate" tone={openRequests.length > 0 ? TONE.warn : TONE.ok} />
        <Tile label="In progress" value={String(inProgress)} href="/wallet/substrate" tone={inProgress > 0 ? TONE.link : TONE.ok} />
        <Tile label="Open appeals" value={String(openAppeals.length)} href="/wallet/substrate" tone={openAppeals.length > 0 ? TONE.warn : TONE.ok} />
        <Tile label="Active consents" value={String(activeConsents.length)} href="/wallet/substrate" tone={TONE.ok} />
        <Tile label="Total records" value={String(requests.length + consents.length + appeals.length)} href="/wallet/substrate" tone={TONE.link} />
      </div>

      {expiring.length > 0 ? (
        <Panel title="Consents expiring soon" meta={`${expiring.length} within 14 days`} bodyClass="!p-0">
          <div className="max-h-[200px] overflow-y-auto">
            {expiring.map(c => (
              <Link key={c.id} href={`/wallet/consent/${c.id}`}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate font-mono text-link">{c.target_charter_id}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{c.scope}</span>
                  <span className="shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: c.days_remaining <= 3 ? TONE.alert : TONE.warn }}>
                    {c.days_remaining === 0 ? 'today' : c.days_remaining === 1 ? '1 day' : `${c.days_remaining} days`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Latest requests" meta={`${openRequests.length} open`} bodyClass="!p-0">
        {openRequests.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No open service requests. File one from{' '}
            <a href="/wallet/substrate" className="font-mono text-link underline">/wallet/substrate</a>.
          </p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {openRequests.map(r => {
              const linked = r.linked_work_item_id ? linkedItems.get(r.linked_work_item_id) : null;
              return (
                <Link key={r.id} href="/wallet/substrate"
                  className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate font-mono text-link">{r.target_charter_id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{r.title ?? r.service}</span>
                    {linked ? (
                      <span
                        className="w-28 shrink-0 truncate rounded-[3px] border px-1.5 py-0.5 text-right text-[8.5px] uppercase tracking-wider"
                        style={{ borderColor: linked.closed ? TONE.ok : TONE.link, color: linked.closed ? TONE.ok : TONE.link }}
                      >
                        ⊳ {linked.current_stage}
                      </span>
                    ) : <span className="w-28 shrink-0" />}
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{ageMinutes(r.submitted_at)}m</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Active consents" meta={`${activeConsents.length}`} bodyClass="!p-0">
          {activeConsents.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No active consents granted.</p>
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              {activeConsents.map(c => (
                <div key={c.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <span className="w-28 shrink-0 truncate font-mono text-link">{c.target_charter_id}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-ink">{c.scope}</span>
                  <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.ok }}>granted</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Appeals in progress" meta={`${openAppeals.length}`} bodyClass="!p-0">
          {openAppeals.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No open appeals.</p>
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              {openAppeals.map(a => {
                const linked = a.linked_work_item_id ? linkedItems.get(a.linked_work_item_id) : null;
                return (
                  <div key={a.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <span className="w-32 shrink-0 truncate font-mono text-link">{a.originating_charter_id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{a.ground}</span>
                    {linked ? (
                      <span
                        className="w-24 shrink-0 truncate text-right text-[8.5px] uppercase tracking-wider"
                        style={{ color: linked.closed ? TONE.ok : TONE.link }}
                      >
                        ⊳ {linked.current_stage}
                      </span>
                    ) : <span className="w-24 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <QuickFile citizenId={actor.id} onSubmitted={refresh} />
      <a href="/wallet/substrate#audit"
         className="inline-block text-[10px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
        view full audit trail →
      </a>

      <WatchedRecords />

      <p className="text-[10px] text-ink-muted">
        Every record here is RLS-scoped to your citizen id. Officer-side
        progress on linked work items updates live as actions are taken.
      </p>
    </div>
  );
}

function QuickFile({ citizenId, onSubmitted }: { citizenId: string; onSubmitted: () => Promise<void> }) {
  const [target, setTarget] = React.useState('ministry-health');
  const [service, setService] = React.useState('birth-cert');
  const [title, setTitle] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setInfo(null);
    try {
      const ref = `SR-${Date.now()}`;
      const r = await submitServiceRequestRow({ ref, citizenId, targetCharterId: target.trim(), service: service.trim(), title: title.trim() });
      if (!r) { setInfo('submit failed'); return; }
      // Mirror the bridge from CitizenSubstrate so quick-file gets an
      // officer-side work item too.
      const workRef = `WI-${ref}`;
      const wi = await openWorkItemRow({
        ref: workRef, scope: `${target.trim()}:intake`, workflowId: 'approval',
        kind: 'approval', title: r.title ?? `Service request · ${r.service}`,
        currentStage: 'Submitted', priority: 'priority',
        originatingCharterId: target.trim(), citizenId,
        meta: { origin: 'service-request', serviceRequestRef: ref, persistent: '1' },
      }).catch(() => null);
      if (wi) await updateServiceRequestRow({ ref, linkedWorkItemId: wi.id });
      setInfo(`filed · ${ref}`);
      setTitle('');
      await onSubmitted();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="rounded-[3px] border border-line bg-surface p-3 space-y-2 text-[11px]">
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Quick file a service request</div>
      <div className="grid grid-cols-3 gap-2">
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={target} onChange={e => setTarget(e.currentTarget.value)} placeholder="target charter" required />
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
               value={service} onChange={e => setService(e.currentTarget.value)} placeholder="service" required />
        <button type="submit" disabled={busy || !title.trim()}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'filing…' : 'file'}
        </button>
      </div>
      <input className="w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
             value={title} onChange={e => setTitle(e.currentTarget.value)} placeholder="title (required)" required />
      {info ? <p className="text-[10px]" style={{ color: TONE2.ok }}>{info}</p> : null}
    </form>
  );
}

function Tile({ label, value, href, tone }: { label: string; value: string; href: string; tone?: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[3px] border border-line bg-surface px-3 py-2 hover:bg-surface-2"
      style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}
    >
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: tone ?? 'rgb(var(--c-ink))' }}>{value}</div>
    </Link>
  );
}
