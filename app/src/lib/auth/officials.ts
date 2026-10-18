// Platform accounts for officials (register 15.4): how a nation without the
// substrate (air-gapped, or before it connects Supabase) signs its officials
// in. Passwords are kept only as scrypt hashes; failed attempts are limited
// per address; every account change and sign-in is audited. With the
// substrate connected, officials sign in there instead and this store is
// only the fallback. Held in platform state (lib/data/persist.ts).

import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { isRole, roleLabel, roleOf, type OfficialRole } from './roles';

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
}
export type PublicAccount = Omit<OfficialAccount, 'passwordHash'>;

interface Db { accounts: OfficialAccount[]; failures: Record<string, number[]>; secret?: string }
const g = globalThis as unknown as { __civicosOfficials?: Db };
const db = (): Db => (g.__civicosOfficials ??= { accounts: [], failures: {} });
export function resetOfficials(): void { g.__civicosOfficials = undefined; }

export const MIN_PASSWORD = 12;
export const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const N = 16384;

const norm = (e: string) => e.trim().toLowerCase();
const pub = ({ passwordHash: _h, ...a }: OfficialAccount): PublicAccount => a;

function hash(password: string): string {
  const salt = randomBytes(16);
  const h = scryptSync(password, salt, 32, { N });
  return `scrypt$${N}$${salt.toString('base64')}$${h.toString('base64')}`;
}
function matches(password: string, stored: string): boolean {
  const [alg, n, salt, h] = stored.split('$');
  if (alg !== 'scrypt' || !n || !salt || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(password, Buffer.from(salt, 'base64'), want.length, { N: Number(n) });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** The key that signs sessions: CIVICOS_SESSION_SECRET, else one generated for this installation and kept in its state. */
export function sessionSecret(): string {
  if (process.env.CIVICOS_SESSION_SECRET) return process.env.CIVICOS_SESSION_SECRET;
  const d = db();
  return (d.secret ??= randomBytes(32).toString('base64'));
}

export const hasAccounts = (): boolean => db().accounts.length > 0;
export const listAccounts = (): PublicAccount[] => db().accounts.map(pub);

/**
 * Create an account. The first account of an installation needs no signed-in
 * official (it is made at installation, like setup); every later one is made
 * by a signed-in official, named in the audit chain.
 */
export function createAccount(input: { email?: string; name?: string; office?: string; password?: string; role?: string; institution?: string }, by: string | null): PublicAccount | { error: string } {
  const d = db();
  if (d.accounts.length && !by) return { error: 'Only a signed-in official can create accounts' };
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
  const a: OfficialAccount = { id: randomUUID(), email, name: name.slice(0, 120), office: office.slice(0, 160), passwordHash: hash(input.password!), createdAt: new Date().toISOString(), createdBy: by ?? 'installation', role, institution };
  d.accounts.push(a);
  recordAudit(by ?? `${a.name} (first account)`, 'auth.account.create', `Official:${a.id}`, 'ok', `${a.name} · ${a.office} · ${roleLabel(role)}${institution ? ` · ${getMinistry(institution)?.name ?? institution}` : ' · whole government'}`);
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

/** Check a password. Refuses after MAX_FAILURES failures for the address within 15 minutes, whatever the password. */
export function checkPassword(emailRaw: string, password: string, now = Date.now()): PublicAccount | { error: string } {
  const d = db();
  const email = norm(emailRaw);
  const recent = (d.failures[email] ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return { error: 'Too many failed attempts; try again in 15 minutes' };
  const a = d.accounts.find(x => x.email === email);
  if (!a || a.disabled || !matches(password, a.passwordHash)) {
    d.failures[email] = [...recent, now];
    recordAudit('sign-in attempt', 'auth.sign-in', 'Official:?', 'denied', 'wrong email or password');
    return { error: 'Wrong email or password' };
  }
  delete d.failures[email];
  a.lastSignIn = new Date(now).toISOString();
  return pub(a);
}
