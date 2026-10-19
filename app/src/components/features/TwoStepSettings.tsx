'use client';

// The signed-in official's second sign-in step (My account): set it up with
// any authenticator app (type the key, or open the otpauth:// link on the
// phone), confirm with a code, keep the recovery codes; turn it off with a
// code when the installation does not require it. Server: /api/auth/two-step.

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, refreshSignIn } from '@/lib/official';
import { downloadText } from '@/lib/csv-download';

interface Status { on: boolean; since: string | null; required: boolean; thisSession: boolean; policy: string; passkeys?: number }

const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const input = 'focus-ring w-40 rounded-[3px] border border-line bg-surface px-2.5 py-2 font-mono text-[15px] tracking-[0.2em] text-ink';
const groups = (k: string) => k.match(/.{1,4}/g)?.join(' ') ?? k;

export function TwoStepSettings() {
  const official = useSignIn()?.official ?? null;
  const [st, setSt] = React.useState<Status | null>(null);
  const [setup, setSetup] = React.useState<{ secret: string; uri: string } | null>(null);
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/two-step', { cache: 'no-store' });
    setSt(r.ok ? await r.json() : null);
  }, []);
  React.useEffect(() => { if (official?.method === 'local') void load(); }, [official?.method, load]);

  async function call(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/two-step', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      return d;
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return null; }
    finally { setBusy(false); }
  }

  if (!official || official.method !== 'local' || !st) return null;
  return (
    <section id="two-step" className="mx-auto mb-4 max-w-[1100px] space-y-3 rounded-[3px] border border-line bg-surface p-4 text-[14px] text-ink">
      <h2 className="text-[17px] font-semibold">Second sign-in step</h2>
      <p className="max-w-3xl text-ink-soft">
        A six-digit code from an authenticator app on your phone, asked for after your password, so a stolen password alone cannot act in your name.
        Any standard app works (for example Google Authenticator, Microsoft Authenticator, FreeOTP or Aegis).
      </p>
      {st.required && !st.on && !st.passkeys ? (
        <p role="alert" className="rounded-[3px] border border-warn p-2 text-[13px]">This installation requires the second step for you. Until it is set up (an authenticator app here, or a <a href="#passkeys" className="text-link underline">passkey</a>) you can read, but not make changes.</p>
      ) : null}
      {st.required && (st.on || !!st.passkeys) && !st.thisSession ? (
        <p role="alert" className="rounded-[3px] border border-warn p-2 text-[13px]">
          {official.via === 'oidc'
            ? 'Your government sign-in did not count as the second step here. Sign out and sign in with your platform password and your code or passkey to make changes.'
            : 'Sign out and sign in again with your code or passkey to make changes.'}
        </p>
      ) : null}
      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}

      {codes ? (
        <div className="space-y-2 rounded-[3px] border border-warn p-3" role="status">
          <p><strong>Your recovery codes.</strong> Each works once in place of a code if you lose your phone. Keep them somewhere safe and offline: they are shown only now.</p>
          <ol className="grid grid-cols-2 gap-x-6 font-mono text-[14px] sm:grid-cols-5">{codes.map(c => <li key={c}>{c}</li>)}</ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => downloadText('recovery-codes.txt', `${codes.join('\n')}\n`)}>Download</button>
            <button type="button" className={btn} onClick={() => setCodes(null)}>I have saved them</button>
          </div>
        </div>
      ) : st.on ? (
        <div className="space-y-2">
          <p><span className="text-ok">On</span> since {new Date(st.since!).toISOString().slice(0, 10)}.</p>
          {st.required ? <p className="text-[13px] text-ink-muted">Required by this installation. If your phone is lost, an administrator can reset it under People › Sign-in accounts.</p> : (
            <form className="flex flex-wrap items-end gap-2" onSubmit={async e => {
              e.preventDefault();
              if (await call({ action: 'off', code })) { setCode(''); setMsg({ ok: true, text: 'Second step turned off' }); await load(); }
            }}>
              <label className="text-[12px] text-ink-soft">Current code<input className={`${input} mt-1 block`} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.currentTarget.value)} /></label>
              <button className={btn} disabled={busy}>Turn off</button>
            </form>
          )}
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-2 ps-5">
            <li>In your authenticator app, add an account and choose to enter a key. Type this key (spaces do not matter):
              <code className="mt-1 block break-all rounded-[3px] bg-bg px-2 py-1 font-mono text-[15px] tracking-wider">{groups(setup.secret)}</code>
              <span className="text-[13px] text-ink-muted">On this phone? <a href={setup.uri} className="text-link underline">Open it in the authenticator app</a> instead.</span>
            </li>
            <li>Enter the six-digit code the app now shows.</li>
          </ol>
          <form className="flex flex-wrap items-end gap-2" onSubmit={async e => {
            e.preventDefault();
            const d = await call({ action: 'confirm', code }) as { recoveryCodes?: string[] } | null;
            if (d?.recoveryCodes) { setCodes(d.recoveryCodes); setSetup(null); setCode(''); setMsg({ ok: true, text: 'Second step is on' }); await refreshSignIn(); await load(); }
          }}>
            <label className="text-[12px] text-ink-soft">Code from the app<input className={`${input} mt-1 block`} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.currentTarget.value)} /></label>
            <button className={btn} disabled={busy}>Turn on</button>
            <button type="button" className="text-[13px] text-link underline" onClick={() => setSetup(null)}>Cancel</button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink-soft">Off.</span>
          <button type="button" className={btn} disabled={busy} onClick={async () => { const d = await call({ action: 'start' }) as { secret: string; uri: string } | null; if (d) setSetup(d); }}>Set it up</button>
        </div>
      )}
      <p className="text-[12px] text-ink-muted">Every change here is written to the <Link href="/gov/audit" className="text-link underline">audit record</Link>.</p>
    </section>
  );
}
