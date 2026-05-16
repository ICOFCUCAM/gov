// Sovereign services contract surface. Federated applications depend on
// these shared runtime services through this single boundary, not deep
// internal paths — the deployment-model isolation contract.
//
// Namespaced to avoid symbol collisions (several services export
// `subscribe`/`version`).

export * as EventBus from '@/services/event-bus';
export * as Orchestration from '@/services/orchestration-engine';
export * as Constitution from '@/services/constitutional-engine';
export * as AuditLedger from '@/services/audit-ledger';
export * as Federation from '@/services/federation-aggregate';
export * as Interop from '@/services/interoperability-fabric';
