// Platform accounts for officials (register 15.4): how a nation without the
// substrate (air-gapped, or before it connects Supabase) signs its officials
// in. Passwords are kept only as scrypt hashes (N=2^17, r=8, p=1, computed
// asynchronously on the libuv thread pool, never on the request thread;
// older, weaker hashes are re-hashed at the next successful sign-in); failed attempts are limited
// per address; every account change and sign-in is audited. With the
// substrate connected, officials sign in there instead and this store is
// only the fallback. Held in platform state (lib/data/persist.ts).

import { randomBytes, scrypt, timingSafeEqual, randomUUID, createHash, type ScryptOptions } from 'node:crypto';
import { matchStep, newSecret, otpauthUri } from './totp';
import { seal, open as openSealed } from '@/lib/crypto/envelope';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { isRole, roleLabel, roleOf, type OfficialRole } from './roles';
import { touch } from '@/lib/data/repo/track';
import { checkSetupCode, consumeSetupCode, localAccountsAllowed, LOCAL_ACCOUNTS_REFUSED } from './setup-token';

export interface OfficialAccount {
  id: string;
  email: string;
  name: string;
  office: string;
  passwordHash: string;
  createdAt: string;
  createdBy: string;
  disabled?: boolean;
  lastSignIn?: string;
  /** Absent on accounts made before roles: they keep everything (roleOf()). */
  role?: OfficialRole;
  /** Ministry id; absent for officials serving the whole government. */
  institution?: string;
  /** Second sign-in step (authenticator app), once confirmed. Never leaves the server. The secret is
   *  sealed with AES-256-GCM under CIVICOS_DATA_KEK (lib/crypto/envelope.ts); plaintext from before that is
   *  still read and sealed on its next use. */
  twoStep?: { secret: string; since: string; lastStep: number; recovery: string[] };
  /** A second step being set up, until its first code is confirmed (secret sealed the same way). */
  twoStepPending?: { secret: string; startedAt: string };
  /** When the password last changed: sessions issued before it no longer count. */
  passwordChangedAt?: string;
  /** A one-time reset code an administrator issued (only its SHA-256 is kept). */
  reset?: { hash: string; expiresAt: string; by: string };
}
/** What screens see of an account: never the password hash or the second-step secret. */
export type PublicAccount = Omit<OfficialAccount, 'passwordHash' | 'twoStep' | 'twoStepPending' | 'reset'> & { twoStepSince?: string; twoStepRequired: boolean; resetPendingUntil?: string };

/** Who must use the second sign-in step: nobody (default), officials who can sign (and administrators), or everyone. */
export type TwoStepPolicy = 'none' | 'signers' | 'all';
interface Db {
  accounts: OfficialAccount[]; failures: Record<string, number[]>; secret?: string; twoStepPolicy?: TwoStepPolicy;
  /** SHA-256 (hex) of each CIVICOS_SETUP_TOKEN already used for a first account: never accepted again (lib/auth/setup-token.ts). */
  setupTokensUsed?: string[];
  /** What substrate officers may do on the platform, set by an administrator (keyed by officer id; lib/auth/substrate-officials.ts). */
  substrateOfficers?: Record<string, SubstrateAssignment>;
  /** Sessions ended before they expire (sign-out): SHA-256 of the token → its expiry (seconds). */
  revoked?: Record<string, number>;
}
/** An administrator's decision about a substrate officer's role and institution on the platform. */
export interface SubstrateAssignment { role: OfficialRole; institution?: string; by: string; at: string }
const g = globalThis as unknown as { __civicosOfficials?: Db };
const db = (): Db => touch('__civicosOfficials', g.__civicosOfficials ??= { accounts: [], failures: {} });
export function resetOfficials(): void { g.__civicosOfficials = undefined; }

