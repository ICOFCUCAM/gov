// An official's own sign-in activity (My account), read from the audit chain:
// sign-ins and sign-outs, failed attempts against their account, password
// and second-step changes and what administrators did to the account. No
// second log is kept; nothing here carries an address or a network address,
// only a coarse device ("Chrome on Windows") recorded at sign-in.

import { listAudit } from '@/lib/data/store';

export interface ActivityEntry { at: string; what: string; ok: boolean; by?: string; detail?: string }

const WHAT: Record<string, [ok: string, refused: string]> = {
  'auth.sign-in': ['Signed in', 'Failed sign-in'],
  'auth.sign-out': ['Signed out', 'Sign-out refused'],
  'auth.password.change': ['Password changed', 'Password change refused (wrong current password)'],
  'auth.password.reset-issued': ['Password reset code issued', 'Password reset code refused'],
  'auth.password.reset': ['Password reset with a code', 'Wrong or expired reset code entered'],
  'auth.two-step.on': ['Second step turned on', 'Second step refused'],
  'auth.two-step.off': ['Second step turned off', 'Second step change refused'],
  'auth.two-step.reset': ['Second step reset by an administrator', 'Second step reset refused'],
  'auth.two-step.recovery-used': ['Recovery code used to sign in', 'Recovery code refused'],
  'auth.account.create': ['Account created', 'Account creation refused'],
  'auth.account.disable': ['Account disabled', 'Disabling refused'],
  'auth.account.enable': ['Account enabled', 'Enabling refused'],
  'auth.account.role': ['Role or institution changed', 'Role change refused'],
};

/** Newest first. `name` is the account's name, to tell the official's own actions from an administrator's. */
export function accountActivity(id: string, name: string, limit = 40): { entries: ActivityEntry[]; failedSincePreviousSignIn: number } {
  const resources = new Set([`Official:${id}`, `Official:local:${id}`, `Official:officer:${id}`]);
  const rows = listAudit().filter(e => resources.has(e.resource) && e.action in WHAT);
  const entries = rows.slice(0, limit).map((e): ActivityEntry => {
    const ok = e.outcome === 'ok';
    const own = e.actor === name || e.actor.startsWith(`${name},`) || e.actor === 'sign-in attempt' || e.actor === 'password reset attempt';
    const detail = e.action === 'auth.sign-in' && ok ? e.detail?.split(' · ').slice(1).join(' · ') || undefined
      : !ok ? e.detail : undefined;
    return { at: e.at, what: WHAT[e.action]![ok ? 0 : 1], ok, ...(own ? {} : { by: e.actor }), ...(detail ? { detail } : {}) };
  });
  // Failures since the sign-in before this one: what the official has not seen yet.
  const signIns = rows.filter(e => e.action === 'auth.sign-in' && e.outcome === 'ok');
  const since = signIns[1]?.at ?? '';
  const failedSincePreviousSignIn = rows.filter(e => e.outcome === 'denied' && (e.action === 'auth.sign-in' || e.action === 'auth.password.reset') && e.at > since).length;
  return { entries, failedSincePreviousSignIn };
}

/** A coarse device description from a User-Agent: browser and system only. */
export function deviceOf(ua: string | null | undefined): string {
  const u = ua ?? '';
  const browser = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : /curl|wget|python|node|Go-http/i.test(u) ? 'a program' : 'a browser';
  const os = /Android/.test(u) ? 'Android' : /iPhone|iPad|iOS/.test(u) ? 'iPhone or iPad' : /Windows/.test(u) ? 'Windows'
    : /Mac OS X|Macintosh/.test(u) ? 'Mac' : /CrOS/.test(u) ? 'ChromeOS' : /Linux/.test(u) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}
