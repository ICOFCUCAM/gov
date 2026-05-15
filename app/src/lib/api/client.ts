// CivicOS — typed client for browser-side mutations.
// Server Components read the datastore directly (normal Next.js practice);
// Client Components use this client for mutations and live reads.
// All calls hit the typed /api routes, so the backend is swappable.

'use client';

import type {
  AuditEntry,
  Bill,
  CreatePermitInput,
  DecidePermitInput,
  Incident,
  IncidentSeverity,
  MunicipalityOnboardingInput,
  MunicipalityOnboardingResult,
  Notification,
  OpsOverview,
  PaymentReceipt,
  Permit,
  IntegrationClient,
  IntegrationKind,
  IntegrationRegistered,
  FederationGrant,
  FederationCheck,
  WebhookSubscription,
  WebhookCreated,
  Release,
  Deployment,
  DeployStrategy,
  TenantLifecycle,
  TenantState,
  BackupRecord,
  BackupKind,
  ConfigBundle,
  ConfigDrift,
  Archetype,
  ArchetypeKey,
  Ministry,
  MinistryOperations,
  MinistryRegions,
  MinistryIncidents,
  MinistryIncident,
  MinistryFieldOps,
  MinistrySeries,
  SovereignProfile,
  CabinetOverview,
  MinistryQueue,
  QueueItem,
  QueueAction,
  AnalyticDelta,
  SignatureRequest,
  SignatureResult,
  VerifyResult,
} from './types';