export const MIN_PASSWORD = 12;
export const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
/** scrypt cost for new hashes: N=2^17, r=8, p=1 (OWASP). Needs 128·N·r = 128 MiB, so maxmem is raised. */
export const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 288 * 1024 * 1024 } as const;
/** The cost in force. Only the test runner may lower it (CIVICOS_SCRYPT_N under Vitest), to keep suites fast. */
const cost = (): { N: number; r: number; p: number; maxmem: number } => {
  const t = Number(process.env.VITEST ? process.env.CIVICOS_SCRYPT_N : NaN);
  return Number.isInteger(t) && t >= 1024 ? { ...SCRYPT, N: t } : SCRYPT;
};

const norm = (e: string) => e.trim().toLowerCase();
// Compared against when the address is unknown (random salt and digest: nothing anyone can type matches it).
const DUMMY_HASH = `scrypt$${2 ** 17}$${randomBytes(16).toString('base64')}$${randomBytes(32).toString('base64')}`;
const pub = ({ passwordHash: _h, twoStep, twoStepPending: _p, reset, ...a }: OfficialAccount): PublicAccount =>
  ({ ...a, ...(twoStep ? { twoStepSince: twoStep.since } : {}), twoStepRequired: twoStepRequiredFor(a), ...(reset && Date.parse(reset.expiresAt) > Date.now() ? { resetPendingUntil: reset.expiresAt } : {}) });

function scryptAsync(password: string, salt: Buffer, len: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, len, opts, (e, k) => (e ? reject(e) : resolve(k))));
}

/** `scrypt$N$salt$hash` (r=8, p=1), or `scrypt$N$r$p$salt$hash` when r or p differ from 8 and 1. */
async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const c = cost();
  const h = await scryptAsync(password, salt, 32, c);
  return `scrypt$${c.N}$${salt.toString('base64')}$${h.toString('base64')}`;
}

function parseHash(stored: string): { N: number; r: number; p: number; salt: Buffer; want: Buffer } | null {
  const parts = stored.split('$');
  if (parts[0] !== 'scrypt') return null;
  const [n, r, p, salt, h] = parts.length === 6 ? parts.slice(1) : [parts[1], '8', '1', parts[2], parts[3]];
  if (!n || !salt || !h) return null;
  return { N: Number(n), r: Number(r), p: Number(p), salt: Buffer.from(salt, 'base64'), want: Buffer.from(h, 'base64') };
}

async function matches(password: string, stored: string): Promise<boolean> {
  const ph = parseHash(stored);
  if (!ph) return false;
  const got = await scryptAsync(password, ph.salt, ph.want.length, { N: ph.N, r: ph.r, p: ph.p, maxmem: Math.max(SCRYPT.maxmem, 160 * ph.N * ph.r) });
  return got.length === ph.want.length && timingSafeEqual(got, ph.want);
}

/** A hash made with a lower cost than today's, to be replaced at the next successful sign-in. */
export function needsRehash(stored: string): boolean {
  const ph = parseHash(stored);
  const c = cost();
  return !ph || ph.N < c.N || ph.r < c.r || ph.p < c.p;
}

/**
 * Why sessions cannot be issued or verified right now, or null. With sign-in
 * enforced (CIVICOS_AUTH=enforce) the session key must come from
 * CIVICOS_SESSION_SECRET (at least 32 characters), held outside the
 * platform's data: a key generated into the state would let whoever reads a
 * snapshot mint sessions.
 */
export function sessionSecretProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.CIVICOS_AUTH !== 'enforce') return null;
  const s = env.CIVICOS_SESSION_SECRET ?? '';
  if (!s) return 'Sign-in is enforced (CIVICOS_AUTH=enforce) but CIVICOS_SESSION_SECRET is not set, so no session can be issued or verified. Set it to a random value of at least 32 characters, kept outside the platform state.';
  if (s.length < 32) return 'CIVICOS_SESSION_SECRET is shorter than 32 characters; with sign-in enforced, sessions are refused until it is replaced with a longer random value.';
  return null;
}

export class SessionSecretMissing extends Error {}

/**
 * The key that signs sessions: CIVICOS_SESSION_SECRET. Only outside enforce
 * mode (previews, first installation) is one generated and kept in the
 * installation's state; with CIVICOS_AUTH=enforce and no usable variable this
 * throws SessionSecretMissing, so nothing is signed or accepted.
 */
