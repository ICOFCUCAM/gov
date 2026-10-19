// civic-api is a mirror of the CivicOS platform (architecture review R19,
// finding D8: one owner per register).
//
// Every register this service holds is owned by the CivicOS platform (the
// Next.js app in app/), whose ownership map is
// app/src/lib/data/register-owners.ts (served at GET /api/platform/owners).
// There is exactly one true copy of each record: the platform's. This
// service keeps all its code and answers reads from its own tables, which
// only the mirror follower writes (src/mirror/follower.ts: signed platform
// events plus a periodic full re-sync).
//
// Writes depend on the mode (CIVIC_API_MODE):
//   - forward (the default): a write is passed to the platform API route that
//     owns the record, with the caller's own credentials, and the platform's
//     answer is returned (src/common/forward.ts). civic-api never writes its
//     own tables on a forwarded write. A write with no platform equivalent is
//     refused with 410, naming that there is no owner route yet.
//   - frozen: every write (anything but GET, HEAD and OPTIONS) is refused
//     with 410 Gone, naming the platform route that owns the record.
// Any other value stops the service at start. A mode that writes civic-api's
// own tables does not exist: that would be a second true copy.
//
// No decorators here, so the rules are testable on their own
// (test/read-only-mirror.spec.ts); the Nest guard is read-only-mirror.guard.ts.

export type MirrorMode = 'forward' | 'frozen';
export const MIRROR_MODES: readonly MirrorMode[] = ['forward', 'frozen'];

export interface MirroredModule {
  /** The module under src/modules. */
  module: string;
  /** The register's id in the platform's ownership map. */
  register: string;
  /** The platform API that owns the register (its only write path). */
  owner: string;
  /** The first path segment(s) after /api that the module's controller serves. */
  prefixes: string[];
}
/** Earlier name, kept for callers of the frozen build. */
export type FrozenModule = MirroredModule;

// One line per module; `register-owners.test.ts` (in app/) reads these lines.
export const MIRRORED_MODULES: MirroredModule[] = [
  { module: 'tenancy', register: 'nation', owner: '/api/sovereign, /api/setup', prefixes: ['tenancy'] },
  { module: 'org', register: 'institutions', owner: '/api/org/ministries', prefixes: ['org'] },
  { module: 'audit', register: 'audit-platform', owner: 'recordAudit() (lib/data/store/audit.ts)', prefixes: ['audit'] },
  { module: 'permits', register: 'permits', owner: '/api/permits', prefixes: ['permits'] },
  { module: 'payments', register: 'payments', owner: '/api/payments', prefixes: ['payments'] },
  { module: 'ops', register: 'ops', owner: '/api/ops, /api/platform', prefixes: ['ops'] },
  { module: 'platform-ops', register: 'ops', owner: '/api/ops, /api/platform', prefixes: ['platform'] },
  { module: 'health', register: 'ops', owner: '/api/ops, /api/platform', prefixes: ['health'] },
  { module: 'metrics', register: 'ops', owner: '/api/ops, /api/platform', prefixes: ['metrics'] },
  { module: 'interop', register: 'federation', owner: '/api/federation, /api/integrations, /api/webhooks', prefixes: ['integrations', 'federation', 'webhooks'] },
  { module: 'identity', register: 'identity', owner: '/sign-in (substrate auth)', prefixes: ['identity'] },
];
/** Earlier name, kept for callers of the frozen build. */
export const FROZEN_MODULES = MIRRORED_MODULES;

export const OWNERSHIP_MAP = 'GET /api/platform/owners on the CivicOS platform (app/src/lib/data/register-owners.ts)';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const isRead = (method: string): boolean => READS.has(method.toUpperCase());

/** The configured mode: unset or empty is `forward`; anything but the two modes throws (the service does not start). */
export function mirrorMode(env: Record<string, string | undefined> = process.env): MirrorMode {
  const mode = env.CIVIC_API_MODE;
  if (mode === undefined || mode === '') return 'forward';
  if ((MIRROR_MODES as readonly string[]).includes(mode)) return mode as MirrorMode;
  throw new Error(`civic-api is a mirror of the CivicOS platform (architecture review D8); CIVIC_API_MODE accepts only "forward" (the default: writes go to the platform that owns the record) or "frozen" (writes refused), not "${mode}". Records are changed through the CivicOS platform: ${OWNERSHIP_MAP}.`);
}

/**
 * Throws unless the configuration can start: a known mode, and in forward mode
 * the platform's address (CIVICOS_PLATFORM_URL). Returns the mode.
 */
export function assertMirrorMode(env: Record<string, string | undefined> = process.env): MirrorMode {
  const mode = mirrorMode(env);
  if (mode === 'forward') {
    const url = env.CIVICOS_PLATFORM_URL;
    if (!url) throw new Error('civic-api forwards writes to the CivicOS platform (CIVIC_API_MODE=forward, the default) and needs its address: set CIVICOS_PLATFORM_URL (e.g. http://app:3000), or CIVIC_API_MODE=frozen to refuse every write.');
    let u: URL;
    try { u = new URL(url); } catch { throw new Error(`CIVICOS_PLATFORM_URL is not an address: "${url}"`); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`CIVICOS_PLATFORM_URL must be http or https, not "${u.protocol}"`);
  }
  return mode;
}

/** Earlier check, kept: throws unless the mode is a known one. */
export function assertFrozenMode(env: Record<string, string | undefined> = process.env): void {
  mirrorMode(env);
}

/** The module a request path belongs to (path with or without the /api prefix and query). */
export function moduleFor(path: string): MirroredModule | undefined {
  const segs = path.split('?')[0]!.split('/').filter(Boolean);
  const first = segs[0] === 'api' ? segs[1] : segs[0];
  return MIRRORED_MODULES.find(m => first !== undefined && m.prefixes.includes(first));
}

export interface Refusal { status: 410; owner: string; register: string | null; message: string }

/** Frozen mode: null for a read; for a write, why it is refused and where to make it instead. */
export function frozenRefusal(method: string, path: string): Refusal | null {
  if (isRead(method)) return null;
  const m = moduleFor(path);
  const owner = m?.owner ?? OWNERSHIP_MAP;
  return {
    status: 410,
    owner,
    register: m?.register ?? null,
    message: m
      ? `civic-api is a frozen read-only mirror; the ${m.register} register is owned by the CivicOS platform. Make this change through ${m.owner}.`
      : `civic-api is a frozen read-only mirror; every register is owned by the CivicOS platform. See ${OWNERSHIP_MAP}.`,
  };
}

/** Forward mode: the refusal for a write that has no platform route to forward to (src/common/forward.ts). */
export function unmappedRefusal(method: string, path: string, why?: string): Refusal {
  const m = moduleFor(path);
  const owner = m?.owner ?? OWNERSHIP_MAP;
  const base = m
    ? `civic-api forwards writes to the CivicOS platform, which owns the ${m.register} register, but this change has no owner route there yet`
    : 'civic-api forwards writes to the CivicOS platform, but this change has no owner route there yet';
  return {
    status: 410,
    owner,
    register: m?.register ?? null,
    message: `${base}${why ? ` (${why})` : ''}; nothing was written. The register is changed through ${owner}.`,
  };
}
