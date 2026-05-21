'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable } from '@/lib/db/client';
import { useSubstrateAlerts, type Alert, type AlertSeverity } from '@/components/identity/useSubstrateAlerts';
import { useIdentity } from '@/components/identity/useIdentity';
import { isSeen, markSeen, clearSeen } from '@/lib/seen';
import { getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const sevTone: Record<AlertSeverity, string | undefined> = {
  national: TONE.alert, major: TONE.alert,
  critical: TONE.alert, urgent: TONE.warn,
  warn: TONE.warn, minor: TONE.link,
};

const kindIcon: Record<Alert['kind'], string> = {
  'chain-broken': '⚠',
  escalation: '!',
  dispatch: '⇨',
  'work-item': '⊳',
};

/**
 * NotificationsCenter — full-page view of the substrate alert feed.
 *
 * Same data the bell summarises; here it's sorted by severity and
 * filterable by kind. Every row links to the surface that owns the
 * underlying record. Stays live via the same Realtime channels the
 * bell uses (escalations, dispatches, work_items, audit_entries).
 */
export function NotificationsCenter() {
  const { actor } = useIdentity();
  const { alerts, loading, refresh } = useSubstrateAlerts();
  const [kindFilter, setKindFilter] = React.useState<Alert['kind'] | 'all'>(
    () => getPref<Alert['kind'] | 'all'>('alerts.kind', ['all','chain-broken','escalation','dispatch','work-item'] as const, 'all'));
  React.useEffect(() => { setPref('alerts.kind', kindFilter); }, [kindFilter]);
  const available = substrateAvailable();

  if (!available) {
    return <SubstrateNotConfigured title="Notifications" />;
  }

  const filtered = kindFilter === 'all' ? alerts : alerts.filter(a => a.kind === kindFilter);

  const tallies = alerts.reduce<Record<AlertSeverity, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1; return acc;
  }, { national: 0, major: 0, critical: 0, urgent: 0, warn: 0, minor: 0 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Notifications</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            substrate alerts · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => { markSeen(actor?.id ?? null, alerts.map(a => a.id)); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            mark all read
          </button>
          <button type="button"
            onClick={() => {
              const csv = ['at,kind,severity,title,detail,href',
                ...alerts.map(a => `${new Date(a.at).toISOString()},${a.kind},${a.severity},${(a.title ?? '').replace(/,/g,';')},${(a.detail ?? '').replace(/,/g,';')},${a.href}`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `civicos-alerts-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
          <button type="button"
            onClick={() => { clearSeen(actor?.id ?? null); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            reset
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            disabled={loading}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
          >
            {loading ? 'sweeping…' : 'refresh'}
          </button>
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-muted">
        scope: {actor ? `${actor.name} · ${actor.kind === 'officer' ? actor.role ?? 'officer' : 'citizen'}` : 'anonymous'}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {(['national','major','critical','urgent','warn','minor'] as const).map(s => (
          <div key={s} className="rounded-[3px] border border-line bg-surface px-3 py-2">
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s}</div>
            <div className="font-mono text-[15px] tabular-nums" style={{ color: tallies[s] === 0 ? 'rgb(var(--c-ink-muted))' : sevTone[s] }}>
              {tallies[s]}
            </div>
          </div>
        ))}
      </div>

      <FilterChips label="kind:"
        options={['all','chain-broken','escalation','dispatch','work-item'] as const}
        value={kindFilter}
        onChange={setKindFilter} />

      <Panel title="Alerts" meta={`${filtered.length}`} bodyClass="!p-0">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {alerts.length === 0
              ? 'No alerts. Everything in scope is steady.'
              : 'No alerts match the current filter.'}
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {filtered.map(a => {
              const seen = isSeen(actor?.id ?? null, a.id);
              return (
              <Link
                key={a.id}
                href={a.href}
                onClick={() => { markSeen(actor?.id ?? null, [a.id]); }}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2"
                style={{ opacity: seen ? 0.55 : 1 }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 shrink-0 text-center"
                    style={{ color: sevTone[a.severity] }}
                  >
                    {kindIcon[a.kind]}
                  </span>
                  <span
                    className="w-20 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: sevTone[a.severity] }}
                  >
                    {a.severity}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">{a.title}</span>
                  <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">
                    {a.at ? new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-ink-muted">
                  {a.detail}
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Aggregates: open national/major escalations · critical/urgent
        dispatches · critical/urgent work items · broken audit chains
        across the top 8 visible scopes. RLS shapes what's visible — a
        charter officer sees their own; platform-tier sees everything.
      </p>
    </div>
  );
}
