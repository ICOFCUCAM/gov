'use client';

import * as React from 'react';
import Link from 'next/link';
import { useIdentity } from './useIdentity';
import { signOut } from '@/lib/db/auth';

/** Compact session indicator. Renders "Sign in" when anonymous, or
 *  "<name> · <role>" with a sign-out affordance when authenticated.
 *  Hidden entirely when the substrate isn't configured (SSR-safe). */
export function IdentityBadge({ className = '' }: { className?: string }) {
  const { actor, session, ready } = useIdentity();

  if (!ready) return null;
  if (!session) {
    return (
      <Link
        href="/sign-in"
        className={`text-xs text-ink-muted hover:text-ink underline-offset-2 hover:underline ${className}`}
      >
        Sign in
      </Link>
    );
  }

  const label = actor
    ? actor.kind === 'officer'
      ? `${actor.name} · ${actor.role ?? 'officer'}`
      : actor.name
    : session.user.email ?? 'Signed in';

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={() => { void signOut(); }}
        className="text-ink-muted hover:text-ink underline-offset-2 hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
