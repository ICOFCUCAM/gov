// The one-time setup code for an installation's first administrator
// (go-live review C-1). Until the first official account exists, anyone who
// could reach the server could otherwise create it and administer the
// nation. The first account therefore needs a code only the operator has:
//
//   • CIVICOS_SETUP_TOKEN (at least 24 characters; the same on every replica),
//     optionally ending at CIVICOS_SETUP_TOKEN_EXPIRES (an ISO date-time); or
//   • when that is not set, a random code the server writes once to its own
//     output (stdout, never the log ring /api/health shows) when it starts
//     without accounts, valid SETUP_CODE_HOURS. An expired code is replaced
//     by a new one, written the same way, at the next attempt.
//
// The code is compared in constant time (SHA-256 of both sides, then
// timingSafeEqual) and works once: a written code is forgotten when it is
// used, and a used CIVICOS_SETUP_TOKEN is remembered (by its hash, in the
// officials' store) and refused afterwards. Wrong codes are audited and
// limited. When the substrate is the sign-in method, platform accounts are
// not created at all unless CIVICOS_LOCAL_ACCOUNTS=allow (break-glass).
//
// The written code lives on globalThis under a key that does not start with
// `__civicos`, so it is never saved with the platform's state.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { serverClient } from '@/lib/db/client';
import { logger } from '@/lib/ops/log';

export const SETUP_CODE_HOURS = 24;
export const MIN_SETUP_TOKEN = 24;
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60_000;

interface Written { hash: Buffer; expiresAt: number }
const g = globalThis as unknown as { __setupCode?: Written | null; __setupCodeFailures?: number[] };

const sha = (v: string) => createHash('sha256').update(v, 'utf8').digest();
/** Written codes are typed by people: case, spaces and dashes do not matter. */
const normWritten = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

/** Whether platform accounts may be created here: not while the substrate is the sign-in method, unless allowed explicitly. */
export function localAccountsAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.CIVICOS_LOCAL_ACCOUNTS === 'allow') return true;
  try { return !serverClient(); } catch { return true; }
}

export const LOCAL_ACCOUNTS_REFUSED = 'Officials on this installation sign in through the substrate; platform accounts are not created here (an operator can allow them as a fallback with CIVICOS_LOCAL_ACCOUNTS=allow)';

/** The operator's CIVICOS_SETUP_TOKEN, or why it cannot be used; null when it is not set. */
function envToken(now: number): { token: string } | { error: string } | null {
  const t = (process.env.CIVICOS_SETUP_TOKEN ?? '').trim();
  if (!t) return null;
  if (t.length < MIN_SETUP_TOKEN) return { error: `CIVICOS_SETUP_TOKEN is shorter than ${MIN_SETUP_TOKEN} characters; the operator must replace it with a longer random value` };
  const until = process.env.CIVICOS_SETUP_TOKEN_EXPIRES;
  if (until && !(Date.parse(until) > now)) return { error: 'The setup code (CIVICOS_SETUP_TOKEN) has expired; the operator must set a new one' };
  return { token: t };
}

/** Write a new code to the server's own output (shown nowhere else). */
function writeCode(code: string, expiresAt: number, out: (s: string) => void): void {
  const grouped = code.match(/.{1,4}/g)!.join('-');
  out(`\n================ CIVICOS SETUP CODE ================\n`
    + `No official account exists yet. To create the first administrator,\n`
    + `open /sign-in (or /setup) and enter this one-time code:\n\n`
    + `    ${grouped}\n\n`
    + `It works once and expires ${new Date(expiresAt).toISOString()}.\n`
    + `Set CIVICOS_SETUP_TOKEN to choose your own instead.\n`
    + `====================================================\n\n`);
  // The structured log says that a code was written, never the code.
  logger.info('auth.setup_code.written', { expiresAt: new Date(expiresAt).toISOString() });
}

const defaultOut = (s: string) => { process.stdout.write(s); };

/**
 * Make sure a setup code exists while no account does: nothing when
 * CIVICOS_SETUP_TOKEN is set, else a written code (a new one when there is
 * none or it has expired). Called at start (instrumentation.ts) and before
 * each first-account attempt. `out` receives the text (tests capture it).
 */
export function ensureSetupCode(opts: { now?: number; out?: (s: string) => void } = {}): { written: boolean } {
  const now = opts.now ?? Date.now();
  if (envToken(now)) return { written: false };
  const cur = g.__setupCode;
  if (cur && cur.expiresAt > now) return { written: false };
  const bytes = randomBytes(20);
  const code = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
  const expiresAt = now + SETUP_CODE_HOURS * 3_600_000;
  g.__setupCode = { hash: sha(code), expiresAt };
  writeCode(code, expiresAt, opts.out ?? defaultOut);
  return { written: true };
}

/** Forget the written code (tests, and after use). */
export function resetSetupCode(): void { g.__setupCode = undefined; g.__setupCodeFailures = undefined; }

/**
 * Check a setup code for the first account. Returns null when it is right,
 * or the reason it is refused. Does not use it up: call consumeSetupCode()
 * when the account is actually created. `used` holds the hashes of
 * CIVICOS_SETUP_TOKEN values already used here.
 */
export function checkSetupCode(given: string | undefined, used: string[], now = Date.now()): string | null {
  const recent = (g.__setupCodeFailures ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return 'Too many wrong setup codes; try again in 15 minutes';
  const fail = (why: string) => { g.__setupCodeFailures = [...recent, now]; return why; };
  const env = envToken(now);
  if (env && 'error' in env) return env.error;
  const raw = (given ?? '').trim();
  if (!raw) {
    if (!env) ensureSetupCode({ now });
    return 'Enter the one-time setup code. The operator sets it as CIVICOS_SETUP_TOKEN, or finds it in the server\'s output at start (CIVICOS SETUP CODE)';
  }
  if (env) {
    const h = sha(env.token);
    if (used.includes(h.toString('hex'))) return 'This setup code (CIVICOS_SETUP_TOKEN) has already been used; the operator must set a new one';
    return timingSafeEqual(sha(raw), h) ? null : fail('That setup code is not right');
  }
  const cur = g.__setupCode;
  if (!cur || cur.expiresAt <= now) {
    ensureSetupCode({ now });
    return 'The setup code has expired; a new one has been written to the server\'s output';
  }
  return timingSafeEqual(sha(normWritten(raw)), cur.hash) ? null : fail('That setup code is not right');
}

/**
 * Use the code up, once the first account has been created: a written code
 * is forgotten; for CIVICOS_SETUP_TOKEN the hash to remember is returned.
 */
export function consumeSetupCode(now = Date.now()): string | null {
  g.__setupCodeFailures = undefined;
  const env = envToken(now);
  if (env && 'token' in env) return sha(env.token).toString('hex');
  g.__setupCode = null;
  return null;
}
