'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Section, EnterpriseTable, StatusText, type Column } from '@/components/ui/DataSystem';
import { RegionMatrix } from '@/components/ui/Viz';
import { api } from '@/lib/api/client';
import type { NationalCoordination as NC, CoordinationEdge, OpsTimelineEvent } from '@/lib/api/types';

const REFRESH_MS = 15_000;

function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const KIND_LABEL: Record<OpsTimelineEvent['kind'], string> = {
  incident: 'INCIDENT',
  escalation: 'ESCALATION',
  sla: 'SLA',
  sovereign: 'SOVEREIGN',
  audit: 'AUDIT',
};

/**
 * National Coordination Intelligence (Phase 2A) — a read-only command
 * surface that makes cross-ministry dependency, cascade risk and the
 * national operations tempo legible so humans coordinate. No autonomous
 * action and no forecasting: every figure is derived from current real
 * operational state and refreshes live.
 */
export function NationalCoordination() {
  const [d, setD] = React.useState<NC | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [fetchedAt, setFetchedAt] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const r = await api.cabinet.coordination();
      setD(r);
      setFetchedAt(Date.now());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Coordination fabric unavailable');
    }
  }, []);

  React.useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  if (err && !d) return <p className="text-sm text-alert" role="alert">{err}</p>;
  if (!d) return <p className="text-ink-muted">Assembling national coordination fabric…</p>;

  const p = d.posture;
  const clock = new Date(now);

  const edgeCols: Column<CoordinationEdge & { id: string }>[] = [
    { key: 'f', header: 'Source', filter: e => e.from, sort: (a, b) => a.from.localeCompare(b.from), render: e => <strong>{e.from}</strong> },
    { key: 'rel', header: 'Relation', filter: e => e.relation, sort: (a, b) => a.relation.localeCompare(b.relation), render: e => <span className="text-ink-muted">{e.relation}</span> },
    { key: 't', header: 'Dependent', filter: e => e.to, sort: (a, b) => a.to.localeCompare(b.to), render: e => e.to },
    { key: 'pr', header: 'Cascade risk', align: 'right', sort: (a, b) => a.propagatedRisk - b.propagatedRisk, render: e => {
        const c = e.propagatedRisk >= 67 ? '#b22e28' : e.propagatedRisk >= 34 ? '#9a6e00' : '#227c4d';
        return (
          <span className="inline-flex w-28 items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full" style={{ width: `${e.propagatedRisk}%`, backgroundColor: c }} />
            </span>
            <span className="w-7 text-right tabular-nums" style={{ color: e.propagatedRisk >= 67 ? c : undefined }}>{e.propagatedRisk}</span>
          </span>
        );
      } },
  ];

  return (
    <div className="space-y-5">
      {/* National posture command bar */}
      <div className="rounded-sm border border-line bg-[#0f141b] p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <Link href="/gov" className="text-xs text-[#8b95a3] underline underline-offset-2">← Cabinet</Link>
            <h1 className="text-xl font-semibold tracking-tight">National Coordination Intelligence</h1>
            <span className="flex items-center gap-1.5 text-xs text-[#8b95a3]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#3fbf7f]" />
              LIVE · {clock.toLocaleTimeString()} · updated {rel(new Date(fetchedAt).toISOString(), now)}
            </span>
          </div>
          <span
            className="rounded-sm px-3 py-1 text-sm font-semibold tracking-widest"
            style={{
              backgroundColor: p.level === 'alert' ? '#3a1f1f' : p.level === 'warn' ? '#3a2f1a' : '#1d3a2c',
              color: p.level === 'alert' ? '#f3b4b0' : p.level === 'warn' ? '#e6cd95' : '#9fe0c0',
            }}
          >
            {p.label}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { l: 'National risk index', v: `${p.nationalRisk}`, sub: '/ 100' },
            { l: 'Coordinating institutions', v: `${p.coordinatingMinistries}`, sub: 'active' },
            { l: 'Cascade exposures', v: `${p.cascadeRisks}`, sub: 'dependencies ≥ 50' },
            { l: 'Pinned incidents', v: `${d.pinnedIncidents.length}`, sub: 'sev1 / sev2' },
          ].map(s => (
            <div key={s.l}>
              <div className="text-[10px] uppercase tracking-widest text-[#6c7682]">{s.l}</div>
              <div className="font-serif text-3xl tabular-nums">{s.v}<span className="ml-1 text-xs text-[#6c7682]">{s.sub}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr,1fr]">
        <div className="space-y-5">
          <Section title="Strategic risk overlay" meta="tile shade ∝ composite risk">
            <RegionMatrix
              cells={d.nodes.map(n => ({
                label: n.ministry,
                tone: n.posture,
                intensity: n.riskScore,
                value: String(n.riskScore),
              }))}
            />
          </Section>

          <Section title="Cross-ministry dependency engine" meta={`${d.edges.length} dependencies · ${p.cascadeRisks} elevated`}>
            <EnterpriseTable
              columns={edgeCols}
              rows={d.edges.map((e, i) => ({ ...e, id: `${e.fromId}-${e.toId}-${i}` }))}
              rowKey={e => e.id}
              search
              searchPlaceholder="Filter dependencies…"
              initialSort={{ key: 'pr', dir: 'desc' }}
              empty="No active cross-ministry dependencies."
              expand={e => (
                <div className="text-sm text-ink-muted">
                  <strong className="text-ink">{e.from}</strong> {e.relation} <strong className="text-ink">{e.to}</strong>.
                  Disruption at {e.from} transmits an estimated <strong className="text-ink">{e.propagatedRisk}/100</strong> operational
                  load to {e.to}. Coordination is advisory — escalation and
                  mitigation remain with the named institutional authorities.
                </div>
              )}
            />
          </Section>

          <Section title="Institutional risk register" meta={`${d.nodes.length} institutions`}>
            <EnterpriseTable
              columns={[
                { key: 'm', header: 'Institution', filter: n => n.ministry, sort: (a, b) => a.ministry.localeCompare(b.ministry), render: n => (
                    <Link href={`/gov/ministry/${n.ministryId}`} className="font-medium text-link underline underline-offset-2">{n.ministry}</Link>
                  ) },
                { key: 'r', header: 'Risk', align: 'right', sort: (a, b) => a.riskScore - b.riskScore, render: n => (
                    <StatusText tone={n.posture}>{n.riskScore}</StatusText>
                  ) },
                { key: 'i', header: 'Active incidents', align: 'right', sort: (a, b) => a.activeIncidents - b.activeIncidents, render: n => n.activeIncidents },
                { key: 's', header: 'Top severity', filter: n => n.topSeverity ?? '', render: n => n.topSeverity ? <Pill tone={n.topSeverity === 'sev1' || n.topSeverity === 'sev2' ? 'alert' : 'warn'}>{n.topSeverity.toUpperCase()}</Pill> : <span className="text-ink-muted">—</span> },
                { key: 'q', header: 'Queue', align: 'right', sort: (a, b) => a.queueDepth - b.queueDepth, render: n => n.slaBreaching ? <StatusText tone="warn">{n.queueDepth}</StatusText> : n.queueDepth },
              ]}
              rows={d.nodes.map(n => ({ ...n, id: n.ministryId }))}
              rowKey={n => n.ministryId}
              search
              searchPlaceholder="Filter institutions…"
              initialSort={{ key: 'r', dir: 'desc' }}
            />
          </Section>
        </div>

        {/* Side inspector: live tempo + pinned */}
        <div className="space-y-5">
          <Section title="National operations timeline" meta="live tempo">
            <div className="max-h-[28rem] space-y-0 overflow-y-auto rounded-sm border border-line">
              {d.timeline.length === 0 ? (
                <p className="p-4 text-sm text-ink-muted">No recorded operational activity.</p>
              ) : (
                d.timeline.map((ev, i) => (
                  <div key={i} className="flex gap-3 border-b border-line-soft px-3 py-2 last:border-b-0">
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.tone === 'alert' ? '#b22e28' : ev.tone === 'warn' ? '#9a6e00' : ev.tone === 'ok' ? '#227c4d' : '#5a636e' }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{ev.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-ink-muted">{rel(ev.at, now)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="rounded-xs bg-surface-2 px-1 py-0.5 text-[10px] font-semibold tracking-wide">{KIND_LABEL[ev.kind]}</span>
                        <span className="truncate">{ev.detail}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Pinned incidents" meta={`${d.pinnedIncidents.length} cross-cutting`}>
            <div className="space-y-2">
              {d.pinnedIncidents.length === 0 ? (
                <p className="text-sm text-ink-muted">No sev1/sev2 incidents in national scope.</p>
              ) : (
                d.pinnedIncidents.map((pi, i) => (
                  <Card tight key={i}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill tone="alert">{pi.severity.toUpperCase()}</Pill>
                          <Link href={`/gov/ministry/${pi.ministryId}`} className="truncate font-medium text-link underline underline-offset-2">{pi.ministry}</Link>
                        </div>
                        <div className="mt-1 text-sm">{pi.label}</div>
                        <div className="mt-1 text-xs text-ink-muted">Authority: <strong>{pi.authority}</strong></div>
                        {pi.affects.length > 0 ? (
                          <div className="mt-1 text-xs text-ink-muted">
                            Cascade scope: {pi.affects.join(' · ')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Section>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Coordination intelligence is read-only and advisory. The platform
        surfaces dependency and tempo; humans hold escalation, mitigation
        and decision authority. No forecasting, no autonomous action.
      </p>
    </div>
  );
}
