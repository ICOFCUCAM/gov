'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  HealthTile,
  MetricStat,
  ThresholdBar,
  SeverityBadge,
} from '@/components/ui/Ops';
import { api } from '@/lib/api/client';
import type { Incident, OpsOverview } from '@/lib/api/types';

const ME = 'W. Chebet (ops)';

export function OpsCenter() {
  const [ov, setOv] = React.useState<OpsOverview | null>(null);
  const [incidents, setIncidents] = React.useState<Incident[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [o, i] = await Promise.all([
      api.ops.overview(),
      api.ops.incidents.list(),
    ]);
    setOv(o);
    setIncidents(i.incidents);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function act(
    id: string,
    fn: 'ack' | 'resolve' | 'escalate',
  ) {
    setBusy(id + fn);
    try {
      const { incident } =
        fn === 'ack'
          ? await api.ops.incidents.ack(id, ME)
          : fn === 'resolve'
            ? await api.ops.incidents.resolve(id, ME)
            : await api.ops.incidents.escalate(id, ME);
      setIncidents(prev =>
        (prev ?? []).map(x => (x.id === incident.id ? incident : x)),
      );
      setOv(await api.ops.overview());
    } finally {
      setBusy(null);
    }
  }

  if (!ov || incidents === null) {
    return <p className="text-ink-muted">Loading operational picture…</p>;
  }

  const s = ov.summary;

  return (
    <div className="space-y-6">
      {/* Headline — calm, four numbers, no noise */}
      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <MetricStat
          label="Services healthy"
          value={`${s.servicesOk}/${s.servicesTotal}`}
          tone={s.servicesOk === s.servicesTotal ? 'ok' : 'warn'}
        />
        <MetricStat
          label="SLA compliance"
          value={`${s.slaCompliancePct}%`}
          tone={s.slaCompliancePct >= 95 ? 'ok' : s.slaCompliancePct >= 80 ? 'warn' : 'alert'}
        />
        <MetricStat
          label="Queues breaching"
          value={String(s.queuesBreaching)}
          tone={s.queuesBreaching === 0 ? 'ok' : 'alert'}
        />
        <MetricStat
          label="Open incidents"
          value={String(s.openIncidents)}
          tone={s.openIncidents === 0 ? 'ok' : 'warn'}
        />
      </section>

      {!s.auditIntact ? (
        <Plain>
          <strong>Audit integrity alert.</strong> The audit chain did not
          verify. This is a sev1-class condition — investigate before trusting
          any downstream report.
        </Plain>
      ) : null}

      {/* Services */}
      <section aria-label="Service health">
        <h2 className="mb-2 text-lg font-semibold">Service health</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ov.services.map(svc => (
            <HealthTile
              key={svc.name}
              label={svc.name}
              status={svc.status}
              metric={svc.latencyMs ? `${svc.latencyMs} ms p95` : undefined}
              detail={svc.detail}
            />
          ))}
        </div>
      </section>

      {/* Queues */}
      <section aria-label="Queue intelligence">
        <h2 className="mb-2 text-lg font-semibold">Queue intelligence</h2>
        <div className="space-y-2">
          {ov.queues.map(q => (
            <Card tight key={q.name}>
              <div className="flex items-baseline justify-between gap-2">
                <strong>{q.name}</strong>
                <span className="text-sm text-ink-muted">
                  {q.depth} item{q.depth === 1 ? '' : 's'}
                  {q.oldestAgeHours
                    ? ` · oldest ${q.oldestAgeHours}h`
                    : ''}
                </span>
              </div>
              {q.slaHours > 0 ? (
                <div className="mt-2">
                  <ThresholdBar
                    value={q.oldestAgeHours}
                    threshold={q.slaHours}
                    breaching={q.breaching}
                  />
                  <div className="mt-1 text-xs text-ink-muted">
                    SLA {Math.round(q.slaHours / 24)}d ·{' '}
                    {q.breaching ? (
                      <span className="text-alert">breaching — intervene</span>
                    ) : (
                      <span className="text-ok">within SLA</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-xs text-ink-muted">
                  {q.breaching ? (
                    <span className="text-alert">overdue items present</span>
                  ) : (
                    'no SLA breach'
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Municipality health */}
      <section aria-label="Municipality health">
        <h2 className="mb-2 text-lg font-semibold">Municipality health</h2>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="p-3">Municipality</th>
                <th className="p-3">Status</th>
                <th className="p-3">Open permits</th>
                <th className="p-3">SLA breaches</th>
                <th className="p-3">Last edge sync</th>
              </tr>
            </thead>
            <tbody>
              {ov.tenants.map(t => (
                <tr key={t.municipality} className="border-t border-line">
                  <td className="p-3">{t.municipality}</td>
                  <td className="p-3">
                    {t.status === 'ok' ? (
                      <Pill tone="ok">OK</Pill>
                    ) : t.status === 'degraded' ? (
                      <Pill tone="warn">Degraded</Pill>
                    ) : (
                      <Pill tone="alert">Down</Pill>
                    )}
                  </td>
                  <td className="p-3">{t.openPermits}</td>
                  <td className="p-3">
                    {t.slaBreaches > 0 ? (
                      <span className="text-alert">{t.slaBreaches}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="p-3">
                    {t.lastSyncMinutes > 120 ? (
                      <span className="text-alert">
                        {t.lastSyncMinutes} min ago
                      </span>
                    ) : (
                      `${t.lastSyncMinutes} min ago`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Incidents */}
      <section aria-label="Incidents">
        <h2 className="mb-2 text-lg font-semibold">Incidents</h2>
        {incidents.length === 0 ? (
          <EmptyState title="No incidents" hint="The ecosystem is calm." />
        ) : (
          <div className="space-y-2">
            {incidents.map(inc => (
              <Card tight key={inc.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={inc.severity} />
                    <strong>{inc.title}</strong>
                  </div>
                  <span className="font-mono text-xs text-ink-muted">
                    {inc.id} · {inc.scope}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {inc.status === 'open' && <Pill tone="alert">Open</Pill>}
                  {inc.status === 'acknowledged' && (
                    <Pill tone="warn">Acknowledged</Pill>
                  )}
                  {inc.status === 'resolved' && <Pill tone="ok">Resolved</Pill>}
                  {inc.owner ? ` · owner ${inc.owner}` : ''} · opened{' '}
                  {new Date(inc.openedAt).toLocaleString()}
                </div>
                {inc.status !== 'resolved' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inc.status === 'open' ? (
                      <Button
                        onClick={() => act(inc.id, 'ack')}
                        disabled={busy === inc.id + 'ack'}
                      >
                        Acknowledge
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => act(inc.id, 'escalate')}
                      disabled={busy === inc.id + 'escalate'}
                    >
                      Escalate
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => act(inc.id, 'resolve')}
                      disabled={busy === inc.id + 'resolve'}
                    >
                      Resolve
                    </Button>
                  </div>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-ink-muted">
                    Timeline ({inc.events.length})
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm">
                    {inc.events.map((e, i) => (
                      <li key={i} className="text-ink-soft">
                        <span className="text-ink-muted">
                          {new Date(e.at).toLocaleString()}
                        </span>{' '}
                        — {e.by} {e.action}
                        {e.note ? `: ${e.note}` : ''}
                      </li>
                    ))}
                  </ol>
                </details>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-ink-muted">
        Generated {new Date(ov.generatedAt).toLocaleString()}. AI may summarise
        and prioritise; humans acknowledge, escalate, and resolve. No citizen
        records appear in any operational metric.
      </p>
    </div>
  );
}
