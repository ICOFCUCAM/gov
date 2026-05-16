'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { TextField, CheckRow } from '@/components/ui/Field';
import { api } from '@/lib/api/client';
import type { MunicipalityOnboardingResult } from '@/lib/api/types';

export function OnboardingWizard() {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<MunicipalityOnboardingResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const { result } = await api.municipalities.onboard({
        name: String(f.get('name')),
        country: String(f.get('country')),
        adminContact: String(f.get('adminContact')),
        population: Number(f.get('population') || 0),
        officialLanguages: String(f.get('languages') || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        inclusionFloor: {
          ussd: f.get('ussd') === 'on',
          ivr: f.get('ivr') === 'on',
          agentNetwork: f.get('agent') === 'on',
          walkIn: f.get('walkin') === 'on',
        },
        modules: f.getAll('modules').map(String),
        constitutionalOfficerSignoff: f.get('signoff') === 'on',
      });
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">{result.name}</h2>
          {result.status === 'provisioned' ? (
            <Pill tone="ok">Provisioned</Pill>
          ) : (
            <Pill tone="alert">Blocked</Pill>
          )}
        </div>

        <ul className="space-y-2">
          {result.checks.map(c => (
            <li
              key={c.label}
              className="flex items-start gap-2 p-3 border border-line rounded-sm"
            >
              <span className={c.passed ? 'text-ok' : 'text-alert'}>
                {c.passed ? '✓' : '✗'}
              </span>
              <span>
                <strong>{c.label}</strong>
                {c.detail ? (
                  <div className="text-sm text-ink-muted">{c.detail}</div>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        {result.status === 'provisioned' ? (
          <Plain>
            Provisioned. Estimated go-live: {result.goLiveEstimateDays} days.
            Next: load local services, train officers, run the inclusion-floor
            check in the field.
          </Plain>
        ) : (
          <Plain>
            Blocked. Resolve the failing checks above and submit again. The
            inclusion floor and constitutional officer signoff are not optional.
          </Plain>
        )}

        <Button className="mt-4" variant="secondary" onClick={() => setResult(null)}>
          Start over
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-6">
        {[
          { l: 'Tenant model', v: 'ISOLATED', c: 'rgb(var(--c-ok))' },
          { l: 'Provisioning', v: 'PHASE 1', c: 'rgb(var(--c-ink))' },
          { l: 'Inclusion floor', v: 'ENFORCED', c: 'rgb(var(--c-ok))' },
          { l: 'Sovereign core', v: 'INHERITED', c: 'rgb(var(--c-ok))' },
          { l: 'Governance', v: 'NAMED', c: 'rgb(var(--c-ok))' },
          { l: 'Status', v: 'READY', c: 'rgb(var(--c-ok))' },
        ].map(m => (
          <div key={m.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{m.l}</span>
            <span className="font-mono font-semibold tabular-nums" style={{ color: m.c }}>{m.v}</span>
          </div>
        ))}
      </div>
      <Card>
        <h2 className="text-lg font-semibold mb-3">Municipality details</h2>
        <TextField label="Municipality name" name="name" required placeholder="e.g. Kiambu" />
        <TextField label="Country" name="country" required placeholder="e.g. Kenya" />
        <TextField label="Admin contact" name="adminContact" required placeholder="name@municipality.gov" />
        <TextField label="Population" name="population" type="number" placeholder="e.g. 240000" />
        <TextField
          label="Official languages (comma-separated)"
          name="languages"
          required
          placeholder="Kiswahili, English, Kikuyu"
          help="Multilingual is structural (Companion 148)."
        />
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold mb-1">Inclusion floor</h2>
        <p className="text-sm text-ink-muted mb-3">
          All four channels are required before go-live (Companion 67).
        </p>
        <div className="space-y-2">
          <CheckRow label="USSD (*civic#)" name="ussd" defaultChecked />
          <CheckRow label="IVR (voice)" name="ivr" defaultChecked />
          <CheckRow label="Agent network" name="agent" defaultChecked />
          <CheckRow label="Walk-in counters" name="walkin" defaultChecked />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold mb-1">Phase 1 modules</h2>
        <div className="space-y-2">
          <CheckRow label="Permits" name="modules" value="permits" defaultChecked />
          <CheckRow label="Payments (CivicPay)" name="modules" value="payments" defaultChecked />
          <CheckRow label="Document verification" name="modules" value="documents" defaultChecked />
          <CheckRow label="Notifications" name="modules" value="notifications" defaultChecked />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold mb-1">Governance</h2>
        <div className="space-y-2">
          <CheckRow
            label="Constitutional officer signoff obtained"
            name="signoff"
          />
        </div>
        <p className="text-sm text-ink-muted mt-2">
          Required for any citizen-affecting deployment (Companion 28). Leave
          unchecked to see the blocked state.
        </p>
      </Card>

      {error ? (
        <p className="text-alert text-sm mt-3" role="alert">{error}</p>
      ) : null}

      <div className="mt-4">
        <Button type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Run checks and provision'}
        </Button>
      </div>
    </form>
  );
}
