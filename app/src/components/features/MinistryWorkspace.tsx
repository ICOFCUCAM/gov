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
import { TONE, Spark, seed, TerritoryHeat } from '@/components/features/SituationRoom';
import { api } from '@/lib/api/client';
import { identityFor } from '@/lib/archetype-profiles';
import { scoreInstitution, LIFECYCLE_LABEL } from '@/lib/institution/readiness';
import { subsystemsFor, subsystemOpPct } from '@/lib/institution/operational-catalog';
import type { Ministry } from '@/lib/api/types';
import type {
  AnalyticSeries,
  ArchetypeKey,
  FieldUnitStatus,
  MinistryIncident,
  MinistryQueue,
  QueueItem,
  RegionStat,
} from '@/lib/api/types';

type Tab =
  | 'command' | 'regional' | 'approvals' | 'incidents' | 'field'
  | 'escalations' | 'logistics' | 'analytics' | 'treasury'
  | 'infrastructure' | 'workforce' | 'security' | 'audit';
const TABS: { k: Tab; label: string }[] = [
  { k: 'command', label: 'Command' },
  { k: 'regional', label: 'Regional' },
  { k: 'approvals', label: 'Approvals' },
  { k: 'incidents', label: 'Incidents' },
  { k: 'escalations', label: 'Escalations' },
  { k: 'field', label: 'Field ops' },
  { k: 'logistics', label: 'Logistics' },
  { k: 'analytics', label: 'Analytics' },
  { k: 'treasury', label: 'Treasury' },
  { k: 'infrastructure', label: 'Infrastructure' },
  { k: 'workforce', label: 'Workforce' },
  { k: 'security', label: 'Security' },
  { k: 'audit', label: 'Audit' },
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
  const [inst, setInst] = React.useState<Ministry | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [r, s, q, inc, f, mins] = await Promise.all([
        api.org.regions(id),
        api.org.series(id),
        api.org.queue(id),
        api.org.incidents(id),
        api.org.field(id),
        api.org.ministries().then(x => x.ministries).catch(() => [] as Ministry[]),
      ]);
      setInst(mins.find(m => m.id === id) ?? null);
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

  // Institutional posture engine: lifecycle + live operating mode.
  const readiness = inst ? scoreInstitution(inst) : null;
  const crisis = activeAlerts.some(a => /1|crit/i.test(String(a.severity)));
  const mode: 'CRISIS' | 'ESCALATION' | 'EXECUTIVE' =
    crisis ? 'CRISIS' : activeAlerts.length > 0 ? 'ESCALATION' : 'EXECUTIVE';
  const modeTone = mode === 'CRISIS' ? 'rgb(var(--c-alert))'
    : mode === 'ESCALATION' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  const provisional = !!inst && (inst.status !== 'active' || (readiness ? !readiness.deployable : false));

  // Crisis auto-routes the operator to the incident surface once, without
  // fighting subsequent manual navigation.
  const autoRouted = React.useRef(false);
  React.useEffect(() => {
    if (crisis && !autoRouted.current) {
      autoRouted.current = true;
      setTab('incidents');
    }
  }, [crisis]);

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

  const ident = identityFor((archetype || 'GENERIC') as ArchetypeKey);

  return (
    <div className="space-y-5" style={{ ['--accent' as string]: ident.accent }}>
      <div
        className="-mx-4 -mt-4 mb-1 h-1 lg:-mx-6 lg:-mt-6"
        style={{ backgroundColor: ident.accent }}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-[3px] text-2xl text-white shadow-elev-1"
            style={{ backgroundColor: ident.accent }}
          >
            {ident.glyph}
          </span>
          <div>
            <Link href="/gov" className="focus-ring text-sm text-link underline underline-offset-2">← Cabinet</Link>
            <h1 className="t-display mt-1">{name || 'Institution workspace'}</h1>
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink-soft">{ident.domain}</span>
              <span className="mx-1.5 text-line">·</span>
              <span className="text-[11px] uppercase tracking-[0.16em]">{archetype}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 ? <Pill tone="alert">{activeAlerts.length} active incident{activeAlerts.length === 1 ? '' : 's'}</Pill> : <Pill tone="ok">no active incidents</Pill>}
          <Pill tone={openQueue > 6 ? 'warn' : 'neutral'}>{openQueue} in queue</Pill>
        </div>
      </div>

      {provisional ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border px-3 py-1.5 text-[11px]"
          style={{ borderColor: 'rgb(var(--c-warn))', backgroundColor: 'color-mix(in srgb, rgb(var(--c-warn)) 12%, transparent)', color: 'rgb(var(--c-warn))' }}>
          <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--c-warn))' }} />
            Provisional institution · activation gate not passed{readiness ? ` · ${readiness.total}% ready` : ''}
          </span>
          <Link href="/ministries" className="focus-ring rounded-[3px] border px-2 py-0.5 uppercase tracking-widest no-underline" style={{ borderColor: 'rgb(var(--c-warn))' }}>Resolve in Institutions Admin →</Link>
        </div>
      ) : null}

      {crisis ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border px-3 py-1.5 text-[11px]"
          style={{ borderColor: 'rgb(var(--c-alert))', backgroundColor: 'color-mix(in srgb, rgb(var(--c-alert)) 14%, transparent)', color: 'rgb(var(--c-alert))' }}>
          <span className="flex items-center gap-2 font-bold uppercase tracking-[0.2em]">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'rgb(var(--c-alert))' }} />
            Crisis posture engaged · {activeAlerts.length} active incident{activeAlerts.length === 1 ? '' : 's'} · institution operating under escalation authority
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Lifecycle', v: readiness ? LIFECYCLE_LABEL[readiness.lifecycle] : (inst?.status ?? '—'), c: readiness ? (readiness.deployable ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))') : 'rgb(var(--c-ink-muted))', dot: true },
          { l: 'Readiness', v: readiness ? `${readiness.total}%` : '—', c: readiness ? (readiness.deployable ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))') : 'rgb(var(--c-ink-muted))' },
          { l: 'Posture mode', v: mode, c: modeTone, dot: true },
          { l: 'Active incidents', v: String(activeAlerts.length), c: activeAlerts.length ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
          { l: 'Queue', v: `${openQueue} open`, c: openQueue > 6 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ink))' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: s.c }}>
              {s.dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: s.c }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      {(() => {
        const navBtn = (label: string, onClick: () => void, danger?: boolean) => (
          <button key={label} onClick={onClick}
            className="focus-ring rounded-[3px] border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{ borderColor: danger ? 'rgb(var(--c-alert))' : 'rgb(var(--c-line))', color: danger ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ink-soft))' }}>
            {label}
          </button>
        );
        const linkBtn = (label: string, href: string, danger?: boolean) => (
          <Link key={label} href={href}
            className="focus-ring rounded-[3px] border px-2.5 py-1 text-[11px] font-medium no-underline transition-colors"
            style={{ borderColor: danger ? 'rgb(var(--c-alert))' : 'rgb(var(--c-line))', color: danger ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ink-soft))' }}>
            {label}
          </Link>
        );
        const actions =
          mode === 'CRISIS' ? [
            navBtn('Open incident command', () => setTab('incidents'), true),
            navBtn('Escalations', () => setTab('escalations'), true),
            linkBtn('Convene War Room', '/gov/situation-room', true),
            linkBtn('Notify Cabinet', '/gov/coordination', true),
          ] : mode === 'ESCALATION' ? [
            navBtn('Review escalations', () => setTab('escalations')),
            navBtn('Prioritise queue', () => setTab('approvals')),
            linkBtn('National coordination', '/gov/coordination'),
            linkBtn('Notify oversight', '/audit'),
          ] : [
            navBtn('Command surface', () => setTab('command')),
            navBtn('Strategic analytics', () => setTab('analytics')),
            navBtn('Regional posture', () => setTab('regional')),
            linkBtn('Executive brief', '/gov'),
          ];
        return (
          <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: modeTone }}>
              {mode === 'CRISIS' ? 'Crisis directives' : mode === 'ESCALATION' ? 'Escalation directives' : 'Executive directives'}
            </span>
            <span className="text-[10px] text-ink-muted">·</span>
            {actions}
          </div>
        );
      })()}

      {/* Internal workspace navigation */}
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Workspace sections">
        {TABS.map(t => (
          <button
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            onClick={() => setTab(t.k)}
            style={tab === t.k ? { borderColor: ident.accent, color: 'rgb(var(--c-ink))' } : undefined}
            className={
              'focus-ring border-b-2 px-3 py-2 text-sm transition-colors duration-150 ease-sov ' +
              (tab === t.k
                ? 'font-semibold'
                : 'border-transparent text-ink-soft hover:text-ink')
            }
          >
            <span className="inline-flex items-center gap-1">
              {t.label}
              {crisis && (t.k === 'incidents' || t.k === 'escalations')
                ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: 'rgb(var(--c-alert))' }} />
                : null}
            </span>
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
        <div className="space-y-3">
          <Section title="Regional theatre" meta="institutional deployment · pressure">
            <div className="overflow-hidden rounded-[3px] border border-line-soft">
              <TerritoryHeat epoch={(id.charCodeAt(0) || 7) % 50} height={230} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
              <span>Stable</span>
              <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
              <span>Critical</span>
            </div>
          </Section>
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
        </div>
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

      {(['escalations', 'logistics', 'analytics', 'treasury', 'infrastructure', 'workforce', 'security', 'audit'] as string[]).includes(tab) && (() => {
        const sk = `${id}:${tab}`;
        const MOD: Record<string, { m: string; sub: string }[]> = {
          escalations: [{ m: 'Open escalations', sub: 'tier review' }, { m: 'Mean resolution', sub: 'hours' }, { m: 'Breaching SLA', sub: 'count' }, { m: 'Cabinet-tier', sub: 'level 3' }],
          logistics: [{ m: 'Convoys active', sub: 'in transit' }, { m: 'Corridor load', sub: '% capacity' }, { m: 'Depot stock', sub: 'days' }, { m: 'Delivery SLA', sub: '%' }],
          analytics: [{ m: 'Throughput', sub: '24h' }, { m: 'Backlog', sub: 'items' }, { m: 'Cycle time', sub: 'days' }, { m: 'Forecast load', sub: '+7d' }],
          treasury: [{ m: 'Budget execution', sub: '%' }, { m: 'Commitments', sub: '$M' }, { m: 'Disbursed', sub: '$M' }, { m: 'Variance', sub: 'vs plan' }],
          infrastructure: [{ m: 'Assets operational', sub: '%' }, { m: 'Maintenance due', sub: 'count' }, { m: 'Grid/route load', sub: '%' }, { m: 'Outages', sub: 'active' }],
          workforce: [{ m: 'Establishment', sub: 'filled %' }, { m: 'On duty', sub: 'now' }, { m: 'Vacancies', sub: 'open' }, { m: 'Training', sub: 'in progress' }],
          security: [{ m: 'Threat level', sub: 'posture' }, { m: 'Incidents 24h', sub: 'count' }, { m: 'Clearance backlog', sub: 'cases' }, { m: 'Readiness', sub: '%' }],
          audit: [{ m: 'Findings open', sub: 'count' }, { m: 'Controls passing', sub: '%' }, { m: 'Chain integrity', sub: 'state' }, { m: 'Last review', sub: 'days' }],
        };
        const cards = MOD[tab] ?? [];
        return (
          <Section title={`${TABS.find(t => t.k === tab)?.label} — ${name}`} meta={`${archetype} · ${ident.domain}`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cards.map((c, i) => {
                const v = 20 + Math.round(seed(`${sk}:${c.m}`) * 78);
                const d = Math.round((seed(`${sk}:${c.m}:d`) - 0.45) * 14);
                const tn = v >= 78 ? 'alert' : v >= 58 ? 'warn' : 'ok';
                return (
                  <div key={i} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
                    <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{c.m}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl tabular-nums" style={{ color: TONE[tn] }}>{v}</span>
                      <span className="text-[9px] text-ink-muted">{c.sub}</span>
                      <span className="ml-auto text-[9px]" style={{ color: d >= 0 ? TONE.ok : TONE.alert }}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}</span>
                    </div>
                    <div className="opacity-80"><Spark pts={Array.from({ length: 14 }).map((_, j) => 35 + seed(`${sk}:${c.m}:${j}`) * 55)} tone={tn} /></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2">
              <Card tight>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Institutional subsystems</strong>
                  <span className="text-[10px] text-ink-muted">{subsystemsFor(archetype as ArchetypeKey).length} component classes · national deployment</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                  {subsystemsFor(archetype as ArchetypeKey).map(ss => {
                    const total = Math.max(1, Math.round(ss.scale * (0.85 + seed(`${id}:ss:${ss.name}:n`) * 0.3)));
                    const opPct = subsystemOpPct(id, ss.name);
                    const degraded = Math.round(total * (1 - opPct / 100));
                    const tn = opPct >= 90 ? 'ok' : opPct >= 75 ? 'warn' : 'alert';
                    return (
                      <div key={ss.name} className="rounded-[3px] border border-line bg-surface px-2.5 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
                        <div className="truncate text-[10px] font-medium text-ink">{ss.name}</div>
                        <div className="mt-0.5 flex items-baseline justify-between">
                          <span className="font-mono text-base tabular-nums text-ink">{total.toLocaleString()}</span>
                          <span className="text-[8px] uppercase tracking-wider text-ink-muted">{ss.unit}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full rounded-full" style={{ width: `${opPct}%`, backgroundColor: TONE[tn] }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9px]">
                          <span style={{ color: TONE[tn] }}>{opPct}% operational</span>
                          <span className="text-ink-muted">{degraded ? `${degraded} degraded` : 'all nominal'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              <Card tight>
                <strong className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Operational stream</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const tn = seed(`${sk}:ev:${i}:t`) > 0.8 ? 'alert' : seed(`${sk}:ev:${i}:t`) > 0.55 ? 'warn' : 'ok';
                    return (
                      <li key={i} className="flex items-center gap-2 border-b border-line-soft pb-1 last:border-0">
                        <span className="font-mono text-[10px] tabular-nums text-ink-muted">{String(8 + i).padStart(2, '0')}:{String(10 + i * 7).slice(0, 2)}</span>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[tn] }} />
                        <span className="truncate text-ink-soft">{ident.domain} · {TABS.find(t => t.k === tab)?.label} cycle {regions[i % Math.max(1, regions.length)]?.region ?? 'national'}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card tight>
                <strong className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Regional load</strong>
                <div className="mt-2 space-y-1.5">
                  {(regions.length ? regions.slice(0, 6) : Array.from({ length: 6 }).map((_, i) => ({ region: `Region ${i + 1}`, openCases: 0 }))).map((r, i) => {
                    const p = 20 + Math.round(seed(`${sk}:rl:${r.region}`) * 78);
                    const tn = p >= 78 ? 'alert' : p >= 58 ? 'warn' : 'ok';
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-[11px]"><span className="text-ink-soft">{r.region}</span><span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{p}%</span></div>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${p}%`, backgroundColor: TONE[tn] }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">
              {ident.domain} · {TABS.find(t => t.k === tab)?.label} module. Deterministic operational telemetry; humans hold decision authority. No autonomous action.
            </p>
          </Section>
        );
      })()}
    </div>
  );
}
