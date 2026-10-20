'use client';

// The nation's retention rules for permits and cases (lib/data/retention.ts):
// the rule in force, proposals waiting for a second administrator, and the
// last sweeps. Keep is the default; anonymise and delete apply only after a
// different administrator confirms. Administrators only (/api/platform).

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { TextField, SelectField } from '@/components/ui/Field';
import { api, type RetentionOverview } from '@/lib/api/client';
import { useOfficial } from '@/lib/official';
import { ActingOfficial } from '@/components/ui/ActingOfficial';

const ruleText = (r: { action: string; days?: number; basis?: string }) =>
  r.action === 'keep' ? 'Keep (no deletion)' : `${r.action === 'delete' ? 'Delete' : 'Anonymise'} after ${r.days} days${r.basis ? ` · ${r.basis}` : ''}`;

export function RetentionPanel({ onError }: { onError: (e: string | null) => void }) {
  const [data, setData] = React.useState<RetentionOverview | null>(null);
  const [official, setOfficial] = useOfficial();
  const load = React.useCallback(() => api.platform.retention.get().then(setData).catch(e => onError(e instanceof Error ? e.message : 'Could not load')), [onError]);
  React.useEffect(() => { void load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    onError(null);
    try { await fn(); await load(); } catch (e) { onError(e instanceof Error ? e.message : 'Action failed'); }
  }

  if (!data) return <p className="text-sm text-ink-muted">Loading retention rules…</p>;
  const pending = data.changes.filter(c => c.state === 'proposed');
  const oversight = data.changes.filter(c => c.state === 'awaiting-oversight');
  return (
    <>
      <Card tight>
        <h3 className="font-semibold">Retention of personal data</h3>
        <p className="mb-2 text-sm text-ink-muted">
          Permits and cases are kept unless the nation sets a rule. A rule to anonymise or delete takes effect only
          when a second administrator confirms it; going back to keep applies at once. The hourly sweep applies the
          rules and is recorded in the audit chain with counts only. Unconfirmed email-update requests are removed
          after their link expires, and sign-in lockout counters after 15 minutes, on every installation.
        </p>
        <ul className="space-y-1 text-sm">
          {data.categories.map(c => (
            <li key={c.id}>
              <strong>{c.label}:</strong> {ruleText(data.rules[c.id])}
              {data.rules[c.id].confirmedBy ? <span className="text-ink-muted"> · confirmed by {data.rules[c.id].confirmedBy}</span> : null}
              <div className="text-xs text-ink-muted">{c.applies}</div>
            </li>
          ))}
        </ul>
      </Card>
      <Card tight>
        <h3 className="font-semibold">Propose a rule</h3>
        <div className="mb-2 text-sm"><ActingOfficial name={official} onChange={setOfficial} /></div>
        <form
          onSubmit={e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const form = e.currentTarget;
            void act(() => api.platform.retention.propose({
              category: String(f.get('category')), action: String(f.get('action')),
              days: Number(f.get('days') || 0) || undefined, basis: String(f.get('basis') ?? ''), reason: String(f.get('reason') ?? ''), by: official,
            }).then(() => form.reset()));
          }}
        >
          <SelectField label="Records" name="category">
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </SelectField>
          <SelectField label="Rule" name="action">
            <option value="keep">Keep (no deletion)</option>
            <option value="anonymise">Anonymise after a number of days</option>
            <option value="delete">Delete after a number of days</option>
          </SelectField>
          <TextField label={`Days (${data.minDays}–${data.maxDays}; for anonymise or delete)`} name="days" type="number" min={data.minDays} max={data.maxDays} />
          <TextField label="Legal basis or records schedule (for anonymise or delete)" name="basis" />
          <TextField label="Reason" name="reason" required />
          <Button type="submit">Propose</Button>
        </form>
      </Card>
      {oversight.map(c => (
        <Card tight key={c.id}>
          <p className="text-sm">Shortening the access log ({c.rule.action} after {c.rule.days} days) was confirmed by {c.decidedBy} and now waits for the data-protection authority, which confirms it on the Access log page. Administrators cannot complete it alone.</p>
        </Card>
      ))}
      {pending.map(c => (
        <Card tight key={c.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <strong>{c.category}: {ruleText(c.rule)}</strong>
            <Pill tone="warn">waiting for a second administrator</Pill>
          </div>
          <div className="mt-1 text-sm text-ink-muted">Proposed by {c.proposedBy} · {c.reason}</div>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => void act(() => api.platform.retention.decide(c.id, 'confirm', official))}>Confirm</Button>
            <Button variant="secondary" onClick={() => void act(() => api.platform.retention.decide(c.id, 'withdraw', official))}>Withdraw</Button>
          </div>
        </Card>
      ))}
      <Card tight>
        <h3 className="font-semibold">Recent sweeps</h3>
        {data.runs.length === 0 ? <p className="text-sm text-ink-muted">No sweep has run yet (hourly, /api/cron/retention).</p> : (
          <ul className="space-y-1 text-xs text-ink-muted">
            {data.runs.slice(0, 10).map(r => (
              <li key={r.at}>
                {new Date(r.at).toLocaleString()} · permits {r.permits.anonymised} anonymised, {r.permits.deleted} deleted · cases {r.cases.anonymised} anonymised, {r.cases.deleted} deleted · {r.subscriptions.expired} unconfirmed email-update requests removed · {r.signInFailures.expired} lockout counters expired
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
