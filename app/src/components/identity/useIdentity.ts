'use client';

import * as React from 'react';
import {
  initIdentity, subscribeIdentity,
  currentActorSnapshot, currentSessionSnapshot,
} from '@/services/identity';
import type { CurrentActor } from '@/lib/db/repos/identity';
import type { Session } from '@/lib/db/auth';

export interface IdentityState {
  actor: CurrentActor | null;
  session: Session | null;
  ready: boolean;
}

// useSyncExternalStore compares snapshots by identity, so each snapshot is
// cached and replaced only when the actor or session itself changes; a fresh
// object on every read makes React re-render without end (the receipts page
// failed with "Maximum update depth exceeded").
const SERVER_SNAPSHOT: IdentityState = { actor: null, session: null, ready: false };
let last: IdentityState | null = null;
function snapshot(): IdentityState {
  const actor = currentActorSnapshot();
  const session = currentSessionSnapshot();
  if (!last || last.actor !== actor || last.session !== session) last = { actor, session, ready: true };
  return last;
}
const serverSnapshot = () => SERVER_SNAPSHOT;

/** Subscribes to the identity service. Stable snapshot via getSnapshot. */
export function useIdentity(): IdentityState {
  React.useEffect(() => { initIdentity(); }, []);
  const subscribe = React.useCallback((l: () => void) => subscribeIdentity(l), []);
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
