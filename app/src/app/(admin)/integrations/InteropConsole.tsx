'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { TextField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import type {
  FederationGrant,
  IntegrationClient,
  WebhookSubscription,
} from '@/lib/api/types';

function Secret({ value, label }: { value: string; label: string }) {
  return (
    <Plain>
      <strong>{label} (shown once):</strong>{' '}
      <code className="break-all font-mono text-sm">{value}</code>
      <div className="mt-1 text-sm text-ink-muted">
        Store it now — it is not recoverable.
      </div>
    </Plain>
  );
}

export function InteropConsole() {
  const [tab, setTab] = React.useState<'integrations' | 'federation' | 'webhooks'>('integrations');
  const [ints, setInts] = React.useState<IntegrationClient[]>([]);
  const [grants, setGrants] = React.useState<FederationGrant[]>([]);
  const [hooks, setHooks] = React.useState<WebhookSubscription[]>([]);
  const [secret, setSecret] = React.useState<{ label: string; value: string } | null>(null);
  const [checkResult, setCheckResult] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const [a, b, c] = await Promise.all([
      api.interop.integrations.list(),
      api.interop.federation.grants(),
      api.interop.webhooks.list(),
    ]);
    setInts(a.integrations);
    setGrants(b.grants);
    setHooks(c.webhooks);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function registerIntegration(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api.interop.integrations.register({
        kind: 'integration',
        name: String(f.get('name')),
        ownerOrg: String(f.get('ownerOrg')),
        contact: String(f.get('contact')),
        scopes: String(f.get('scopes')).split(',').map(s => s.trim()).filter(Boolean),
      });
      setSecret({ label: 'API key', value: r.apiKey });
      (e.target as HTMLFormElement).reset();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function proposeGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api.interop.federation.propose({
        toTenant: String(f.get('toTenant')),
        scopes: String(f.get('scopes')).split(',').map(s => s.trim()).filter(Boolean),
        reason: String(f.get('reason')),
      });
      (e.target as HTMLFormElement).reset();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function runCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await api.interop.federation.check(
      String(f.get('to')),
      String(f.get('scope')),
    );
    setCheckResult(`${r.allowed ? 'ALLOW' : 'DENY'} — ${r.reason}`);
  }

  async function subscribeHook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api.interop.webhooks.subscribe({
        topic: String(f.get('topic')),
        url: String(f.get('url')),
      });
      setSecret({ label: 'Webhook signing secret', value: r.signingSecret });
      (e.target as HTMLFormElement).reset();
      await load();
    } finally {
      setBusy(false);
    }
  }

  const pendingInts = ints.filter(i => i.status === 'pending').length;
  const hookFailures = hooks.reduce((a, h) => a + (h.failures ?? 0), 0);
  const io = [
    { l: 'Clients', v: String(ints.length), c: 'rgb(var(--c-ink))' },
    { l: 'Pending approval', v: String(pendingInts), c: pendingInts ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
    { l: 'Federation grants', v: String(grants.length), c: 'rgb(var(--c-ink))' },
    { l: 'Webhooks', v: String(hooks.length), c: 'rgb(var(--c-ink))' },
    { l: 'Delivery failures', v: String(hookFailures), c: hookFailures ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
    { l: 'Posture', v: pendingInts || hookFailures ? 'ATTENTION' : 'NOMINAL', c: pendingInts || hookFailures ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-6">
        {io.map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {(['integrations', 'federation', 'webhooks'] as const).map(t => (
          <Button
            key={t}
            variant={tab === t ? 'primary' : 'secondary'}
            onClick={() => { setTab(t); setSecret(null); }}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {secret ? <Secret label={secret.label} value={secret.value} /> : null}

      {tab === 'integrations' && (
        <>
          <Card tight>
            <h3 className="font-semibold">Register an external system</h3>
            <p className="mb-3 text-sm text-ink-muted">
              Registered systems start <strong>PENDING</strong> and cannot call
              the API until a ministry operator approves them. Scope to the
              minimum capabilities needed.
            </p>
            <form onSubmit={registerIntegration}>
              <TextField label="Name" name="name" required />
              <TextField label="Owner organisation" name="ownerOrg" required />
              <TextField label="Contact" name="contact" required />
              <TextField
                label="Scopes (comma-separated)"
                name="scopes"
                required
                placeholder="permit:read, payment:read"
              />
              <Button type="submit" disabled={busy}>Register</Button>
            </form>
          </Card>
          {ints.length === 0 ? (
            <EmptyState title="No integrations yet" />
          ) : (
            ints.map(i => (
              <Card tight key={i.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{i.name}</strong>
                  <span className="font-mono text-xs text-ink-muted">{i.id}</span>
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {i.ownerOrg} · scopes: {i.scopes.join(', ')} · {i.rateLimitRpm} rpm
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {i.status === 'approved' ? (
                    <Pill tone="ok">Approved</Pill>
                  ) : i.status === 'pending' ? (
                    <Pill tone="warn">Pending</Pill>
                  ) : (
                    <Pill tone="alert">{i.status}</Pill>
                  )}
                  {i.status === 'pending' ? (
                    <Button onClick={async () => { await api.interop.integrations.approve(i.id); await load(); }}>
                      Approve
                    </Button>
                  ) : null}
                  {i.status === 'approved' ? (
                    <Button variant="secondary" onClick={async () => { await api.interop.integrations.revoke(i.id); await load(); }}>
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {tab === 'federation' && (
        <>
          <Plain>
            <strong>Default deny.</strong> A tenant may reach another tenant's
            data only where an approved, unexpired grant with the required
            scope exists. Approval is by the receiving tenant.
          </Plain>
          <Card tight>
            <h3 className="font-semibold">Propose a grant (from this tenant)</h3>
            <form onSubmit={proposeGrant}>
              <TextField label="To tenant" name="toTenant" required placeholder="min-health" />
              <TextField label="Scopes (comma-separated)" name="scopes" required placeholder="permit:read" />
              <TextField label="Reason" name="reason" required />
              <Button type="submit" disabled={busy}>Propose</Button>
            </form>
          </Card>
          <Card tight>
            <h3 className="font-semibold">Test the policy (live)</h3>
            <form onSubmit={runCheck} className="flex flex-wrap items-end gap-2">
              <TextField label="To tenant" name="to" required className="mb-0" />
              <TextField label="Scope" name="scope" required className="mb-0" />
              <Button type="submit">Check access</Button>
            </form>
            {checkResult ? (
              <p className="mt-2 font-mono text-sm">{checkResult}</p>
            ) : null}
          </Card>
          {grants.map(g => (
            <Card tight key={g.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{g.fromTenant} → {g.toTenant}</strong>
                <span className="font-mono text-xs text-ink-muted">{g.id}</span>
              </div>
              <div className="mt-1 text-sm text-ink-muted">
                scopes: {g.scopes.join(', ')} · {g.reason}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {g.status === 'approved' ? (
                  <Pill tone="ok">Approved</Pill>
                ) : g.status === 'proposed' ? (
                  <Pill tone="warn">Proposed</Pill>
                ) : (
                  <Pill tone="alert">Revoked</Pill>
                )}
                {g.status !== 'approved' ? (
                  <Button onClick={async () => { await api.interop.federation.approve(g.id); await load(); }}>
                    Approve
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={async () => { await api.interop.federation.revoke(g.id); await load(); }}>
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === 'webhooks' && (
        <>
          <Card tight>
            <h3 className="font-semibold">Subscribe to events</h3>
            <p className="mb-3 text-sm text-ink-muted">
              Deliveries are HMAC-signed. Verify the signature and reject
              timestamps older than 300s (replay protection).
            </p>
            <form onSubmit={subscribeHook}>
              <TextField label="Topic" name="topic" required placeholder="civicos.permit.decided" />
              <TextField label="URL" name="url" required placeholder="https://…/hooks" />
              <Button type="submit" disabled={busy}>Subscribe</Button>
            </form>
          </Card>
          {hooks.map(w => (
            <Card tight key={w.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{w.topic}</strong>
                <span className="font-mono text-xs text-ink-muted">{w.id}</span>
              </div>
              <div className="mt-1 text-sm text-ink-muted break-all">{w.url}</div>
              <div className="mt-2 flex items-center gap-2">
                {w.status === 'active' ? (
                  <Pill tone="ok">Active</Pill>
                ) : (
                  <Pill tone="warn">{w.status}</Pill>
                )}
                {w.status === 'active' ? (
                  <Button variant="secondary" onClick={async () => { await api.interop.webhooks.pause(w.id); await load(); }}>
                    Pause
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
