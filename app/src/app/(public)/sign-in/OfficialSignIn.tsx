'use client';

// Sign-in for officials with a platform account (lib/auth/officials.ts): the
// way an installation without the substrate signs its officials in, and how
// the first official account is created at installation. The server checks
// the password (and, when the account has one, the code from the official's
// authenticator app, or a passkey) and sets the signed session; actions are
// then recorded under the verified name. Where the government's identity
// provider is set up (lib/auth/oidc.ts), "Sign in with <provider>" goes
// there; officials with a passkey can also sign in with it alone. Email and
// password stay.

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useSignIn, refreshSignIn, officialLabel } from '@/lib/official';
import { getPasskey, passkeysSupported, type RequestJSON } from '@/lib/webauthn-browser';

type PasskeyStep = { challengeId: string; publicKey: RequestJSON };

export function OfficialSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('from');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/gov/work';
  // What the identity provider's sign-in came back with, when it did not succeed (plain text, shown as text).
  const providerNote = params.get('oidc');
  const providerPending = params.get('pending') === '1';
  const s = useSignIn();
  const [f, setF] = React.useState({ email: '', password: '', name: '', office: '', code: '', setupToken: '' });
  const [askCode, setAskCode] = React.useState(false);
  // The account has a passkey: the server's options for the second step.
  const [passkeyStep, setPasskeyStep] = React.useState<PasskeyStep | null>(null);
  const [canPasskey, setCanPasskey] = React.useState(false);
  React.useEffect(() => { setCanPasskey(passkeysSupported()); }, []);
  // Forgotten password: a one-time code from an administrator sets a new one.
  const [resetting, setResetting] = React.useState(false);
  const [r, setR] = React.useState({ code: '', next: '', again: '' });
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // No account yet and the first may be made here (methods.local: not while the substrate is the
  // sign-in method, unless the operator allows platform accounts, CIVICOS_LOCAL_ACCOUNTS=allow).
  const first = s ? !s.accounts && s.methods.local : false;

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      if ((d as { needsCode?: boolean }).needsCode) setAskCode(true);
      const pk = (d as { passkey?: PasskeyStep }).passkey;
      if (pk) setPasskeyStep(pk);
      throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
    }
    return d as { official?: { twoStep?: boolean; twoStepRequired?: boolean }; challengeId?: string; publicKey?: RequestJSON };
  }

  const landed = async (d: { official?: { twoStep?: boolean; twoStepRequired?: boolean } }) => {
    await refreshSignIn();
    // Officials the installation requires to use the second step set it up first.
    router.push(d.official?.twoStepRequired && !d.official.twoStep ? '/gov/me#two-step' : safeNext);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (first) await post('/api/auth/officials', { email: f.email, password: f.password, name: f.name, office: f.office, setupToken: f.setupToken });
      const d = await post('/api/auth/official', { method: 'local', email: f.email, password: f.password, ...(askCode && f.code ? { code: f.code } : {}) });
      await landed(d);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  /** The second step with the account's passkey, after the password. */
  async function passkeySecondStep() {
    if (!passkeyStep) return;
    setBusy(true); setError(null);
    try {
      const response = await getPasskey(passkeyStep.publicKey);
      setPasskeyStep(null);
      const d = await post('/api/auth/official', { method: 'local', email: f.email, password: f.password, passkey: { challengeId: passkeyStep.challengeId, response } });
      await landed(d);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  /** Sign in with a passkey alone (it verifies the person on the device). */
  async function passkeyOnly() {
    setBusy(true); setError(null);
    try {
      const o = await post('/api/auth/passkeys/options', {});
      const response = await getPasskey(o.publicKey!);
      const d = await post('/api/auth/official', { method: 'passkey', challengeId: o.challengeId, response });
      await landed(d);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (!s) return null;
  if (s.official) {
    return (
      <Card>
        <h2 className="mb-2 font-semibold">Signed in as {officialLabel(s.official)}</h2>
        <p className="mb-3 text-sm text-ink-muted">Your actions are recorded under this name in the audit chain.</p>
        <div className="flex gap-2">
          <Button onClick={() => router.push(safeNext)}>Continue</Button>
          <Button variant="secondary" onClick={async () => {
            const r = await fetch('/api/auth/official', { method: 'DELETE' });
            const out = (await r.json().catch(() => null)) as { logoutUrl?: string } | null;
            await refreshSignIn();
            // Signed in through the identity provider: end that session there too.
            if (out?.logoutUrl) window.location.assign(out.logoutUrl);
          }}>Sign out</Button>
        </div>
      </Card>
    );
  }
  if (!s.accounts && !s.methods.local) return null;
  if (resetting) {
    return (
      <Card>
        <h2 className="mb-1 font-semibold">Set a new password</h2>
        <p className="mb-3 text-sm text-ink-muted">Ask an administrator for a reset code (they give it to you in person; it works once, for 24 hours). Your new password is never shown to them.</p>
        <form className="space-y-3" onSubmit={async e => {
          e.preventDefault();
          if (r.next !== r.again) { setError('The two new passwords are not the same'); return; }
          setBusy(true); setError(null);
          try {
            await post('/api/auth/password', { action: 'reset', email: f.email, code: r.code, next: r.next });
            setResetting(false); setR({ code: '', next: '', again: '' }); setF({ ...f, password: '' });
            setNotice('Your new password is set. Sign in with it now.');
          } catch (err) { setError((err as Error).message); }
          finally { setBusy(false); }
        }}>
          <TextField label="Email" name="official-email" type="email" autoComplete="username" required value={f.email} onChange={e => setF({ ...f, email: e.currentTarget.value })} />
          <TextField label="Reset code" name="reset-code" autoComplete="one-time-code" required help="Three groups of six letters and digits" value={r.code} onChange={e => setR({ ...r, code: e.currentTarget.value })} />
          <TextField label="New password" name="new-password" type="password" autoComplete="new-password" required minLength={12} value={r.next} onChange={e => setR({ ...r, next: e.currentTarget.value })} />
          <TextField label="New password again" name="new-password-again" type="password" autoComplete="new-password" required minLength={12} value={r.again} onChange={e => setR({ ...r, again: e.currentTarget.value })} />
          {error ? <p className="text-sm text-alert" role="alert">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{busy ? 'Working…' : 'Set new password'}</Button>
            <button type="button" className="text-sm text-link underline" onClick={() => { setResetting(false); setError(null); }}>Back to sign in</button>
          </div>
        </form>
      </Card>
    );
  }
  const provider = !first ? s.methods.oidc : null;
  return (
    <Card>
      {providerNote ? (
        <p className={`mb-3 rounded-[3px] border p-2 text-sm ${providerPending ? 'border-warn' : 'border-alert text-alert'}`} role={providerPending ? 'status' : 'alert'}>{providerNote}</p>
      ) : null}
      {provider ? (
        <div className="mb-4 space-y-2 border-b border-line pb-4">
          <h2 className="font-semibold">Officials: sign in with your government account</h2>
          <a className="focus-ring inline-flex min-h-tap items-center rounded-sm border border-ink bg-ink px-5 py-2 font-medium text-bg hover:opacity-90" href={`/api/auth/oidc/start?from=${encodeURIComponent(safeNext)}`}>
            Sign in with {provider.name}
          </a>
          <p className="text-xs text-ink-muted">You sign in on your government&rsquo;s own sign-in page and come back here. Or use your platform account below.</p>
        </div>
      ) : null}
      <h2 className="mb-1 font-semibold">{first ? 'Create the first official account' : 'Officials: sign in with your platform account'}</h2>
      <p className="mb-3 text-sm text-ink-muted">
        {first
          ? 'This installation has no official accounts yet. The first account is made now, at installation, with the one-time setup code from the operator; after that, only a signed-in official can create accounts. Every account and sign-in is written to the audit chain.'
          : 'Your actions will be recorded under your verified name.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {first ? (
          <>
            <TextField label="Full name" name="name" required value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} />
            <TextField label="Office" name="office" required placeholder="e.g. Permanent Secretary, Cabinet Office" value={f.office} onChange={e => setF({ ...f, office: e.currentTarget.value })} />
            <TextField label="Setup code" name="setup-code" autoComplete="one-time-code" required spellCheck={false}
              help="From the operator: CIVICOS_SETUP_TOKEN, or the code the server wrote to its output at start (CIVICOS SETUP CODE). It works once." value={f.setupToken} onChange={e => setF({ ...f, setupToken: e.currentTarget.value })} />
          </>
        ) : null}
        <TextField label="Email" name="official-email" type="email" autoComplete="username" required value={f.email} onChange={e => setF({ ...f, email: e.currentTarget.value })} />
        <TextField label="Password" name="official-password" type="password" autoComplete={first ? 'new-password' : 'current-password'} required minLength={first ? 12 : 1} value={f.password} onChange={e => setF({ ...f, password: e.currentTarget.value })} />
        {first ? <p className="text-xs text-ink-muted">At least 12 characters.</p> : null}
        {askCode ? (
          <TextField label="Code from your authenticator app" name="official-code" inputMode="numeric" autoComplete="one-time-code" required autoFocus
            help="Six digits, or one of your recovery codes" value={f.code} onChange={e => setF({ ...f, code: e.currentTarget.value })} />
        ) : null}
        {passkeyStep ? (
          <div className="space-y-2 rounded-[3px] border border-line p-3">
            <p className="text-sm">Finish signing in with your passkey (your phone, security key or this device&rsquo;s fingerprint or PIN).</p>
            <Button type="button" disabled={busy || !canPasskey} onClick={passkeySecondStep}>Use my passkey</Button>
            {!canPasskey ? <p className="text-xs text-ink-muted">This browser cannot use passkeys.{askCode ? ' Enter the code from your authenticator app instead.' : ''}</p> : null}
          </div>
        ) : null}
        {error ? <p className="text-sm text-alert" role="alert">{error}</p> : null}
        {notice ? <p className="text-sm text-ok" role="status">{notice}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? 'Working…' : first ? 'Create account and sign in' : 'Sign in'}</Button>
        {!first ? <button type="button" className="ms-3 text-sm text-link underline" onClick={() => { setResetting(true); setError(null); setNotice(null); }}>Forgot your password?</button> : null}
      </form>
      {!first && s.methods.passkey && canPasskey ? (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" className="focus-ring text-sm text-link underline" disabled={busy} onClick={passkeyOnly}>Sign in with a passkey instead</button>
        </div>
      ) : null}
    </Card>
  );
}
