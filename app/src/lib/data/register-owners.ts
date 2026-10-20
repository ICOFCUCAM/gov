// One owner per register (architecture review R19, finding D8).
//
// The same business records exist in up to three places: the platform's
// own stores (`globalThis.__civicos*`, saved by lib/data/persist.ts), the
// Supabase substrate (app/supabase/migrations) and the NestJS service in
// services/civic-api. Estonia's rule applies: each register has exactly one
// owner, every other copy is a mirror of it, a fallback used only when the
// owner is unreachable, or retired (kept reachable, never written). This
// list is that decision. `register-owners.test.ts` fails when a store key or
// a civic-api module appears without an owner here, when a copy of a
// platform register is anything but a mirror, when app code other than
// a mirror's writer writes a mirrored substrate table, and when app code reads
// one (its table or an RPC over it) instead of asking the platform.
//
// Retiring the duplicates (finding D8):
//   - substrate copies of platform registers are mirrors fed by the platform
//     after its commit (lib/db/mirror.ts for directives and institutions, the
//     anchor cron for audit heads), best-effort and retried, never read as
//     the register; the browser can no longer write them (migration
//     20261022000000_civicos_substrate_mirror.sql);
//   - services/civic-api is a mirror: its reads answer from its own tables,
//     which only its follower writes, from the platform's signed events
//     (webhook, topic `*`) and the mirror feed (GET /api/platform/mirror,
//     integration key of scope mirror:read), with a full re-sync every
//     15 minutes (services/civic-api/src/mirror/follower.ts); a write made
//     to it is forwarded to the owning platform route with the caller's own
//     credentials and the platform's answer returned (CIVIC_API_MODE=forward,
//     the default; services/civic-api/src/common/forward.ts), or refused with
//     410 (frozen). Writes with no platform route answer 410.

import type { AuthorityKey } from '@/lib/nation/deployment';

export type Copy = {
  where: 'platform' | 'substrate' | 'civic-api';
  what: string;
  role: 'mirror' | 'fallback' | 'retired';
  note: string;
  /** Substrate mirrors: the tables as the app names them (`civicos_…`), never written by app code but `writer`. */
  tables?: string[];
  /** Substrate mirrors: the RPCs that write those tables; only `writer` may call them. */
  writes?: string[];
  /** Substrate mirrors: the one app file that writes the mirror (from the platform, after its commit). */
  writer?: string;
  /**
   * Substrate mirrors: the substrate's SQL functions that read the mirror
   * (kept for the substrate's own use; never called by app code, which asks
   * the platform instead).
   */
  reads?: string[];
  /**
   * Substrate mirrors: app files allowed to read the mirror as the register
   * when the platform cannot answer (none: every screen and route reads the
   * platform). Listed with the reason if one is ever needed.
   */
  fallbackReaders?: { file: string; why: string }[];
  /** civic-api: what a write made to it does: `forward` (the default; passed to the owner's route with the caller's credentials) or `frozen` (refused). */
  mode?: 'forward' | 'frozen';
  /** civic-api: whether its follower keeps this copy current from the owner (false: it holds what it last held). */
  fed?: boolean;
};
export interface RegisterOwner {
  id: string;
  name: string;
  /** Who holds the authoritative record. */
  owner: { where: 'platform'; keys: string[] } | { where: 'substrate'; objects: string[] };
  /** The API that changes it (the only write path). */
  api: string;
  copies: Copy[];
  /**
   * How the owner's records are kept durably when it is not the store's JSON
   * snapshot alone: with CIVICOS_STATE=postgres the persistence port
   * (lib/data/repo) writes them through to per-record tables. The tables are
   * the same register, not a copy.
   */
  storage?: string;
  /**
   * Who is legally responsible for the register (design §2.1, directions §3):
   * an authority the nation names in its deployment profile
   * (lib/nation/deployment.ts), each record's own institution, or the
   * installation's national administrators. Storage and legal responsibility
   * are separate questions; this names the second. Unset: the installation.
   */
  legal?: LegalOwner;
}

