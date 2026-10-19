// What a signed-in official may do (register 15.4). Every platform account has
// a role and, unless it serves the whole government, one institution (a
// ministry id from the registry, /api/org). The same rules run in the
// middleware (every change through the API, when the session can be verified
// there) and in the routes that need the record itself to decide (directives,
// accounts). No imports: this file runs at the edge as well as in Node.

export type OfficialRole = 'administrator' | 'signatory' | 'officer' | 'auditor';

export const ROLES: { id: OfficialRole; label: string; means: string }[] = [
  { id: 'administrator', label: 'Administrator', means: 'Manages official accounts, setup and the structure of government, and can do everything an official can.' },
  { id: 'signatory', label: 'Can sign', means: 'Does the work of an officer, and signs or withdraws directives.' },
  { id: 'officer', label: 'Officer', means: 'Works cases and incidents and drafts directives.' },
  { id: 'auditor', label: 'Auditor (read only)', means: 'Reads every record and changes nothing.' },
];
export const isRole = (v: unknown): v is OfficialRole => ROLES.some(r => r.id === v);
export const roleLabel = (r: OfficialRole) => ROLES.find(x => x.id === r)!.label;

/** The part of an official's session the rules read. */
export interface Scope {
  role?: OfficialRole; institution?: string;
  /** The installation requires this official to use the second sign-in step. */
  twoStepRequired?: boolean;
  /** This session passed the second sign-in step. */
  twoStep?: boolean;
}

/** Officials the policy requires to use the second step make no changes until this session has passed it. */
export function secondStepMissing(s: Scope): string | null {
  return s.twoStepRequired && !s.twoStep ? 'Set up the second sign-in step under My account, then sign in again, before making changes' : null;
}

/** When roles were introduced (seconds since 1970): sessions and accounts dated before it carry no role. */
export const ROLES_SINCE = Date.parse('2026-10-18T10:37:47Z') / 1000;
/**
 * The role a session or account acts with. Only records from before roles
 * existed (a session issued, or an account created, before ROLES_SINCE) keep
 * what they could do then, everything; anything newer without a role gets
 * the least: officer (deny by default, architecture review S4).
 */
export const roleOf = (s: { role?: OfficialRole; iat?: number; createdAt?: string }): OfficialRole => {
  if (s.role) return s.role;
  const at = s.iat ?? (s.createdAt ? Date.parse(s.createdAt) / 1000 : undefined);
  return at === undefined || at < ROLES_SINCE ? 'administrator' : 'officer';
};
/** True when the official serves every institution, not one. */
export const wholeGovernment = (s: Scope): boolean => !s.institution;

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ── Which rule covers each change through the API ─────────────────────────
// Every mutating route file under app/api must match exactly one of the lists
// below; anything else is refused (deny by default). api-permission-coverage.test.ts
// walks the route files and fails when a new one is not covered, so a route
// cannot slip past the rules by being forgotten.

/** Citizens ask for and manage email updates from the public sites without signing in
 *  (double opt-in and per-sender limits in lib/data/site-subscriptions.ts). */
export const PUBLIC_WRITE: RegExp[] = [/^\/api\/public-sites\/[a-z-]+\/subscribe$/, /^\/api\/subscriptions$/];
/**
 * Machine callers with no browser session that authenticate themselves in the
 * route, whatever they present: every scheduled job under /api/cron
 * (CIVICOS_CRON_SECRET, called by pg_cron; each refuses when the secret is
 * unset), the deployment agent's health reports (per-nation agent credential)
 * and a ministry's connected systems (their own ccf_ / facility feed keys).
 */
export const SELF_AUTHENTICATED: RegExp[] = [/^\/api\/cron\/[a-z0-9-]+$/, /^\/api\/releases\/health$/, /^\/api\/org\/ministries\/[^/]+\/queue\/feed$/, /^\/api\/org\/ministries\/[^/]+\/facilities\/feed$/,
  /^\/api\/federation\/exchange$/,  // an institution's integration key (verifyIntegrationKey), logged with a signed receipt
  /^\/api\/oauth\/token$/];         // OAuth2 client credentials: the integration's id and key (lib/auth/client-credentials.ts)
/**
 * Routes that verify an `Authorization` bearer themselves (the automation
 * secret of the route's purpose or a platform-tier substrate session: lib/platform-auth.ts,
 * lib/updates/access.ts). Only on these, and on SELF_AUTHENTICATED, does a
 * request carrying an Authorization header skip the session gate; anywhere
 * else the header counts for nothing.
 */
