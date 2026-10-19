// Browser-only stores (the runtime queue, records, dispatches, referrals,
// encounters, the local audit and event logs) are plain modules. In the browser
// each page load starts them fresh; on the server one module instance serves
// every request, so seeds and totals from earlier requests would reach later
// pages, and the HTML would disagree with the browser's first render (a
// hydration mismatch). Such a store registers a reset here, and the server runs
// every reset at the start of each page render (RenderNowProvider). Nothing a
// person does is held on the server: their actions only happen in the browser.

const resets = new Set<() => void>();

/** Register a store's reset; only kept on the server. */
export function resetOnServerRender(fn: () => void): void {
  if (typeof window === 'undefined') resets.add(fn);
}

/** Run every registered reset (server only; called once per page render). */
export function runServerResets(): void {
  if (typeof window !== 'undefined') return;
  for (const fn of resets) fn();
}
