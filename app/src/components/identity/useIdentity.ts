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

/** Subscribes to the identity service. Stable snapshot via getSnapshot. */
export function useIdentity(): IdentityState {
  React.useEffect(() => { initIdentity(); }, []);
  const subscribe = React.useCallback((l: () => void) => subscribeIdentity(l), []);
  const get = React.useCallback((): IdentityState => ({
    actor: currentActorSnapshot(),
    session: currentSessionSnapshot(),
    ready: true,
  }), []);
  // useSyncExternalStore requires referentially stable snapshots between
  // events. We freeze the tuple per change cycle by re-computing only
  // when `subscribe` fires. React 18 handles the rest.
  return React.useSyncExternalStore(subscribe, get, () => ({ actor: null, session: null, ready: false }));
}
