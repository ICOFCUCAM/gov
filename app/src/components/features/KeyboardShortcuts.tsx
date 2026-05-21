'use client';

import * as React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/features/SituationRoom';

interface ShortcutGroup { title: string; items: { keys: string; what: string }[] }

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Command palette',
    items: [
      { keys: '⌘K / Ctrl-K', what: 'Open the global command palette anywhere under /gov/*' },
      { keys: '↑ ↓',         what: 'Move selection within the palette' },
      { keys: '↵',           what: 'Open the highlighted entry' },
      { keys: 'Esc',         what: 'Close the palette' },
    ],
  },
  {
    title: 'Detail pages',
    items: [
      { keys: '☆ (click)',   what: 'Star/unstar the current record into your per-device watchlist' },
      { keys: '← (link)',    what: 'Return to the parent list/board' },
    ],
  },
  {
    title: 'Headers · always present',
    items: [
      { keys: 'IdentityBadge', what: 'Shows the currently signed-in identity + role + charter' },
      { keys: 'ChainSentinel', what: 'Passive watchdog over the audit chain; click for /gov/audit' },
      { keys: 'NotificationsBell', what: 'Count of UNSEEN substrate alerts; click for /gov/alerts' },
    ],
  },
];

const ROUTE_TABLE: { path: string; what: string }[] = [
  { path: '/sign-in',              what: 'Sign in / sign up' },
  { path: '/gov/home',             what: 'Officer landing — your charter, your queue, alerts' },
  { path: '/wallet/home',          what: 'Citizen landing — your requests, consents, appeals' },
  { path: '/public',               what: 'Public observatory — what anon sees' },
  { path: '/gov/me',               what: 'Profile + signing keys + recent activity' },
  { path: '/gov/search',           what: 'Cross-substrate search' },
  { path: '/gov/watchlist',        what: 'Per-device starred records' },
  { path: '/gov/alerts',           what: 'Aggregated alerts feed' },
  { path: '/gov/crons',            what: 'Scheduled-worker status' },
  { path: '/gov/live',             what: 'Composite live operational picture' },
  { path: '/gov/substrate',        what: 'Data plane self-portrait + digest export' },
  { path: '/gov/registry',         what: 'Federation registry · institutions + facilities' },
  { path: '/gov/charter/[id]',     what: 'Single-charter dashboard' },
  { path: '/gov/officers',         what: 'Officer registry · platform-tier admin' },
  { path: '/gov/officers/[id]',    what: 'Officer profile + activity' },
  { path: '/gov/workbench',        what: 'Officer execution console for persistent items' },
  { path: '/gov/workflows',        what: 'Workflow catalogue (transition rules)' },
  { path: '/gov/workflows/simulator', what: 'Dry-run a workflow transition' },
  { path: '/gov/items/[ref]',      what: 'Work-item drill-in' },
  { path: '/gov/directives',       what: 'Directive board · draft → sign → rescind' },
  { path: '/gov/directives/[ref]', what: 'Directive detail' },
  { path: '/gov/dispatches',       what: 'Dispatch board · record → ack → close' },
  { path: '/gov/dispatches/[ref]', what: 'Dispatch detail' },
  { path: '/gov/escalations',      what: 'Escalation floor · record → ack → resolve' },
  { path: '/gov/escalations/[id]', what: 'Escalation detail' },
  { path: '/gov/intake',           what: 'Officer intake · service requests + appeals' },
  { path: '/gov/intake/request/[ref]', what: 'Service request detail' },
  { path: '/gov/intake/appeal/[ref]',  what: 'Appeal detail' },
  { path: '/gov/posture',          what: 'Posture board + per-charter timeline' },
  { path: '/gov/telemetry',        what: 'Telemetry wall' },
  { path: '/gov/telemetry/[id]',   what: 'Telemetry stream chart' },
  { path: '/gov/federation',       what: 'Federation event stream' },
  { path: '/gov/federation/[id]',  what: 'Federation event detail' },
  { path: '/gov/audit',            what: 'Audit chain explorer' },
  { path: '/gov/audit/[scope]/[seq]', what: 'Single audit entry' },
  { path: '/gov/signatures',       what: 'Signature audit · ECDSA verify in-browser' },
  { path: '/gov/activity',         what: 'Cross-substrate transition log + CSV export' },
  { path: '/gov/constitutional',   what: 'Constitutional channel signals' },
  { path: '/wallet/substrate',     what: 'Citizen-side wallet · requests/consents/appeals' },
  { path: '/wallet/home',          what: 'Citizen landing dashboard' },
  { path: '/wallet/consent/[id]',  what: 'Consent detail (revoke / re-grant)' },
  { path: '/gov/charter',          what: 'Charter quick-jump list' },
  { path: '/gov/directory',        what: 'Officer directory (read-only)' },
  { path: '/gov/inbox',            what: 'Directives addressed to your charter' },
  { path: '/gov/audit/sweep',      what: 'Full-substrate chain coverage' },
  { path: '/gov/workflows/diff',   what: 'Compare two workflow definitions' },
  { path: '/gov/audit/[scope]/[seq]', what: 'Single audit entry · in chain context' },
  { path: '/gov/federation/[id]',  what: 'Federation event detail' },
  { path: '/gov/telemetry/[id]',   what: 'Telemetry stream chart' },
  { path: '/gov/charter/[id]',     what: 'Single charter dashboard' },
  { path: '/gov/officers/[id]',    what: 'Officer profile + activity' },
  { path: '/gov/global',           what: 'Unified recent feed across kinds' },
];

