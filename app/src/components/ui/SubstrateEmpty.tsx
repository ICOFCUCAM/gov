'use client';

import * as React from 'react';
import { Panel } from '@/components/features/SituationRoom';

/** Consistent empty-state copy block. */
export function SubstrateEmpty({
  title, hint, className = '',
}: { title: string; hint?: string; className?: string }) {
  return (
    <div className={`px-3 py-6 text-center ${className}`}>
      <div className="text-[11px] text-ink">{title}</div>
      {hint ? <div className="mt-1 text-[10px] text-ink-muted">{hint}</div> : null}
    </div>
  );
}

/** Small inline spinner using CSS only. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-line border-t-link ${className}`} />
  );
}

/**
 * Standard panel for a page that works on the shared database's work items
 * and needs an officer's sign-in there (wiring audit §10). The platform's own
 * accounts (/sign-in with email and password, or the identity provider) are
 * a separate system: an official signed in that way is told so, plainly,
 * and sent to the platform's own case work instead of to a sign-in they have
 * already done. Nothing is decided here; the page still reads the shared
 * database only with its own session.
 */
export function OfficerSignInNeeded({ title, from, signedOut, what }: {
  title: string;
  /** The page to come back to after signing in. */
  from: string;
  /** The sentence shown to someone not signed in at all. */
  signedOut: string;
  /** What the page does, after "This page" (e.g. "lists your work items"). */
  what: string;
}) {
  const [platform, setPlatform] = React.useState<{ name: string } | null>(null);
  React.useEffect(() => {
    let live = true;
    fetch('/api/auth/official', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: { official?: { name?: string; method?: string } | null }) => {
        if (live && j.official && j.official.method !== 'substrate') setPlatform({ name: j.official.name ?? 'an official' });
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  const button = 'inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2';
  const signIn = `/sign-in?from=${encodeURIComponent(from)}`;
  return (
    <Panel title={title} meta={platform ? 'needs an officer sign-in' : 'signed out'} bodyClass="!p-3 space-y-2">
      {platform ? (
        <>
          <p className="text-[12px] text-ink-soft" data-testid="platform-account-notice">
            You are signed in as {platform.name} with a platform account. This page {what} from the shared database, where officers sign in
            with their own officer account; the two are separate. Cases, registers and decisions on this platform are under My work.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/gov/work/cases/open" className={button}>Open my cases</a>
            <a href="/gov/work" className={button}>Waiting on officials</a>
            <a href={signIn} className={button}>Sign in as a database officer</a>
          </div>
          <p className="text-[11px] text-ink-muted">
            What a database officer may do on the platform is set by an administrator under Staff → Sign-in accounts.
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] text-ink-muted">{signedOut}</p>
          <a href={signIn} className={button}>Sign in</a>
        </>
      )}
    </Panel>
  );
}

/**
 * Standard panel for a part of the platform that needs the shared database
 * (the substrate), which this installation has not connected. Officials read
 * a plain sentence; the technical detail stays behind "Technical details".
 */
export function SubstrateNotConfigured({
  title,
  message = 'Substrate not configured.',
}: { title: string; message?: string }) {
  return (
    <Panel title={title} meta="not switched on" bodyClass="!p-3">
      <p className="text-[13px] text-ink-soft">
        This part of the platform is not switched on for this installation yet. It needs the shared database, which an
        administrator connects (see <a href="/gov/configuration" className="text-link underline underline-offset-2">National settings</a>).
      </p>
      <details className="mt-2 text-[12px] text-ink-muted">
        <summary className="cursor-pointer">Technical details</summary>
        <p className="mt-1">{message} Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (register 1.1).</p>
      </details>
    </Panel>
  );
}
