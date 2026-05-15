import Link from 'next/link';
import { CommandShell } from '@/components/ui/CommandShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricStat, ThresholdBar, SeverityBadge } from '@/components/ui/Ops';
import { listMinistries, ministryOperations } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

// Service health is CONFIG-DRIVEN, not a hardcoded single ministry. It
// renders whatever institutions exist in the tenant: each ministry's name,
// departments, and enabled modules come from the institutional framework.
export default function MinistryControlPage({
  searchParams,
}: {
  searchParams: { ministry?: string };
}) {
  const ministries = listMinistries().filter(m => m.status !== 'merged');
  const selected =
    ministries.find(m => m.slug === searchParams.ministry) ??
    ministries.find(m => m.status === 'active') ??
    ministries[0] ??
    null;

  return (
    <CommandShell active="ctl">
      <h1 className="mb-1 text-2xl font-semibold">Service health</h1>
      <p className="mb-4 text-ink-muted">
        Operational view per institution. The structure below is composed from
        the institutional framework, not hardcoded.
      </p>

      {ministries.length === 0 ? (
        <EmptyState
          title="No institutions configured"
          hint="Compose a ministry, agency, or commission from an archetype first."
          action={<Link href="/ministries" className="text-link underline underline-offset-2">Go to Institutions →</Link>}
        />
      ) : (
        <div className="space-y-4">
          <Card tight>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-muted">Institution:</span>
              {ministries.map(m => (
                <Link
                  key={m.id}
                  href={`/control?ministry=${m.slug}`}
                  className={
                    'rounded-sm border px-3 py-1 text-sm no-underline ' +
                    (selected && m.id === selected.id
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line text-ink hover:bg-surface-2')
                  }
                >
                  {m.name}
                </Link>
              ))}
            </div>
          </Card>

          {selected ? (
            <>
              <Card tight>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <Pill tone={selected.status === 'active' ? 'ok' : 'warn'}>{selected.status}</Pill>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Archetype {selected.archetype} · {selected.departments.length} departments ·{' '}
                  {selected.modules.filter(m => m.enabled).length} active modules
                </p>
              </Card>

              {(() => {
                const ops = ministryOperations(selected.id);
                if ('error' in ops) return null;
                const activeAlerts = ops.modules.flatMap(m =>
                  m.alerts.filter(a => a.active).map(a => ({ m: m.title, a })),
                );
                const breaching = ops.modules.flatMap(m =>
                  m.queues.filter(q => q.breaching),
                ).length;
                return (
                  <div className="space-y-4">
                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <MetricStat label="Active modules" value={String(ops.modules.length)} tone="neutral" />
                      <MetricStat label="Queues breaching SLA" value={String(breaching)} tone={breaching === 0 ? 'ok' : 'alert'} />
                      <MetricStat label="Active alerts" value={String(activeAlerts.length)} tone={activeAlerts.length === 0 ? 'ok' : 'warn'} />
                      <MetricStat label="Departments" value={String(selected.departments.length)} tone="neutral" />
                    </section>

                    {activeAlerts.length > 0 ? (
                      <Card tight>
                        <h3 className="font-semibold">Operational alerts</h3>
                        <ul className="mt-2 space-y-2">
                          {activeAlerts.map(({ m, a }, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <SeverityBadge severity={a.severity} />
                              <span>
                                <strong>{a.label}</strong> · {m}
                                <div className="text-ink-muted">{a.detail}</div>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ) : null}

                    <section aria-label="Module operations" className="space-y-3" data-bw-hide-empty>
                      <h3 className="font-semibold">Operational dashboards</h3>
                      {ops.modules.map(mod => (
                        <Card tight key={mod.module}>
                          <div className="flex items-baseline justify-between gap-2">
                            <strong>{mod.title}</strong>
                            <span className="font-mono text-xs text-ink-muted">{mod.module}</span>
                          </div>
                          {mod.kpis.length > 0 ? (
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {mod.kpis.map(k => (
                                <div key={k.label} className="rounded-sm border border-line p-2">
                                  <div className="text-xs text-ink-muted">{k.label}</div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-serif text-lg">{k.value}</span>
                                    <Pill tone={k.tone}>{k.tone}</Pill>
                                  </div>
                                  {k.target ? (
                                    <div className="text-xs text-ink-muted">target {k.target}</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {mod.queues.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {mod.queues.map(q => (
                                <div key={q.label}>
                                  <div className="flex justify-between text-sm">
                                    <span>{q.label}</span>
                                    <span className="text-ink-muted">
                                      {q.depth} · oldest {q.oldestAgeHours}h / SLA {Math.round(q.slaHours / 24)}d
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <ThresholdBar value={q.oldestAgeHours} threshold={q.slaHours} breaching={q.breaching} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </Card>
                      ))}
                    </section>
                  </div>
                );
              })()}

              <div className="grid gap-4 md:grid-cols-2">
                <Card tight>
                  <h3 className="font-semibold">Departments</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selected.departments.map(d => <li key={d.id}>{d.name}</li>)}
                    {selected.departments.length === 0 ? <li className="text-ink-muted">None configured.</li> : null}
                  </ul>
                </Card>
                <Card tight>
                  <h3 className="font-semibold">Active operational modules</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.modules.filter(m => m.enabled).map(m => (
                      <Pill key={m.moduleKey} tone="ok">{m.moduleKey}</Pill>
                    ))}
                    {selected.modules.filter(m => m.enabled).length === 0 ? (
                      <span className="text-sm text-ink-muted">No modules enabled.</span>
                    ) : null}
                  </div>
                  {selected.modules.some(m => !m.enabled) ? (
                    <div className="mt-3">
                      <div className="text-sm text-ink-muted">Disabled:</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selected.modules.filter(m => !m.enabled).map(m => (
                          <Pill key={m.moduleKey}>{m.moduleKey}</Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              </div>

              <Plain>
                Shared sovereign core is inherited by every institution:
                identity, audit, RBAC, observability, workflows, notifications,
                interoperability, documents, payments. Configure structure in{' '}
                <Link href="/ministries" className="text-link underline underline-offset-2">Institutions</Link>.
              </Plain>

              <p className="text-sm text-ink-muted">
                What this view never shows: individual citizen records, officer
                click data, political affiliations. Per Companions 156 and 158.
              </p>
            </>
          ) : null}
        </div>
      )}
    </CommandShell>
  );
}