export function sessionSecret(): string {
  const problem = sessionSecretProblem();
  if (problem) throw new SessionSecretMissing(problem);
  if (process.env.CIVICOS_SESSION_SECRET) return process.env.CIVICOS_SESSION_SECRET;
  const d = db();
  return (d.secret ??= randomBytes(32).toString('base64'));
}

export const hasAccounts = (): boolean => db().accounts.length > 0;
export const listAccounts = (): PublicAccount[] => db().accounts.map(pub);

/**
 * Create an account. The first account of an installation needs no signed-in
 * official (it is made at installation, like setup) but needs the one-time
 * setup code (lib/auth/setup-token.ts, review C-1); every later one is made
 * by a signed-in official, named in the audit chain. While the substrate is
 * the sign-in method no platform account is created (unless the operator
 * allows them, CIVICOS_LOCAL_ACCOUNTS=allow).
 */
export async function createAccount(input: { email?: string; name?: string; office?: string; password?: string; role?: string; institution?: string; setupToken?: string }, by: string | null): Promise<PublicAccount | { error: string }> {
  const d = db();
  if (!localAccountsAllowed()) return { error: LOCAL_ACCOUNTS_REFUSED };
  if (d.accounts.length && !by) return { error: 'Only a signed-in official can create accounts' };
  if (!d.accounts.length) {
    const why = checkSetupCode(input.setupToken, d.setupTokensUsed ?? []);
    if (why) {
      if (input.setupToken) recordAudit('first account attempt', 'auth.setup-code', 'Officials:first', 'denied', why);
      return { error: why };
    }
  }
  const email = norm(input.email ?? '');
  const name = (input.name ?? '').trim();
  const office = (input.office ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address' };
  if (!name) return { error: 'Enter the official\'s name' };
  if (!office) return { error: 'Enter the official\'s office' };
  if ((input.password ?? '').length < MIN_PASSWORD) return { error: `The password needs at least ${MIN_PASSWORD} characters` };
  if (d.accounts.some(a => a.email === email)) return { error: 'An account with that email already exists' };
  // The first account administers the installation; later ones get the role they are given (officer by default).
  const first = d.accounts.length === 0;
  const role: OfficialRole = first ? 'administrator' : isRole(input.role) ? input.role : 'officer';
  if (input.role !== undefined && !first && !isRole(input.role)) return { error: 'Unknown role' };
  const institution = first ? undefined : (input.institution ?? '').trim() || undefined;
  const a: OfficialAccount = { id: randomUUID(), email, name: name.slice(0, 120), office: office.slice(0, 160), passwordHash: await hash(input.password!), createdAt: new Date().toISOString(), createdBy: by ?? 'installation', role, institution };
  // Hashing yields the thread: check again that nobody took the address (or became the first account) meanwhile.
  if (d.accounts.some(x => x.email === email)) return { error: 'An account with that email already exists' };
  if (first && d.accounts.length) return { error: 'The first account was created meanwhile; sign in to create more' };
  if (first) {
    // Checked again after the hash yielded the thread, then used up in the same step as the account is added.
    const why = checkSetupCode(input.setupToken, d.setupTokensUsed ?? []);
    if (why) return { error: why };
    const used = consumeSetupCode();
    if (used) d.setupTokensUsed = [...(d.setupTokensUsed ?? []), used];
  }
  d.accounts.push(a);
  recordAudit(by ?? `${a.name} (first account, setup code)`, 'auth.account.create', `Official:${a.id}`, 'ok', `${a.name} · ${a.office} · ${roleLabel(role)}${institution ? ` · ${getMinistry(institution)?.name ?? institution}` : ' · whole government'}`);
  return pub(a);
}

export function setDisabled(id: string, disabled: boolean, by: string): PublicAccount | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  if (disabled && !db().accounts.some(x => x.id !== id && !x.disabled)) return { error: 'The last active account cannot be disabled' };
  if (disabled && isActiveAdmin(a) && !otherActiveAdmin(id)) return { error: 'The last active administrator cannot be disabled' };
  a.disabled = disabled;
  recordAudit(by, disabled ? 'auth.account.disable' : 'auth.account.enable', `Official:${a.id}`, 'ok', a.name);
  return pub(a);
}

