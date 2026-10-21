// Platform accounts for officials (register 15.4): how a nation without the
// substrate (air-gapped, or before it connects Supabase) signs its officials
// in. Passwords are kept only as scrypt hashes (N=2^17, r=8, p=1, computed
// asynchronously on the libuv thread pool, never on the request thread;
// older, weaker hashes are re-hashed at the next successful sign-in); failed attempts are limited
// per address; every account change and sign-in is audited. With the
// substrate connected, officials sign in there instead and this store is
// only the fallback. Held in platform state (lib/data/persist.ts).

import { registerPersonResolver } from '@/lib/data/dual-control';
import { authEnforced } from './mode';
import { samplesAllowed } from '@/lib/ops/mode';
import { randomBytes, scrypt, timingSafeEqual, randomUUID, createHash, type ScryptOptions } from 'node:crypto';
import { matchStep, newSecret, otpauthUri } from './totp';
import { seal, open as openSealed } from '@/lib/crypto/envelope';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { isRole, roleLabel, roleOf, twoStepCovers, type OfficialRole, type TwoStepPolicy } from './roles';
import { touch } from '@/lib/data/repo/track';
import { recordAggregated } from '@/lib/audit/aggregate';
import { checkSetupCode, consumeSetupCode, localAccountsAllowed, LOCAL_ACCOUNTS_REFUSED } from './setup-token';
import { verifyAssertion, verifyRegistration, WebAuthnError, type AssertionJSON, type RegistrationJSON } from './webauthn';
import { creationOptions, newChallenge, requestOptions, takeChallenge, type RelyingParty } from './passkeys';

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
  /** Passkeys and security keys (WebAuthn): public keys only, never a private key or a biometric. */
  passkeys?: StoredPasskey[];
  /** The official's identity at the government's identity provider (lib/auth/oidc.ts), linked by an administrator or by a verified email. */
  identity?: { issuer: string; claim: string; value: string; linkedAt: string; linkedBy: string };
  /** Made for an identity-provider sign-in: no platform password (the hash matches nothing). */
  noPassword?: boolean;
  /** One of the demo cast (lib/auth/demo-cast.ts): made only in a demo or training installation, reached only by
   *  switching to it (/api/demo/act-as), never by a password; refused everywhere once samples are not allowed
   *  (a demo snapshot restored into production signs nobody in as the cast). Absent on every other account
   *  (and on snapshots saved before the cast existed), which reads as "not the cast". */
  demo?: true;
}

export interface StoredPasskey {
  /** Credential id, base64url. */
  id: string;
  /** COSE public key, base64url. */
  publicKey: string;
  alg: number;
  signCount: number;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  aaguid: string;
  backupEligible: boolean;
  transports: string[];
}
/** What screens see of a passkey. */
export interface PasskeySummary { id: string; name: string; createdAt: string; lastUsedAt?: string; synced: boolean }
const passkeySummary = (p: StoredPasskey): PasskeySummary => ({ id: p.id, name: p.name, createdAt: p.createdAt, ...(p.lastUsedAt ? { lastUsedAt: p.lastUsedAt } : {}), synced: p.backupEligible });
/** What screens see of an account: never the password hash or the second-step secret. */
export type PublicAccount = Omit<OfficialAccount, 'passwordHash' | 'twoStep' | 'twoStepPending' | 'reset' | 'passkeys'> & { twoStepSince?: string; twoStepRequired: boolean; resetPendingUntil?: string; passkeys: PasskeySummary[]; secondStepOn: boolean };

