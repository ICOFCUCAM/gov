'use client';

// Sign-in for officials with a platform account (lib/auth/officials.ts): the
// way an installation without the substrate signs its officials in, and how
// the first official account is created at installation. The server checks
// the password and sets the signed session; actions are then recorded under
// the verified name.

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useSignIn, refreshSignIn, officialLabel } from '@/lib/official';

export function OfficialSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('from');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/gov/work';
  const s = useSignIn();
  const [f, setF] = React.useState({ email: '', password: '', name: '', office: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const first = s ? !s.accounts && !s.methods.substrate : false;

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (first) await post('/api/auth/officials', { email: f.email, password: f.password, name: f.name, office: f.office });
      await post('/api/auth/official', { method: 'local', email: f.email, password: f.password });
      await refreshSignIn();
      router.push(safeNext);
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
          <Button variant="secondary" onClick={async () => { await fetch('/api/auth/official', { method: 'DELETE' }); await refreshSignIn(); }}>Sign out</Button>
        </div>
      </Card>
    );
  }
  if (s.methods.substrate && !s.accounts) return null;
  return (
    <Card>
      <h2 className="mb-1 font-semibold">{first ? 'Create the first official account' : 'Officials: sign in with your platform account'}</h2>
      <p className="mb-3 text-sm text-ink-muted">
        {first
          ? 'This installation has no official accounts yet. The first account is made now, at installation; after that, only a signed-in official can create accounts. Every account and sign-in is written to the audit chain.'
          : 'Your actions will be recorded under your verified name.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {first ? (
          <>
            <TextField label="Full name" name="name" required value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} />
            <TextField label="Office" name="office" required placeholder="e.g. Permanent Secretary, Cabinet Office" value={f.office} onChange={e => setF({ ...f, office: e.currentTarget.value })} />
          </>
        ) : null}
        <TextField label="Email" name="official-email" type="email" autoComplete="username" required value={f.email} onChange={e => setF({ ...f, email: e.currentTarget.value })} />
        <TextField label="Password" name="official-password" type="password" autoComplete={first ? 'new-password' : 'current-password'} required minLength={first ? 12 : 1} value={f.password} onChange={e => setF({ ...f, password: e.currentTarget.value })} />
        {first ? <p className="text-xs text-ink-muted">At least 12 characters.</p> : null}
        {error ? <p className="text-sm text-alert" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? 'Working…' : first ? 'Create account and sign in' : 'Sign in'}</Button>
      </form>
    </Card>
  );
}