export type LegalOwner = { kind: 'authority'; key: AuthorityKey } | { kind: 'institution'; note: string } | { kind: 'installation' };
export const legalOwnerOf = (r: RegisterOwner): LegalOwner => r.legal ?? { kind: 'installation' };

/**
 * Each register's legal owner as the installation stands now: for a register
 * held for an authority, the institution the nation named, or `named: false`
 * ("no legal owner named": not an error, the nation decides).
 */
export function legalOwners(authorities: Partial<Record<AuthorityKey, string>> | undefined): { id: string; name: string; legal: LegalOwner; institution?: string; named: boolean }[] {
  return REGISTER_OWNERS.map(r => {
    const legal = legalOwnerOf(r);
    if (legal.kind !== 'authority') return { id: r.id, name: r.name, legal, named: true };
    const institution = authorities?.[legal.key];
    return { id: r.id, name: r.name, legal, ...(institution ? { institution } : {}), named: !!institution };
  });
}

const RECORD_TABLES = (tables: string, rest?: string) =>
  `CIVICOS_STATE=postgres: per-record tables ${tables} (lib/data/repo/postgres.ts, migration civicos_records), written through by every instance in one transaction with the audit entry and an outbox row, followed by the others through the outbox${rest ? `; ${rest}` : ''}. Otherwise the store's snapshot (lib/data/persist.ts).`;

const RECORD_DOCS = (what: string) =>
  `CIVICOS_STATE=postgres: per-record documents in civicos.record_doc, one row per record (${what}; lib/data/repo/documents.ts, migration civicos_record_docs), written through by every instance in one transaction with the audit entry and an outbox row, merged where two instances changed one record, followed by the others through the outbox. Otherwise the store's snapshot (lib/data/persist.ts).`;

/** The follower that writes civic-api's tables (path from the repository root). */
export const CIVIC_API_FOLLOWER = 'services/civic-api/src/mirror/follower.ts';
const CIVIC_API_FED = 'Fed: written only by its follower (services/civic-api/src/mirror/follower.ts) from the platform\'s signed events (webhook subscription, topic *) and the mirror feed (GET /api/platform/mirror, integration key of scope mirror:read), idempotent by event id with a cursor on the audit sequence, re-synced in full every 15 minutes.';
const CIVIC_API_WRITES = 'Writes made to it are forwarded to the owning platform route with the caller\'s own credentials and the platform\'s answer returned (CIVIC_API_MODE=forward, services/civic-api/src/common/forward.ts); frozen mode refuses them (410).';
const civicApi = (module: string, fed: boolean, note?: string): Copy =>
  ({ where: 'civic-api', what: `services/civic-api/src/modules/${module}`, role: 'mirror', mode: 'forward', fed,
    note: `NestJS module from the first build; no app route calls it. Mirror: its reads answer from its own tables. ${note ?? (fed ? CIVIC_API_FED : 'Not fed.')} ${CIVIC_API_WRITES}` });

const MIRROR = 'src/lib/db/mirror.ts';

/**
 * App code that reads every substrate table as stored, mirrors included, to
 * describe the substrate itself (row counts, the digest, the handover dump).
 * They report what the mirror holds, never answer a question about the
 * register; register-owners.test.ts allows them only the table names.
 */
export const SUBSTRATE_INSPECTION: { file: string; why: string }[] = [
  { file: 'src/components/features/SubstrateStatus.tsx', why: 'row counts of every substrate table (/gov/substrate)' },
  { file: 'src/app/api/substrate/digest/route.ts', why: 'row-count digest of every substrate table' },
  { file: 'src/app/api/substrate/export/route.ts', why: 'full dump of every substrate table (compliance / handover)' },
];
const ANCHORS = 'src/app/api/cron/audit-anchor/route.ts';

