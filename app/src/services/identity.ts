// services/identity — current-actor singleton + React subscription.
//
// Resolves the signed-in user to a CurrentActor (officer or citizen)
// once on first access, refreshes on Supabase auth state changes, and
// publishes via subscribeIdentity for React hooks. When the substrate
// isn't configured or no one is signed in, returns null and the
// platform operates in legacy anonymous-actor mode.

import { onAuthStateChange, currentSession, type Session } from '@/lib/db/auth';
import { currentActor, claimCitizen, type CurrentActor } from '@/lib/db/repos/identity';
import { substrateAvailable } from '@/lib/db/client';

type Listener = () => void;
const listeners = new Set<Listener>();
let _actor: CurrentActor | null = null;
let _session: Session | null = null;
let _initialised = false;
let _resolving: Promise<void> | null = null;

export function version(): { actor: CurrentActor | null; session: Session | null } {
  return { actor: _actor, session: _session };
}

export function subscribeIdentity(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function emit() { for (const l of listeners) l(); }

async function resolve(): Promise<void> {
  if (!substrateAvailable()) return;
  _actor = await currentActor();
  emit();
}

/** Initialise on first call from a client surface. Idempotent. */
export function initIdentity(): void {
  if (_initialised || typeof window === 'undefined') return;
  _initialised = true;
  void (async () => {
    _session = await currentSession();
    if (_session) await resolve();
    emit();
  })();
  onAuthStateChange(session => {
    _session = session;
    if (!session) {
      _actor = null;
      emit();
      return;
    }
    // Re-resolve on every auth change (sign-in, refresh, sign-out).
    if (_resolving) return;
    _resolving = resolve().finally(() => { _resolving = null; });
  });
}

/** Current actor snapshot (synchronous). */
export function currentActorSnapshot(): CurrentActor | null { return _actor; }
export function currentSessionSnapshot(): Session | null { return _session; }

/** Force-refresh — call after a server action that may have changed
 *  the actor's link (e.g. after claiming an officer or citizen). */
export async function refreshIdentity(): Promise<CurrentActor | null> {
  await resolve();
  return _actor;
}

/** Convenience: if signed in but unlinked, claim as a citizen.
 *  Returns true when the actor is resolved (existing or new). */
export async function ensureCitizenLinkage(displayName?: string | null): Promise<boolean> {
  if (!_session) return false;
  if (_actor) return true;
  await claimCitizen({ displayName: displayName ?? null });
  await resolve();
  return _actor !== null;
}
