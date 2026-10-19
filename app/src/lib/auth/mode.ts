// Whether sign-in is enforced (go-live review L-2): the one place that
// decides, read by the middleware (edge runtime: no Node imports here), the
// routes and the start-up check.
//
//   CIVICOS_AUTH=enforce                    enforced
//   CIVICOS_AUTH=open or CIVICOS_ALLOW_OPEN=1  open, said out loud: a warning at
//                                           every start and a banner on every
//                                           console page in a production build
//   neither                                 enforced in a production build
//                                           (next build / next start, the
//                                           container image), open in
//                                           development and tests (next dev)
//
// A production server therefore fails closed: without an explicit choice it
// needs a verified official for every non-public page, read and change, and
// CIVICOS_SESSION_SECRET for any session. The first installation still works
// under enforcement: /setup sends it to /sign-in, where the first account is
// made with the one-time setup code (lib/auth/setup-token.ts).

export interface AuthEnv { CIVICOS_AUTH?: string; CIVICOS_ALLOW_OPEN?: string; NODE_ENV?: string }

// Read field by field so the build inlines NODE_ENV where it does (middleware, client).
const fromProcess = (): AuthEnv => ({ CIVICOS_AUTH: process.env.CIVICOS_AUTH, CIVICOS_ALLOW_OPEN: process.env.CIVICOS_ALLOW_OPEN, NODE_ENV: process.env.NODE_ENV });

export type AuthMode = { enforced: true; why: 'set' | 'production default' } | { enforced: false; why: 'set open' | 'development default' };

export function authMode(env: AuthEnv = fromProcess()): AuthMode {
  const auth = (env.CIVICOS_AUTH ?? '').trim().toLowerCase();
  if (auth === 'enforce') return { enforced: true, why: 'set' };
  if (auth === 'open' || (env.CIVICOS_ALLOW_OPEN ?? '').trim() === '1') return { enforced: false, why: 'set open' };
  return env.NODE_ENV === 'production' ? { enforced: true, why: 'production default' } : { enforced: false, why: 'development default' };
}

/** Sign-in is enforced: every non-public page, read and change needs a verified official. */
export const authEnforced = (env?: AuthEnv): boolean => authMode(env).enforced;

/** A production server left open on purpose: warned at start and shown on every console page. */
export const openInProduction = (env: AuthEnv = fromProcess()): boolean => env.NODE_ENV === 'production' && !authMode(env).enforced;

export const OPEN_WARNING = 'CIVICOS SIGN-IN IS OFF: this production server was started with CIVICOS_AUTH=open (or CIVICOS_ALLOW_OPEN=1), so anyone who can reach it can read and change everything. Use it only for a demonstration; remove the setting (or set CIVICOS_AUTH=enforce with CIVICOS_SESSION_SECRET) for anything real.';
