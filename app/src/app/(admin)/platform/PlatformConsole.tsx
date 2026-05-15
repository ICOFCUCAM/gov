'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { TextField } from '@/components/ui/Field';
import { api } from '@/lib/api/client';
import type {
  BackupRecord,
  ConfigBundle,
  ConfigDrift,
  Deployment,
  Release,
  TenantLifecycle,
} from '@/lib/api/types';

type Tab = 'releases' | 'deployments' | 'lifecycle' | 'backups' | 'config';

const DEPLOY_ORDER = ['pending', 'precheck', 'rollout', 'verify', 'completed'];

export function PlatformConsole() {
  const [tab, setTab] = React.useState<Tab>('releases');
  const [releases, setReleases] = React.useState<Release[]>([]);
  const [deployments, setDeployments] = React.useState<Deployment[]>([]);
  const [lifecycle, setLifecycle] = React.useState<TenantLifecycle | null>(null);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [configs, setConfigs] = React.useState<ConfigBundle[]>([]);
  const [drift, setDrift] = React.useState<ConfigDrift | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [r, d, l, b, c, df] = await Promise.all([
      api.platform.releases.list(),
      api.platform.deployments.list(),
      api.platform.lifecycle.get(),
      api.platform.backups.list(),
      api.platform.config.list(),
      api.platform.config.drift(),
    ]);
    setReleases(r.releases);
    setDeployments(d.deployments);
    setLifecycle(l.lifecycle);
    setBackups(b.backups);
    setConfigs(c.configs);
    setDrift(df);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function guard(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['releases', 'deployments', 'lifecycle', 'backups', 'config'] as Tab[]).map(t => (
          <Button key={t} variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
            {t[0]!.toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>
      {err ? <p className="text-sm text-alert" role="alert">{err}</p> : null}

      {tab === 'releases' && (
        <>
          <Card tight>
            <h3 className="font-semibold">Cut a release</h3>
            <p className="mb-2 text-sm text-ink-muted">
              Releases start in <strong>DEV</strong>, promote DEV→STAGING→STABLE.
              Promotion to STABLE is the named approval gate.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void guard(() =>
                  api.platform.releases.create({
                    version: String(f.get('version')),
                    notes: String(f.get('notes')),
                  }),
                );
                (e.target as HTMLFormElement).reset();
              }}
            >
              <TextField label="Version (x.y.z)" name="version" required placeholder="1.6.0" />
              <TextField label="Notes" name="notes" required />
              <Button type="submit">Create in DEV</Button>
            </form>
          </Card>
          {releases.map(r => (
            <Card tight key={r.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{r.version}</strong>
                <span className="font-mono text-xs text-ink-muted">{r.id}</span>
              </div>
              <div className="mt-1 text-sm text-ink-muted">{r.notes}</div>
              <div className="mt-2 flex items-center gap-2">
                <Pill tone={r.channel === 'stable' ? 'ok' : 'warn'}>{r.channel}</Pill>
                {r.approvedBy ? <span className="text-xs text-ink-muted">approved by {r.approvedBy}</span> : null}
                {r.channel !== 'stable' ? (
                  <Button onClick={() => guard(() => api.platform.releases.promote(r.id))}>
                    Promote
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === 'deployments' && (
        <>
          <Card tight>
            <h3 className="font-semibold">Start a deployment</h3>
            <p className="mb-2 text-sm text-ink-muted">
              State machine: pending → precheck → rollout → verify → completed.
              A failed gate or operator rollback reverses it.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void guard(() =>
                  api.platform.deployments.start(
                    String(f.get('releaseId')),
                    f.get('strategy') as 'rolling' | 'canary' | 'blue-green',
                  ),
                );
              }}
            >
              <label className="mb-1 block font-medium">Release</label>
              <select name="releaseId" required className="mb-3 min-h-tap w-full rounded-sm border border-line bg-surface p-3">
                {releases.map(r => (
                  <option key={r.id} value={r.id}>{r.version} ({r.channel})</option>
                ))}
              </select>
              <label className="mb-1 block font-medium">Strategy</label>
              <select name="strategy" className="mb-3 min-h-tap w-full rounded-sm border border-line bg-surface p-3">
                <option value="rolling">Rolling</option>
                <option value="canary">Canary</option>
                <option value="blue-green">Blue / green</option>
              </select>
              <Button type="submit">Start</Button>
            </form>
          </Card>
          {deployments.length === 0 ? (
            <p className="text-sm text-ink-muted">No deployments yet.</p>
          ) : deployments.map(d => (
            <Card tight key={d.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{d.releaseVersion} · {d.strategy}</strong>
                <span className="font-mono text-xs text-ink-muted">{d.id}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {DEPLOY_ORDER.map(st => (
                  <span
                    key={st}
                    className={
                      'rounded-sm px-2 py-1 ' +
                      (d.state === st
                        ? 'bg-ink text-surface'
                        : DEPLOY_ORDER.indexOf(d.state) > DEPLOY_ORDER.indexOf(st)
                          ? 'bg-[#e7f1ec] text-ok'
                          : 'bg-surface-2 text-ink-muted')
                    }
                  >
                    {st}
                  </span>
                ))}
                {d.state === 'rolled-back' ? (
                  <Pill tone="alert">rolled-back</Pill>
                ) : null}
              </div>
              {d.state !== 'completed' && d.state !== 'rolled-back' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => guard(() => api.platform.deployments.advance(d.id, 'pass'))}>
                    Advance (gate pass)
                  </Button>
                  <Button variant="secondary" onClick={() => guard(() => api.platform.deployments.advance(d.id, 'fail', 'gate failed'))}>
                    Gate fail
                  </Button>
                  <Button variant="warn" onClick={() => guard(() => api.platform.deployments.rollback(d.id, 'operator decision'))}>
                    Rollback
                  </Button>
                </div>
              ) : null}
              {d.gates.length ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-ink-muted">Gates ({d.gates.length})</summary>
                  <ol className="mt-1 space-y-1 text-sm">
                    {d.gates.map((g, i) => (
                      <li key={i} className="text-ink-soft">
                        <span className="text-ink-muted">{new Date(g.at).toLocaleString()}</span>{' '}
                        — {g.gate}: <strong>{g.result}</strong> by {g.by}
                        {g.note ? ` — ${g.note}` : ''}
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </Card>
          ))}
        </>
      )}

      {tab === 'lifecycle' && lifecycle && (
        <>
          <Card tight>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Tenant: {lifecycle.tenant}</h3>
                <Pill tone={lifecycle.state === 'active' ? 'ok' : lifecycle.state === 'suspended' ? 'warn' : 'alert'}>
                  {lifecycle.state}
                </Pill>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Guarded transitions only: provisioning→active→(suspended↔active)
              →decommissioned, recover from decommissioned→active. No illegal jumps.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['active', 'suspended', 'decommissioned'] as const).map(to => (
                <Button
                  key={to}
                  variant="secondary"
                  onClick={() => guard(() => api.platform.lifecycle.transition(to, `operator: -> ${to}`))}
                >
                  → {to}
                </Button>
              ))}
            </div>
          </Card>
          <Card tight>
            <h4 className="font-semibold">Lifecycle ledger</h4>
            <ol className="mt-2 space-y-1 text-sm">
              {lifecycle.events.map((e, i) => (
                <li key={i} className="text-ink-soft">
                  <span className="text-ink-muted">{new Date(e.at).toLocaleString()}</span>{' '}
                  — {e.from} → <strong>{e.to}</strong> · {e.reason} ({e.actor})
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {tab === 'backups' && (
        <>
          <Card tight>
            <h3 className="font-semibold">Backups</h3>
            <p className="mb-2 text-sm text-ink-muted">
              Encrypted snapshots in the sovereign object store. Only the
              reference + integrity hash is recorded here.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => guard(() => api.platform.backups.create('full'))}>Run full backup</Button>
              <Button variant="secondary" onClick={() => guard(() => api.platform.backups.create('incremental'))}>
                Incremental
              </Button>
            </div>
          </Card>
          {backups.map(b => (
            <Card tight key={b.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{b.kind} backup</strong>
                <span className="font-mono text-xs text-ink-muted">{b.id}</span>
              </div>
              <div className="mt-1 break-all text-sm text-ink-muted">{b.location}</div>
              <div className="mt-2 flex items-center gap-2">
                <Pill tone={b.state === 'completed' ? 'ok' : b.state === 'restoring' ? 'warn' : 'neutral'}>
                  {b.state}
                </Pill>
                {b.encrypted ? <Pill tone="ok">encrypted</Pill> : <Pill tone="alert">UNENCRYPTED</Pill>}
                {b.state === 'completed' ? (
                  <Button variant="secondary" onClick={() => guard(() => api.platform.backups.restore(b.id))}>
                    Restore
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === 'config' && (
        <>
          {drift ? (
            <Plain>
              <strong>Config drift:</strong>{' '}
              {drift.drift ? (
                <span className="text-alert">DRIFT — {drift.reason}</span>
              ) : (
                <span className="text-ok">in sync — {drift.reason}</span>
              )}
            </Plain>
          ) : null}
          <Card tight>
            <h3 className="font-semibold">Publish config / policy</h3>
            <p className="mb-2 text-sm text-ink-muted">
              draft → sign (attested over content hash) → apply (supersedes
              prior). Unsigned config never applies.
            </p>
            <Button onClick={() => guard(() => api.platform.config.publish({ note: 'demo policy', at: Date.now() }))}>
              Publish new draft
            </Button>
          </Card>
          {configs.map(c => (
            <Card tight key={c.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>v{c.version} ({c.scope})</strong>
                <span className="font-mono text-xs text-ink-muted">{c.contentHash}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Pill tone={c.state === 'applied' ? 'ok' : c.state === 'signed' ? 'warn' : 'neutral'}>
                  {c.state}
                </Pill>
                {c.signedBy ? <span className="text-xs text-ink-muted">signed by {c.signedBy}</span> : null}
                {c.state === 'draft' ? (
                  <Button onClick={() => guard(() => api.platform.config.sign(c.id))}>Sign</Button>
                ) : null}
                {c.state === 'signed' ? (
                  <Button onClick={() => guard(() => api.platform.config.apply(c.id))}>Apply</Button>
                ) : null}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