/** Who must use the second sign-in step (the type and the rule live in roles.ts). */
export type { TwoStepPolicy } from './roles';
interface Db {
  accounts: OfficialAccount[]; failures: Record<string, number[]>; secret?: string; twoStepPolicy?: TwoStepPolicy;
  /** Who last set the two-step policy and when (absent until it is first set; the audit chain keeps every change). */
  twoStepPolicySet?: { by: string; at: string };
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

// ── Failed attempts (go-live review M-9, M-13) ───────────────────────────
// The lockout counts failures per typed address, but the address itself is
// never kept: the key is a SHA-256 of it (people type passwords into the
// email field too). Counts older than the window are dropped whenever a key
// is touched, by the retention sweep (sweepSignInFailures) and when the map
// reaches MAX_FAILURE_KEYS. Refusals reach the audit chain through
// lib/audit/aggregate.ts: a few per account and window, then one summary.
const MAX_FAILURE_KEYS = 10_000;
const failureKey = (email: string) => `h:${createHash('sha256').update(`civicos-signin|${email}`).digest('hex').slice(0, 32)}`;
const recentFailures = (d: Db, email: string, now: number): number[] => (d.failures[failureKey(email)] ?? []).filter(t => now - t < WINDOW_MS);
function noteFailure(d: Db, email: string, recent: number[], now: number): void {
  const key = failureKey(email);
  delete d.failures[key];
  d.failures[key] = [...recent, now].slice(-MAX_FAILURES);
  const keys = Object.keys(d.failures);
  if (keys.length <= MAX_FAILURE_KEYS) return;
  sweepSignInFailures(now);
  const left = Object.keys(d.failures);
  for (let i = 0; i < left.length - MAX_FAILURE_KEYS; i++) delete d.failures[left[i]!];
}
const clearFailures = (d: Db, email: string) => { delete d.failures[failureKey(email)]; };
/** Refusals to the audit chain, bounded per targeted account (or unknown address) and window. */
const auditRefusal = (actor: string, action: string, resource: string, detail: string, now: number) =>
  recordAggregated(`${action}|${resource}`, { actor, action, resource, outcome: 'denied', detail }, now);

/** Drop failure counts that have left the window (and keys from before they were hashed). Returns how many keys went. */
export function sweepSignInFailures(now = Date.now()): number {
  const f = db().failures;
  let n = 0;
  for (const [k, list] of Object.entries(f)) {
    if (k.startsWith('h:') && list.some(t => now - t < WINDOW_MS)) continue;
    delete f[k];
    n++;
  }
  return n;
}
/** The keys of the failure counter (hashes; for tests). */
export const failureKeys = (): string[] => Object.keys(db().failures);
// Compared against when the address is unknown (random salt and digest: nothing anyone can type matches it),
// at the cost in force, so an unknown address takes as long as a real one.
const DUMMY_SALT = randomBytes(16).toString('base64'), DUMMY_DIGEST = randomBytes(32).toString('base64');
const dummyHash = () => `scrypt$${cost().N}$${DUMMY_SALT}$${DUMMY_DIGEST}`;
const pub = ({ passwordHash: _h, twoStep, twoStepPending: _p, reset, passkeys, ...a }: OfficialAccount): PublicAccount =>
  ({ ...a, ...(twoStep ? { twoStepSince: twoStep.since } : {}), twoStepRequired: twoStepRequiredFor(a), ...(reset && Date.parse(reset.expiresAt) > Date.now() ? { resetPendingUntil: reset.expiresAt } : {}),
    passkeys: (passkeys ?? []).map(passkeySummary), secondStepOn: !!twoStep || !!passkeys?.length });
/** Whether the account has a second step (authenticator app or a passkey). */
const hasSecondStep = (a: OfficialAccount) => !!a.twoStep || !!a.passkeys?.length;
/** A demo cast account on an installation that may not hold samples (production): it signs nobody in. */
export const demoAccountRefused = (a: { demo?: boolean }): boolean => !!a.demo && !samplesAllowed();

// At most this many password hashes at once (go-live review M-9): each takes 128 MiB and a thread of the
// libuv pool, which DNS lookups and file reads share; the rest wait their turn.
const HASH_SLOTS = Math.max(1, Number(process.env.CIVICOS_SCRYPT_CONCURRENCY) || 2);
let hashing = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (hashing >= HASH_SLOTS) await new Promise<void>(r => waiting.push(r));
  hashing++;
  try { return await fn(); } finally { hashing--; waiting.shift()?.(); }
}

