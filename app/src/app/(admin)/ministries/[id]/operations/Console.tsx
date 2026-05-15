'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import {
  Section,
  DataTable,
  StatusText,
  Delta,
  type Column,
} from '@/components/ui/DataSystem';
import { api } from '@/lib/api/client';
import type {
  AnalyticDelta,
  MinistryQueue,
  MinistryRegions,
  QueueItem,
  RegionStat,
} from '@/lib/api/types';

const OPERATOR = 'K. Otieno';

export function OperationsConsole({ id }: { id: string }) {
  const [name, setName] = React.useState('');
  const [archetype, setArchetype] = React.useState('');
  const [regions, setRegions] = React.useState<RegionStat[]>([]);
  const [analytics, setAnalytics] = React.useState<AnalyticDelta[]>([]);
  const [queue, setQueue] = React.useState<MinistryQueue | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [r, a, q] = await Promise.all([
        api.org.regions(id),
        api.org.analytics(id),
        api.org.queue(id),
      ]);
      setName((r as MinistryRegions).ministry.name);
      setArchetype((r as MinistryRegions).ministry.archetype);
      setRegions((r as MinistryRegions).regions);
      setAnalytics(a.analytics);
      setQueue(q);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load console');
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function act(itemId: string, action: 'assign' | 'escalate' | 'clear') {
    setBusy(itemId + action);
    setErr(null);
    try {
      const { item } = await api.org.actOnQueueItem(id, itemId, action);
      setQueue(prev =>
        prev
          ? { ...prev, items: prev.items.map(x => (x.id === item.id ? item : x)) }
          : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const regionCols: Column<RegionStat & { id?: string }>[] = [
    { key: 'r', header: 'Region', render: r => <strong>{r.region}</strong> },
    { key: 'f', header: 'Facilities op.', align: 'right', render: r => `${r.facilitiesOperationalPct}%` },
    { key: 'c', header: 'Capacity', align: 'right', render: r => `${r.capacityPct}%` },
    { key: 'o', header: 'Open cases', align: 'right', render: r => r.openCases },
    { key: 's', header: 'SLA breaches', align: 'right', render: r =>
        r.slaBreaches > 0 ? <StatusText tone="alert">{r.slaBreaches}</StatusText> : '0' },
    { key: 'st', header: 'Status', render: r => (
        <StatusText tone={r.status}>{r.status.toUpperCase()}</StatusText>
      ) },
  ];

  const open = queue?.items.filter(i => i.state !== 'cleared') ?? [];
  const queueCols: Column<QueueItem>[] = [
    { key: 'ref', header: 'Ref', render: i => <span className="font-mono text-xs">{i.ref}</span> },
    { key: 'sub', header: 'Subject', render: i => i.subject },
    { key: 'rg', header: 'Region', render: i => i.region },
    { key: 'age', header: 'Age', align: 'right', render: i =>
        i.ageHours > queue!.slaHours ? (
          <StatusText tone="alert">{i.ageHours}h</StatusText>
        ) : (
          `${i.ageHours}h`
        ) },
    { key: 'pr', header: 'Priority', render: i => (
        <Pill tone={i.priority === 'urgent' ? 'alert' : i.priority === 'elevated' ? 'warn' : 'neutral'}>
          {i.priority}
        </Pill>
      ) },
    { key: 'st', header: 'State', render: i => (
        <Pill tone={i.state === 'escalated' ? 'alert' : i.state === 'assigned' ? 'warn' : 'neutral'}>
          {i.state}{i.assignee ? ` · ${i.assignee}` : ''}
        </Pill>
      ) },
    { key: 'act', header: 'Action', render: i => (
        <div className="flex gap-1.5">
          {i.state === 'open' ? (
            <button
              className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2"
              disabled={busy === i.id + 'assign'}
              onClick={() => act(i.id, 'assign')}
            >
              Assign me
            </button>
          ) : null}
          <button
            className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2"
            disabled={busy === i.id + 'escalate'}
            onClick={() => act(i.id, 'escalate')}
          >
            Escalate
          </button>
          <button
            className="rounded-xs border border-line px-2 py-0.5 text-xs hover:bg-surface-2"
            disabled={busy === i.id + 'clear'}
            onClick={() => act(i.id, 'clear')}
          >
            Clear
          </button>
        </div>
      ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/ministries" className="text-sm text-link underline underline-offset-2">
            ← Institutions
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{name || 'Operations console'}</h1>
          <p className="text-sm text-ink-muted">{archetype} · operational command</p>
        </div>
        <Link href={`/control?ministry=`} className="text-sm text-link underline underline-offset-2">
          Service-health overview →
        </Link>
      </div>

      {err ? <p className="text-sm text-alert" role="alert">{err}</p> : null}

      <Section title="Analytics" meta="period over period">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {analytics.map(a => (
            <Card tight key={a.label}>
              <div className="text-xs uppercase tracking-wide text-ink-muted">{a.label}</div>
              <div className="mt-1">
                <Delta value={a.value} delta={a.delta} goodWhenUp={a.goodWhenUp} />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Regional oversight" meta={`${regions.length} regions`}>
        <DataTable
          columns={regionCols}
          rows={regions}
          rowKey={r => r.region}
        />
      </Section>

      <Section
        title={queue?.title ?? 'Approvals queue'}
        meta={`${open.length} open · SLA ${queue ? Math.round(queue.slaHours / 24) : '—'}d`}
      >
        <DataTable
          columns={queueCols}
          rows={queue?.items ?? []}
          rowKey={i => i.id}
          empty="Queue is clear."
        />
        <p className="mt-2 text-xs text-ink-muted">
          Operator: <strong>{OPERATOR}</strong>. Every action is named and
          written to the audit trail. The platform surfaces work; humans
          assign, escalate, and clear — no autonomous action.
        </p>
      </Section>
    </div>
  );
}
