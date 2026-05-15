'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Section, EnterpriseTable, StatusText, type Column } from '@/components/ui/DataSystem';
import { SeverityBadge } from '@/components/ui/Ops';
import { Sparkbars, RegionMatrix, SLAMonitor, FlowBars } from '@/components/ui/Viz';
import { WorkspaceSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api/client';
import type {
  AnalyticSeries,
  FieldUnitStatus,
  MinistryIncident,
  MinistryQueue,
  QueueItem,
  RegionStat,
} from '@/lib/api/types';

type Tab = 'command' | 'regional' | 'approvals' | 'incidents' | 'field';
const TABS: { k: Tab; label: string }[] = [
  { k: 'command', label: 'Command' },
  { k: 'regional', label: 'Regional oversight' },
  { k: 'approvals', label: 'Approvals' },
  { k: 'incidents', label: 'Incidents & escalation' },
  { k: 'field', label: 'Field operations' },
];

const OPERATOR = 'K. Otieno';

/**
 * A ministry as a deep institutional workspace: its own internal
 * navigation, command surface with domain visualisations, and
 * archetype-specialised operational tabs. One canonical implementation,
 * composed per archetype from the profile + operational data.
 */
export function MinistryWorkspace({ id }: { id: string }) {
  const [tab, setTab] = React.useState<Tab>('command');
  const [name, setName] = React.useState('');
  const [archetype, setArchetype] = React.useState('');
  const [labels, setLabels] = React.useState({ unit: 'Operational', capacity: 'Capacity', cases: 'Open cases' });
  const [regions, setRegions] = React.useState<RegionStat[]>([]);
  const [series, setSeries] = React.useState<AnalyticSeries[]>([]);
  const [queue, setQueue] = React.useState<MinistryQueue | null>(null);
  const [incidents, setIncidents] = React.useState<MinistryIncident[]>([]);
  const [escChain, setEscChain] = React.useState<string[]>([]);
  const [field, setField] = React.useState<FieldUnitStatus[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [r, s, q, inc, f] = await Promise.all([
        api.org.regions(id),
        api.org.series(id),
        api.org.queue(id),
        api.org.incidents(id),
        api.org.field(id),
      ]);
      setName(r.ministry.name);
      setArchetype(r.ministry.archetype);
      setRegions(r.regions);
      setLabels(r.labels);
      setSeries(s.series);
      setQueue(q);
      setIncidents(inc.incidents);
      setEscChain(inc.escalation);
      setField(f.units);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load workspace');
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function queueAct(itemId: string, action: 'assign' | 'escalate' | 'clear') {
    setBusy(itemId + action);
    setErr(null);
    try {
      const { item } = await api.org.actOnQueueItem(id, itemId, action);
      setQueue(prev => (prev ? { ...prev, items: prev.items.map(x => (x.id === item.id ? item : x)) } : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }
  async function queueActMany(items: QueueItem[], action: 'assign' | 'escalate' | 'clear') {
    setErr(null);
    try {
      const updated = await Promise.all(
        items.map(it => api.org.actOnQueueItem(id, it.id, action).then(r => r.item)),
      );
      const byId = new Map(updated.map(u => [u.id, u]));
      setQueue(prev =>
        prev ? { ...prev, items: prev.items.map(x => byId.get(x.id) ?? x) } : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Bulk action failed');
    }
  }
  async function incAct(key: string, kind: 'escalate' | 'resolve') {
    setBusy(key + kind);
    setErr(null);
    try {
      const { incident } =
        kind === 'escalate'
          ? await api.org.escalateIncident(id, key)
          : await api.org.resolveIncident(id, key);
      setIncidents(prev => prev.map(x => (x.key === incident.key ? incident : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const activeAlerts = incidents.filter(i => i.active);
  const openQueue = queue?.items.filter(i => i.state !== 'cleared').length ?? 0;
  const maxCases = regions.reduce((m, r) => Math.max(m, r.openCases), 0);
  const totalCases = regions.reduce((s, r) => s + r.openCases, 0);

  const regionCols: Column<RegionStat & { id?: string }>[] = [
    { key: 'r', header: 'Region', render: r => <strong>{r.region}</strong>, filter: r => r.region, sort: (a, b) => a.region.localeCompare(b.region) },
    { key: 'f', header: labels.unit, align: 'right', render: r => `${r.facilitiesOperationalPct}%`, sort: (a, b) => a.facilitiesOperationalPct - b.facilitiesOperationalPct },
    { key: 'c', header: labels.capacity, align: 'right', render: r => `${r.capacityPct}%`, sort: (a, b) => a.capacityPct - b.capacityPct },
    { key: 'o', header: labels.cases, align: 'right', render: r => r.openCases, sort: (a, b) => a.openCases - b.openCases },
    { key: 's', header: 'SLA breaches', align: 'right', render: r => (r.slaBreaches > 0 ? <StatusText tone="alert">{r.slaBreaches}</StatusText> : '0'), sort: (a, b) => a.slaBreaches - b.slaBreaches },
    { key: 'st', header: 'Status', render: r => <StatusText tone={r.status}>{r.status.toUpperCase()}</StatusText>, filter: r => r.status, sort: (a, b) => a.status.localeCompare(b.status) },
  ];
  const queueCols: Column<QueueItem>[] = [
    { key: 'ref', header: 'Ref', render: i => <span className="font-mono text-xs">{i.ref}</span>, filter: i => i.ref, sort: (a, b) => a.ref.localeCompare(b.ref) },
    { key: 'sub', header: 'Subject', render: i => i.subject, filter: i => i.subject, sort: (a, b) => a.subject.localeCompare(b.subject) },
    { key: 'rg', header: 'Region', render: i => i.region, filter: i => i.region, sort: (a, b) => a.region.localeCompare(b.region) },
    { key: 'age', header: 'Age', align: 'right', render: i => (queue && i.ageHours > queue.slaHours ? <StatusText tone="alert">{i.ageHours}h</StatusText> : `${i.ageHours}h`), sort: (a, b) => a.ageHours - b.ageHours },
    { key: 'pr', header: 'Priority', render: i => <Pill tone={i.priority === 'urgent' ? 'alert' : i.priority === 'elevated' ? 'warn' : 'neutral'}>{i.priority}</Pill>, filter: i => i.priority, sort: (a, b) => a.priority.localeCompare(b.priority) },
    { key: 'st', header: 'State', render: i => <Pill tone={i.state === 'escalated' ? 'alert' : i.state === 'assigned' ? 'warn' : 'neutral'}>{i.state}{i.assignee ? ` · ${i.assignee}` : ''}</Pill>, filter: i => `${i.state} ${i.assignee ?? ''}`, sort: (a, b) => a.state.localeCompare(b.state) },
    { key: 'act', header: 'Action', render: i => (
        <div className="flex gap-1.5">
          {i.state === 'open' ? <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'assign'} onClick={() => queueAct(i.id, 'assign')}>Assign me</button> : null}
          <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'escalate'} onClick={() => queueAct(i.id, 'escalate')}>Escalate</button>
          <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'clear'} onClick={() => queueAct(i.id, 'clear')}>Clear</button>
        </div>
      ) },
  ];

  if (!name && !err) return <WorkspaceSkeleton label="Loading institution workspace" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/gov" className="text-sm text-link underline underline-offset-2">← Cabinet</Link>
          <h1 className="mt-1 text-2xl font-semibold">{name || 'Institution workspace'}</h1>
          <p className="text-sm text-ink-muted">{archetype} · institutional operating environment</p>
        </div>
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 ? <Pill tone="alert">{activeAlerts.length} active incident{activeAlerts.length === 1 ? '' : 's'}</Pill> : <Pill tone="ok">no active incidents</Pill>}
          <Pill tone={openQueue > 6 ? 'warn' : 'neutral'}>{openQueue} in queue</Pill>
        </div>
      </div>

      {/* Internal workspace navigation */}
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Workspace sections">
        {TABS.map(t => (
          <button
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            onClick={() => setTab(t.k)}
            className={
              'border-b-2 px-3 py-2 text-sm ' +
              (tab === t.k
                ? 'border-ink font-semibold text-ink'
                : 'border-transparent text-ink-soft hover:text-ink')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {err ? <p className="text-sm text-alert" role="alert">{err}</p> : null}

      {tab === 'command' && (
        <div className="space-y-5">
          <Section title="Command indicators" meta="last 12 periods">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {series.map(s => (
                <Sparkbars
                  key={s.key}
                  points={s.points}
                  goodWhenUp={s.goodWhenUp}
                  label={s.label}
                  unit={s.unit}
                  current={s.current}
                  mean={s.mean}
                />
              ))}
            </div>
          </Section>
          <Section title="Regional posture" meta="tile shade ∝ open caseload">
            <RegionMatrix
              cells={regions.map(r => ({
                label: r.region,
                tone: r.status,
                intensity: maxCases ? (r.openCases / maxCases) * 100 : 0,
                value: `${r.facilitiesOperationalPct}%`,
              }))}
              onSelect={() => setTab('regional')}
            />
          </Section>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="SLA compliance" meta="target 95%">
              <SLAMonitor
                rows={regions.map(r => ({
                  label: r.region,
                  compliancePct: Math.round(
                    100 * (1 - r.slaBreaches / (r.openCases + r.slaBreaches || 1)),
                  ),
                  target: 95,
                }))}
              />
            </Section>
            <Section title="Caseload concentration" meta={`${totalCases} ${labels.cases.toLowerCase()}`}>
              <FlowBars
                segments={regions.map(r => ({
                  label: r.region,
                  value: r.openCases,
                  tone: r.status,
                }))}
              />
            </Section>
          </div>
          {activeAlerts.length > 0 ? (
            <Section title="Active incidents">
              <div className="space-y-2">
                {activeAlerts.map(a => (
                  <Card tight key={a.key}>
                    <div className="flex items-start gap-2">
                      <SeverityBadge severity={a.severity} />
                      <div>
                        <strong>{a.label}</strong>
                        <div className="text-sm text-ink-muted">{a.detail}</div>
                        <div className="mt-1 text-xs text-ink-muted">
                          Authority: <strong>{escChain[a.tierIndex] ?? '—'}</strong>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      )}

      {tab === 'regional' && (
        <Section title="Regional oversight" meta={`${regions.length} ${labels.unit.toLowerCase()}`}>
          <EnterpriseTable
            columns={regionCols}
            rows={regions}
            rowKey={r => r.region}
            search
            searchPlaceholder="Filter regions…"
            initialSort={{ key: 's', dir: 'desc' }}
            expand={r => (
              <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><span className="text-ink-muted">{labels.unit} operational</span><span className="tabular-nums">{r.facilitiesOperationalPct}%</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">{labels.capacity}</span><span className="tabular-nums">{r.capacityPct}%</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">{labels.cases}</span><span className="tabular-nums">{r.openCases}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">SLA breaches</span><span className="tabular-nums">{r.slaBreaches}</span></div>
                <div className="sm:col-span-2 mt-1 text-xs text-ink-muted">
                  Posture <strong className="uppercase">{r.status}</strong>. Drill-through to the institution&rsquo;s
                  regional command and field operations for {r.region}.
                </div>
              </div>
            )}
          />
        </Section>
      )}

      {tab === 'approvals' && (
        <Section
          title={queue?.title ?? 'Approvals'}
          meta={`${openQueue} open · SLA ${queue ? Math.round(queue.slaHours / 24) : '—'}d`}
        >
          <EnterpriseTable
            columns={queueCols}
            rows={queue?.items ?? []}
            rowKey={i => i.id}
            empty="Queue clear."
            search
            searchPlaceholder="Filter by ref, subject, region…"
            initialSort={{ key: 'age', dir: 'desc' }}
            bulk={[
              { label: 'Assign to me', run: items => queueActMany(items.filter(i => i.state === 'open'), 'assign') },
              { label: 'Escalate', run: items => queueActMany(items, 'escalate') },
              { label: 'Clear', tone: 'alert', run: items => queueActMany(items, 'clear') },
            ]}
            expand={i => (
              <div className="space-y-2 text-sm">
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  <div className="flex justify-between"><span className="text-ink-muted">Reference</span><span className="font-mono text-xs">{i.ref}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Region</span><span>{i.region}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Age</span><span className="tabular-nums">{i.ageHours}h{queue && i.ageHours > queue.slaHours ? ` · ${i.ageHours - queue.slaHours}h over SLA` : ''}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Priority</span><span className="capitalize">{i.priority}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">State</span><span className="capitalize">{i.state}{i.assignee ? ` · ${i.assignee}` : ''}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">SLA target</span><span className="tabular-nums">{queue ? Math.round(queue.slaHours / 24) : '—'}d</span></div>
                </div>
                <div className="text-xs text-ink-muted">
                  {i.subject}. Disposition is recorded to the tamper-evident audit
                  chain against operator <strong>{OPERATOR}</strong> — escalation
                  follows this institution&rsquo;s authority chain.
                </div>
              </div>
            )}
          />
          <p className="mt-2 text-xs text-ink-muted">
            Operator <strong>{OPERATOR}</strong>. Every action named and
            audited — single or bulk. Humans assign, escalate, clear — no
            autonomous action.
          </p>
        </Section>
      )}

      {tab === 'incidents' && (
        <Section title="Incidents & escalation" meta={escChain.length ? `chain: ${escChain.join(' → ')}` : undefined}>
          <div className="space-y-2">
            {incidents.map(inc => (
              <Card tight key={inc.key}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={inc.severity} />
                    <div>
                      <strong>{inc.label}</strong>
                      <div className="text-sm text-ink-muted">{inc.detail}</div>
                    </div>
                  </div>
                  <Pill tone={inc.active ? 'alert' : 'ok'}>{inc.active ? 'ACTIVE' : 'clear'}</Pill>
                </div>
                {inc.active ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink-muted">
                      Current authority: <strong>{escChain[inc.tierIndex] ?? '—'}</strong>
                      {inc.tierIndex < escChain.length - 1 ? ` · next: ${escChain[inc.tierIndex + 1]}` : ' · top of chain'}
                    </span>
                    <Button variant="secondary" disabled={busy === inc.key + 'escalate' || inc.tierIndex >= escChain.length - 1} onClick={() => incAct(inc.key, 'escalate')}>Escalate</Button>
                    <Button variant="secondary" disabled={busy === inc.key + 'resolve'} onClick={() => incAct(inc.key, 'resolve')}>Resolve</Button>
                  </div>
                ) : null}
              </Card>
            ))}
            {incidents.length === 0 ? <p className="text-sm text-ink-muted">No incident types configured.</p> : null}
          </div>
        </Section>
      )}

      {tab === 'field' && (
        <Section title="Field operations" meta={`${field.length} unit types`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {field.map(u => (
              <Card tight key={u.unit}>
                <div className="flex items-baseline justify-between gap-2">
                  <strong>{u.label}</strong>
                  <span className="text-sm text-ink-muted">{u.total} total</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {u.counts.map(c => (
                    <div key={c.state} className="flex justify-between">
                      <span className="capitalize text-ink-muted">{c.state}</span>
                      <span className="tabular-nums">{c.n}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {field.length === 0 ? <p className="text-sm text-ink-muted">No field units configured.</p> : null}
          </div>
        </Section>
      )}
    </div>
  );
}