export const REGISTER_OWNERS: RegisterOwner[] = [
  { id: 'nation', name: 'Nation profile and setup', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/sovereign, /api/setup',
    copies: [civicApi('tenancy', true, `${CIVIC_API_FED} It holds the platform's own tenant (platform:<name>, its state and lifecycle); provisioning another tenant has no platform route and answers 410.`)], storage: RECORD_DOCS('each field of the profile, the setup record') },
  { id: 'institutions', name: 'Institutions (ministry registry)', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/org/ministries',
    copies: [{ where: 'substrate', what: 'institutions (civicos.institutions)', role: 'mirror', tables: ['civicos_institutions'], writes: ['civicos_mirror_institution', 'civicos_register_institution', 'civicos_activate_institution'], writer: MIRROR,
      reads: [], fallbackReaders: [],
      note: 'Charter rows the substrate needs for its own rows (officers, posture, work items) and its own SQL (the escalation cascade trigger, civicos.cascade_escalation, reads it): seeded by migration civicos_seed_institutions, then written by the platform after each registry change (create, rename, activate, deactivate, merge) and re-copied hourly; one row per charter, active while any of its ministries is. No app code reads it: the charter screens (charter list, profile and detail, catalogue, observatory, search) and the posture digest read the platform\'s register (/api/public/charters, lib/institution/charter-register.ts) and join the substrate\'s own rows by charter id.' }, civicApi('org', true)],
    storage: RECORD_DOCS('each ministry, and each ministry\'s queue item and incident') },
  { id: 'audit-platform', name: 'Audit chain of platform actions', owner: { where: 'platform', keys: ['__civicos'] }, api: 'recordAudit() (lib/data/store/audit.ts)',
    copies: [{ where: 'substrate', what: "federation_events 'audit.anchor' with scope 'platform'", role: 'mirror', tables: [], writes: [], writer: ANCHORS, note: 'Signed chain heads only, appended to the substrate\'s own event stream by the anchor cron; the entries stay in the platform chain.' }, civicApi('audit', false, 'Not fed: the platform audit chain is not in the mirror feed; civic-api\'s AuditEvent table holds what it held before it became a mirror (verify the platform chain at /api/audit/verify).')],
    storage: RECORD_TABLES('civicos.audit_entry (append-only, each entry chained to the one before by the database)') },
  { id: 'audit-substrate', name: 'Audit trail of substrate actions (citizen runtime)', owner: { where: 'substrate', objects: ['audit_log', 'audit_witnesses'] }, api: 'substrate RPCs', copies: [] },
  { id: 'permits', legal: { kind: 'institution', note: 'The institution whose kind keeps the permit register decides each permit' }, name: 'Permits and licences', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/permits', copies: [civicApi('permits', true)], storage: RECORD_DOCS('each permit') },
  { id: 'payments', name: 'Bills and receipts', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/payments', copies: [civicApi('payments', true)], storage: RECORD_DOCS('each bill and receipt') },
  { id: 'ops', name: 'Operations: services, incidents, deployments, backups, configuration', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/ops, /api/platform',
    copies: [civicApi('ops', true), civicApi('platform-ops', true), civicApi('health', true, 'No records of its own (liveness and readiness of the service).'), civicApi('metrics', true, 'No records of its own (the service\'s Prometheus metrics).')], storage: RECORD_DOCS('each incident, release, deployment, backup and configuration bundle') },
  { id: 'federation', name: 'Federation grants, integrations and webhooks', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/federation, /api/integrations, /api/webhooks',
    copies: [{ where: 'substrate', what: 'federation edges (civicos.federation_edges) and the channel catalogue', role: 'mirror', tables: ['civicos_federation_edges'], writes: [], writer: 'supabase/migrations/20260521850000_civicos_federation_edges.sql',
      note: 'Read models for the substrate dashboards: the edges are seeded by migration from the declared dependency graph and no app path writes them; the channel catalogue is computed from the substrate\'s own event stream.' }, civicApi('interop', true, `${CIVIC_API_FED} Integration keys and webhook secrets stay with the platform; civic-api's key and secret columns hold a placeholder that matches no key.`)],
    storage: RECORD_DOCS('each grant, integration client and webhook subscription') },
  { id: 'directives', legal: { kind: 'institution', note: 'The issuing institution, under its charter' }, name: 'Directives', owner: { where: 'platform', keys: ['__civicosDirectives'] }, api: '/api/directives',
    copies: [{ where: 'substrate', what: 'directives (civicos.directives)', role: 'mirror', tables: ['civicos_directives'], writes: ['civicos_mirror_directive', 'civicos_record_directive', 'civicos_sign_directive', 'civicos_rescind_directive', 'civicos_promote_due_directives'], writer: MIRROR,
      reads: ['civicos_directive_stats', 'civicos_directive_trend'], fallbackReaders: [],
      note: 'Written by the platform after each draft, signature, withdrawal and promotion, re-copied hourly by /api/cron/promote-directives; feeds the substrate\'s realtime change notices. Its SQL statistics (directive_stats, directive_trend) are kept but read this mirror, so no app code calls them: governance output is computed by the platform from its register (lib/data/directive-stats.ts, /api/public/accountability) and search asks /api/directives. Directives the substrate held before the platform owned them are taken over once (the writer reads them once), audited.' }],
    storage: RECORD_DOCS('each directive') },
  { id: 'dispatches', name: 'Dispatches and escalations', owner: { where: 'substrate', objects: ['dispatches', 'escalations'] }, api: 'substrate RPCs', copies: [] },
  { id: 'citizen-runtime', legal: { kind: 'institution', note: 'The institution each service request or work item is addressed to' }, name: 'Service requests, work items, appeals, consents, receipts', owner: { where: 'substrate', objects: ['service_requests', 'work_items', 'appeals', 'consents', 'receipts'] }, api: 'substrate RPCs', copies: [] },
  { id: 'identity', legal: { kind: 'authority', key: 'identity' }, name: 'Citizen and officer identity', owner: { where: 'substrate', objects: ['identities', 'officers', 'signing_keys'] }, api: '/sign-in (substrate auth)', copies: [civicApi('identity', false, 'Not fed: the substrate owns identity and the platform\'s mirror feed does not carry it; a write (POST /api/identity/citizens) has no platform route and answers 410.')] },
  { id: 'officials', name: 'Platform official accounts and sessions', owner: { where: 'platform', keys: ['__civicosOfficials'] }, api: '/api/auth/officials', copies: [],
    storage: RECORD_DOCS('each account; failed sign-in counts per hashed address, kept 15 minutes') },
  { id: 'retention', name: 'Retention rules for personal data, and refusals counted for the audit chain', owner: { where: 'platform', keys: ['__civicosRetention', '__civicosAuditAggregate'] }, api: '/api/platform/retention, /api/cron/retention', copies: [],
    storage: RECORD_DOCS('the rules, their proposals and sweeps; the open windows of aggregated refusals') },
  { id: 'sign-on', name: 'Identity provider for officials and passkey challenges', owner: { where: 'platform', keys: ['__civicosSignOn'] }, api: '/api/auth/officials/identity-provider, /api/auth/oidc/*, /api/auth/passkeys', copies: [],
    storage: RECORD_DOCS('the provider configuration (client secret sealed), each sign-in in progress, each identity waiting for an administrator, each sign-out hint and passkey challenge') },
  { id: 'audit-heads', name: 'Signed audit chain heads', owner: { where: 'platform', keys: ['__civicosAuditHeads'] }, api: 'lib/audit/sign.ts (every N entries) and /api/cron/audit-anchor',
    copies: [{ where: 'substrate', what: "federation_events 'audit.anchor' with scope 'platform'", role: 'mirror', tables: [], writes: [], writer: ANCHORS, note: 'The anchored head is appended to the substrate\'s event stream by the anchor cron when configured; marked anchored only once accepted, retried on the next run.' }],
    storage: RECORD_DOCS('each signed head') },
  { id: 'substrate-mirror', name: 'Substrate mirror queue (records waiting to be copied, with their errors)', owner: { where: 'platform', keys: ['__civicosSubstrateMirror'] }, api: 'lib/db/mirror.ts (after each owner\'s change; /api/cron/promote-directives)', copies: [],
    storage: RECORD_DOCS('each queued record') },
  { id: 'keyring', name: 'Wrapped envelope data keys (key custody)', owner: { where: 'platform', keys: ['__civicosKeyring'] }, api: 'lib/keys/custody.ts (issued and unwrapped by the key provider at start)', copies: [],
    storage: RECORD_DOCS('each wrapped data key') },
  { id: 'exchange', name: 'Exchanges between institutions: feed signing keys, exchange log, event outbox', owner: { where: 'platform', keys: ['__civicosFeedKeys', '__civicosExchangeLog', '__civicosEventOutbox', '__civicosPartnerCerts'] }, api: '/api/exchange, feed signing-key routes, webhooks delivery', copies: [],
    storage: RECORD_DOCS('each signing key, exchange log entry, partner certificate binding, outbox event, delivery and subscriber cursor') },
  { id: 'twin-readings', name: 'Readings pushed to twin stream sources (SensorThings create, MQTT) and their brokers\' sealed passwords', owner: { where: 'platform', keys: ['__civicosStreamReadings'] }, api: '/api/twin/sta/v1.1 (POST Observations, CreateObservations, DELETE Observations to withdraw), the MQTT subscriber (lib/twin/mqtt.ts), /api/twin/sources/[id]/ingest', copies: [],
    storage: RECORD_DOCS('each stream\'s readings, kept 92 days, and each broker\'s sealed password; the substrate\'s own telemetry samples are a separate register (telemetry) read beside it') },
  { id: 'twin-tasking', name: 'Tasking of the devices behind twin stream sources: tasking capabilities and tasks', owner: { where: 'platform', keys: ['__civicosTwinTasking'] }, api: '/api/twin/tasking (capabilities, tasks, executor), /api/twin/sta/v1.1 (Actuators, TaskingCapabilities, Tasks)', copies: [],
    storage: RECORD_DOCS('each tasking capability (retired ones kept) and each task with its status history') },
  { id: 'telemetry', name: 'Telemetry streams', owner: { where: 'substrate', objects: ['telemetry_streams', 'telemetry_readings'] }, api: 'substrate RPCs', copies: [] },
  { id: 'twin', legal: { kind: 'authority', key: 'statistics' }, name: 'National twin: sources, runs, observations, metrics, scenarios, policy', owner: { where: 'platform', keys: ['__civicosTwin', '__civicosTwinScenarios', '__civicosTwinArchive', '__civicosTwinPolicy'] }, api: '/api/twin', copies: [],
    storage: RECORD_TABLES('civicos.twin_entity, twin_key, twin_source, twin_run and twin_observation (bitemporal: valid range, recorded and superseded times)', 'metric definitions, scenarios (each scenario with its versions), the calibration log, the withdrawal policy and the archive\'s move log as per-record documents in civicos.record_doc') },
  { id: 'facilities', legal: { kind: 'institution', note: 'The owning institution records a site; the mapping agency certifies locations under the facility policy' }, name: 'National facility register', owner: { where: 'platform', keys: ['__civicosFacilities', '__civicosOpenSites', '__civicosSiteFeeds'] }, api: '/api/facilities, /api/org/ministries/{id}/facilities', copies: [],
    storage: RECORD_TABLES('civicos.facility (with a geography point and GiST index where PostGIS is present)', 'the policy, its changes, loads, feeds and open-data candidates as per-record documents in civicos.record_doc') },
  { id: 'boundaries', legal: { kind: 'institution', note: 'The national mapping agency named in setup' }, name: 'Boundary versions and installed districts', owner: { where: 'platform', keys: ['__civicosBoundaries', '__civicosMapPack'] }, api: '/api/boundaries, /api/map-pack', copies: [],
    storage: RECORD_TABLES('civicos.boundary_version and boundary_unit (geometry(MultiPolygon, 4326) checked with ST_IsValid where PostGIS is present)', 'installed district packs as per-record documents in civicos.record_doc') },
  { id: 'parcels', legal: { kind: 'institution', note: 'The cadastre authority named in the parcel policy' }, name: 'Land parcel register (cadastre): parcels, the parcel policy and its changes, loads', owner: { where: 'platform', keys: ['__civicosParcels'] }, api: '/api/parcels', copies: [],
    storage: RECORD_TABLES('civicos.parcel (bounding box columns; a geometry(MultiPolygon, 4326) made valid with ST_IsValid checked and a GiST index where PostGIS is present; migration civicos_parcels; the outbox row carries only the parcel id and state, never its rights)', 'the policy, its changes and loads as per-record documents in civicos.record_doc') },
  { id: 'case-imports', legal: { kind: 'institution', note: 'The institution whose queue receives the cases' }, name: 'Case loads and connected case systems', owner: { where: 'platform', keys: ['__civicosCaseImports', '__civicosCaseFeedKeys'] }, api: '/api/org/ministries/{id}/queue', copies: [],
    storage: RECORD_DOCS('each case load and connected case system; feed key hashes') },
  { id: 'public-sites', legal: { kind: 'institution', note: 'The institution whose site it is' }, name: 'Public sites: settings, editorial, subscriptions', owner: { where: 'platform', keys: ['__civicosSites', '__civicosEditorial', '__civicosSiteSubs'] }, api: '/api/public-sites, /api/subscriptions', copies: [],
    storage: RECORD_DOCS('each site\'s settings, each editorial version, proposal and translation, each subscription and queued message') },
  { id: 'messaging', name: 'Email and SMS: the outbox of messages to officials and subscribers, the nation\'s providers (sealed secrets) and delivery settings', owner: { where: 'platform', keys: ['__civicosMessaging'] }, api: '/api/messaging (administrators), /api/cron/deliver-messages (the delivery worker); queued by lib/data/comms.ts alert() and lib/data/site-subscriptions.ts', copies: [],
    storage: RECORD_DOCS('each queued, sent or dead message (address and text emptied once sent, cancelled or cleared), each provider with its sealed secret, each nation\'s settings') },
  { id: 'update-center', name: 'Update Center', owner: { where: 'platform', keys: ['__civicosUpdates', '__civicosSecurity', '__civicosHosting', '__civicosReadiness', '__civicosChange', '__civicosAdvisories', '__civicosSupport', '__civicosSupply', '__civicosLifecycle', '__civicosMirror', '__civicosComms', '__civicosContracts', '__civicosSovereignty'] }, api: '/api/releases', copies: [],
    storage: RECORD_DOCS('each release, nation, feature request, order, ticket, advisory, deposit, mirror, shipment, alert, contract and change-control record; record numbers from blocks reserved in civicos.record_counter') },
  { id: 'access-log', name: 'Access log: reads of restricted and secret records, searches, exports, refusals and permission changes', legal: { kind: 'authority', key: 'dataProtection' }, owner: { where: 'platform', keys: ['__civicosAccessLog'] }, api: 'recordAccess() (lib/records/access-log.ts), read at /api/access-log', copies: [],
    storage: RECORD_DOCS('each entry, hash-chained') },
  { id: 'backups', name: 'Backups: retention policy, RPO/RTO targets, restore proposals and restores (the catalogue itself is the backup target)', owner: { where: 'platform', keys: ['__civicosBackups'] }, api: '/api/platform/backups', copies: [],
    storage: RECORD_DOCS('the policy, each restore proposal and each restore record; kept as they are by a restore (lib/backup/state.ts KEPT_ON_RESTORE)') },
];

/** The register a store key belongs to. */
export const ownerOfKey = (key: string) => REGISTER_OWNERS.find(r => r.owner.where === 'platform' && r.owner.keys.includes(key));