function scryptAsync(password: string, salt: Buffer, len: number, opts: ScryptOptions): Promise<Buffer> {
  return slot(() => new Promise((resolve, reject) => scrypt(password, salt, len, opts, (e, k) => (e ? reject(e) : resolve(k)))));
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
  if (!authEnforced(env)) return null;
  const s = env.CIVICOS_SESSION_SECRET ?? '';
  if (!s) return 'Sign-in is enforced (CIVICOS_AUTH=enforce, or a production server without CIVICOS_AUTH=open) but CIVICOS_SESSION_SECRET is not set, so no session can be issued or verified. Set it to a random value of at least 32 characters, kept outside the platform state.';
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
export async function checkPassword(emailRaw: string, password: string, now = Date.now(), code?: string, passkey?: { challengeId?: string; response?: AssertionJSON; rp?: RelyingParty | null }):
  Promise<(PublicAccount & { secondStep: boolean }) | { error: string; needsCode?: true; passkey?: ReturnType<typeof requestOptions> }> {
  const d = db();
  const email = norm(emailRaw);
  if (recentFailures(d, email, now).length >= MAX_FAILURES) return { error: 'Too many failed attempts; try again in 15 minutes' };
  const a = d.accounts.find(x => x.email === email);
  // An unknown address still costs one hash, so the answer's timing does not tell which addresses exist.
  const good = await matches(password, a?.passwordHash ?? dummyHash());
  // Counted after the hash: attempts made meanwhile are in the count too.
  const recent = recentFailures(d, email, now);
  if (!a || a.disabled || !good || demoAccountRefused(a)) {
    noteFailure(d, email, recent, now);
    // Filed against the account it targeted (never the address), so its owner sees it in their sign-in activity.
    auditRefusal('sign-in attempt', 'auth.sign-in', a ? `Official:${a.id}` : 'Official:?', 'wrong email or password', now);
    return { error: 'Wrong email or password' };
  }
  if (passkey?.response && a.passkeys?.length) {
    // The second step with a passkey: the challenge was issued for this account after its password was checked.
    const r = passkey.rp ? usePasskey(a, passkey.challengeId ?? '', passkey.response, passkey.rp, 'second-step', false, now) : { error: 'Passkeys are not available on this installation yet' };
    if ('error' in r) {
      noteFailure(d, email, recent, now);
      auditRefusal(a.name, 'auth.sign-in', `Official:${a.id}`, `passkey: ${r.error}`, now);
      return { error: r.error, ...(a.twoStep ? { needsCode: true as const } : {}) };
    }
  } else if (hasSecondStep(a)) {
    if (!code?.trim() || !a.twoStep) {
      // Offer what the account has: a passkey (a fresh challenge for this account) and/or the authenticator code.
      const options = a.passkeys?.length && passkey?.rp ? passkeyChallengeFor(a, passkey.rp, now) : undefined;
      if (!a.twoStep && !options) return { error: 'This account finishes signing in with a passkey; passkeys are not available on this installation yet (CIVICOS_PUBLIC_URL)' };
      return { error: a.twoStep ? (options ? 'Use your passkey, or enter the 6-digit code from your authenticator app' : 'Enter the 6-digit code from your authenticator app') : 'Use your passkey to finish signing in',
        ...(a.twoStep ? { needsCode: true as const } : {}), ...(options ? { passkey: options } : {}) };
    }
    const used = useSecondStep(a, code, now);
    if (typeof used === 'object') return { error: used.error, needsCode: true };
    if (!used) {
      noteFailure(d, email, recent, now);
      auditRefusal(a.name, 'auth.sign-in', `Official:${a.id}`, 'wrong second-step code', now);
      return { error: 'That code is not right; enter the current one (or a recovery code)', needsCode: true };
    }
  }
  clearFailures(d, email);
  a.lastSignIn = new Date(now).toISOString();
  if (needsRehash(a.passwordHash)) {
    const old = a.passwordHash;
    const upgraded = await hash(password);
    if (a.passwordHash === old) a.passwordHash = upgraded; // unless the password changed meanwhile
  }
  return { ...pub(a), secondStep: hasSecondStep(a) };
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
/** Who last set the policy and when; null while it has never been set (the default, nobody required). */
export const twoStepPolicySet = (): { by: string; at: string } | null => db().twoStepPolicySet ?? null;
/** Whether the installation's policy requires this account to use the second step. */
export function twoStepRequiredFor(a: Pick<OfficialAccount, 'role'>): boolean {
  return twoStepCovers(twoStepPolicy(), roleOf(a));
}

export function setTwoStepPolicy(policy: string, by: string): { policy: TwoStepPolicy } | { error: string } {
  if (policy !== 'none' && policy !== 'signers' && policy !== 'all') return { error: 'Policy must be none, signers or all' };
  db().twoStepPolicy = policy;
  db().twoStepPolicySet = { by, at: new Date().toISOString() };
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
  if (opts.reset && a.passkeys?.length) {
    // A lost device: the administrator's reset removes the passkeys too; the official registers them again.
    const n = a.passkeys.length;
    delete a.passkeys;
    recordAudit(opts.by, 'auth.passkey.reset', `Official:${a.id}`, 'ok', `${a.name} · ${n} passkey${n === 1 ? '' : 's'} removed`);
  }
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
  const recent = recentFailures(d, email, now);
  if (recent.length >= MAX_FAILURES) return { error: 'Too many failed attempts; try again in 15 minutes' };
  const a = d.accounts.find(x => x.email === email);
  const raw = (code ?? '').toUpperCase().replace(/[^0-9A-F]/g, '');
  const want = a?.reset ? Buffer.from(a.reset.hash, 'hex') : null;
  const got = createHash('sha256').update(raw).digest();
  const valid = !!a && !a.disabled && !!want && Date.parse(a.reset!.expiresAt) > now && want.length === got.length && timingSafeEqual(want, got);
  if (!valid) {
    noteFailure(d, email, recent, now);
    auditRefusal('password reset attempt', 'auth.password.reset', a ? `Official:${a.id}` : 'Official:?', 'wrong or expired reset code', now);
    return { error: 'That reset code is not right or has expired; ask an administrator for a new one' };
  }
  const bad = newPasswordProblem(next);
  if (bad) return { error: bad };
  const fresh = await hash(next);
  if (!a!.reset) return { error: 'That reset code has just been used' };
  a!.passwordHash = fresh;
  a!.passwordChangedAt = new Date(now).toISOString();
  delete a!.reset;
  clearFailures(d, email);
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

/**
 * Whether an institution has its own officials who can sign or administer
 * (enabled platform accounts, and substrate officers assigned there): an
 * independent institution with such officials confirms changes made to it
 * (its standing, its accounts) itself (lib/data/store/institutions.ts,
 * lib/auth/account-changes.ts).
 */
export function hasOwnSigners(institution: string): boolean {
  const can = (r?: OfficialRole) => r === 'signatory' || r === 'administrator';
  return db().accounts.some(a => !a.disabled && a.institution === institution && can(roleOf(a)) && !demoAccountRefused(a))
    || Object.values(db().substrateOfficers ?? {}).some(a => a.institution === institution && can(a.role));
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
// ── Passkeys (WebAuthn) ──────────────────────────────────────────────
// Registered by the official under My account; used as the second sign-in
// step after the password, or to sign in on their own (a passkey that
// verified the person, by PIN or biometric, counts as both steps). Every
// registration, removal and refusal is audited; a counter that goes
// backwards (a copied authenticator) is refused and recorded.

const MAX_PASSKEYS = 10;
const userHandle = (a: OfficialAccount) => Buffer.from(a.id, 'utf8').toString('base64url');

function passkeyChallengeFor(a: OfficialAccount, rp: RelyingParty, now: number) {
  const c = newChallenge('second-step', a.id, now);
  return requestOptions(c, rp, (a.passkeys ?? []).map(p => ({ id: p.id, transports: p.transports })), 'preferred');
}

function usePasskey(a: OfficialAccount, challengeId: string, response: AssertionJSON, rp: RelyingParty, purpose: 'second-step' | 'sign-in', requireUv: boolean, now: number): { uv: boolean } | { error: string } {
  const c = takeChallenge(challengeId, purpose, purpose === 'second-step' ? a.id : undefined, now);
  if (!c) return { error: 'The passkey request has expired or was used already; try again' };
  const cred = a.passkeys?.find(p => p.id === response?.id);
  if (!cred) return { error: 'That passkey is not registered to this account' };
  if (response.response?.userHandle && response.response.userHandle !== userHandle(a)) return { error: 'That passkey belongs to another account' };
  try {
    const r = verifyAssertion(response, { challenge: c.challenge, origins: [rp.origin], rpId: rp.rpId, requireUv }, cred);
    cred.signCount = r.signCount;
    cred.lastUsedAt = new Date(now).toISOString();
    return { uv: r.uv };
  } catch (e) {
    const why = e instanceof WebAuthnError ? e.message : 'The passkey could not be checked';
    if (/counter/.test(why)) recordAudit(a.name, 'auth.passkey.counter', `Official:${a.id}`, 'denied', `${cred.name}: ${why}`);
    return { error: why };
  }
}

/** Start registering a passkey: the browser's creation options. An account that already has a second step needs a session that passed it. */
export function passkeyRegistrationOptions(id: string, rp: RelyingParty, sessionPassedSecondStep: boolean, now = Date.now()): ReturnType<typeof creationOptions> | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a || a.disabled) return { error: 'No such account' };
  if (hasSecondStep(a) && !sessionPassedSecondStep) return { error: 'Sign in with your current second step (code or passkey) before adding a passkey' };
  if ((a.passkeys?.length ?? 0) >= MAX_PASSKEYS) return { error: `An account can hold at most ${MAX_PASSKEYS} passkeys; remove one first` };
  const c = newChallenge('register', a.id, now);
  return creationOptions(c, rp, { id: userHandle(a), name: a.email, displayName: a.name }, (a.passkeys ?? []).map(p => ({ id: p.id, transports: p.transports })));
}

/** Finish registering: verify the authenticator's answer and keep its public key. */
export function registerPasskey(id: string, input: { challengeId?: string; response?: RegistrationJSON; name?: string }, rp: RelyingParty, now = Date.now()): { passkey: PasskeySummary } | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a || a.disabled) return { error: 'No such account' };
  const c = takeChallenge(input.challengeId ?? '', 'register', a.id, now);
  if (!c) return { error: 'The registration has expired or was used already; start again' };
  let cred;
  try {
    cred = verifyRegistration(input.response as RegistrationJSON, { challenge: c.challenge, origins: [rp.origin], rpId: rp.rpId, requireUv: false });
  } catch (e) {
    const why = e instanceof WebAuthnError ? e.message : 'The passkey could not be checked';
    recordAudit(a.name, 'auth.passkey.add', `Official:${a.id}`, 'denied', why);
    return { error: why };
  }
  if (db().accounts.some(x => x.passkeys?.some(p => p.id === cred.id))) return { error: 'This passkey is already registered' };
  const name = (input.name ?? '').trim().slice(0, 60) || `Passkey ${(a.passkeys?.length ?? 0) + 1}`;
  const p: StoredPasskey = { id: cred.id, publicKey: cred.publicKey, alg: cred.alg, signCount: cred.signCount, name, createdAt: new Date(now).toISOString(), aaguid: cred.aaguid, backupEligible: cred.backupEligible, transports: cred.transports };
  (a.passkeys ??= []).push(p);
  recordAudit(a.name, 'auth.passkey.add', `Official:${a.id}`, 'ok', `${name} · ${cred.backupEligible ? 'synced passkey' : 'device-bound key'} · alg ${cred.alg}`);
  return { passkey: passkeySummary(p) };
}

