'use client';

// Official accounts: who can sign in on this installation with a platform
// account. A signed-in official creates accounts and can disable them; every
// change is in the audit chain. Passwords are never shown or stored in clear.

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, officialLabel } from '@/lib/official';

interface Account { id: string; email: string; name: string; office: string; createdAt: string; createdBy: string; disabled?: boolean; lastSignIn?: string }

const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');

export function OfficialAccounts() {
  const s = useSignIn();
  const [list, setList] = React.useState<Account[] | null>(null);
  const [f, setF] = React.useState({ name: '', office: '', email: '', password: '' });
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/officials', { cache: 'no-store' });
    if (r.ok) setList(((await r.json()) as { accounts: Account[] }).accounts);
  }, []);
  React.useEffect(() => { if (s?.official) void load(); }, [s?.official, load]);

  async function call(url: string, body: unknown, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: done }); await load(); return true;
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 text-[14px] text-ink">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Official accounts</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Who can sign in on this installation with a platform account. Signed-in officials&rsquo; actions are recorded under their verified names.
          {s?.methods.substrate ? ' This installation is also connected to the substrate, where officers sign in with their substrate accounts.' : ''}
        </p>
      </header>
      {!s ? null : !s.official ? (
        <p className="rounded-[3px] border border-line bg-surface p-3"><Link href="/sign-in?from=/admin/officials" className="text-link underline">Sign in</Link> as an official to manage accounts.</p>
      ) : (
        <>
          <p className="text-[13px] text-ink-soft">Signed in as <strong className="text-ink">{officialLabel(s.official)}</strong>.</p>
          <form className="grid gap-2 rounded-[3px] border border-line bg-surface p-3 md:grid-cols-5"
            onSubmit={async e => { e.preventDefault(); if (await call('/api/auth/officials', f, `Account created for ${f.name}`)) setF({ name: '', office: '', email: '', password: '' }); }}>
            <h2 className="text-[15px] font-semibold md:col-span-5">Add an official</h2>
            <label className="text-[12px] text-ink-soft">Full name<input className={`${input} mt-1`} required value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft">Office<input className={`${input} mt-1`} required value={f.office} onChange={e => setF({ ...f, office: e.currentTarget.value })} placeholder="e.g. Director of Budget" /></label>
            <label className="text-[12px] text-ink-soft">Email<input type="email" className={`${input} mt-1`} required value={f.email} onChange={e => setF({ ...f, email: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft">First password<input type="password" autoComplete="new-password" minLength={12} className={`${input} mt-1`} required value={f.password} onChange={e => setF({ ...f, password: e.currentTarget.value })} /></label>
            <div className="flex items-end"><button className={btn} disabled={busy}>Create account</button></div>
            <p className="text-[12px] text-ink-muted md:col-span-5">Give the first password to the official in person; at least 12 characters.</p>
          </form>
          {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line text-start text-ink-muted"><th className="py-1.5 text-start font-semibold">Official</th><th className="text-start font-semibold">Email</th><th className="text-start font-semibold">Created</th><th className="text-start font-semibold">Last sign-in</th><th className="text-start font-semibold">Status</th><th /></tr></thead>
            <tbody>
              {(list ?? []).map(a => (
                <tr key={a.id} className="border-b border-line-soft">
                  <td className="py-1.5"><strong>{a.name}</strong><div className="text-ink-muted">{a.office}</div></td>
                  <td>{a.email}</td>
                  <td>{day(a.createdAt)}<div className="text-ink-muted">by {a.createdBy}</div></td>
                  <td>{day(a.lastSignIn)}</td>
                  <td>{a.disabled ? <span className="text-alert">Disabled</span> : <span className="text-ok">Active</span>}</td>
                  <td className="text-end">
                    {s.official?.sub !== `local:${a.id}` ? (
                      <button className={btn} disabled={busy} onClick={() => call(`/api/auth/officials/${a.id}`, { disabled: !a.disabled }, `${a.disabled ? 'Enabled' : 'Disabled'}: ${a.name}`)}>{a.disabled ? 'Enable' : 'Disable'}</button>
                    ) : <span className="text-ink-muted">you</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