const isActiveAdmin = (a: OfficialAccount) => !a.disabled && roleOf(a) === 'administrator';
const otherActiveAdmin = (id: string) => db().accounts.some(x => x.id !== id && isActiveAdmin(x));

export function accountById(id: string): PublicAccount | undefined {
  const a = db().accounts.find(x => x.id === id);
  return a ? pub(a) : undefined;
}

/** Change what an official may do and for which institution (administrators only; audited). */
export function setRole(id: string, input: { role?: string; institution?: string | null }, by: string): PublicAccount | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  const role = input.role === undefined ? roleOf(a) : input.role;
  if (!isRole(role)) return { error: 'Unknown role' };
  if (role !== 'administrator' && isActiveAdmin(a) && !otherActiveAdmin(id)) return { error: 'The last active administrator keeps that role' };
  const institution = input.institution === undefined ? a.institution : (input.institution ?? '').trim() || undefined;
  a.role = role;
  a.institution = institution;
  recordAudit(by, 'auth.account.role', `Official:${a.id}`, 'ok', `${a.name} · ${roleLabel(role)}${institution ? ` · ${getMinistry(institution)?.name ?? institution}` : ' · whole government'}`);
  return pub(a);
}

/**
 * Check a sign-in: the password, then the second step when the account has
 * one (a code from the authenticator app, or an unused recovery code).
 * Refuses after MAX_FAILURES failures for the address within 15 minutes,
 * whatever is entered; a wrong code counts as a failure too. Without a code
 * for an account that needs one the answer is { needsCode }, and nothing is
 * counted.
 */
export async function checkPassword(emailRaw: string, password: string, now = Date.now(), code?: string):
  Promise<(PublicAccount & { secondStep: boolean }) | { error: string; needsCode?: true }> {
  const d = db();
  const email = norm(emailRaw);
  const recent = (d.failures[email] ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return { error: 'Too many failed attempts; try again in 15 minutes' };
  const a = d.accounts.find(x => x.email === email);
  // An unknown address still costs one hash, so the answer's timing does not tell which addresses exist.
  const good = await matches(password, a?.passwordHash ?? DUMMY_HASH);
  if (!a || a.disabled || !good) {
    d.failures[email] = [...(d.failures[email] ?? []).filter(t => now - t < WINDOW_MS), now];
    // Filed against the account it targeted (never the address), so its owner sees it in their sign-in activity.
    recordAudit('sign-in attempt', 'auth.sign-in', a ? `Official:${a.id}` : 'Official:?', 'denied', 'wrong email or password');
    return { error: 'Wrong email or password' };
  }
  if (a.twoStep) {
    if (!code?.trim()) return { error: 'Enter the 6-digit code from your authenticator app', needsCode: true };
    const used = useSecondStep(a, code, now);
    if (typeof used === 'object') return { error: used.error, needsCode: true };
    if (!used) {
      d.failures[email] = [...recent, now];
      recordAudit(a.name, 'auth.sign-in', `Official:${a.id}`, 'denied', 'wrong second-step code');
      return { error: 'That code is not right; enter the current one (or a recovery code)', needsCode: true };
    }
  }
  delete d.failures[email];
  a.lastSignIn = new Date(now).toISOString();
  if (needsRehash(a.passwordHash)) {
    const old = a.passwordHash;
    const upgraded = await hash(password);
    if (a.passwordHash === old) a.passwordHash = upgraded; // unless the password changed meanwhile
  }
  return { ...pub(a), secondStep: !!a.twoStep };
}

// ── Second sign-in step ──────────────────────────────────────────────
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const normRecovery = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '');

const totpAad = (a: OfficialAccount, pending = false) => `${pending ? 'totp-pending' : 'totp'}:${a.id}`;

