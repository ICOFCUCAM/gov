// civic-api is frozen as a read-only mirror (architecture review R19,
// finding D8: one owner per register).
//
// Every register this service holds is owned by the CivicOS platform (the
// Next.js app in app/), whose ownership map is
// app/src/lib/data/register-owners.ts (served at GET /api/platform/owners).
// This service keeps all its code and answers reads as before, but refuses
// every write (anything but GET, HEAD and OPTIONS) with 410 Gone, naming the
// platform route that owns the record. It is not fed from the platform: it
// holds what it held when it was frozen.
//
// The mode can only be "frozen": CIVIC_API_MODE unset or "frozen" starts the
// service; any other value stops it at start, so the freeze cannot be
// switched off by configuration. Lifting it is a code change that must also
// change the ownership map (register-owners.test.ts checks the two agree).
//
// No decorators here, so the rules are testable on their own
// (test/read-only-mirror.spec.ts); the Nest guard is read-only-mirror.guard.ts.

export interface FrozenModule {
  /** The module under src/modules. */
  module: string;
  /** The register's id in the platform's ownership map. */
  register: string;
  /** The platform API that owns the register (its only write path). */
  owner: string;
  /** The first path segment(s) after /api that the module's controller serves. */
  prefixes: string[];
}

// One line per module; `register-owners.test.ts` (in app/) reads these lines.
export const FROZEN_MODULES: FrozenModule[] = [
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

export const OWNERSHIP_MAP = 'GET /api/platform/owners on the CivicOS platform (app/src/lib/data/register-owners.ts)';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Throws unless the configured mode is the only one there is. */
export function assertFrozenMode(env: Record<string, string | undefined> = process.env): void {
  const mode = env.CIVIC_API_MODE;
  if (mode === undefined || mode === '' || mode === 'frozen') return;
  throw new Error(`civic-api is frozen as a read-only mirror (architecture review D8); CIVIC_API_MODE accepts only "frozen", not "${mode}". Records are changed through the CivicOS platform: ${OWNERSHIP_MAP}.`);
}

/** The module a request path belongs to (path with or without the /api prefix and query). */
export function moduleFor(path: string): FrozenModule | undefined {
  const segs = path.split('?')[0]!.split('/').filter(Boolean);
  const first = segs[0] === 'api' ? segs[1] : segs[0];
  return FROZEN_MODULES.find(m => first !== undefined && m.prefixes.includes(first));
}

export interface Refusal { status: 410; owner: string; register: string | null; message: string }

/** null for a read; for a write, why it is refused and where to make it instead. */
export function frozenRefusal(method: string, path: string): Refusal | null {
  if (READS.has(method.toUpperCase())) return null;
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