export const BEARER_ROUTES: RegExp[] = [
  /^\/api\/releases\/publisher(\/|$)/,       // publisherAuthorized() under CIVICOS_AUTH=enforce
  /^\/api\/admin\/officers\/bulk$/,           // platformOrSecretAuthorized(req, 'provisioning')
  /^\/api\/federation\/webhooks\/test$/,      // platformOrSecretAuthorized(req, 'provisioning')
  /^\/api\/substrate\/(digest|export)$/,     // CIVICOS_EXPORT_SECRET
  // SensorThings create on a twin stream source's Datastream and DELETE (withdrawal) of a reading it sent: the bound
  // integration's own key, scope sta:write (verifyIntegrationKey in staCreate / staDelete, lib/twin/sta-write.ts);
  // PATCH answers 405. POST Tasks there takes no key: a signed-in official allowed by canTaskSensor (checked in the route).
  /^\/api\/twin\/sta\/v1\.1\/.+$/,
  // The integration that executes a tasking capability reports a task's status with its own key, scope sta:task
  // (verifyIntegrationKey in the route, lib/twin/tasking.ts acknowledgeTask).
  /^\/api\/twin\/tasking\/executor\/[^/]+$/,
];
/** Read-only routes that verify a bearer themselves (machine readers such as a metrics scraper). */
export const BEARER_READS: RegExp[] = [
  /^\/api\/metrics$/,                         // CIVICOS_METRICS_TOKEN, compared in constant time
  /^\/api\/integrations\/verify$/,           // an integration key, compared by its hash in constant time
  // GIS clients (QGIS, ArcGIS, GDAL) reading the twin with an integration key of scope ogc:read, or an
  // access token issued for it (POST /api/oauth/token): OGC API – Features, SensorThings and vector
  // tiles of the facility register, of the nation's boundaries and of the land parcel register (public
  // fields only; machineReadRefusal() in each route,
  // lib/twin/machine-read.ts). The public PMTiles archive is not among them: it is open to everyone (a
  // public read in the middleware); an institution's own archive is for its signed-in officials only.
  /^\/api\/twin\/(ogc|sta)(\/|$)/,
  /^\/api\/twin\/tiles\/facilities(\/|$)/,
  /^\/api\/twin\/tiles\/boundaries(\/|$)/,
  /^\/api\/twin\/tiles\/parcels(\/|$)/,
  // The executing integration pulls the tasks of its tasking capabilities with its own key, scope sta:task.
  /^\/api\/twin\/tasking\/executor$/,
  // The mirror feed for services/civic-api's follower: an integration key of scope mirror:read (review D8).
  /^\/api\/platform\/mirror$/,
];
/** True when the route checks the caller's own credential (bearer, agent or feed key). */
export const verifiesOwnCredential = (pathname: string): boolean =>
  SELF_AUTHENTICATED.some(re => re.test(pathname)) || BEARER_ROUTES.some(re => re.test(pathname)) || BEARER_READS.some(re => re.test(pathname));

/** Changes the structure of government or the installation: administrators only. */
const ADMIN_ONLY: RegExp[] = [
  /^\/api\/auth\/officials(\/|$)/,
  /^\/api\/org\/ministries\/?$/,
  /^\/api\/org\/ministries\/[^/]+\/(merge|deactivate|activate|rename)\/?$/,
  /^\/api\/setup(\/|$)/,
  /^\/api\/sovereign(\/|$)/,
  /^\/api\/facilities\/policy(\/|$)/,
  // The nation's parcel policy: its cadastre authority, parcel id format, overlap rule (four-eyes).
  /^\/api\/parcels\/policy(\/|$)/,
  /^\/api\/map-pack(\/|$)/,
  // The nation's rules for its twin (four-eyes withdrawal of imports).
  /^\/api\/twin\/policy(\/|$)/,
  // Declaring and retiring what a stream's device can be tasked to do (tasking capabilities).
  /^\/api\/twin\/tasking\/capabilities(\/|$)/,
  // The installation itself: backups and their restore, configuration and its
  // apply, deployments, releases and tenant lifecycle.
  /^\/api\/platform(\/|$)/,
  // Connections to other installations and outside systems.
  /^\/api\/federation(\/|$)/,
  /^\/api\/integrations(\/|$)/,
  /^\/api\/webhooks(\/|$)/,
  // Provisioning a new municipality (/admin/onboarding).
  /^\/api\/municipalities\/?$/,
];
/** Signing in and out, one's own second step and one's own password stay open to every role;
 *  the health probe is public. */
const ANY_ROLE: RegExp[] = [/^\/api\/auth\/official\/?$/, /^\/api\/auth\/two-step\/?$/, /^\/api\/auth\/password\/?$/, /^\/api\/health\/?$/];
/** Inside one ministry's workspace: officials of that ministry, or of the whole government. */
const MINISTRY = /^\/api\/org\/ministries\/([^/]+)\//;
/**
 * The day-to-day work of any official who is not an auditor. Routes here that
 * need the record to decide (directives, boundaries, facilities, the Update
 * Center's four-eyes steps) check again with refusal() or their own rules.
 */
