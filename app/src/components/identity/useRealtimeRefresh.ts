'use client';

import * as React from 'react';
import { subscribeRealtime, type SubscribeOptions } from '@/lib/db/realtime';

/**
 * Generic realtime refresh trigger. Subscribes to one or more civicos
 * tables and calls `onChange` (debounced to one trailing call per 400ms)
 * whenever any subscribed table emits an event the current session is
 * entitled to see. RLS does the scoping — the hook doesn't filter.
 *
 * Typical use: a surface fetches via the standard repos on mount, then
 * passes its re-fetch function as `onChange`. The result is a live view
 * with no polling.
 */
export function useRealtimeRefresh(
  subs: SubscribeOptions[],
  onChange: () => void,
): void {
  // Stable callback ref so subscriptions don't tear down on every render.
  const cbRef = React.useRef(onChange);
  React.useEffect(() => { cbRef.current = onChange; }, [onChange]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; cbRef.current(); }, 400);
    };
    const unsubs = subs.map(s => subscribeRealtime(s, fire));
    return () => {
      if (timer) clearTimeout(timer);
      unsubs.forEach(u => u());
    };
    // We intentionally key on the JSON serialisation so adding/removing
    // subs re-subscribes, but stable values across renders don't churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(subs)]);
}
