// What a signed-in official may do (register 15.4). Every platform account has
// a role and, unless it serves the whole government, one institution (a
// ministry id from the registry, /api/org). The same rules run in the
// middleware (every change through the API, when the session can be verified
// there) and in the routes that need the record itself to decide (directives,
// accounts). No imports: this file runs at the edge as well as in Node.

export type OfficialRole = 'administrator' | 'signatory' | 'officer' | 'auditor';

export const ROLES: { id: OfficialRole; label: string; means: string }[] = [
  { id: 'administrator', label: 'Administrator', means: 'Manages official accounts, setup and the structure of government, and does the day-to-day work of an official. Does not decide cases: that needs an account of the institution responsible, with the role Can sign.' },
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
  /^\/api\/oauth\/token$/,          // OAuth2 client credentials: the integration's id and key (lib/auth/client-credentials.ts)
  /^\/api\/audit\/witnesses$/];     // a witness attestation: signed by a key an administrator registered (verifyWitnessStatement in the route)
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
  // Which keys count as audit-chain witnesses (registering and revoking them).
  /^\/api\/audit\/witnesses\/keys$/,
  /^\/api\/integrations(\/|$)/,
  /^\/api\/webhooks(\/|$)/,
  // The nation's email and SMS providers and its message outbox (lib/messaging).
  /^\/api\/messaging(\/|$)/,
  // Provisioning a new municipality (/admin/onboarding).
  /^\/api\/municipalities\/?$/,
];
/**
 * The nation's Update Center work that any official who is not an auditor may
 * do: ask for a feature, open and work a support ticket, and send the
 * installation's crash reports (which the data-sovereignty gate still holds
 * back unless an administrator enabled them).
 */
const UPDATE_CENTER_WORK: RegExp[] = [/^\/api\/releases\/(requests|support)(\/|$)/, /^\/api\/releases\/telemetry$/];
/**
 * Installation-level decisions on this nation's own deployment (review H-4):
 * what operational data may leave for the publisher (sovereignty), the
 * deployment agent's credential, break-glass, restoring data, preflight
 * waivers, staging, the release decisions themselves (approve, install,
 * rollback), change control, Update Center settings, the contract, hosting,
 * security-store orders, escrow, the mirror and who is alerted. Only this
 * nation's government-wide administrators (installationAdmin()); no central
 * operator and no other nation takes part. The publisher's own console
 * (/api/releases/publisher) and the agent's health reports keep their own
 * credentials (BEARER_ROUTES, SELF_AUTHENTICATED).
 */
const INSTALLATION: RegExp[] = [/^\/api\/releases(\/|$)/];
/** Signing in and out, one's own second step (authenticator app or passkeys, and the passkey
 *  sign-in challenge) and one's own password stay open to every role; the health probe is public. */
const ANY_ROLE: RegExp[] = [/^\/api\/auth\/official\/?$/, /^\/api\/auth\/two-step\/?$/, /^\/api\/auth\/passkeys(\/options)?\/?$/, /^\/api\/auth\/password\/?$/, /^\/api\/health\/?$/];
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
  /^\/api\/law(\/|$)/,                        // the laws register: canRecordLaw() / canConfirmLaw() in the route
  /^\/api\/documents\/verify$/,               // checks a document code (no change)
  /^\/api\/facilities\/(check|candidates)(\/|$)/, // checks and candidate review (rules in the route)
  /^\/api\/facilities\/[^/]+$/,               // one site (canSignForSite() etc. in the route)
  /^\/api\/ops\/incidents(\/|$)/,
  // The land parcel register: canRecordParcel() / canCertifyParcel() in the route (the cadastre authority).
  /^\/api\/parcels(\/|$)/,
  /^\/api\/payments$/,
  /^\/api\/permits(\/|$)/,
  /^\/api\/signatures$/,
  // Site editor and site settings: proposed by one official, published by another (lib/data/site-editorial.ts);
  // only officials of the site's own institution or of the whole government (canActForSite() in the route).
  /^\/api\/public-sites\/[a-z-]+(\/|$)/,
  // The Update Center's ordinary work is UPDATE_CENTER_WORK; the rest of /api/releases is INSTALLATION.
  /^\/api\/twin\/(keys|metrics|runs|scenarios|sources)(\/|$)/, // registering metrics and withdrawing imports are audited with the official
  /^\/api\/twin\/tasking\/tasks(\/|$)/,       // a signed-in official allowed by canTaskSensor() (checked in the route)
];

export type MutationRule = 'public-write' | 'self-authenticated' | 'bearer' | 'any-role' | 'admin' | 'installation' | 'ministry' | 'official';

