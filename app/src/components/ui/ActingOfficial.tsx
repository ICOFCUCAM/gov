'use client';

import * as React from 'react';
import { useSignIn, refreshSignIn, officialLabel, officialScope } from '@/lib/official';

/**
 * Who is acting: the signed-in official (verified by the server), or, where
 * the installation does not require sign-in, a name declared at the desk
 * (lib/official.ts). Actions wait until someone is signed in or named.
 */
export function ActingOfficial({ name, onChange, label = 'Acting official' }: { name: string; onChange: (v: string) => void; label?: string }) {
  const signIn = useSignIn();
  const [draft, setDraft] = React.useState(name);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => { setDraft(name); }, [name]);
  const [here, setHere] = React.useState('');
  React.useEffect(() => { setHere(`?from=${encodeURIComponent(window.location.pathname)}`); }, []);

  if (signIn?.official) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        Signed in as <strong className="text-ink">{officialLabel(signIn.official)}</strong>
        <span className="text-ink-muted">({officialScope(signIn.official)})</span>
        <button type="button" className="focus-ring rounded-[3px] px-1 text-link underline underline-offset-2"
          onClick={async () => { await fetch('/api/auth/official', { method: 'DELETE' }); await refreshSignIn(); }}>Sign out</button>
      </span>
    );
  }
  if (signIn?.enforced) {
    return <a href={`/sign-in${here}`} className="text-xs text-link underline underline-offset-2">Sign in to act: changes are recorded under your verified name</a>;
  }
  if (name && !editing) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        {label}: <strong className="text-ink">{name}</strong> <span className="text-ink-muted">(declared)</span>
        <button type="button" onClick={() => setEditing(true)} className="focus-ring rounded-[3px] px-1 text-link underline underline-offset-2">change</button>
        <a href={`/sign-in${here}`} className="text-link underline underline-offset-2">sign in</a>
      </span>
    );
  }
  return (
    <form className="inline-flex flex-wrap items-center gap-1.5 text-xs" onSubmit={e => { e.preventDefault(); const v = draft.trim(); if (v) { onChange(v); setEditing(false); } }}>
      <label className="text-ink-soft" htmlFor="acting-official">{label}</label>
      <input id="acting-official" value={draft} onChange={e => setDraft(e.currentTarget.value)} placeholder="Your name and office"
        className="focus-ring h-7 w-48 rounded-[3px] border border-line bg-surface px-2 text-ink" />
      <button type="submit" className="focus-ring h-7 rounded-[3px] border border-line px-2 text-ink hover:bg-surface-2">Set</button>
      <a href={`/sign-in${here}`} className="text-link underline underline-offset-2">or sign in</a>
    </form>
  );
}
