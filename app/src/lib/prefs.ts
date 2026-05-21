// Per-device preference helper. Centralises the localStorage read/write
// pattern used across surfaces for sticky filters, panel visibility,
// chart toggles, etc. SSR-safe (no-op on the server).
//
// Keys are namespaced under 'civicos.pref.<key>'.

const PREFIX = 'civicos.pref.';

export function getPref<T extends string>(key: string, allow: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(PREFIX + key);
    return (v && (allow as readonly string[]).includes(v)) ? (v as T) : fallback;
  } catch { return fallback; }
}

export function getBoolPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(PREFIX + key);
    if (v === '1') return true;
    if (v === '0') return false;
    return fallback;
  } catch { return fallback; }
}

export function getStringPref(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(PREFIX + key) ?? fallback; }
  catch { return fallback; }
}

export function setPref(key: string, value: string | boolean | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value == null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
  } catch { /* quota */ }
}