/** The official removes one of their passkeys (not the last second step when the installation requires one). */
export function removePasskey(id: string, credentialId: string, by: string, sessionPassedSecondStep: boolean): { passkeys: PasskeySummary[] } | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  const i = a.passkeys?.findIndex(p => p.id === credentialId) ?? -1;
  if (i < 0) return { error: 'No such passkey' };
  if (!sessionPassedSecondStep) return { error: 'Sign in with your second step before removing a passkey' };
  if (twoStepRequiredFor(a) && !a.twoStep && a.passkeys!.length === 1) return { error: 'This installation requires a second step for you; add another passkey or an authenticator app first' };
  const [gone] = a.passkeys!.splice(i, 1);
  if (!a.passkeys!.length) delete a.passkeys;
  recordAudit(by, 'auth.passkey.remove', `Official:${a.id}`, 'ok', gone!.name);
  return { passkeys: (a.passkeys ?? []).map(passkeySummary) };
}

export const passkeysOf = (id: string): PasskeySummary[] => (db().accounts.find(x => x.id === id)?.passkeys ?? []).map(passkeySummary);

/** Options for signing in with a passkey alone (the browser offers the passkeys it holds for this platform). */
export function passkeySignInOptions(rp: RelyingParty, now = Date.now()) {
  return requestOptions(newChallenge('sign-in', undefined, now), rp, [], 'required');
}

