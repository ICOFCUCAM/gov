'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import {
  signInWithPassword, signUpWithPassword, signOut, currentSession,
} from '@/lib/db/auth';
import { ensureCitizenLinkage, refreshIdentity } from '@/services/identity';
import { substrateAvailable } from '@/lib/db/client';
import { linkOfficerByEmail, registerSigningKeyRow } from '@/lib/db/repos/identity';
import { publicSigningJwk } from '@/lib/db/webcrypto';

type Mode = 'sign-in' | 'sign-up';

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('from');
  const safeNext = next && next.startsWith('/') ? next : '/wallet';

  const [mode, setMode] = React.useState<Mode>('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const available = substrateAvailable();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const fn = mode === 'sign-up' ? signUpWithPassword : signInWithPassword;
      const { session, error: err } = await fn(email, password);
      if (err) { setError(err); return; }
      if (!session) {
        // Sign-up with email confirmation enabled returns null session.
        setInfo('Check your email to confirm your address, then sign in.');
        setMode('sign-in');
        return;
      }
      // Best-effort: if an officer record matches this email, link it.
      // Otherwise auto-provision as a citizen.
      const officer = await linkOfficerByEmail(email);
      if (officer) {
        // Officer signed in — ensure a device signing key exists and
        // register the public JWK so transitions can be cryptographically
        // signed. Best-effort; transitions fall back to a tamper digest
        // if registration fails or WebCrypto is unavailable.
        const jwk = await publicSigningJwk();
        if (jwk) await registerSigningKeyRow(jwk);
      } else {
        await ensureCitizenLinkage();
      }
      await refreshIdentity();
      router.push(safeNext);
    } finally {
      setBusy(false);
    }
  }

  async function alreadySignedIn() {
    const s = await currentSession();
    return s != null;
  }
  const [signedIn, setSignedIn] = React.useState(false);
  React.useEffect(() => { void alreadySignedIn().then(setSignedIn); }, []);

  if (!available) {
    return (
      <Card>
        <h2 className="font-semibold mb-1">Substrate not configured</h2>
        <p className="text-sm text-ink-muted">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          to enable authenticated sign-in. The platform will continue to
          operate in anonymous demo mode without them.
        </p>
      </Card>
    );
  }

  if (signedIn) {
    return (
      <Card>
        <h2 className="font-semibold mb-2">Already signed in</h2>
        <p className="text-sm text-ink-muted mb-3">
          You can continue or sign out to switch identity.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => router.push(safeNext)}>Continue</Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              setSignedIn(false);
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-3">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.currentTarget.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.currentTarget.value)}
        />
        {error ? <p className="text-sm text-alert">{error}</p> : null}
        {info  ? <p className="text-sm text-ink-muted">{info}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="text-sm text-ink-muted underline-offset-2 hover:underline"
            onClick={() => { setMode(m => m === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setInfo(null); }}
          >
            {mode === 'sign-up' ? 'Have an account? Sign in' : 'Create an account'}
          </button>
        </div>
      </form>
    </Card>
  );
}
