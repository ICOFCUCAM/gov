'use client';

import * as React from 'react';
import { runServerResets } from '@/lib/clock/server-reset';

// Live clocks start from "now" when a component first renders. On the server
// and in the browser that first render happens at different moments, so the
// page's HTML disagreed with the browser (a hydration mismatch). The server
// stamps one time per request; components hydrating that HTML start from it,
// and anything mounted later (client navigation) starts from Date.now().

const RequestTime = React.createContext<number | null>(null);

export function RenderNowProvider({ value, children }: { value: number; children: React.ReactNode }) {
  // Each server render starts the browser-only stores fresh (lib/clock/server-reset.ts).
  runServerResets();
  return <RequestTime.Provider value={value}>{children}</RequestTime.Provider>;
}

const noSubscribe = () => () => {};

/** Initializer for a component's clock state: `React.useState(useRenderNow())`. */
export function useRenderNow(): () => number {
  const requestTime = React.useContext(RequestTime);
  // True on the server and while hydrating its HTML; false for fresh client renders.
  const fromServerHtml = React.useSyncExternalStore(noSubscribe, () => false, () => true);
  return () => (fromServerHtml && requestTime !== null ? requestTime : Date.now());
}

/**
 * False on the server and while hydrating its HTML, true afterwards. For values
 * only this browser knows (its local runtime queue, federation registry): show
 * them once hydrated, so the server's HTML and the first browser render agree.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(noSubscribe, () => true, () => false);
}