/** Sign in with a passkey alone. The person must be verified on the authenticator; that counts as the second step. */
export function signInWithPasskey(input: { challengeId?: string; response?: AssertionJSON }, rp: RelyingParty, now = Date.now()): (PublicAccount & { secondStep: boolean }) | { error: string } {
  const credId = typeof input.response?.id === 'string' ? input.response.id : '';
  const a = credId ? db().accounts.find(x => x.passkeys?.some(p => p.id === credId)) : undefined;
  if (!a || a.disabled || demoAccountRefused(a)) {
    takeChallenge(input.challengeId ?? '', 'sign-in', undefined, now);
    auditRefusal('sign-in attempt', 'auth.sign-in', a ? `Official:${a.id}` : 'Official:?', 'passkey not registered to an active account', now);
    return { error: 'That passkey is not registered to an active account here' };
  }
  const r = usePasskey(a, input.challengeId ?? '', input.response!, rp, 'sign-in', true, now);
  if ('error' in r) {
    auditRefusal(a.name, 'auth.sign-in', `Official:${a.id}`, `passkey: ${r.error}`, now);
    return r;
  }
  a.lastSignIn = new Date(now).toISOString();
  return { ...pub(a), secondStep: r.uv };
}

// ── Identity provider links ──────────────────────────────────────────
// Which platform account an identity at the government's identity provider
// signs in as (lib/auth/oidc.ts). Accounts are never made with powers by a
// sign-in: an administrator links an identity to an account, or makes the
// account with a role from lib/auth/roles.ts.