async function req<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  sovereign: {
    get: () => req<{ sovereign: SovereignProfile }>('/api/sovereign'),
    update: (patch: Partial<SovereignProfile>) =>
      req<{ sovereign: SovereignProfile }>('/api/sovereign', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
  },
  cabinet: {
    overview: () => req<CabinetOverview>('/api/cabinet'),
  },
  permits: {
    list: () => req<{ permits: Permit[] }>('/api/permits'),
    get: (id: string) => req<{ permit: Permit }>(`/api/permits/${id}`),
    create: (body: CreatePermitInput) =>
      req<{ permit: Permit }>('/api/permits', { method: 'POST', body: JSON.stringify(body) }),
    decide: (id: string, body: DecidePermitInput) =>
      req<{ permit: Permit }>(`/api/permits/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  audit: {
    list: () => req<{ events: AuditEntry[] }>('/api/audit'),
    verify: () =>
      req<{ ok: boolean; checked: number; brokenAtSeq?: number }>('/api/audit/verify'),
  },
  ops: {
    overview: () => req<OpsOverview>('/api/ops/overview'),
    incidents: {
      list: () => req<{ incidents: Incident[] }>('/api/ops/incidents'),
      create: (body: {
        severity: IncidentSeverity;
        title: string;
        scope: string;
        by?: string;
      }) =>
        req<{ incident: Incident }>('/api/ops/incidents', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      ack: (id: string, by: string, note?: string) =>
        req<{ incident: Incident }>(`/api/ops/incidents/${id}/ack`, {
          method: 'POST',
          body: JSON.stringify({ by, note }),
        }),
      resolve: (id: string, by: string, note?: string) =>
        req<{ incident: Incident }>(`/api/ops/incidents/${id}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ by, note }),
        }),
      escalate: (id: string, by: string, note?: string) =>
        req<{ incident: Incident }>(`/api/ops/incidents/${id}/escalate`, {
          method: 'POST',
          body: JSON.stringify({ by, note }),
        }),
    },
  },
  interop: {
    integrations: {
      list: () => req<{ integrations: IntegrationClient[] }>('/api/integrations'),
      register: (body: {
        kind: IntegrationKind;
        name: string;
        ownerOrg: string;
        contact: string;
        scopes: string[];
      }) =>
        req<IntegrationRegistered>('/api/integrations', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      approve: (id: string) =>
        req<{ integration: IntegrationClient }>(`/api/integrations/${id}/approve`, { method: 'POST', body: '{}' }),
      revoke: (id: string) =>
        req<{ integration: IntegrationClient }>(`/api/integrations/${id}/revoke`, { method: 'POST', body: '{}' }),
    },
    federation: {
      grants: () => req<{ grants: FederationGrant[] }>('/api/federation/grants'),
      propose: (body: { toTenant: string; scopes: string[]; reason: string; expiresAt?: string }) =>
        req<{ grant: FederationGrant }>('/api/federation/propose', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      approve: (id: string) =>
        req<{ grant: FederationGrant }>(`/api/federation/grants/${id}/approve`, { method: 'POST', body: '{}' }),
      revoke: (id: string) =>
        req<{ grant: FederationGrant }>(`/api/federation/grants/${id}/revoke`, { method: 'POST', body: '{}' }),
      check: (to: string, scope: string) =>
        req<FederationCheck>(
          `/api/federation/check?to=${encodeURIComponent(to)}&scope=${encodeURIComponent(scope)}`,
        ),
    },
    webhooks: {
      list: () => req<{ webhooks: WebhookSubscription[] }>('/api/webhooks'),
      subscribe: (body: { topic: string; url: string }) =>
        req<WebhookCreated>('/api/webhooks', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      pause: (id: string) =>
        req<{ webhook: WebhookSubscription }>(`/api/webhooks/${id}/pause`, { method: 'POST', body: '{}' }),
    },
  },
  platform: {
    releases: {
      list: () => req<{ releases: Release[] }>('/api/platform/releases'),
      create: (body: { version: string; notes: string; schemaMigration?: string }) =>
        req<{ release: Release }>('/api/platform/releases', { method: 'POST', body: JSON.stringify(body) }),
      promote: (id: string) =>
        req<{ release: Release }>(`/api/platform/releases/${id}/promote`, { method: 'POST', body: '{}' }),
    },
    deployments: {
      list: () => req<{ deployments: Deployment[] }>('/api/platform/deployments'),
      start: (releaseId: string, strategy: DeployStrategy) =>
        req<{ deployment: Deployment }>('/api/platform/deployments', { method: 'POST', body: JSON.stringify({ releaseId, strategy }) }),
      advance: (id: string, gateResult: 'pass' | 'fail', note?: string) =>
        req<{ deployment: Deployment }>(`/api/platform/deployments/${id}/advance`, { method: 'POST', body: JSON.stringify({ gateResult, note }) }),
      rollback: (id: string, note: string) =>
        req<{ deployment: Deployment }>(`/api/platform/deployments/${id}/rollback`, { method: 'POST', body: JSON.stringify({ note }) }),
    },
    lifecycle: {
      get: () => req<{ lifecycle: TenantLifecycle }>('/api/platform/lifecycle'),
      transition: (to: TenantState, reason: string) =>
        req<{ lifecycle: TenantLifecycle }>('/api/platform/lifecycle/transition', { method: 'POST', body: JSON.stringify({ to, reason }) }),
    },
    backups: {
      list: () => req<{ backups: BackupRecord[] }>('/api/platform/backups'),
      create: (kind: BackupKind) =>
        req<{ backup: BackupRecord }>('/api/platform/backups', { method: 'POST', body: JSON.stringify({ kind }) }),
      restore: (id: string) =>
        req<{ backup: BackupRecord }>(`/api/platform/backups/${id}/restore`, { method: 'POST', body: '{}' }),
    },
    config: {
      list: () => req<{ configs: ConfigBundle[] }>('/api/platform/config'),
      publish: (payload: Record<string, unknown>) =>
        req<{ config: ConfigBundle }>('/api/platform/config', { method: 'POST', body: JSON.stringify({ payload }) }),
      sign: (id: string) =>
        req<{ config: ConfigBundle }>(`/api/platform/config/${id}/sign`, { method: 'POST', body: '{}' }),
      apply: (id: string) =>
        req<{ config: ConfigBundle }>(`/api/platform/config/${id}/apply`, { method: 'POST', body: '{}' }),
      drift: () => req<ConfigDrift>('/api/platform/config/drift'),
    },
  },
  org: {
    archetypes: () => req<{ archetypes: Archetype[] }>('/api/org/archetypes'),
    ministries: () => req<{ ministries: Ministry[] }>('/api/org/ministries'),
    get: (id: string) => req<{ ministry: Ministry }>(`/api/org/ministries/${id}`),
    operations: (id: string) => req<MinistryOperations>(`/api/org/ministries/${id}/operations`),
    regions: (id: string) => req<MinistryRegions>(`/api/org/ministries/${id}/regions`),
    analytics: (id: string) => req<{ analytics: AnalyticDelta[] }>(`/api/org/ministries/${id}/analytics`),
    queue: (id: string) => req<MinistryQueue>(`/api/org/ministries/${id}/queue`),
    incidents: (id: string) => req<MinistryIncidents>(`/api/org/ministries/${id}/incidents`),
    escalateIncident: (id: string, key: string) =>
      req<{ incident: MinistryIncident }>(`/api/org/ministries/${id}/incidents/${key}/escalate`, { method: 'POST', body: '{}' }),
    resolveIncident: (id: string, key: string) =>
      req<{ incident: MinistryIncident }>(`/api/org/ministries/${id}/incidents/${key}/resolve`, { method: 'POST', body: '{}' }),
    field: (id: string) => req<MinistryFieldOps>(`/api/org/ministries/${id}/field`),
    series: (id: string) => req<MinistrySeries>(`/api/org/ministries/${id}/series`),
    actOnQueueItem: (id: string, itemId: string, action: QueueAction, note?: string) =>
      req<{ item: QueueItem }>(`/api/org/ministries/${id}/queue/${itemId}/act`, {
        method: 'POST',
        body: JSON.stringify({ action, note }),
      }),
    create: (body: { archetype: ArchetypeKey; name: string; slug: string }) =>
      req<{ ministry: Ministry }>('/api/org/ministries', { method: 'POST', body: JSON.stringify(body) }),
    rename: (id: string, name: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/rename`, { method: 'POST', body: JSON.stringify({ name }) }),
    deactivate: (id: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/deactivate`, { method: 'POST', body: '{}' }),
    merge: (id: string, targetId: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/merge`, { method: 'POST', body: JSON.stringify({ targetId }) }),
    addDepartment: (id: string, name: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/departments`, { method: 'POST', body: JSON.stringify({ name }) }),
    removeDepartment: (id: string, deptId: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/departments/${deptId}`, { method: 'DELETE' }),
    setModule: (id: string, moduleKey: string, enabled: boolean) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/modules`, { method: 'POST', body: JSON.stringify({ moduleKey, enabled }) }),
  },
  payments: {
    list: () => req<{ bills: Bill[]; receipts: PaymentReceipt[] }>('/api/payments'),
    pay: (billId: string, rail: string) =>
      req<{ receipt: PaymentReceipt }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ billId, rail }),
      }),
  },
  notifications: {
    list: () => req<{ notifications: Notification[] }>('/api/notifications'),
  },
  documents: {
    verify: (code: string) =>
      req<VerifyResult>('/api/documents/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
  },
  signatures: {
    sign: (body: SignatureRequest) =>
      req<{ result: SignatureResult }>('/api/signatures', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  municipalities: {
    onboard: (body: MunicipalityOnboardingInput) =>
      req<{ result: MunicipalityOnboardingResult }>('/api/municipalities', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};