/** The plaintext authenticator secret; seals it (again) under the current key when it was plaintext or under an old key. */
function totpSecret(a: OfficialAccount, holder: { secret: string }, pending = false): string | { error: string } {
  const r = openSealed(holder.secret, totpAad(a, pending));
  if ('error' in r) return r;
  if (r.reseal) holder.secret = seal(r.plain, totpAad(a, pending));
  return r.plain;
}

const KEY_UNREADABLE = 'The server cannot read this account\'s second-step key (CIVICOS_DATA_KEK missing or changed); ask an administrator';

/** Accept a current authenticator code (each only once) or an unused recovery code (then spent). */
function useSecondStep(a: OfficialAccount, code: string, now: number): boolean | { error: string } {
  const t = a.twoStep!;
  const secret = totpSecret(a, t);
  if (typeof secret !== 'string') {
    recordAudit(a.name, 'auth.two-step.key', `Official:${a.id}`, 'error', secret.error);
    // Recovery codes are hashes, not sealed: they still work while the key is unreadable.
    if (!useRecovery(a, code)) return { error: KEY_UNREADABLE };
    return true;
  }
  const step = matchStep(secret, code, now, t.lastStep);
  if (step !== null) { t.lastStep = step; return true; }
  return useRecovery(a, code);
}

function useRecovery(a: OfficialAccount, code: string): boolean {
  const t = a.twoStep!;
  const h = sha(normRecovery(code));
  const i = t.recovery.indexOf(h);
  if (i >= 0 && normRecovery(code).length >= 10) {
    t.recovery.splice(i, 1);
    recordAudit(a.name, 'auth.two-step.recovery-used', `Official:${a.id}`, 'ok', `${t.recovery.length} recovery codes left`);
    return true;
  }
  return false;
}

export const twoStepPolicy = (): TwoStepPolicy => db().twoStepPolicy ?? 'none';
/** Whether the installation's policy requires this account to use the second step. */
export function twoStepRequiredFor(a: Pick<OfficialAccount, 'role'>): boolean {
  const p = twoStepPolicy();
  const r = roleOf(a);
  return p === 'all' || (p === 'signers' && (r === 'administrator' || r === 'signatory'));
}

export function setTwoStepPolicy(policy: string, by: string): { policy: TwoStepPolicy } | { error: string } {
  if (policy !== 'none' && policy !== 'signers' && policy !== 'all') return { error: 'Policy must be none, signers or all' };
  db().twoStepPolicy = policy;
  recordAudit(by, 'auth.two-step.policy', 'Officials:two-step', 'ok', policy);
  return { policy };
}

/** Start setting up the second step: a new secret, shown once, until confirmed with a code. */
export function startTwoStep(id: string, issuer: string): { secret: string; uri: string } | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  if (a.twoStep) return { error: 'The second step is already set up; turn it off first to set up another app' };
  const secret = newSecret();
  a.twoStepPending = { secret: seal(secret, totpAad(a, true)), startedAt: new Date().toISOString() };
  return { secret, uri: otpauthUri(secret, a.email, issuer) };
}

/** Confirm the app with its first code; returns ten recovery codes, shown once. */
export function confirmTwoStep(id: string, code: string, now = Date.now()): { recoveryCodes: string[] } | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a?.twoStepPending) return { error: 'Start setting up the second step first' };
  const pending = totpSecret(a, a.twoStepPending, true);
  if (typeof pending !== 'string') return { error: 'Start setting up the second step again (the key being set up cannot be read)' };
  const step = matchStep(pending, code, now);
  if (step === null) return { error: 'That code is not right; check the time on your phone and enter the current code' };
  const recoveryCodes = Array.from({ length: 10 }, () => { const h = randomBytes(5).toString('hex'); return `${h.slice(0, 5)}-${h.slice(5)}`; });
  a.twoStep = { secret: seal(pending, totpAad(a)), since: new Date(now).toISOString(), lastStep: step, recovery: recoveryCodes.map(c => sha(normRecovery(c))) };
  delete a.twoStepPending;
  recordAudit(a.name, 'auth.two-step.on', `Official:${a.id}`, 'ok', 'authenticator app');
  return { recoveryCodes };
}

