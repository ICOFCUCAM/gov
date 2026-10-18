'use client';

import * as React from 'react';
import Link from 'next/link';
import { Panel } from '@/components/features/SituationRoom';
import { CONSOLE_NAV } from '@/lib/nav/console-nav';

interface ShortcutGroup { title: string; items: { keys: string; what: string }[] }

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Finding things quickly',
    items: [
      { keys: '⌘K / Ctrl-K', what: 'Open quick search from any console page: type a page, a case or a name' },
      { keys: '↑ ↓',         what: 'Move up and down the results' },
      { keys: '↵',           what: 'Open the highlighted result' },
      { keys: 'Esc',         what: 'Close quick search' },
    ],
  },
  {
    title: 'On a record',
    items: [
      { keys: '☆ (click)',   what: 'Follow the record: it appears under My work › Following on this device' },
      { keys: '← (link)',    what: 'Go back to the list the record came from' },
    ],
  },
  {
    title: 'At the top of every page',
    items: [
      { keys: 'Your name',     what: 'Who you are signed in as, what you may do and for which institution' },
      { keys: 'Audit record',  what: 'Shows that the record of every action is intact; click to read it' },
      { keys: 'Bell',          what: 'Notifications you have not seen yet; click to read them' },
    ],
  },
];

/** Everyday tasks, each with the page that does it. */
const TASKS: { task: string; how: string; href: string }[] = [
  { task: 'See what is waiting on you', how: 'My work lists decisions, cases and incidents across your institutions; late items come first.', href: '/gov/work' },
  { task: 'Bring your institution\'s cases in', how: 'My work › Load cases: load a spreadsheet saved as CSV, type in one case, or connect your case system.', href: '/gov/work/cases' },
  { task: 'Draft, sign or withdraw a directive', how: 'Directives: draft one, then an official who can sign signs it; every step is recorded.', href: '/gov/directives' },
  { task: 'Find a page, case or person', how: 'Use Search at the top, or press ⌘K / Ctrl-K.', href: '/gov/search' },
  { task: 'Add an official or change what they may do', how: 'People › Sign-in accounts (administrators only).', href: '/admin/officials' },
  { task: 'Check who did what', how: 'Audit record: every action, with who acted and when, in an unbroken chain.', href: '/gov/audit' },
  { task: 'Understand a word on the screen', how: 'The glossary explains the technical terms in plain language.', href: '/gov/glossary' },
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
    <div className="space-y-4 text-[14px]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-[20px] font-semibold tracking-tight text-ink">How to use the console</h2>
        <span className="text-[12px] text-ink-muted">Press ⌘K / Ctrl-K anywhere to search</span>
      </div>

      <label className="block text-[13px] text-ink-soft">Look for a page or task
        <input type="search" value={q} onChange={e => setQ(e.currentTarget.value)}
          placeholder="e.g. directives, cases, audit"
          className="mt-1 w-full rounded-[3px] border border-line bg-bg px-3 py-2 text-[14px]" />
      </label>

      <Panel title="Common tasks" meta={`${TASKS.length}`} bodyClass="!p-0">
        {TASKS.filter(t => matchRow(`${t.task} ${t.how}`)).map(t => (
          <div key={t.href} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line-soft px-3 py-2 last:border-0">
            <Link href={t.href} className="w-72 shrink-0 font-semibold text-link hover:underline">{t.task}</Link>
            <span className="min-w-0 flex-1 text-ink-soft">{t.how}</span>
          </div>
        ))}
      </Panel>

      <Panel title="Where things are" meta="the menu, section by section" bodyClass="!p-0">
        {CONSOLE_NAV.map(sec => {
          const items = sec.items.filter(it => matchRow(`${sec.label} ${it.label} ${it.purpose} ${it.tabs.map(t => `${t.label} ${t.was ?? ''}`).join(' ')}`));
          if (!items.length) return null;
          return (
            <div key={sec.label} className="border-b border-line-soft px-3 py-2 last:border-0">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{sec.label}</h3>
              <ul className="mt-1 space-y-1.5">
                {items.map(it => (
                  <li key={it.key}>
                    <Link href={it.href} className="font-semibold text-link hover:underline">{it.label}</Link>
                    <span className="text-ink-soft"> — {it.purpose}</span>
                    {it.tabs.length > 1 ? (
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink-muted">
                        {it.tabs.map(t => <Link key={t.href} href={t.href} className="hover:text-link hover:underline">{t.label}</Link>)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Panel>

      {GROUPS.map(g => (
        <Panel key={g.title} title={g.title} meta={`${g.items.length}`} bodyClass="!p-0">
          {g.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-soft px-3 py-1.5 last:border-0 text-[13px]">
              <span className="w-40 shrink-0 rounded-[3px] border border-line bg-bg px-2 py-0.5 text-center font-mono text-[11px] text-ink">{it.keys}</span>
              <span className="min-w-0 flex-1 text-ink">{it.what}</span>
            </div>
          ))}
        </Panel>
      ))}

      <details className="rounded-[3px] border border-line px-3 py-2 text-[12px]">
        <summary className="cursor-pointer text-ink-soft">For technical staff: every page address and the scheduled jobs</summary>
        <div className="mt-2 space-y-3">
          <Panel title="Page addresses" meta={`${ROUTE_TABLE.length}`} bodyClass="!p-0">
            <div className="max-h-[480px] overflow-y-auto">
              {ROUTE_TABLE.filter(r => matchRow(`${r.path} ${r.what}`)).map(r => (
                <div key={r.path} className="flex items-center gap-3 border-b border-line-soft px-3 py-1 last:border-0 text-[11px]">
                  <Link href={r.path.replace(/\/\[[^\]]+\]/g, '').replace(/\/+$/, '') || '/'}
                    className="w-64 shrink-0 truncate font-mono text-link hover:underline">
                    {r.path}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-ink">{r.what}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Scheduled jobs and machine calls" meta={`${API_TABLE.length}`} bodyClass="!p-0">
            {API_TABLE.filter(r => matchRow(`${r.path} ${r.what}`)).map(r => (
              <div key={r.path} className="flex items-center gap-3 border-b border-line-soft px-3 py-1 last:border-0 text-[11px]">
                <span className="w-64 shrink-0 truncate font-mono text-link">{r.path}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{r.what}</span>
              </div>
            ))}
          </Panel>

          <p className="text-[11px] text-ink-muted">
            All of these except <span className="font-mono">/api/health</span> require
            <span className="font-mono"> CIVICOS_CRON_SECRET</span> (either
            <span className="font-mono"> ?token=…</span> or Bearer header). Cadence recipes
            for Vercel Cron / pg_cron live in <span className="font-mono">supabase/README.md</span>.
            The full platform API is described at <Link href="/developers" className="text-link underline">Developers</Link> and
            <span className="font-mono"> /api/openapi</span>.
          </p>
        </div>
      </details>
    </div>
  );
}