const API_TABLE: { path: string; what: string }[] = [
  { path: 'POST /api/cron/sla',                 what: 'Sweep stale service requests · emits substrate.sla.escalated' },
  { path: 'POST /api/cron/substrate-metrics',   what: 'Emit substrate.* telemetry samples' },
  { path: 'POST /api/cron/posture-digest',      what: 'Per-charter posture snapshots' },
  { path: 'POST /api/cron/audit-self',          what: 'Heartbeat audit entry on substrate:self' },
  { path: 'GET  /api/substrate/digest',         what: 'Substrate snapshot JSON (counts + chains)' },
  { path: 'GET  /api/health',                   what: 'Public reachability probe (no auth)' },
];

export function KeyboardShortcuts() {
  const [q, setQ] = React.useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem('civicos.pref.help.q') ?? '');
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (q) window.localStorage.setItem('civicos.pref.help.q', q);
    else window.localStorage.removeItem('civicos.pref.help.q');
  }, [q]);
  const needle = q.trim().toLowerCase();
  const matchRow = (s: string) => needle === '' || s.toLowerCase().includes(needle);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Help · shortcuts &amp; routes</h2>
        <span className="font-mono text-[10px] text-ink-muted">Cmd/Ctrl-K for the palette</span>
      </div>

      <input type="search" value={q} onChange={e => setQ(e.currentTarget.value)}
        placeholder="filter routes / shortcuts…"
        className="w-full rounded-[3px] border border-line bg-bg px-3 py-1 font-mono text-[11px]" />

      {GROUPS.map(g => (
        <Panel key={g.title} title={g.title} meta={`${g.items.length}`} bodyClass="!p-0">
          {g.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft px-3 py-1.5 last:border-0 text-[11px]">
              <span className="w-40 shrink-0 rounded-[3px] border border-line bg-bg px-2 py-0.5 text-center font-mono text-[10px] text-ink">{it.keys}</span>
              <span className="min-w-0 flex-1 text-ink">{it.what}</span>
            </div>
          ))}
        </Panel>
      ))}

      <Panel title="Routes" meta={`${ROUTE_TABLE.length}`} bodyClass="!p-0">
        <div className="max-h-[480px] overflow-y-auto">
          {ROUTE_TABLE.filter(r => matchRow(`${r.path} ${r.what}`)).map(r => (
            <div key={r.path} className="flex items-center gap-3 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
              <Link href={r.path.replace('[ref]','').replace('[id]','').replace('[scope]','').replace(/\/+$/,'') || r.path}
                className="w-64 shrink-0 truncate font-mono text-link hover:underline">
                {r.path}
              </Link>
              <span className="min-w-0 flex-1 truncate text-ink">{r.what}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="API endpoints" meta={`${API_TABLE.length}`} bodyClass="!p-0">
        {API_TABLE.filter(r => matchRow(`${r.path} ${r.what}`)).map(r => (
          <div key={r.path} className="flex items-center gap-3 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
            <span className="w-64 shrink-0 truncate font-mono text-link">{r.path}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{r.what}</span>
          </div>
        ))}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        All API endpoints except <span className="font-mono">/api/health</span> require
        <span className="font-mono"> CIVICOS_CRON_SECRET</span> (either
        <span className="font-mono"> ?token=…</span> or Bearer header). Cadence recipes
        for Vercel Cron / pg_cron live in <span className="font-mono">supabase/README.md</span>.
      </p>
    </div>
  );
}
