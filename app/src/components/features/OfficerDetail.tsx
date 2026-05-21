'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listOfficersRows } from '@/lib/db/repos/admin';
import { recentActorStepsRows, type ActorStepRow } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { OfficerRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

/**
 * OfficerDetail — profile lookup for any officer the current session
 * can see (RLS scoped: same charter, platform-tier, or self). Renders
 * the officer record + their recent transition activity reconstructed
 * from civicos_actor_steps.
 */
export function OfficerDetail({ id }: { id: string }) {
  const { ready } = useIdentity();
  const [row, setRow] = React.useState<OfficerRow | null>(null);
  const [steps, setSteps] = React.useState<ActorStepRow[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const all = await listOfficersRows({ limit: 500 });
    const found = all.find(o => o.id === id) ?? null;
    setRow(found);
    // Actor steps view is RLS-scoped — we just filter the global recent
    // list to this officer rather than running a per-officer query.
    const all_steps = await recentActorStepsRows({ limit: 200 });
    setSteps(all_steps.filter(s => s.actor_id === id).slice(0, 60));
  }, [available, id]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_item_steps' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Officer" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }
  if (!row) {
    return (
      <Panel title="Officer" meta={id} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No officer with id <span className="font-mono">{id}</span> is visible
          at the current scope.{' '}
          <Link href="/gov/officers" className="text-link underline">Back to registry</Link>
        </p>
      </Panel>
    );
  }

  const signedSteps = steps.filter(s => !!s.signature_hash).length;
  const ecdsaSteps = steps.filter(s => s.signature_hash && s.signature_hash.length > 8).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.name}</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: row.active ? TONE.ok : TONE.alert, color: row.active ? TONE.ok : TONE.alert }}>
            {row.active ? 'active' : 'inactive'}
          </span>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: row.auth_user_id ? TONE.ok : TONE.warn, color: row.auth_user_id ? TONE.ok : TONE.warn }}>
            {row.auth_user_id ? 'linked' : 'pending'}
          </span>
        </div>
        <Link href="/gov/officers" className="font-mono text-[10px] text-link underline">← registry</Link>
      </div>

      <Panel title="Officer record" meta={row.id} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Role" value={row.role} />
          <Field label="Email" value={row.email ?? '—'} mono />
          {row.charter_id ? (
            <div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Charter</div>
              <Link href={`/gov/charter/${encodeURIComponent(row.charter_id)}`}
                className="mt-0.5 block truncate font-mono text-[11px] text-link hover:underline">
                {row.charter_id}
              </Link>
            </div>
          ) : null}
          {row.title ? <Field label="Title" value={row.title} /> : null}
          <Field label="Joined" value={new Date(row.joined_at).toLocaleDateString()} />
          <Field label="Updated" value={new Date(row.updated_at).toLocaleDateString()} />
        </div>
      </Panel>

      <Panel title="Recent activity" meta={`${steps.length} steps · ${signedSteps} signed · ${ecdsaSteps} ECDSA`} bodyClass="!p-0">
        {steps.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No transitions attributed to this officer in scope.</p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {steps.map(s => (
              <Link key={s.id} href={`/gov/items/${encodeURIComponent(s.work_item_ref)}`}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                    {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                  <span className="w-20 shrink-0 truncate font-mono" style={{ color: actionTone(s.action) }}>{s.action}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{s.work_item_title}</span>
                  <span className="w-32 shrink-0 truncate text-right font-mono text-link">{s.work_item_ref}</span>
                </div>
                {s.signature_hash ? (
                  <div className="mt-0.5 font-mono text-[9px] text-ink-muted">
                    {s.signature_hash.length === 8 ? 'digest' : 'ECDSA'} · {s.signature_hash.slice(0, 16)}…
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
