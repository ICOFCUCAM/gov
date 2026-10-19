// One owner per register (architecture review R19, finding D8).
//
// The same business records exist in up to three places: the platform's
// own stores (`globalThis.__civicos*`, saved by lib/data/persist.ts), the
// Supabase substrate (app/supabase/migrations) and the NestJS service in
// services/civic-api. Estonia's rule applies: each register has exactly one
// owner, every other copy is a mirror of it, a fallback used only when the
// owner is unreachable, or retired (kept reachable, never written). This
// list is that decision. `register-owners.test.ts` fails when a store key or
// a civic-api module appears without an owner here.

export type Copy = { where: 'platform' | 'substrate' | 'civic-api'; what: string; role: 'mirror' | 'fallback' | 'retired'; note: string };
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
}

const RECORD_TABLES = (tables: string, rest?: string) =>
  `CIVICOS_STATE=postgres: per-record tables ${tables} (lib/data/repo/postgres.ts, migration civicos_records), written through by every instance in one transaction with the audit entry and an outbox row, followed by the others through the outbox${rest ? `; ${rest}` : ''}. Otherwise the store's snapshot (lib/data/persist.ts).`;

const civicApi = (module: string, note = 'NestJS module from the first build; no app route calls it. Kept reachable, not written.'): Copy =>
  ({ where: 'civic-api', what: `services/civic-api/src/modules/${module}`, role: 'retired', note });