/** Turn the second step off: by its owner with a current code (when policy allows), or reset by an administrator for a lost phone. */
export function removeTwoStep(id: string, opts: { code?: string; by: string; reset?: boolean }, now = Date.now()): PublicAccount | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  if (!a.twoStep) { delete a.twoStepPending; return pub(a); }
  if (!opts.reset) {
    if (twoStepRequiredFor(a)) return { error: 'This installation requires the second step for you; an administrator can reset it if your phone is lost' };
    const used = opts.code ? useSecondStep(a, opts.code, now) : false;
    if (typeof used === 'object') return used;
    if (!used) return { error: 'Enter a current code to turn the second step off' };
  }
  delete a.twoStep; delete a.twoStepPending;
  recordAudit(opts.by, opts.reset ? 'auth.two-step.reset' : 'auth.two-step.off', `Official:${a.id}`, 'ok', a.name);
  return pub(a);
}

// ── Password change and reset ────────────────────────────────────────
const RESET_HOURS = 24;

function newPasswordProblem(next: string | undefined): string | null {
  if ((next ?? '').length < MIN_PASSWORD) return `The new password needs at least ${MIN_PASSWORD} characters`;
  if ((next ?? '').length > 256) return 'The new password is too long';
  return null;
}

/** The official changes their own password with the current one; every earlier session of theirs stops counting. */
export async function changePassword(id: string, current: string, next: string, now = Date.now()): Promise<PublicAccount | { error: string }> {
  const a = db().accounts.find(x => x.id === id);
  if (!a || a.disabled) return { error: 'No such account' };
  if (!(await matches(current ?? '', a.passwordHash))) {
    recordAudit(a.name, 'auth.password.change', `Official:${a.id}`, 'denied', 'wrong current password');
    return { error: 'The current password is not right' };
  }
  const bad = newPasswordProblem(next);
  if (bad) return { error: bad };
  if (await matches(next, a.passwordHash)) return { error: 'Choose a password different from the current one' };
  a.passwordHash = await hash(next);
  a.passwordChangedAt = new Date(now).toISOString();
  delete a.reset;
  recordAudit(a.name, 'auth.password.change', `Official:${a.id}`, 'ok', 'other sessions ended');
  return pub(a);
}

/**
 * An administrator issues a one-time reset code for an official who forgot
 * their password, to hand over in person. The code is shown once, kept only
 * as a SHA-256 hash, and expires after 24 hours; the administrator never
 * sees or sets the password itself.
 */
export function issueReset(id: string, by: string, now = Date.now()): { code: string; expiresAt: string } | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  if (a.disabled) return { error: 'Enable the account first' };
  const raw = randomBytes(9).toString('hex').toUpperCase();
  const code = `${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12)}`;
  const expiresAt = new Date(now + RESET_HOURS * 3_600_000).toISOString();
  a.reset = { hash: createHash('sha256').update(raw).digest('hex'), expiresAt, by };
  recordAudit(by, 'auth.password.reset-issued', `Official:${a.id}`, 'ok', `${a.name} · expires ${expiresAt}`);
  return { code, expiresAt };
}