// The natural person behind a session subject, for dual control (lib/data/dual-control.ts):
// a platform account linked to the government's identity provider is that identity.
registerPersonResolver(sub => {
  const m = /^local:(.+)$/.exec(sub);
  const a = m ? db().accounts.find(x => x.id === m[1]) : undefined;
  return a?.identity ? { key: `idp:${a.identity.issuer}|${a.identity.claim}|${a.identity.value}`, bound: true } : undefined;
});

export function accountByIdentity(issuer: string, claim: string, value: string): PublicAccount | undefined {
  const a = db().accounts.find(x => x.identity && x.identity.issuer === issuer && x.identity.claim === claim && x.identity.value === value);
  return a && !demoAccountRefused(a) ? pub(a) : undefined;
}

export function accountByEmail(email: string): PublicAccount | undefined {
  const a = db().accounts.find(x => x.email === norm(email));
  return a ? pub(a) : undefined;
}

/** Link an identity to an existing account (audited). One identity, one account. */
export function linkIdentity(id: string, identity: { issuer: string; claim: string; value: string }, by: string): PublicAccount | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a) return { error: 'No such account' };
  const other = db().accounts.find(x => x.id !== id && x.identity?.issuer === identity.issuer && x.identity.claim === identity.claim && x.identity.value === identity.value);
  if (other) return { error: `That identity is already linked to ${other.name}` };
  a.identity = { ...identity, linkedAt: new Date().toISOString(), linkedBy: by };
  recordAudit(by, 'auth.identity.link', `Official:${a.id}`, 'ok', `${a.name} · ${identity.claim} at ${identity.issuer}`);
  return pub(a);
}

/** Remove an account's identity link (audited): the official then signs in only with the platform password or a passkey. */
export function unlinkIdentity(id: string, by: string): PublicAccount | { error: string } {
  const a = db().accounts.find(x => x.id === id);
  if (!a?.identity) return { error: 'This account has no identity provider link' };
  delete a.identity;
  recordAudit(by, 'auth.identity.unlink', `Official:${a.id}`, 'ok', a.name);
  return pub(a);
}

/**
 * Make an account for an identity an administrator approved: the role and
 * institution the administrator chose, no platform password (the official
 * signs in through the identity provider). Audited under the administrator.
 */