export const REGISTER_OWNERS: RegisterOwner[] = [
  { id: 'nation', name: 'Nation profile and setup', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/sovereign, /api/setup',
    copies: [civicApi('tenancy')] },
  { id: 'institutions', name: 'Institutions (ministry registry)', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/org/ministries',
    copies: [{ where: 'substrate', what: 'institutions (civicos_seed_institutions)', role: 'mirror', note: 'Charter ids the substrate needs for its own rows; seeded from the registry.' }, civicApi('org')] },
  { id: 'audit-platform', name: 'Audit chain of platform actions', owner: { where: 'platform', keys: ['__civicos'] }, api: 'recordAudit() (lib/data/store/audit.ts)',
    copies: [{ where: 'substrate', what: 'audit_witnesses (civicos_audit_witnesses)', role: 'mirror', note: 'Anchors of chain heads only; the entries stay in the platform chain.' }, civicApi('audit')],
    storage: RECORD_TABLES('civicos.audit_entry (append-only, each entry chained to the one before by the database)') },
  { id: 'audit-substrate', name: 'Audit trail of substrate actions (citizen runtime)', owner: { where: 'substrate', objects: ['audit_log', 'audit_witnesses'] }, api: 'substrate RPCs', copies: [] },
  { id: 'permits', name: 'Permits and licences', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/permits', copies: [civicApi('permits')] },
  { id: 'payments', name: 'Bills and receipts', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/payments', copies: [civicApi('payments')] },
  { id: 'ops', name: 'Operations: services, incidents, deployments, backups, configuration', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/ops, /api/platform',
    copies: [civicApi('ops'), civicApi('platform-ops'), civicApi('health'), civicApi('metrics')] },
  { id: 'federation', name: 'Federation grants, integrations and webhooks', owner: { where: 'platform', keys: ['__civicos'] }, api: '/api/federation, /api/integrations, /api/webhooks',
    copies: [{ where: 'substrate', what: 'federation channels and edges (civicos_federation_*)', role: 'mirror', note: 'Read models of agreed channels for the substrate dashboards.' }, civicApi('interop')] },
  { id: 'directives', name: 'Directives', owner: { where: 'substrate', objects: ['directives', 'dispatches', 'escalations'] }, api: '/api/directives',
    copies: [{ where: 'platform', what: '__civicosDirectives (lib/data/directives.ts)', role: 'fallback', note: 'Used only when the substrate is not configured; the same calls work either way (lib/db/repos/memory.ts).' }] },
  { id: 'citizen-runtime', name: 'Service requests, work items, appeals, consents, receipts', owner: { where: 'substrate', objects: ['service_requests', 'work_items', 'appeals', 'consents', 'receipts'] }, api: 'substrate RPCs', copies: [] },
  { id: 'identity', name: 'Citizen and officer identity', owner: { where: 'substrate', objects: ['identities', 'officers', 'signing_keys'] }, api: '/sign-in (substrate auth)', copies: [civicApi('identity')] },
  { id: 'officials', name: 'Platform official accounts and sessions', owner: { where: 'platform', keys: ['__civicosOfficials'] }, api: '/api/auth/officials', copies: [] },
  { id: 'audit-heads', name: 'Signed audit chain heads', owner: { where: 'platform', keys: ['__civicosAuditHeads'] }, api: 'lib/audit/sign.ts (every N entries) and /api/cron/audit-anchor',
    copies: [{ where: 'substrate', what: 'audit_witnesses (civicos_audit_witnesses)', role: 'mirror', note: 'The anchored head is also written to the substrate witnesses when configured.' }] },
  { id: 'exchange', name: 'Exchanges between institutions: feed signing keys, exchange log, event outbox', owner: { where: 'platform', keys: ['__civicosFeedKeys', '__civicosExchangeLog', '__civicosEventOutbox'] }, api: '/api/exchange, feed signing-key routes, webhooks delivery', copies: [] },
  { id: 'telemetry', name: 'Telemetry streams', owner: { where: 'substrate', objects: ['telemetry_streams', 'telemetry_readings'] }, api: 'substrate RPCs', copies: [] },
  { id: 'twin', name: 'National twin: sources, runs, observations, metrics, scenarios', owner: { where: 'platform', keys: ['__civicosTwin', '__civicosTwinScenarios', '__civicosTwinArchive'] }, api: '/api/twin', copies: [],
    storage: RECORD_TABLES('civicos.twin_entity, twin_key, twin_source, twin_run and twin_observation (bitemporal: valid range, recorded and superseded times)', 'metrics, scenarios and the archive\'s move log stay in the snapshot') },
  { id: 'facilities', name: 'National facility register', owner: { where: 'platform', keys: ['__civicosFacilities', '__civicosOpenSites', '__civicosSiteFeeds'] }, api: '/api/facilities, /api/org/ministries/{id}/facilities', copies: [],
    storage: RECORD_TABLES('civicos.facility (with a geography point and GiST index where PostGIS is present)', 'the policy, its changes, loads, feeds and open-data candidates stay in the snapshot') },
  { id: 'boundaries', name: 'Boundary versions and installed districts', owner: { where: 'platform', keys: ['__civicosBoundaries', '__civicosMapPack'] }, api: '/api/boundaries, /api/map-pack', copies: [],
    storage: RECORD_TABLES('civicos.boundary_version and boundary_unit (geometry(MultiPolygon, 4326) checked with ST_IsValid where PostGIS is present)', 'installed district packs stay in the snapshot') },
  { id: 'case-imports', name: 'Case loads and connected case systems', owner: { where: 'platform', keys: ['__civicosCaseImports', '__civicosCaseFeedKeys'] }, api: '/api/org/ministries/{id}/queue', copies: [] },
  { id: 'public-sites', name: 'Public sites: settings, editorial, subscriptions', owner: { where: 'platform', keys: ['__civicosSites', '__civicosEditorial', '__civicosSiteSubs'] }, api: '/api/public-sites, /api/subscriptions', copies: [] },
  { id: 'update-center', name: 'Update Center', owner: { where: 'platform', keys: ['__civicosUpdates', '__civicosSecurity', '__civicosHosting', '__civicosReadiness', '__civicosChange', '__civicosAdvisories', '__civicosSupport', '__civicosSupply', '__civicosLifecycle', '__civicosMirror', '__civicosComms', '__civicosContracts', '__civicosSovereignty'] }, api: '/api/releases', copies: [] },
];

/** The register a store key belongs to. */
export const ownerOfKey = (key: string) => REGISTER_OWNERS.find(r => r.owner.where === 'platform' && r.owner.keys.includes(key));