const OFFICIAL_WORK: RegExp[] = [
  /^\/api\/ai\/advisory$/,                    // advisory text (refuses when the nation has the assistant off)
  /^\/api\/audit\/proof$/,                    // builds a proof of the audit chain (no change)
  /^\/api\/boundaries(\/|$)/,                 // canManageBoundaries() in the route
  /^\/api\/directives(\/|$)/,                 // canDraftDirective() / canSignDirective() in the route
  /^\/api\/documents\/verify$/,               // checks a document code (no change)
  /^\/api\/facilities\/(check|candidates)(\/|$)/, // checks and candidate review (rules in the route)
  /^\/api\/facilities\/[^/]+$/,               // one site (canSignForSite() etc. in the route)
  /^\/api\/ops\/incidents(\/|$)/,
  // The land parcel register: canRecordParcel() / canCertifyParcel() in the route (the cadastre authority).
  /^\/api\/parcels(\/|$)/,
  /^\/api\/payments$/,
  /^\/api\/permits(\/|$)/,
  /^\/api\/signatures$/,
  /^\/api\/public-sites\/[a-z-]+(\/|$)/,       // Site editor: proposed by one official, published by another (lib/data/site-editorial.ts)
  /^\/api\/releases(\/|$)/,                   // the nation's Update Center (four-eyes and named officials in lib/data/*)
  /^\/api\/twin\/(keys|metrics|runs|scenarios|sources)(\/|$)/, // registering metrics and withdrawing imports are audited with the official
  /^\/api\/twin\/tasking\/tasks(\/|$)/,       // a signed-in official allowed by canTaskSensor() (checked in the route)
];

export type MutationRule = 'public-write' | 'self-authenticated' | 'bearer' | 'any-role' | 'admin' | 'ministry' | 'official';

/** The rule that covers a change to `pathname`, or null when none does (refused). */
export function mutationRule(pathname: string): MutationRule | null {
  if (PUBLIC_WRITE.some(re => re.test(pathname))) return 'public-write';
  if (SELF_AUTHENTICATED.some(re => re.test(pathname))) return 'self-authenticated';
  if (ANY_ROLE.some(re => re.test(pathname))) return 'any-role';
  if (ADMIN_ONLY.some(re => re.test(pathname))) return 'admin';
  if (BEARER_ROUTES.some(re => re.test(pathname))) return 'bearer';
  if (MINISTRY.test(pathname)) return 'ministry';
  if (OFFICIAL_WORK.some(re => re.test(pathname))) return 'official';
  return null;
}

/**
 * Whether a change through the API is allowed: null when it is, otherwise the
 * reason shown to the official. Reads only the method and path, so it can run
 * before the route; routes that need the record (directives) check again.
 * A change no rule covers is refused (deny by default).
 */
export function apiPermission(s: Scope, method: string, pathname: string): string | null {
  if (!MUTATING.has(method.toUpperCase())) return null;
  const rule = mutationRule(pathname);
  // Open to anyone, or the route checks its caller's own credential.
  if (rule === 'public-write' || rule === 'self-authenticated' || rule === 'any-role') return null;
  const missing = secondStepMissing(s);
  if (missing) return missing;
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (rule === 'admin') return adminOnly(s);
  if (rule === 'ministry') return ministryPermission(s, decodeURIComponent(MINISTRY.exec(pathname)![1]!));
  if (rule === 'official' || rule === 'bearer') return null;
  return 'No permission rule covers this change, so it is refused (lib/auth/roles.ts)';
}

export function adminOnly(s: Scope): string | null {
  return roleOf(s) === 'administrator' ? null : 'Only an administrator can make this change';
}

/** Whether the official may act inside one ministry's workspace. */
export function ministryPermission(s: Scope, ministryId: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (wholeGovernment(s) || s.institution === ministryId) return null;
  return 'You can act only for your own institution';
}

/**
 * Downloading an institution's own site archive (restricted sites at their
 * exact position, lib/twin/tiles-archive.ts institutionArchive()): its own
 * officials of every role, auditors included, and the whole government.
 */
export function canDownloadSiteArchive(s: Scope, ministryId: string): string | null {
  if (wholeGovernment(s) || s.institution === ministryId) return null;
  return 'Only officials of this institution (or of the whole government) may download its site archive';
}

/** Connecting or disconnecting a ministry's case system issues a machine key: administrators, or those who can sign for that ministry. */
export function canManageFeeds(s: Scope, ministryId: string): string | null {
  const where = ministryPermission(s, ministryId);
  if (where) return where;
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may connect a case system';
}