export function createAccountForIdentity(input: { email?: string; name?: string; office?: string; role?: string; institution?: string }, identity: { issuer: string; claim: string; value: string }, by: string): PublicAccount | { error: string } {
  const d = db();
  // The same rules as every platform account (review C-1): none while the substrate is the sign-in method, and
  // never the installation's first (that one is made with the setup code, createAccount()).
  if (!localAccountsAllowed()) return { error: LOCAL_ACCOUNTS_REFUSED };
  if (!d.accounts.length || !by) return { error: 'The first account is made with the setup code at /sign-in; only an administrator creates accounts for identities' };
  const email = norm(input.email ?? '');
  const name = (input.name ?? '').trim();
  const office = (input.office ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address' };
  if (!name) return { error: 'Enter the official\'s name' };
  if (!office) return { error: 'Enter the official\'s office' };
  if (!isRole(input.role)) return { error: 'Choose a role' };
  if (d.accounts.some(a => a.email === email)) return { error: 'An account with that email already exists; link the identity to it instead' };
  if (d.accounts.some(x => x.identity?.issuer === identity.issuer && x.identity.claim === identity.claim && x.identity.value === identity.value)) return { error: 'That identity is already linked to an account' };
  const institution = (input.institution ?? '').trim() || undefined;
  const now = new Date().toISOString();
  const a: OfficialAccount = { id: randomUUID(), email, name: name.slice(0, 120), office: office.slice(0, 160), passwordHash: 'none', noPassword: true, createdAt: now, createdBy: by, role: input.role, institution,
    identity: { ...identity, linkedAt: now, linkedBy: by } };
  d.accounts.push(a);
  recordAudit(by, 'auth.account.create', `Official:${a.id}`, 'ok', `${a.name} · ${a.office} · ${roleLabel(input.role)}${institution ? ` · ${getMinistry(institution)?.name ?? institution}` : ' · whole government'} · identity provider sign-in`);
  return pub(a);
}

/** A successful identity-provider sign-in (the time is shown under sign-in activity). */
export function noteIdentitySignIn(id: string, now = Date.now()): void {
  const a = db().accounts.find(x => x.id === id);
  if (a) a.lastSignIn = new Date(now).toISOString();
}

// ── The demo cast (lib/auth/demo-cast.ts) ────────────────────────────
// Accounts for showing a demonstration or training installation end to end:
// one per role an institution's work needs, each a separate account, so a
// four-eyes step still needs two different accounts. Made only while samples
// are allowed (lib/ops/mode.ts); no password (the hash matches nothing), so
// they are reached only by switching to them (/api/demo/act-as, audited).

/** One account of the cast, as lib/auth/demo-cast.ts plans it. `key` stays the same across refreshes. */
export interface DemoCastSpec { key: string; name: string; office: string; role: OfficialRole; institution?: string }
/** Cast accounts' addresses are under a reserved domain (RFC 2606): no mail ever reaches anyone. */
export const DEMO_CAST_DOMAIN = 'demo-cast.invalid';
const castEmail = (key: string) => `${key}@${DEMO_CAST_DOMAIN}`;

/** The cast as it stands, retired (disabled) accounts included. */
export const listDemoAccounts = (): PublicAccount[] => db().accounts.filter(a => a.demo).map(pub);

/**
 * Create or refresh the cast to match `specs`: new accounts are made, existing
 * ones (by key) take the planned name, office, role and institution and are
 * enabled again, and cast accounts no longer planned are disabled (never
 * deleted: the audit chain names them). Every change is audited under `by`.
 * Refused while samples are not allowed.
 */
export function syncDemoCast(specs: DemoCastSpec[], by: string): { created: number; updated: number; retired: number; skipped: string[] } | { error: string } {
  if (!samplesAllowed()) return { error: 'A production installation has no demo cast' };
  const d = db();
  const now = new Date().toISOString();
  const planned = new Set(specs.map(s => castEmail(s.key)));
  const where = (s: { institution?: string }) => (s.institution ? getMinistry(s.institution)?.name ?? s.institution : 'whole government');
  let created = 0, updated = 0, retired = 0;
  const skipped: string[] = [];
  for (const s of specs) {
    const email = castEmail(s.key);
    const a = d.accounts.find(x => x.email === email);
    if (a && !a.demo) { skipped.push(`${email} belongs to an account that is not part of the cast`); continue; }
    if (!a) {
      const n: OfficialAccount = { id: randomUUID(), email, name: s.name.slice(0, 120), office: s.office.slice(0, 160), passwordHash: 'none', noPassword: true, demo: true,
        createdAt: now, createdBy: by, role: s.role, ...(s.institution ? { institution: s.institution } : {}) };
      d.accounts.push(n);
      created++;
      recordAudit(by, 'demo.cast.create', `Official:${n.id}`, 'ok', `${n.name} · ${roleLabel(s.role)} · ${where(s)} · sample`);
      continue;
    }
    if (a.name === s.name && a.office === s.office && a.role === s.role && a.institution === s.institution && !a.disabled) continue;
    a.name = s.name.slice(0, 120);
    a.office = s.office.slice(0, 160);
    a.role = s.role;
    delete a.disabled;
    if (s.institution) a.institution = s.institution; else delete a.institution;
    updated++;
    recordAudit(by, 'demo.cast.update', `Official:${a.id}`, 'ok', `${a.name} · ${roleLabel(s.role)} · ${where(s)} · sample`);
  }
  for (const a of d.accounts) {
    if (!a.demo || a.disabled || planned.has(a.email)) continue;
    a.disabled = true;
    retired++;
    recordAudit(by, 'demo.cast.retire', `Official:${a.id}`, 'ok', `${a.name} · no longer in the cast (its institution is no longer named as responsible)`);
  }
  return { created, updated, retired, skipped };
}
