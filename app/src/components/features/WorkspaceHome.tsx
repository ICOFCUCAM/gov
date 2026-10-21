'use client';

// My workspace (/gov/workspace): the shared workspace shell of
// docs/CONSTITUTIONAL_ARCHITECTURE.md §6.6 (plan phase 4, audit F). The same
// panels for every official, filled from their own office and institution:
// My authority, My work, Awaiting my action, Institution status, Legal
// changes, Oversight, Exceptions. Panels read /api/workspace and /api/work,
// which apply lib/auth/roles.ts: another institution's restricted records
// never reach this page. Every figure here is observed from the records.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type { WorkOverview } from '@/lib/api/types';
import type { Workspace, Item } from '@/lib/workspace/panels';
import { Panel } from '@/components/features/SituationRoom';
import { useSignIn } from '@/lib/official';
import { greetingName, officeLine, homeDestinations } from '@/lib/workspace/home';

function Items({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return <p className="px-1 py-1 text-[12px] text-ink-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line-soft">
      {items.map((x, i) => (
        <li key={`${x.what}-${i}`}>
          <Link href={x.href} className="focus-ring block px-1 py-1.5 no-underline hover:bg-surface-2/50">
            <span className="block text-[12px] text-ink">{x.what}</span>
            {x.detail ? <span className="block text-[11px] text-ink-muted">{x.detail}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WorkspaceHome() {
  const official = useSignIn()?.official ?? null;
  const [ws, setWs] = React.useState<Workspace | null>(null);
  const [work, setWork] = React.useState<WorkOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    const load = () => {
      fetch('/api/workspace', { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject(new Error(`Could not read the workspace (${r.status})`))))
        .then((j: { workspace: Workspace }) => { if (live) { setWs(j.workspace); setError(null); } })
        .catch(e => { if (live) setError((e as Error).message); });
      api.work().then(w => { if (live) setWork(w); }).catch(() => { if (live) setWork(null); });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  // My work: what /api/work lets this official see, narrowed to their own institution (all of it for the whole government).
  const own = official?.institution;
  const cases = (work?.cases ?? []).filter(c => !own || c.ministryId === own);
  const queue = (work?.queue ?? []).filter(q => !own || q.ministryId === own);
  const myWork: Item[] = [
    ...cases.slice(0, 6).map(c => ({ what: `${c.ref} · ${c.procedure}`, detail: `${c.ministry} · ${c.stage}${c.overdue ? ' · past its deadline' : ''}${c.source === 'sample' ? ' · sample' : ''}`, href: `/gov/cases/${encodeURIComponent(c.id)}` })),
    ...queue.slice(0, 6).map(q => ({ what: `${q.ref} · ${q.subject}`, detail: `${q.ministry}${q.overdue ? ' · past its deadline' : ''}${!q.source || q.source === 'sample' ? ' · sample' : ''}`, href: `/gov/ministry/${encodeURIComponent(q.ministryId)}` })),
  ];
  const approvals: Item[] = cases.filter(c => c.pendingApproval).map(c => ({ what: `${c.ref}: a decision waiting for a second official`, detail: c.procedure, href: `/gov/cases/${encodeURIComponent(c.id)}` }));
  const home = homeDestinations(official)[0];
  const a = ws?.authority;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">{official ? `Welcome, ${greetingName(official)}` : 'Not signed in'}</div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">My workspace</h1>
          <p className="text-[12px] text-ink-muted">{official ? officeLine(official) : 'Sign in to see your office, your work and what waits for you.'}</p>
        </div>
        {home ? <Link href={home.href} className="focus-ring rounded-[3px] border border-line px-2.5 py-1 text-[12px] text-link no-underline hover:bg-surface-2">{home.t} →</Link> : null}
      </div>
      {error ? <p role="alert" className="text-[12px] text-ink-muted">{error}</p> : null}

      <div className="grid gap-2 lg:grid-cols-3">
        <Panel title="My authority" meta={a?.role ?? (a?.signedIn === false ? 'not signed in' : undefined)} bodyClass="!p-2">
          {a ? (
            <div className="space-y-2 text-[12px]">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-ink-muted">Office</dt>
                <dd className="min-w-0 text-ink">{a.offices.length ? a.offices.map(o => `${o.acting ? 'Acting ' : ''}${o.title}`).join(' · ') : a.office ?? 'No office recorded for this account'}</dd>
                <dt className="text-ink-muted">Institution</dt>
                <dd className="min-w-0 text-ink">{a.institution ? `${a.institution.name} · ${a.institution.standing}` : a.signedIn ? 'Whole government' : '—'}</dd>
                <dt className="text-ink-muted">Independent</dt>
                <dd className="text-ink">{a.institution ? (a.institution.independent ? (a.institution.court ? 'Yes · a court' : 'Yes') : 'No') : '—'}</dd>
                <dt className="text-ink-muted">Delegations</dt>
                <dd className="text-ink-muted">None recorded</dd>
              </dl>
              {a.offices.some(o => o.powers.length) ? (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">Powers of the office (recorded elsewhere)</div>
                  <ul className="mt-0.5 list-disc ps-4 text-[11px] text-ink-soft">{a.offices.flatMap(o => o.powers).slice(0, 8).map(p => <li key={p}>{p}</li>)}</ul>
                </div>
              ) : null}
              <ul className="space-y-0.5 text-[11px] text-ink-muted">{a.restrictions.map(r => <li key={r}>{r}</li>)}</ul>
            </div>
          ) : <p className="text-[12px] text-ink-muted">Reading…</p>}
        </Panel>

        <Panel title="My work" meta={work ? `${cases.length} case${cases.length === 1 ? '' : 's'} · ${queue.length} in queues` : undefined} bodyClass="!p-1.5">
          <Items items={myWork} empty={work ? 'Nothing open that you may see.' : 'Reading…'} />
          <Link href="/gov/work" className="focus-ring mt-1 inline-block px-1 text-[11px] text-link underline underline-offset-2">All my work →</Link>
        </Panel>

        <Panel title="Awaiting my action" meta={ws ? String((ws.awaiting.length) + approvals.length) : undefined} bodyClass="!p-1.5">
          <Items items={[...approvals, ...(ws?.awaiting ?? [])]} empty={ws ? 'Nothing waits for you.' : 'Reading…'} />
        </Panel>

        <Panel title="Institution status" bodyClass="!p-2">
          {ws?.institutionStatus.length ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px]">
              {ws.institutionStatus.map(s => (
                <React.Fragment key={s.label}>
                  <dt className="text-ink-muted"><Link href={s.href} className="focus-ring text-ink-muted no-underline hover:text-ink">{s.label}</Link></dt>
                  <dd className="text-end font-mono tabular-nums text-ink">{s.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          ) : <p className="text-[12px] text-ink-muted">{ws ? 'Not available for your institution.' : 'Reading…'}</p>}
        </Panel>

        <Panel title="Legal changes" bodyClass="!p-1.5">
          <Items items={ws?.legalChanges ?? []} empty={ws ? 'No law confirmed or coming into force in the last 90 days.' : 'Reading…'} />
        </Panel>

        <Panel title="Oversight" bodyClass="!p-1.5">
          <Items items={ws?.oversight ?? []} empty={ws ? 'Nothing to report.' : 'Reading…'} />
        </Panel>

        <Panel title="Exceptions" className="lg:col-span-3" bodyClass="!p-1.5">
          <Items items={ws?.exceptions ?? []} empty={ws ? 'Nothing blocked.' : 'Reading…'} />
        </Panel>
      </div>
    </div>
  );
}