/** The rule that covers a change to `pathname`, or null when none does (refused). */
export function mutationRule(pathname: string): MutationRule | null {
  if (PUBLIC_WRITE.some(re => re.test(pathname))) return 'public-write';
  if (SELF_AUTHENTICATED.some(re => re.test(pathname))) return 'self-authenticated';
  if (ANY_ROLE.some(re => re.test(pathname))) return 'any-role';
  if (ADMIN_ONLY.some(re => re.test(pathname))) return 'admin';
  if (BEARER_ROUTES.some(re => re.test(pathname))) return 'bearer';
  if (UPDATE_CENTER_WORK.some(re => re.test(pathname))) return 'official';
  if (INSTALLATION.some(re => re.test(pathname))) return 'installation';
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
  if (rule === 'installation') return installationAdmin(s);
  if (rule === 'ministry') return ministryPermission(s, decodeURIComponent(MINISTRY.exec(pathname)![1]!));
  if (rule === 'official' || rule === 'bearer') return null;
  return 'No permission rule covers this change, so it is refused (lib/auth/roles.ts)';
}

export function adminOnly(s: Scope): string | null {
  return roleOf(s) === 'administrator' ? null : 'Only an administrator can make this change';
}

/**
 * Installation-level decisions on this nation's deployment (the INSTALLATION
 * paths, and both officials of a dual-control step there): an administrator
 * who serves the whole government of this nation. An administrator scoped to
 * one institution, and every officer, signatory or auditor, may not.
 */
