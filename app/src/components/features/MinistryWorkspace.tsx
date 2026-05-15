'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Section, DataTable, StatusText, type Column } from '@/components/ui/DataSystem';
import { SeverityBadge } from '@/components/ui/Ops';
import { Sparkbars, HeatStrip } from '@/components/ui/Viz';
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

  const regionCols: Column<RegionStat & { id?: string }>[] = [
    { key: 'r', header: 'Region', render: r => <strong>{r.region}</strong> },
    { key: 'f', header: labels.unit, align: 'right', render: r => `${r.facilitiesOperationalPct}%` },
    { key: 'c', header: labels.capacity, align: 'right', render: r => `${r.capacityPct}%` },
    { key: 'o', header: labels.cases, align: 'right', render: r => r.openCases },
    { key: 's', header: 'SLA breaches', align: 'right', render: r => (r.slaBreaches > 0 ? <StatusText tone="alert">{r.slaBreaches}</StatusText> : '0') },
    { key: 'st', header: 'Status', render: r => <StatusText tone={r.status}>{r.status.toUpperCase()}</StatusText> },
  ];
  const queueCols: Column<QueueItem>[] = [
    { key: 'ref', header: 'Ref', render: i => <span className="font-mono text-xs">{i.ref}</span> },
    { key: 'sub', header: 'Subject', render: i => i.subject },
    { key: 'rg', header: 'Region', render: i => i.region },
    { key: 'age', header: 'Age', align: 'right', render: i => (queue && i.ageHours > queue.slaHours ? <StatusText tone="alert">{i.ageHours}h</StatusText> : `${i.ageHours}h`) },
    { key: 'pr', header: 'Priority', render: i => <Pill tone={i.priority === 'urgent' ? 'alert' : i.priority === 'elevated' ? 'warn' : 'neutral'}>{i.priority}</Pill> },
    { key: 'st', header: 'State', render: i => <Pill tone={i.state === 'escalated' ? 'alert' : i.state === 'assigned' ? 'warn' : 'neutral'}>{i.state}{i.assignee ? ` · ${i.assignee}` : ''}</Pill> },
    { key: 'act', header: 'Action', render: i => (
        <div className="flex gap-1.5">
          {i.state === 'open' ? <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'assign'} onClick={() => queueAct(i.id, 'assign')}>Assign me</button> : null}
          <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'escalate'} onClick={() => queueAct(i.id, 'escalate')}>Escalate</button>
          <button className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2" disabled={busy === i.id + 'clear'} onClick={() => queueAct(i.id, 'clear')}>Clear</button>
        </div>
      ) },
  ];

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
          <Section title="Regional posture">
            <HeatStrip
              cells={regions.map(r => ({
                label: r.region,
                tone: r.status,
                value: `${r.facilitiesOperationalPct}%`,
              }))}
            />
          </Section>
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
          <DataTable columns={regionCols} rows={regions} rowKey={r => r.region} />
        </Section>
      )}

      {tab === 'approvals' && (
        <Section
          title={queue?.title ?? 'Approvals'}
          meta={`${openQueue} open · SLA ${queue ? Math.round(queue.slaHours / 24) : '—'}d`}
        >
          <DataTable columns={queueCols} rows={queue?.items ?? []} rowKey={i => i.id} empty="Queue clear." />
          <p className="mt-2 text-xs text-ink-muted">
            Operator <strong>{OPERATOR}</strong>. Every action named and
            audited. Humans assign, escalate, clear — no autonomous action.
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
