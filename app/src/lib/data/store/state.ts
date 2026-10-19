// The store's one state object, `globalThis.__civicos` (the same key as
// before the split, so saved snapshots restore; lib/data/persist.ts). Each
// context module under lib/data/store/ reads and changes its own fields of it.
import { withDefaults } from '@/lib/data/defaults';
import { federationSeed } from '@/lib/institution/federation';
import { applyNation } from '@/lib/nation/registry';
import type {
  AuditEntry,
  Bill,
  Incident,
  Notification,
  PaymentReceipt,
  Permit,
  IntegrationClient,
  FederationGrant,
  WebhookSubscription,
  Release,
  Deployment,
  TenantLifecycle,
  BackupRecord,
  ConfigBundle,
  Ministry,
  QueueItem,
  MinistryIncident,
  SovereignProfile,
  PlatformSetup,
} from '@/lib/api/types';
import { hash, citizen } from './shared';

// Module-level singletons (process-lifetime).
const g = globalThis as unknown as { __civicos?: ReturnType<typeof seed> };

export function seed() {
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86400000).toISOString();

  const permits: Permit[] = [
    {
      id: 'PM-4F21',
      type: 'business',
      title: 'Bakery — small business permit',
      applicantName: citizen.displayName,
      municipality: 'Capital District',
      status: 'in-review',
      submittedAt: days(-3),
      decisionDue: days(9),
      officerName: 'M. Khumalo',
      aiClass: 'B',
      fields: { premises: 'Plot 4423', staff: '3', category: 'Food retail' },
      timeline: [
        { status: 'submitted', at: days(-3) },
        { status: 'in-review', at: days(-2), officerName: 'M. Khumalo' },
        { status: 'needs-info', at: days(-1), officerName: 'M. Khumalo', note: 'Please add a fire-safety annex.' },
      ],
      contestable: true,
    },
  ];

  const bills: Bill[] = [
    { id: 'BL-9001', kind: 'water', description: 'Water — April 2026', amountMinor: 84000, currency: 'USD', dueDate: days(6), status: 'due' },
    { id: 'BL-9002', kind: 'waste', description: 'Solid waste — Q2 2026', amountMinor: 30000, currency: 'USD', dueDate: days(12), status: 'due' },
    { id: 'BL-9003', kind: 'property-tax', description: 'Property tax — 2025 (paid)', amountMinor: 540000, currency: 'USD', dueDate: days(-40), status: 'paid' },
  ];

  const receipts: PaymentReceipt[] = [
    { id: 'PR-3001', billId: 'BL-9003', amountMinor: 540000, currency: 'USD', rail: 'Mobile Money', paidAt: days(-40), hash: hash('BL-9003') },
  ];

  const notifications: Notification[] = [
    { id: 'NT-7001', from: 'Ministry of Education', subject: 'School transfer approved', body: 'The transfer of Aisha to Northern Primary is confirmed.', at: days(-1), read: false, channel: 'wallet' },
    { id: 'NT-7002', from: 'Tax authority', subject: 'Your 2026 tax draft is ready', body: 'A pre-filled draft is ready for your review. No signature is needed yet.', at: days(-3), read: false, channel: 'wallet', aiClass: 'C' },
    { id: 'NT-7003', from: 'Civic Assistant', subject: 'Pension eligibility', body: 'Here is the information you asked for about pension eligibility.', at: days(-7), read: true, channel: 'wallet', aiClass: 'A' },
  ];

  const audit: AuditEntry[] = [];

  const incidents: Incident[] = [
    {
      id: 'INC-2041',
      severity: 'sev3',
      title: 'Eastern edge sync delayed (>2h)',
      scope: 'Eastern',
      status: 'acknowledged',
      openedAt: days(0),
      acknowledgedAt: days(0),
      owner: 'Platform on-call',
      events: [
        { at: days(0), by: 'system', action: 'opened', note: 'Sync lag threshold exceeded.' },
        { at: days(0), by: 'W. Tanaka', action: 'acknowledged', note: 'Investigating link to regional POP.' },
      ],
    },
  ];

  // Minutes since last successful edge sync, per municipality.
  const tenantSync: Record<string, number> = {
    'Capital District': 4,
    Eastern: 137,
    Northern: 22,
  };

  const integrations: IntegrationClient[] = [
    {
      id: 'IC-7001',
      kind: 'integration',
      name: 'County GIS connector',
      ownerOrg: 'Capital District Lands Office',
      scopes: ['permit:read'],
      status: 'approved',
      rateLimitRpm: 120,
      createdAt: days(-20),
      approvedBy: 'L. Petrov',
    },
  ];
  const grants: FederationGrant[] = [
    {
      id: 'FG-3001',
      fromTenant: 'home',
      toTenant: 'min-health',
      scopes: ['permit:read'],
      status: 'approved',
      reason: 'Health ministry oversight of food-handling permits',
      createdAt: days(-15),
      approvedBy: 'STO',
      policy: { purposes: ['oversight'], retentionDays: 365, onwardSharing: false },
    },
  ];
  const webhooks: WebhookSubscription[] = [
    {
      id: 'WH-9001',
      topic: 'civicos.permit.decided',
      url: 'https://lands.home.gov.example/hooks/permits',
      status: 'active',
      failures: 0,
      createdAt: days(-10),
    },
  ];

  const releases: Release[] = [
    { id: 'REL-140', version: '1.4.0', channel: 'stable', notes: 'Permits SLA + audit chain', createdAt: days(-30), approvedBy: 'L. Petrov' },
    { id: 'REL-150', version: '1.5.0', channel: 'staging', notes: 'Operations centre + interop', createdAt: days(-7) },
  ];
  const deployments: Deployment[] = [];
  const lifecycle: TenantLifecycle = {
    tenant: 'home',
    state: 'active',
    events: [
      { at: days(-60), from: 'provisioning', to: 'active', reason: 'Go-live after inclusion-floor check', actor: 'L. Petrov' },
    ],
  };
  const backups: BackupRecord[] = [
    { id: 'BK-9001', kind: 'full', state: 'completed', location: 'sov://backups/home/full-1.enc', encrypted: true, sizeBytes: 4_812_004, createdAt: days(-1) },
  ];
  const configs: ConfigBundle[] = [
    { id: 'CFG-1', scope: 'global', version: 1, contentHash: hash('cfg-v1'), signedBy: 'STO', state: 'applied', createdAt: days(-20) },
  ];

  // The sovereign federation always exists — instantiated from the
  // canonical institution set so every institutional route resolves to a
  // real operational surface (no empty store, no 404 dead-end).
  const ministries: Ministry[] = federationSeed();
  const ministryQueues: Record<string, QueueItem[]> = {};
  const ministryIncidents: Record<string, MinistryIncident[]> = {};
  // Global-state-neutral defaults — works for any state form; configurable.
  const sovereign: SovereignProfile = {
    stateName: 'Sovereign State',
    stateForm: 'republic',
    executiveTitle: 'Head of Government',
    legislatureName: 'National Assembly',
    currency: 'USD',
    regionNoun: 'region',
    locale: 'en',
    accent: '#1f2630',
    motto: 'Humans govern · the platform serves',
  };
  const setup = null as PlatformSetup | null;

  // SHA-256 of each integration's API key, by client id (the key itself is shown once and never kept).
  const integrationKeys: Record<string, string> = {};
  // Each webhook's HMAC signing secret, sealed under CIVICOS_DATA_KEK when set (lib/crypto/envelope.ts).
  const webhookSecrets: Record<string, string> = {};
  return { setup, permits, bills, receipts, notifications, audit, incidents, tenantSync, integrations, integrationKeys, webhookSecrets, grants, webhooks, releases, deployments, lifecycle, backups, configs, ministries, ministryQueues, ministryIncidents, sovereign, fabricStartedAt: now };
}

// A store restored from a saved snapshot (lib/data/persist.ts) keeps its data; fields added to the
// store since that snapshot get their seeded defaults at any depth (lib/data/defaults.ts). The
// nation profile and the per-ministry and per-tenant dictionaries are kept exactly as saved.
export const db = (g.__civicos = withDefaults(g.__civicos, seed(), { opaque: ['sovereign', 'tenantSync', 'ministryQueues', 'ministryIncidents'] }));
// Engines read the installed nation (regions, map, currency) from the registry.
applyNation({ ...db.sovereign, configured: !!db.setup });