export function installationAdmin(s: Scope): string | null {
  if (roleOf(s) === 'administrator' && wholeGovernment(s)) return null;
  return 'Only an administrator serving the whole government can take installation-level decisions (Update Center)';
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

/**
 * Changing an institution's public website (review M-2): proposing or
 * publishing in the Site editor, its settings (Link, Embed, Migrate, Host and
 * the registered website) and fetching its feed. Officials of the institution
 * that owns the site (lib/data/site-settings.ts siteOwner()), or of the whole
 * government; a site no registered institution owns is for the whole
 * government only. Publishing still needs a different official (site-editorial.ts).
 */
export function canActForSite(s: Scope, ownerId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (wholeGovernment(s) || (ownerId !== undefined && s.institution === ownerId)) return null;
  return 'Only officials of the institution that owns this website (or of the whole government) may change it';
}

// ── Who may read an institution's personal data (review M-3) ─────────────
/**
 * Reads that carry personal data held for one institution (case subjects,
 * assignees and notes, permit applicants, and the case register's loads and
 * connected systems). Each route on this list checks canReadInstitution() or
 * canReadPermits() (api-permission-coverage.test.ts holds them to it).
 */
export const INSTITUTION_READS: RegExp[] = [
  /^\/api\/org\/ministries\/[^/]+\/queue$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/import$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/feeds$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/feeds\/[^/]+\/signing-key$/,
  /^\/api\/permits(\/[^/]+)?$/,
  /^\/api\/work$/,
];

/** Officials who see every institution's records: those serving the whole government, and auditors. */
const fullView = (s: Scope): boolean => wholeGovernment(s) || roleOf(s) === 'auditor';

/** Reading one institution's cases and the records around them: its own officials, the whole government and auditors. */
export function canReadInstitution(s: Scope, ministryId: string): string | null {
  if (fullView(s) || s.institution === ministryId) return null;
  return 'You can read only your own institution\'s records';
}

/**
 * Reading permits and their applicants: officials of an institution that
 * holds the permit register (lib/data/store permitHolders(): from the
 * registry, the institutions whose kind keeps permits), the whole government
 * and auditors.
 */
export function canReadPermits(s: Scope, holders: string[]): string | null {
  if (fullView(s) || (s.institution !== undefined && holders.includes(s.institution))) return null;
  return 'Permits and their applicants are read only by the institution that issues them';
}

/** Deciding a permit: the same officials as canReadPermits(), except auditors. */
export function canDecidePermit(s: Scope, holders: string[]): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  return canReadPermits(s, holders);
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

// ── Cases and registers: record-level rules (docs/GOVERNMENT_OPERATING_MODEL.md §4) ──
// A case is worked by officials of the institution that owns its procedure;
// a legal decision needs "Can sign" there. Administrators get no automatic
// domain authority (directions 8.2, 20.6): an administrator, or anyone
// serving the whole government, acts on a case only through an account of the
// owning institution with the needed role. Courts' cases are closed to every
// other institution, administrators included (directions 4.6).

export type Sensitivity = 'normal' | 'restricted' | 'secret';

/** What the rules need to know about a case (or a register record) and the action. */
export interface CaseFacts {
  /** The institution that owns the procedure (resolved from the deployment profile). */
  owner: string;
  sensitivity: Sensitivity;
  /** The owner is a court: nobody outside it reads or acts. */
  judicial?: boolean;
  /** Official ids assigned to the case, and named supervisors (secret cases). */
  assigned?: string[];
  supervisors?: string[];
  /** The action is a legal decision (grant, refuse, register, revoke…). */
  decision?: boolean;
  /** The action needs a recent second sign-in step. */
  stepUp?: boolean;
}

/** The part of a session the case rules read, besides the role and institution. */
export interface CaseScope extends Scope {
  /** The official's id (session subject). */
  id?: string;
  /** When this session last passed the second sign-in step (ms since 1970). */
  twoStepAt?: number;
}

/** How recent the second sign-in step must be for an action that asks for it. */
export const STEP_UP_MINUTES = 15;

const assignedTo = (s: CaseScope, c: CaseFacts) => !!s.id && (c.assigned ?? []).includes(s.id);
const supervises = (s: CaseScope, c: CaseFacts) => !!s.id && (c.supervisors ?? []).includes(s.id);

/** May this official take this action on this case? null when yes, otherwise the reason. */
export function caseActRefusal(s: CaseScope, c: CaseFacts, now = Date.now()): string | null {
  const missing = secondStepMissing(s);
  if (missing) return missing;
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (s.institution !== c.owner) {
    return c.judicial
      ? 'A court\'s cases are worked only by the court\'s own officials'
      : 'Cases are worked only by officials of the institution responsible for them; serving the whole government or administering the installation does not give that authority';
  }
  if (c.decision && role !== 'signatory') return 'A decision needs an official who can sign for the institution';
  if (c.sensitivity === 'restricted' && !assignedTo(s, c) && role !== 'signatory') return 'This case is restricted to the officials assigned to it and those who can sign';
  if (c.sensitivity === 'secret' && !assignedTo(s, c) && !supervises(s, c)) return 'This case is open only to the officials assigned to it and its named supervisors';
  if (c.stepUp && !(s.twoStepAt && now - s.twoStepAt <= STEP_UP_MINUTES * 60_000)) return `This step needs the second sign-in step within the last ${STEP_UP_MINUTES} minutes: sign in again`;
  return null;
}

/**
 * May this official read this case? null when yes. Restricted and secret
 * reads by auditors need a stated purpose; every such read is written to the
 * access log by the caller (lib/records/access-log.ts).
 */
export function caseReadRefusal(s: CaseScope, c: CaseFacts, purpose?: string): string | null {
  const role = roleOf(s);
  const own = s.institution === c.owner;
  if (c.judicial && !own) return 'A court\'s cases are read only by the court\'s own officials';
  const auditorWithPurpose = role === 'auditor' && (own || wholeGovernment(s)) && !!purpose?.trim();
  if (c.sensitivity === 'normal') return own || wholeGovernment(s) ? null : 'Cases are read by officials of the responsible institution and of the whole government';
  if (c.sensitivity === 'restricted') {
    if (own && (assignedTo(s, c) || role === 'signatory')) return null;
    if (auditorWithPurpose) return null;
    return role === 'auditor' ? 'Say why you need to read this restricted case' : 'This case is restricted to the officials assigned to it and those who can sign';
  }
  if (own && (assignedTo(s, c) || supervises(s, c))) return null;
  if (auditorWithPurpose) return null;
  return role === 'auditor' ? 'Say why you need to read this case' : 'This case is open only to the officials assigned to it and its named supervisors';
}

/** The access log (lib/records/access-log.ts): auditors, and officials of the nation's data-protection authority. Administrators do not read it by their role. */
export function canReadAccessLog(s: Scope, dataProtection: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return null;
  if (dataProtection && s.institution === dataProtection) return null;
  return 'The access log is read by auditors and by the data-protection authority';
}

/** Recording a version of a law (lib/law/register.ts): officials of the nation's law-register authority; whole-government administrators only while none is named. */
export function canRecordLaw(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authority) return s.institution === authority ? null : 'Only the law-register authority records laws';
  return wholeGovernment(s) && role === 'administrator' ? null : 'Name the law-register authority under Who is responsible first';
}

/** Confirming (four-eyes) or withdrawing a version of a law: those who can sign at the law-register authority; whole-government administrators only while none is named. */
export function canConfirmLaw(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authority) return s.institution === authority && role === 'signatory' ? null : 'Only an official who can sign at the law-register authority confirms or withdraws a law';
  return wholeGovernment(s) && role === 'administrator' ? null : 'Name the law-register authority under Who is responsible first';
}
