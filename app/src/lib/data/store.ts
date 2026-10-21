// CivicOS — the platform's own server store, as a barrel (review R16, C1).
//
// The store is split into bounded contexts under lib/data/store/, all sharing
// the one state object `globalThis.__civicos` (lib/data/store/state.ts; the
// same key as before, so saved snapshots restore through lib/data/persist.ts):
//
//   audit         the platform audit chain (recordAudit, verifyAuditChain …)
//   permits       session, permits, notifications, documents, onboarding
//   payments      bills and receipts
//   ops           operational intelligence and platform incidents
//   federation    integration clients, federation grants, webhooks
//   platform-ops  releases, deployments, tenant lifecycle, backups, configs
//   ministries    archetypes, ministries, modules, regions, queues,
//                 ministry incidents, field operations, series
//   sovereign     the nation profile, cabinet, setup, presets
//   institutions  the constitutional terms of each institution (standing, independence)
//   national      the national snapshot and the coordination fabric
//
// Every import of '@/lib/data/store' keeps working: this module re-exports
// every function it exported before the split. Stores that only record audit
// entries import '@/lib/data/store/audit' and no longer load the whole store.

export * from './store/audit';
export * from './store/permits';
export * from './store/payments';
export * from './store/ops';
export * from './store/federation';
export * from './store/platform-ops';
export * from './store/ministries';
export * from './store/sovereign';
export * from './store/institutions';
export * from './store/national';