/** Connecting a twin stream source to an outside sender (an integration's key for SensorThings, the nation's MQTT broker): administrators, or officials who can sign. */
export function canConnectStream(s: Scope): string | null {
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may connect a stream to a sensor gateway or broker';
}

/**
 * Creating or cancelling a task for a stream's device (a tasking capability,
 * lib/twin/tasking.ts): it acts on physical equipment, so administrators and
 * officials who can sign; officers and auditors see tasks but do not make them.
 */
export function canTaskSensor(s: Scope): string | null {
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may task a sensor or device';
}

/** Publishing a proposed site, certifying it for its institution, or confirming a move: those who can sign for the owning institution. */
export function canSignForSite(s: Scope, ownerId: string): string | null {
  const where = ministryPermission(s, ownerId);
  if (where) return where;
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an official who can sign for the institution may do this';
}

/** Certifying a site's location for the national mapping agency: its officials (or the whole government's administrators while none is named). */
export function canCertifyForAgency(s: Scope, agencyId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (agencyId ? s.institution === agencyId || (wholeGovernment(s) && roleOf(s) === 'administrator') : wholeGovernment(s) && roleOf(s) === 'administrator') return null;
  return 'Only the national mapping agency certifies locations at this stage';
}

/** Loading and publishing the nation's boundaries: the national mapping agency's officials, or whole-government administrators. */
export function canManageBoundaries(s: Scope, agencyId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (agencyId && s.institution === agencyId && roleOf(s) !== 'officer') return null;
  if (agencyId && s.institution === agencyId) return 'Officials who can sign at the mapping agency load and publish boundaries';
  if (wholeGovernment(s) && roleOf(s) === 'administrator') return null;
  return 'Only the national mapping agency or a government administrator loads and publishes boundaries';
}

/** Recording a land parcel (or loading a file of them): officials of the nation's cadastre authority (not auditors), or whole-government administrators. */
export function canRecordParcel(s: Scope, authorityId: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authorityId && s.institution === authorityId) return null;
  if (wholeGovernment(s) && role === 'administrator') return null;
  return 'Only the nation\'s cadastre authority (or a government administrator) records land parcels';
}

/** Publishing a parcel, confirming or discarding a change to it, withdrawing it or a load: those who can sign at the cadastre authority, or whole-government administrators. */
export function canCertifyParcel(s: Scope, authorityId: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authorityId && s.institution === authorityId && (role === 'signatory' || role === 'administrator')) return null;
  if (wholeGovernment(s) && role === 'administrator') return null;
  return 'Only an official who can sign at the cadastre authority (or a government administrator) publishes or withdraws land parcels';
}

/**
 * Seeing a parcel's rights and their holders (personal data): the cadastre
 * authority's own officials of every role, and whole-government
 * administrators and auditors. Nobody else; never in tiles, the OGC
 * collection, lists or exports (lib/data/parcels.ts publicParcel()).
 */
export function canSeeParcelRights(s: Scope, authorityId: string | undefined): string | null {
  if (authorityId && s.institution === authorityId) return null;
  const role = roleOf(s);
  if (wholeGovernment(s) && (role === 'administrator' || role === 'auditor')) return null;
  return 'Rights and holders are shown only to the cadastre authority and officials with need';
}

/** The issuer a new directive is recorded under: an official's own institution, whatever the request names. */
export function directiveIssuer(s: Scope | null, requested: string): string {
  return s && !wholeGovernment(s) ? s.institution! : requested;
}

export function canDraftDirective(s: Scope): string | null {
  return roleOf(s) === 'auditor' ? 'Auditors can read records but not change them' : null;
}

/** Sign or withdraw: signatories and administrators, for their own institution's directives. */
export function canSignDirective(s: Scope, issuer: string): string | null {
  const role = roleOf(s);
  if (role !== 'signatory' && role !== 'administrator') return 'Only an official who can sign may sign or withdraw a directive';
  if (wholeGovernment(s) || s.institution === issuer) return null;
  return 'You can sign only your own institution\'s directives';
}

/** Drafts are seen only by the issuing institution (and officials serving the whole government). */
export function canSeeDraft(s: Scope, issuer: string): boolean {
  return wholeGovernment(s) || s.institution === issuer;
}

/** The role a substrate officer has on the platform, from the officer register's role. */
export function roleFromSubstrate(role: string): OfficialRole {
  if (role === 'platform-admin') return 'administrator';
  if (role === 'auditor') return 'auditor';
  if (['president', 'minister', 'cabinet-secretary', 'cabinet-officer', 'permanent-secretary'].includes(role)) return 'signatory';
  return 'officer';
}
