'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  adminCreateOfficerRow, adminDeactivateOfficerRow, listOfficersRows,
} from '@/lib/db/repos/admin';
import { substrateAvailable } from '@/lib/db/client';
import type { OfficerRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

const COMMON_ROLES = [
  'analyst', 'reviewer', 'director',
  'noc-officer', 'cabinet-officer', 'auditor', 'platform-admin',
];

/**
 * Officer Registry — platform-tier admin surface for officer records.
 *
 * Composer creates / upserts an officer record (idempotent on email).
 * Each row exposes a deactivate affordance. The substrate enforces
 * the platform-tier gate via is_platform_officer(); the UI only
 * renders the surface to those callers, but the substrate is the
 * final check — a misbehaving client cannot escalate.
 *
 * The created officer record sits inactive (auth_user_id NULL) until
 * the named user signs in for the first time; at that point
 * link_officer_by_email matches their auth email and stamps
 * auth_user_id, completing the claim.
 */
export function OfficerRegistry() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<OfficerRow[]>([]);
  const [q, setQ] = React.useState('');
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setItems(await listOfficersRows({ limit: 200 }));
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  if (!available) {
    return (
      <Panel title="Officer Registry" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel title="Officer Registry" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">
          Sign in with a platform-tier role to provision officers.
        </p>
        <a href="/sign-in?from=/gov/officers"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }

  const isPlatform = actor?.kind === 'officer' && actor.role && PLATFORM_ROLES.has(actor.role);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Officer Registry</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            platform-tier · RLS-enforced
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPlatform ? (
            <button
              type="button"
              onClick={() => setComposerOpen(o => !o)}
              className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              {composerOpen ? 'cancel' : '+ provision officer'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            refresh
          </button>
        </div>
      </div>

      {!isPlatform ? (
        <Panel title="Read-only view" meta="not platform-tier" bodyClass="!p-3">
          <p className="text-[11px] text-ink-muted">
            You are signed in as <span className="font-mono">{actor?.name ?? session.user.email}</span>
            {actor?.role ? <> · <span className="font-mono">{actor.role}</span></> : null}.
            This surface shows other officers in your charter (RLS-scoped).
            The substrate refuses provisioning calls from non-platform-tier roles.
          </p>
        </Panel>
      ) : null}

      {composerOpen && isPlatform ? (
        <OfficerComposer
          onDone={async () => { await refresh(); setComposerOpen(false); }}
        />
      ) : null}

      <input type="search" value={q} onChange={e => setQ(e.currentTarget.value)}
        placeholder="search name / email / role / charter…"
        className="w-full rounded-[3px] border border-line bg-bg px-3 py-1 font-mono text-[11px]" />

      <Panel title="Officers" meta={`${items.length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No officers visible at the current scope.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {items.filter(o => {
              const n = q.trim().toLowerCase();
              return n === '' || `${o.name} ${o.email ?? ''} ${o.role} ${o.charter_id ?? ''}`.toLowerCase().includes(n);
            }).map(o => (
              <div
                key={o.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <span className="w-44 shrink-0 truncate font-mono text-ink-soft">{o.email ?? '—'}</span>
                <span className="w-32 shrink-0 truncate text-ink">{o.name}</span>
                <span className="w-28 shrink-0 truncate font-mono text-link no-underline">{o.charter_id ?? '—'}</span>
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{o.role}</span>
                <span
                  className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: o.auth_user_id ? TONE.ok : TONE.warn }}
                >
                  {o.auth_user_id ? 'linked' : 'pending'}
                </span>
                <span
                  className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: o.active ? TONE.ok : TONE.alert }}
                >
                  {o.active ? 'active' : 'inactive'}
                </span>
                <div className="flex w-44 shrink-0 justify-end gap-1">
                  {!o.auth_user_id && o.email ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink"
                      onClick={() => {
                        const url = `${window.location.origin}/sign-in?email=${encodeURIComponent(o.email ?? '')}&mode=sign-up&from=/gov/me`;
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          void navigator.clipboard.writeText(url);
                          alert('Onboarding link copied to clipboard.');
                        } else {
                          window.prompt('Onboarding link', url);
                        }
                      }}
                    >
                      copy invite
                    </button>
                  ) : null}
                  {isPlatform && o.active ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === o.id}
                      onClick={async () => {
                        setBusyId(o.id);
                        try { await adminDeactivateOfficerRow(o.id); await refresh(); }
                        finally { setBusyId(null); }
                      }}
                    >
                      deactivate
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        A newly provisioned officer's <span className="font-mono">auth_user_id</span> is null
        until they sign in for the first time — at which point the sign-in
        flow calls <span className="font-mono">link_officer_by_email</span>, the substrate
        verifies the caller's auth email matches, and the record gets stamped.
      </p>
    </div>
  );
}

function OfficerComposer({
  onDone,
}: { onDone: () => Promise<void> }) {
  const [email, setEmail] = React.useState('');
  const [name, setName]   = React.useState('');
  const [charterId, setCharterId] = React.useState('');
  const [role, setRole]   = React.useState('analyst');
  const [title, setTitle] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { row, error } = await adminCreateOfficerRow({
        email: email.trim(), name: name.trim(),
        charterId: charterId.trim(), role: role.trim(),
        title: title.trim() || null,
      });
      if (!row) { setError(error ?? 'admin_create_officer failed'); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Email</span>
          <input type="email" className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={email} onChange={e => setEmail(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Name</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 value={name} onChange={e => setName(e.currentTarget.value)} required />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={charterId} onChange={e => setCharterId(e.currentTarget.value)} required
                 placeholder="ministry-health" />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Role</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={role} onChange={e => setRole(e.currentTarget.value)}>
            {COMMON_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Title</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 value={title} onChange={e => setTitle(e.currentTarget.value)}
                 placeholder="optional" />
        </label>
      </div>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'provisioning…' : 'provision officer'}
        </button>
      </div>
    </form>
  );
}
