'use client';

// Account changes waiting for an independent institution (plan phase 2;
// lib/auth/account-changes.ts). An administrator serving the whole
// government who changes an account of the legislature, a court, the head of
// state's office or an independent body proposes it; an official who can
// sign there (or its own administrator) confirms it here. A reset code for a
// new account goes to the confirming official, once, to hand over in person.

import * as React from 'react';
import { roleOf } from '@/lib/auth/roles';
import type { VerifiedOfficial } from '@/lib/official';

interface Change {
  id: string; summary: string; by: string; byId?: string; at: string; expiresAt: string;
  state: 'waiting' | 'done' | 'lapsed' | 'withdrawn' | 'failed'; result?: string;
  confirmFrom: string[]; confirmations: { institution: string; by: string; at: string }[];
}

const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const day = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function AccountChanges({ me, placeName, refresh, onDone }: { me: VerifiedOfficial; placeName: (id?: string) => string; refresh: number; onDone: () => void }) {
  const [changes, setChanges] = React.useState<Change[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = React.useState<{ code: string; expiresAt: string; summary: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const admin = roleOf(me) === 'administrator';

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/account-changes', { cache: 'no-store' });
    if (r.ok) setChanges(((await r.json()) as { changes: Change[] }).changes);
  }, []);
  React.useEffect(() => { void load(); }, [load, refresh]);

  async function act(c: Change, op: 'confirm' | 'withdraw') {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/auth/account-changes/${c.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string; code?: string; expiresAt?: string; change?: Change };
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
      if (d.code && d.expiresAt) setCode({ code: d.code, expiresAt: d.expiresAt, summary: c.summary });
      setMsg({ ok: true, text: op === 'withdraw' ? 'Withdrawn.' : d.change?.state === 'done' ? 'Confirmed and done.' : 'Confirmed; waiting for the other institution.' });
      await load(); onDone();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const waiting = changes.filter(c => c.state === 'waiting');
  const recent = changes.filter(c => c.state !== 'waiting').slice(0, 10);
  if (!changes.length && !msg) return null;
  return (
    <section className="space-y-2 rounded-[3px] border border-line bg-surface p-3" aria-labelledby="account-changes">
      <h2 id="account-changes" className="text-[15px] font-semibold">Changes waiting for an independent institution</h2>
      <p className="text-[12px] text-ink-muted">
        The legislature, the courts, the head of state&rsquo;s office and independent bodies manage their own officials&rsquo; accounts.
        A change made by an administrator serving the whole government waits here until an official who can sign there confirms it.
      </p>
      {waiting.length ? (
        <ul className="space-y-2">
          {waiting.map(c => {
            const mine = !!me.institution && c.confirmFrom.includes(me.institution) && !c.confirmations.some(x => x.institution === me.institution);
            return (
              <li key={c.id} className="rounded-[3px] border border-line p-2 text-[13px]">
                <p><strong>{c.summary}</strong></p>
                <p className="text-ink-soft">Proposed by {c.by} on {day(c.at)} · waits for {c.confirmFrom.map(placeName).join(', ')} until {day(c.expiresAt)}
                  {c.confirmations.length ? ` · confirmed for ${c.confirmations.map(x => placeName(x.institution)).join(', ')}` : ''}</p>
                <div className="mt-1 flex gap-2">
                  {mine ? <button type="button" className={btn} disabled={busy} onClick={() => void act(c, 'confirm')}>Confirm for {placeName(me.institution)}</button> : null}
                  {admin || c.byId === me.sub ? <button type="button" className={btn} disabled={busy} onClick={() => void act(c, 'withdraw')}>Withdraw</button> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-[13px] text-ink-soft">Nothing is waiting.</p>}
      {code ? (
        <div role="status" className="space-y-2 rounded-[3px] border border-warn p-3">
          <p><strong>{code.summary}.</strong> Give this reset code to the official in person (not by email). It works once, until {day(code.expiresAt)}, at the sign-in page under &ldquo;Forgot your password?&rdquo;. It is not shown again.</p>
          <code className="block font-mono text-[18px] tracking-wider">{code.code}</code>
          <button type="button" className={btn} onClick={() => setCode(null)}>Done</button>
        </div>
      ) : null}
      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
      {recent.length ? (
        <details className="text-[12px] text-ink-soft">
          <summary className="cursor-pointer">Earlier changes ({recent.length})</summary>
          <ul className="mt-1 space-y-1">{recent.map(c => <li key={c.id}>{c.summary} · {c.state}{c.result ? ` · ${c.result}` : ''}</li>)}</ul>
        </details>
      ) : null}
    </section>
  );
}