/** Set a new password with a reset code (no session). Wrong codes count toward the sign-in lockout. */
export async function resetPassword(emailRaw: string, code: string, next: string, now = Date.now()): Promise<PublicAccount | { error: string }> {
  const d = db();
  const email = norm(emailRaw);
  const recent = (d.failures[email] ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return { error: 'Too many failed attempts; try again in 15 minutes' };
  const a = d.accounts.find(x => x.email === email);
  const raw = (code ?? '').toUpperCase().replace(/[^0-9A-F]/g, '');
  const want = a?.reset ? Buffer.from(a.reset.hash, 'hex') : null;
  const got = createHash('sha256').update(raw).digest();
  const valid = !!a && !a.disabled && !!want && Date.parse(a.reset!.expiresAt) > now && want.length === got.length && timingSafeEqual(want, got);
  if (!valid) {
    d.failures[email] = [...recent, now];
    recordAudit('password reset attempt', 'auth.password.reset', a ? `Official:${a.id}` : 'Official:?', 'denied', 'wrong or expired reset code');
    return { error: 'That reset code is not right or has expired; ask an administrator for a new one' };
  }
  const bad = newPasswordProblem(next);
  if (bad) return { error: bad };
  const fresh = await hash(next);
  if (!a!.reset) return { error: 'That reset code has just been used' };
  a!.passwordHash = fresh;
  a!.passwordChangedAt = new Date(now).toISOString();
  delete a!.reset;
  delete d.failures[email];
  recordAudit(a!.name, 'auth.password.reset', `Official:${a!.id}`, 'ok', 'new password set with a reset code; other sessions ended');
  return pub(a!);
}

// ── Substrate officers' role and institution on the platform (review H-3) ──
// Officials who sign in through the substrate have no platform account; what
// they may do here is the administrator's decision recorded below, or, when
// none is recorded, the least the officer register supports
// (lib/auth/substrate-officials.ts).

export const substrateAssignment = (officerId: string): SubstrateAssignment | undefined => db().substrateOfficers?.[officerId];
export const listSubstrateAssignments = (): ({ officerId: string } & SubstrateAssignment)[] =>
  Object.entries(db().substrateOfficers ?? {}).map(([officerId, a]) => ({ officerId, ...a }));

/** Record (or, with role null, remove) what a substrate officer may do on the platform. Administrators only; audited. */
export function setSubstrateAssignment(officerId: string, input: { role?: string | null; institution?: string | null; name?: string }, by: string, now = Date.now()): ({ officerId: string } & SubstrateAssignment) | { removed: string } | { error: string } {
  const id = (officerId ?? '').trim();
  if (!/^[0-9a-zA-Z-]{1,64}$/.test(id)) return { error: 'Give the officer\'s id from the substrate\'s officer register' };
  const d = db();
  const label = (input.name ?? '').trim().slice(0, 120) || `officer ${id}`;
  if (input.role === null) {
    if (d.substrateOfficers?.[id]) {
      delete d.substrateOfficers[id];
      recordAudit(by, 'auth.substrate-officer.role', `Official:officer:${id}`, 'ok', `${label} · assignment removed (register default applies)`);
    }
    return { removed: id };
  }
  if (!isRole(input.role)) return { error: 'Unknown role' };
  const institution = (input.institution ?? '').trim() || undefined;
  if (institution && !getMinistry(institution)) return { error: 'Unknown institution' };
  const a: SubstrateAssignment = { role: input.role, institution, by, at: new Date(now).toISOString() };
  (d.substrateOfficers ??= {})[id] = a;
  recordAudit(by, 'auth.substrate-officer.role', `Official:officer:${id}`, 'ok', `${label} · ${roleLabel(a.role)}${institution ? ` · ${getMinistry(institution)?.name ?? institution}` : ' · whole government'}`);
  return { officerId: id, ...a };
}

// ── Ended sessions (review M-1) ──────────────────────────────────────
// Signing out ends the session on the server, not only in the browser: the
// token's SHA-256 is kept until the token would have expired, and
// currentOfficial() refuses it (so the middleware does too, for reads and
// changes alike).

/** End a session before it expires. `exp` is the token's expiry (seconds since 1970). */
export function revokeSession(tokenHash: string, exp: number, now = Date.now()): void {
  const d = db();
  const nowS = Math.floor(now / 1000);
  const kept: Record<string, number> = {};
  for (const [h, e] of Object.entries(d.revoked ?? {})) if (e > nowS) kept[h] = e;
  if (exp > nowS) kept[tokenHash] = exp;
  d.revoked = kept;
}
export const sessionRevoked = (tokenHash: string): boolean => !!db().revoked?.[tokenHash];
