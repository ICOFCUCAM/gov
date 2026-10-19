'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { TextField } from '@/components/ui/Field';
import { api } from '@/lib/api/client';
import { RetentionPanel } from './RetentionPanel';
import type {
  BackupView,
  BackupStatusView,
  ConfigBundle,
  ConfigDrift,
  Deployment,
  Release,
  TenantLifecycle,
} from '@/lib/api/types';

type Tab = 'releases' | 'deployments' | 'lifecycle' | 'backups' | 'config' | 'retention';

const DEPLOY_ORDER = ['pending', 'precheck', 'rollout', 'verify', 'completed'];

export function PlatformConsole() {
  const [tab, setTab] = React.useState<Tab>('releases');
  const [releases, setReleases] = React.useState<Release[]>([]);
  const [deployments, setDeployments] = React.useState<Deployment[]>([]);
  const [lifecycle, setLifecycle] = React.useState<TenantLifecycle | null>(null);
  const [backups, setBackups] = React.useState<BackupView[]>([]);
  const [backupStatus, setBackupStatus] = React.useState<BackupStatusView | null>(null);
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
    setBackupStatus(b.status);
    setConfigs(c.configs);
    setDrift(df);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function guard(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }

  const stable = [...releases].reverse().find(r => r.channel === 'stable');
  const hasDrift = drift?.drift ?? false;
  const plat = [
    { l: 'Releases', v: String(releases.length), c: 'rgb(var(--c-ink))' },
    { l: 'Stable', v: stable?.version ?? '—', c: 'rgb(var(--c-ok))' },
    { l: 'Deployments', v: String(deployments.length), c: 'rgb(var(--c-ink))' },
    { l: 'Backups', v: String(backups.length), c: backups.length ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' },
    { l: 'Config drift', v: hasDrift ? 'DETECTED' : 'NONE', c: hasDrift ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
    { l: 'Posture', v: hasDrift ? 'REVIEW' : 'STABLE', c: hasDrift ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-6">
        {plat.map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(['releases', 'deployments', 'lifecycle', 'backups', 'config', 'retention'] as Tab[]).map(t => (
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
          <BackupsPanel backups={backups} status={backupStatus} guard={guard} />
        </>
      )}

      {tab === 'retention' && <RetentionPanel onError={setErr} />}

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

/**
 * Backups (lib/data/backups.ts): real, encrypted backups at the configured
 * target, each verified by reading it back and a dry-run restore. A restore
 * is proposed by an administrator, who sees what will be lost, and confirmed
 * by a second, different official; the current state is backed up first.
 */
function BackupsPanel({ backups, status, guard }: { backups: BackupView[]; status: BackupStatusView | null; guard: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [by, setBy] = React.useState('');
  const [open, setOpen] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [ack, setAck] = React.useState(false);
  const who = by.trim() || undefined;
  const target = status && 'kind' in status.target ? `${status.target.kind === 'dir' ? 'Local directory' : 'Object storage'}` : status ? `Not available: ${(status.target as { error: string }).error}` : '…';

  async function preview(id: string) {
    setOpen(id); setAck(false); setWarning(null);
    await guard(async () => { const p = await api.platform.backups.preview(id); setWarning(p.warning.text); });
  }

  return (
    <>
      <Card tight>
        <h3 className="font-semibold">Backups</h3>
        <p className="mb-2 text-sm text-ink-muted">
          Each backup is the platform&apos;s whole state at one moment, encrypted under the nation&apos;s key
          and checked by reading it back and restoring it into a scratch copy. A restore needs an
          administrator and a second official.
        </p>
        {status ? (
          <ul className="mb-3 grid gap-1 text-sm text-ink-muted">
            <li>Kept in: {target} · key: {status.key.ready ? status.key.provider : 'not configured: backups are refused'}</li>
            <li>
              Recovery point target {status.policy.rpoMinutes} min ·{' '}
              <Pill tone={status.rpo.met ? 'ok' : 'warn'}>{status.rpo.met ? `met (newest verified ${status.rpo.ageMinutes} min ago)` : 'not met'}</Pill>
              {' '}· recovery time target {status.rtoMinutes} min
            </li>
            <li>Keeps the newest of the last {status.policy.daily} days, {status.policy.weekly} weeks and {status.policy.monthly} months; a backup every {status.policy.intervalMinutes} min</li>
          </ul>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <TextField label="Your name and office" name="backup-by" value={by} onChange={e => setBy(e.target.value)} />
          <Button onClick={() => guard(() => api.platform.backups.create('full', who))}>Run full backup</Button>
          <Button variant="secondary" onClick={() => guard(() => api.platform.backups.create('incremental', who))}>
            Incremental
          </Button>
          <Button variant="secondary" onClick={() => guard(() => api.platform.backups.retention(who))}>Apply retention</Button>
        </div>
      </Card>
      {status?.proposals.map(p => (
        <Card tight key={p.id}>
          <strong>Restore of {p.backupId} proposed by {p.by}</strong>
          <p className="mt-1 text-sm text-ink-muted">{p.warning.text}</p>
          <p className="mt-1 text-xs text-ink-muted">A second, different official confirms it before {new Date(p.expiresAt).toLocaleTimeString()}.</p>
        </Card>
      ))}
      {backups.length === 0 ? <Card tight><p className="text-sm text-ink-muted">No backups yet.</p></Card> : null}
      {backups.map(b => {
        const pending = status?.proposals.find(p => p.backupId === b.id);
        return (
          <Card tight key={b.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{b.kind} backup{b.reason ? ` · ${b.reason}` : ''}</strong>
              <span className="font-mono text-xs text-ink-muted">{b.id}</span>
            </div>
            <div className="mt-1 break-all text-sm text-ink-muted">{b.location} · {new Date(b.createdAt).toLocaleString()}{b.createdBy ? ` · ${b.createdBy}` : ''}{b.audit ? ` · audit chain to entry ${b.audit.seq}` : ''}</div>
            {b.verification && !b.verification.ok ? <p className="mt-1 text-sm text-ink-muted">Verification failed: {b.verification.problem}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={b.state === 'completed' ? 'ok' : b.state === 'failed' ? 'alert' : b.state === 'restoring' ? 'warn' : 'neutral'}>
                {b.state === 'completed' ? 'verified' : b.state === 'pending' ? 'not verified yet' : b.state}
              </Pill>
              {b.encrypted ? <Pill tone="ok">encrypted</Pill> : <Pill tone="alert">UNENCRYPTED</Pill>}
              <Button variant="secondary" onClick={() => guard(() => api.platform.backups.verify(b.id, who))}>Verify</Button>
              {b.state === 'completed' ? (
                <Button variant="secondary" onClick={() => void preview(b.id)}>
                  {pending ? 'Confirm restore' : 'Restore'}
                </Button>
              ) : null}
              {pending ? <Button variant="secondary" onClick={() => guard(() => api.platform.backups.cancel(b.id, who))}>Cancel proposal</Button> : null}
            </div>
            {open === b.id && warning ? (
              <div className="mt-3 grid gap-2 text-sm">
                <p>{warning}</p>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
                  <span>I understand that everything recorded after this backup is lost from the running platform.</span>
                </label>
                <div>
                  <Button disabled={!ack} onClick={() => guard(async () => { await api.platform.backups.restore(b.id, { by: who, acknowledgeLoss: true }); setOpen(null); })}>
                    {pending ? 'Confirm restore (second official)' : 'Propose restore'}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}
