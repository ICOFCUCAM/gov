'use client';

// Working a case beside its procedure's steps (POST /api/cases/[id], the
// engine's assign, hold, release and refer): take the case, hold it with a
// reason, release the hold, or refer it to another institution's procedure.
// Each is an authorised, audited step under the case rules (caseActRefusal());
// a refusal is shown as it comes back.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Official { sub: string; name: string; institution?: string }
interface Pkg { key: string; version: number; title: string; state: string; activeFrom?: string }

export function CaseControls({ caseId, assignee, held, busy, run }: {
  caseId: string; assignee?: { id?: string; name: string }; held: boolean; busy: boolean;
  run: (body: unknown, done: string) => Promise<void>;
}) {
  const [me, setMe] = React.useState<Official | null>(null);
  const [procs, setProcs] = React.useState<Pkg[]>([]);
  const [holdReason, setHoldReason] = React.useState('');
  const [referTo, setReferTo] = React.useState('');
  const [referWhy, setReferWhy] = React.useState('');

  React.useEffect(() => {
    fetch('/api/auth/official', { cache: 'no-store' }).then(r => r.json()).then(j => setMe(j.official ?? null)).catch(() => setMe(null));
    const today = new Date().toISOString().slice(0, 10);
    fetch('/api/case-packages', { cache: 'no-store' }).then(r => r.json()).then(j => {
      const ok = ((j.packages ?? []) as Pkg[]).filter(p => p.state === 'approved' && (!p.activeFrom || p.activeFrom <= today));
      setProcs([...new Map(ok.map(p => [p.key, p])).values()].sort((a, b) => a.title.localeCompare(b.title)));
    }).catch(() => setProcs([]));
  }, [caseId]);

  const mine = !!me && assignee?.id === me.sub;
  const input = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
  return (
    <Section title="Work the case" meta={assignee ? `assigned to ${assignee.name}` : 'not assigned'}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 text-sm">
          <p className="font-medium">Assignment</p>
          {me ? (
            <Button variant="secondary" disabled={busy || mine} onClick={() => run({ op: 'assign', assigneeId: me.sub, assigneeName: me.name }, 'Assigned to you.')}>
              {mine ? 'Assigned to you' : 'Assign to me'}
            </Button>
          ) : <p className="text-xs text-ink-muted">Sign in to take the case.</p>}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Hold</p>
          {held ? (
            <Button variant="secondary" disabled={busy} onClick={() => run({ op: 'release' }, 'Hold released.')}>Release the hold</Button>
          ) : (
            <>
              <label className="block text-xs">Why it is held<input className={input} maxLength={300} value={holdReason} onChange={e => setHoldReason(e.target.value)} /></label>
              <Button variant="secondary" disabled={busy || !holdReason.trim()} onClick={() => run({ op: 'hold', reason: holdReason }, 'Case held.').then(() => setHoldReason(''))}>Hold the case</Button>
            </>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Refer to another institution</p>
          <label className="block text-xs">Procedure
            <select className={input} value={referTo} onChange={e => setReferTo(e.target.value)}>
              <option value="">Choose…</option>
              {procs.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
            </select>
          </label>
          <label className="block text-xs">What is asked<input className={input} maxLength={300} value={referWhy} onChange={e => setReferWhy(e.target.value)} /></label>
          <Button variant="secondary" disabled={busy || !referTo || !referWhy.trim()} onClick={() => run({ op: 'refer', procedure: referTo, reason: referWhy }, 'Referred: a linked case was opened.').then(() => { setReferTo(''); setReferWhy(''); })}>Refer</Button>
        </div>
      </div>
    </Section>
  );
}
