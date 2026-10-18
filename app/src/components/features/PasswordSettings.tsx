'use client';

// The signed-in official changes their own password (My account). Every
// other session of theirs ends; this one carries on. Server: /api/auth/password.

import * as React from 'react';
import { useSignIn, refreshSignIn } from '@/lib/official';

const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const input = 'focus-ring mt-1 block w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';

export function PasswordSettings() {
  const official = useSignIn()?.official ?? null;
  const blank = { current: '', next: '', again: '' };
  const [f, setF] = React.useState(blank);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  if (!official || official.method !== 'local') return null;

  return (
    <section id="password" className="mx-auto mb-4 max-w-[1100px] space-y-3 rounded-[3px] border border-line bg-surface p-4 text-[14px] text-ink">
      <h2 className="text-[17px] font-semibold">Password</h2>
      <p className="text-ink-soft">Changing it signs you out everywhere else; you stay signed in here.</p>
      <form className="grid max-w-3xl gap-2 sm:grid-cols-3" onSubmit={async e => {
        e.preventDefault();
        if (f.next !== f.again) { setMsg({ ok: false, text: 'The two new passwords are not the same' }); return; }
        setBusy(true); setMsg(null);
        try {
          const r = await fetch('/api/auth/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'change', current: f.current, next: f.next }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
          setF(blank); setMsg({ ok: true, text: 'Password changed; other sessions have ended' }); await refreshSignIn();
        } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
        finally { setBusy(false); }
      }}>
        <label className="text-[12px] text-ink-soft">Current password<input type="password" autoComplete="current-password" required className={input} value={f.current} onChange={e => setF({ ...f, current: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">New password<input type="password" autoComplete="new-password" required minLength={12} className={input} value={f.next} onChange={e => setF({ ...f, next: e.currentTarget.value })} /></label>
        <label className="text-[12px] text-ink-soft">New password again<input type="password" autoComplete="new-password" required minLength={12} className={input} value={f.again} onChange={e => setF({ ...f, again: e.currentTarget.value })} /></label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button className={btn} disabled={busy}>Change password</button>
          <span className="text-[12px] text-ink-muted">At least 12 characters; a few unrelated words make a strong one.</span>
        </div>
      </form>
      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
    </section>
  );
}
