// CivicOS — typed client for browser-side mutations.
// Server Components read the datastore directly (normal Next.js practice);
// Client Components use this client for mutations and live reads.
// All calls hit the typed /api routes, so the backend is swappable.

'use client';

import type { SiteSettings, SiteSettingsInput } from '@/lib/data/site-settings';
import type { SiteChange, SiteProposal, SiteEditorial } from '@/lib/data/site-editorial';
import type { SiteContent } from '@/lib/public-sites/types';
import type { SiteLanguage } from '@/lib/public-sites/effective';
import type { Coverage, XliffImport } from '@/lib/public-sites/translation';

/** GET /api/public-sites/<id>/editorial: what the site editor works from. */
export interface SiteEditView {
  content: SiteContent;
  presets: { id: string; label: string; description: string }[];
  defaultPreset: string;
  editorial: SiteEditorial;
  settings: SiteSettings;
  /** Languages the site can be translated into (all but English). */
  languages: { code: string; name: string; dir: 'ltr' | 'rtl' }[];
  nationLocale: string;
  /** The language the public site is shown in now. */
  language: SiteLanguage;
  /** Email-update subscribers (counts only) and messages waiting for an email provider. */
  subscribers: { confirmed: number; pending: number; unsubscribed: number; queued: number };
}

/** One string of a site for translation (GET /api/public-sites/[id]/translations/[locale]). */
export interface SiteTranslationString {
  path: string; label: string; source: string; target: string;
  status: 'translated' | 'stale' | 'missing';
  /** For an out-of-date translation: the English it was made from. */
  previousSource?: string;
}

/** A public institution site's integration settings with its name (GET /api/public-sites). */
export type PublicSiteRow = SiteSettings & { name: string; role: string };
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
  SovereignPreset,
  PlatformSetup,
  NationalSnapshot,
  NationalCoordination,
  CabinetOverview,
  MinistryQueue,
  QueueItem,
  QueueAction,
  AnalyticDelta,
  SignatureRequest,
  SignatureResult,
  VerifyResult,
  UpdateChamber,
  ChamberRelease,
  NationInstall,
  FeatureRequest,
  PublisherOverview,
  DistributionRelease,
  SubscribedNation,
  InstallAction,
  DeliveryMode,
  MaintenanceWindow,
  ResilienceSettings,
  FallbackIncident,
  SecurityCenter,
  SecurityOrder,
  ByoSecurityTool,
  NationSoftware,
  SecurityDefinitions,
  HealthCheck,
  Probation,
  HostingCenter,
  HostingRequest,
  HostingQuestionnaire,
  PreflightReport,
  StagingEnvironment,
  StagingRun,
  ChangeControl,
  MaintenanceSlot,
  AdvisoryExposure,
  PatchCommitment,
  AdvisorySeverity,
  SecurityAdvisory,
  AdvisoryNationStatus,
  TicketView,
  TicketPriority,
  SupportTierPolicy,
  SupportTier,
  StatusPage,
  SlaReport,
  ServiceIncident,
  ProvenanceSummary,
  PublisherKey,
  EscrowAgreement,
  EscrowStatusRow,
  SourceReview,
  SourceReviewEnvironment,
  LifecycleLine,
  LifecyclePolicy,
  LifecycleWarning,
  LocalMirror,
  SyncManifest,
  MediaShipment,
  WhatsNew,
  Official,
  AlertDelivery,
  AlertCategory,
  Contract,
  DataCategory,
  DataCategoryInfo,
  DataSharingState,
  DataTransmission,
} from './types';
import { publicClient } from '@/lib/db/client';

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

/** Publisher calls carry the platform-tier session token when a substrate
 *  session exists (required under CIVICOS_AUTH=enforce). */
async function publisherInit(init: RequestInit = {}): Promise<RequestInit> {
  try {
    const sb = publicClient();
    const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
    if (token) return { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` } };
  } catch { /* prototype mode: no substrate session */ }
  return init;
}

const linkQ = (link?: string) => (link ? `?link=${encodeURIComponent(link)}` : '');

export const api = {
  sovereign: {
    get: () => req<{ sovereign: SovereignProfile }>('/api/sovereign'),
    update: (patch: Partial<SovereignProfile>) =>
      req<{ sovereign: SovereignProfile }>('/api/sovereign', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    presets: () => req<{ presets: SovereignPreset[] }>('/api/sovereign/presets'),
    applyPreset: (key: string) =>
      req<{ sovereign: SovereignProfile }>('/api/sovereign/preset', {
        method: 'POST',
        body: JSON.stringify({ key }),
      }),
  },
  setup: {
    get: () => req<{ setup: PlatformSetup | null }>('/api/setup'),
    complete: (by?: string) =>
      req<{ setup: PlatformSetup }>('/api/setup', { method: 'POST', body: JSON.stringify({ by }) }),
  },
  cabinet: {
    overview: () => req<CabinetOverview>('/api/cabinet'),
    national: () => req<NationalSnapshot>('/api/national'),
    coordination: () => req<NationalCoordination>('/api/national/coordination'),
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
  publicSites: {
    list: () => req<{ sites: PublicSiteRow[] }>('/api/public-sites'),
    update: (id: string, patch: SiteSettingsInput & { by: string }) =>
      req<{ site: SiteSettings }>(`/api/public-sites/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    sync: (id: string, by: string) =>
      req<{ site: SiteSettings }>(`/api/public-sites/${id}/sync`, { method: 'POST', body: JSON.stringify({ by }) }),
    editorial: (id: string) => req<SiteEditView>(`/api/public-sites/${id}/editorial`),
    propose: (id: string, body: { change?: SiteChange; restore?: number; note?: string; by: string }) =>
      req<{ proposal: SiteProposal }>(`/api/public-sites/${id}/proposals`, { method: 'POST', body: JSON.stringify(body) }),
    decide: (id: string, pid: string, body: { action: 'publish' | 'reject' | 'withdraw'; by: string; reason?: string }) =>
      req<{ editorial: SiteEditorial }>(`/api/public-sites/${id}/proposals/${pid}`, { method: 'POST', body: JSON.stringify(body) }),
    translations: (id: string, locale: string) =>
      req<{ locale: string; strings: SiteTranslationString[]; coverage: Coverage }>(`/api/public-sites/${id}/translations/${locale}`),
    xliffUrl: (id: string, locale: string) => `/api/public-sites/${id}/translations/${locale}/xliff`,
    /** Read a translated XLIFF file and check it against the site; nothing is saved until it is proposed. */
    importXliff: (id: string, locale: string, xml: string) =>
      req<XliffImport>(`/api/public-sites/${id}/translations/${locale}/xliff`, { method: 'POST', body: xml, headers: { 'Content-Type': 'application/xliff+xml' } }),
  },
  org: {
    archetypes: () => req<{ archetypes: Archetype[] }>('/api/org/archetypes'),
    ministries: () => req<{ ministries: Ministry[] }>('/api/org/ministries'),
    federation: () => req<{ apps: { id: string; label: string; domain: string; kind: string; activated: boolean; navCount: number }[]; stats: { registered: number; activated: number } }>('/api/org/federation'),
    get: (id: string) => req<{ ministry: Ministry }>(`/api/org/ministries/${id}`),
    operations: (id: string) => req<MinistryOperations>(`/api/org/ministries/${id}/operations`),
    regions: (id: string) => req<MinistryRegions>(`/api/org/ministries/${id}/regions`),
    analytics: (id: string) => req<{ analytics: AnalyticDelta[] }>(`/api/org/ministries/${id}/analytics`),
    queue: (id: string) => req<MinistryQueue>(`/api/org/ministries/${id}/queue`),
    incidents: (id: string) => req<MinistryIncidents>(`/api/org/ministries/${id}/incidents`),
    escalateIncident: (id: string, key: string, by?: string) =>
      req<{ incident: MinistryIncident }>(`/api/org/ministries/${id}/incidents/${key}/escalate`, { method: 'POST', body: JSON.stringify({ by }) }),
    resolveIncident: (id: string, key: string, by?: string) =>
      req<{ incident: MinistryIncident }>(`/api/org/ministries/${id}/incidents/${key}/resolve`, { method: 'POST', body: JSON.stringify({ by }) }),
    field: (id: string) => req<MinistryFieldOps>(`/api/org/ministries/${id}/field`),
    series: (id: string) => req<MinistrySeries>(`/api/org/ministries/${id}/series`),
    actOnQueueItem: (id: string, itemId: string, action: QueueAction, note?: string, by?: string) =>
      req<{ item: QueueItem }>(`/api/org/ministries/${id}/queue/${itemId}/act`, {
        method: 'POST',
        body: JSON.stringify({ action, note, by }),
      }),
    create: (body: { archetype: ArchetypeKey; name: string; slug: string }) =>
      req<{ ministry: Ministry }>('/api/org/ministries', { method: 'POST', body: JSON.stringify(body) }),
    rename: (id: string, name: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/rename`, { method: 'POST', body: JSON.stringify({ name }) }),
    activate: (id: string) =>
      req<{ ministry: Ministry }>(`/api/org/ministries/${id}/activate`, { method: 'POST', body: '{}' }),
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
  // Sovereign Update Center. `link` is a nation's private distribution link;
  // without it the chamber is the installed nation's own.
  updates: {
    chamber: (link?: string) => req<{ chamber: UpdateChamber }>(`/api/releases${linkQ(link)}`),
    release: (id: string, link?: string) =>
      req<{ release: ChamberRelease; chamber: UpdateChamber }>(`/api/releases/${encodeURIComponent(id)}${linkQ(link)}`),
    decide: (id: string, body: { action: InstallAction; by: string; note?: string; window?: MaintenanceWindow; mode?: DeliveryMode; verified?: boolean; acknowledge?: boolean; link?: string }) =>
      req<{ install: NationInstall; chamber: UpdateChamber }>(`/api/releases/${encodeURIComponent(id)}/decision`, { method: 'POST', body: JSON.stringify(body) }),
    requests: (link?: string) => req<{ requests: FeatureRequest[] }>(`/api/releases/requests${linkQ(link)}`),
    submitRequest: (body: { title: string; description: string; priority: string; institution: string; by: string; link?: string }) =>
      req<{ request: FeatureRequest }>('/api/releases/requests', { method: 'POST', body: JSON.stringify(body) }),
    downloadUrl: (channelKey: string, artifactId: string) =>
      `/api/releases/download/${encodeURIComponent(channelKey)}/${encodeURIComponent(artifactId)}`,
    attestationUrl: (channelKey: string, artifactId: string) =>
      `/api/releases/download/${encodeURIComponent(channelKey)}/${encodeURIComponent(artifactId)}/provenance`,
    provenance: (id: string, link?: string) =>
      req<{ provenance: ProvenanceSummary[]; publisherKey: PublisherKey; channelKey: string }>(`/api/releases/${encodeURIComponent(id)}/provenance${linkQ(link)}`),
    escrow: (link?: string) =>
      req<{ agreement?: EscrowAgreement; status: EscrowStatusRow[]; reviews: SourceReview[]; environments: Record<SourceReviewEnvironment, string> }>(`/api/releases/escrow${linkQ(link)}`),
    escrowAction: (body: { action: 'request-review' | 'withdraw-review'; by: string; id?: string; link?: string; releaseId?: string; auditor?: string; auditorKind?: string; scope?: string; purpose?: string; environment?: string; ndaAccepted?: boolean }) =>
      req<{ review: SourceReview }>('/api/releases/escrow', { method: 'POST', body: JSON.stringify(body) }),
    // Resilience
    health: (checks: HealthCheck[], link?: string) =>
      req<{ probation: Probation; install: NationInstall }>('/api/releases/health', { method: 'POST', body: JSON.stringify({ checks, link }) }),
    settings: (patch: Partial<ResilienceSettings> & { estate?: { servers?: number; endpoints?: number }; by: string; link?: string }) =>
      req<{ nation: SubscribedNation }>('/api/releases/settings', { method: 'PUT', body: JSON.stringify(patch) }),
    readiness: (id: string, link?: string) =>
      req<{ preflight: PreflightReport | null; staging: StagingEnvironment; run: StagingRun | null; stagingRequired: boolean }>(`/api/releases/${encodeURIComponent(id)}/readiness${linkQ(link)}`),
    readinessAction: (id: string, body: { action: 'preflight' | 'waive' | 'stage' | 'stage-fail' | 'uat'; by?: string; secondBy?: string; reason?: string; findingKey?: string; tester?: string; date?: string; evidence?: string; link?: string }) =>
      req<{ preflight?: PreflightReport; run?: StagingRun }>(`/api/releases/${encodeURIComponent(id)}/readiness`, { method: 'POST', body: JSON.stringify(body) }),
    advisories: (link?: string) =>
      req<{ exposure: AdvisoryExposure[]; commitments: PatchCommitment[]; policy: Record<AdvisorySeverity, number> }>(`/api/releases/advisories${linkQ(link)}`),
    support: (link?: string) =>
      req<{ tickets: TicketView[]; policy: SupportTierPolicy; tiers: Record<SupportTier, SupportTierPolicy>; priorities: Record<TicketPriority, string>; linkable: { releases: { id: string; version: string; title: string }[]; incidents: { id: string; title: string }[] } }>(`/api/releases/support${linkQ(link)}`),
    openTicket: (body: { priority: TicketPriority; title: string; description: string; by: string; about?: { kind: 'release' | 'incident'; id: string }; link?: string }) =>
      req<{ ticket: TicketView }>('/api/releases/support', { method: 'POST', body: JSON.stringify(body) }),
    ticketAction: (id: string, body: { action: 'reply' | 'close' | 'reopen' | 'attach'; by: string; text?: string; link?: string; filename?: string; sizeBytes?: number }) =>
      req<{ ticket: TicketView }>(`/api/releases/support/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(body) }),
    status: (link?: string) => req<{ status: StatusPage }>(`/api/releases/status${linkQ(link)}`),
    slaReport: (month?: string, link?: string) => {
      const p = new URLSearchParams({ ...(month ? { month } : {}), ...(link ? { link } : {}) }).toString();
      return req<{ report: SlaReport; months: string[] }>(`/api/releases/sla-report${p ? `?${p}` : ''}`);
    },
    evidence: (id: string, link?: string) =>
      req<{ pack: Record<string, unknown> & { digest: string } }>(`/api/releases/${encodeURIComponent(id)}/evidence${linkQ(link)}`),
    sovereignty: (link?: string) =>
      req<{ categories: (DataCategoryInfo & { sample: Record<string, unknown> })[]; state: DataSharingState[] }>(`/api/releases/sovereignty${linkQ(link)}`),
    setSovereignty: (body: { category: DataCategory; enabled: boolean; by: string; reason?: string; link?: string }) =>
      req<{ state: DataSharingState[] }>('/api/releases/sovereignty', { method: 'POST', body: JSON.stringify(body) }),
    contract: (link?: string) =>
      req<{ contract: Contract; tier: SupportTierPolicy; priorities: Record<TicketPriority, string>; patchCommitments: Record<AdvisorySeverity, number> }>(`/api/releases/contract${linkQ(link)}`),
    contractAction: (body: { action: 'accept-renewal' | 'request-change'; by: string; note?: string; link?: string }) =>
      req<{ ok: true }>('/api/releases/contract', { method: 'POST', body: JSON.stringify(body) }),
    whatsNew: (id: string, link?: string) => req<{ whatsNew: WhatsNew }>(`/api/releases/${encodeURIComponent(id)}/whats-new${linkQ(link)}`),
    alerts: (link?: string) => req<{ officials: Official[]; outbox: AlertDelivery[]; categories: AlertCategory[] }>(`/api/releases/alerts${linkQ(link)}`),
    alertsAction: (body: { action: 'save' | 'remove'; by: string; official?: Partial<Official>; id?: string; link?: string }) =>
      req<{ ok: true; officials: Official[] }>('/api/releases/alerts', { method: 'POST', body: JSON.stringify(body) }),
    mirror: (link?: string) =>
      req<{ deliveryMode: DeliveryMode; mirror: LocalMirror | null; manifest: SyncManifest | null; media: MediaShipment[] }>(`/api/releases/mirror${linkQ(link)}`),
    mirrorAction: (body: { action: 'register' | 'sync' | 'custody'; by: string; link?: string; registryUrl?: string; kind?: string; releaseIds?: string[]; mediaId?: string; step?: string; sealId?: string; note?: string }) =>
      req<{ ok: true }>('/api/releases/mirror', { method: 'POST', body: JSON.stringify(body) }),
    lifecycle: (link?: string) =>
      req<{ lines: LifecycleLine[]; policy: LifecyclePolicy; warning: LifecycleWarning | null; installedLine: string }>(`/api/releases/lifecycle${linkQ(link)}`),
    changeControl: (body: { action: 'freeze' | 'unfreeze' | 'add-blackout' | 'remove-blackout' | 'set-windows'; by: string; reason?: string; label?: string; kind?: string; start?: string; end?: string; id?: string; windows?: MaintenanceSlot[]; link?: string }) =>
      req<{ changeControl: ChangeControl }>('/api/releases/change-control', { method: 'POST', body: JSON.stringify(body) }),
    registerStaging: (body: { name: string; url: string; by: string; link?: string }) =>
      req<{ staging: StagingEnvironment }>('/api/releases/staging', { method: 'POST', body: JSON.stringify(body) }),
    hosting: (link?: string) => req<{ hosting: HostingCenter }>(`/api/releases/hosting${linkQ(link)}`),
    requestHosting: (body: { path: string; questionnaire: Partial<HostingQuestionnaire>; by: string; link?: string }) =>
      req<{ request: HostingRequest }>('/api/releases/hosting', { method: 'POST', body: JSON.stringify(body) }),
    hostingAction: (id: string, body: { action: 'accept' | 'revise' | 'withdraw'; by: string; note?: string; link?: string }) =>
      req<{ request: HostingRequest }>(`/api/releases/hosting/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(body) }),
    issueAgentCredential: (by: string, link?: string) =>
      req<{ credential: string; prefix: string; issuedAt: string; rotated: boolean }>('/api/releases/settings/agent-credential', { method: 'POST', body: JSON.stringify({ by, link }) }),
    acknowledge: (id: string, by: string, link?: string) =>
      req<{ incident: FallbackIncident }>(`/api/releases/incidents/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ by, link }) }),
    restoreData: (id: string, body: { by: string; acknowledgeLoss: boolean; link?: string }) =>
      req<{ chamber: UpdateChamber }>(`/api/releases/${encodeURIComponent(id)}/restore-data`, { method: 'POST', body: JSON.stringify(body) }),
    breakGlass: (body: { by: string; secondBy: string; reason: string; link?: string }) =>
      req<{ incident: FallbackIncident; chamber: UpdateChamber }>('/api/releases/break-glass', { method: 'POST', body: JSON.stringify(body) }),
    // Security store
    security: (link?: string) => req<{ security: SecurityCenter }>(`/api/releases/security${linkQ(link)}`),
    quote: (body: { productId: string; edition: string; seats: number; years: number; by: string; link?: string }) =>
      req<{ order: SecurityOrder }>('/api/releases/security/orders', { method: 'POST', body: JSON.stringify(body) }),
    orderAction: (id: string, body: { action: 'order' | 'pay' | 'cancel' | 'renew' | 'install-software'; by: string; poNumber?: string; link?: string }) =>
      req<{ order: SecurityOrder }>(`/api/releases/security/orders/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(body) }),
    registerByo: (body: Record<string, unknown>) =>
      req<{ tool: ByoSecurityTool }>('/api/releases/security/byo', { method: 'POST', body: JSON.stringify(body) }),
    registerSoftware: (body: { name: string; version: string; kind: string; by: string; link?: string }) =>
      req<{ software: NationSoftware }>('/api/releases/security/software', { method: 'POST', body: JSON.stringify(body) }),
    applyDefinitions: (by: string, link?: string) =>
      req<{ definitions: SecurityDefinitions }>('/api/releases/security/definitions', { method: 'POST', body: JSON.stringify({ by, link }) }),
    securityDownloadUrl: (channelKey: string, orderId: string) =>
      `/api/releases/security/download/${encodeURIComponent(channelKey)}/${encodeURIComponent(orderId)}`,
    publisher: {
      overview: async () => req<{ overview: PublisherOverview }>('/api/releases/publisher', await publisherInit()),
      publish: async (body: Record<string, unknown>) =>
        req<{ release: DistributionRelease }>('/api/releases/publisher', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      advance: async (id: string, body: { to: string; by?: string; note?: string; targetVersion?: string }) =>
        req<{ request: FeatureRequest }>(`/api/releases/publisher/requests/${encodeURIComponent(id)}`, await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      enrol: async (body: { name: string; iso3?: string; deliveryMode: DeliveryMode; installedVersion: string; ring?: string }) =>
        req<{ nation: SubscribedNation }>('/api/releases/publisher/nations', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      hostingQueue: async () => req<{ requests: HostingRequest[]; nations: Record<string, string> }>('/api/releases/publisher/hosting', await publisherInit()),
      hostingAction: async (id: string, body: { action: 'review' | 'issue'; by?: string; notes?: string; capexFactor?: number; annualFactor?: number; timelineFactor?: number }) =>
        req<{ request: HostingRequest }>(`/api/releases/publisher/hosting/${encodeURIComponent(id)}`, await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      advisories: async () => req<{ advisories: SecurityAdvisory[]; commitments: PatchCommitment[]; policy: Record<AdvisorySeverity, number>; statuses: Record<string, Record<string, AdvisoryNationStatus>>; nations: { id: string; name: string }[] }>('/api/releases/publisher/advisories', await publisherInit()),
      support: async () => req<{ tickets: TicketView[]; service: ServiceIncident[]; nations: { id: string; name: string; tier: SupportTier; deliveryMode: string }[]; tiers: Record<SupportTier, SupportTierPolicy>; components: { key: string; label: string; group: string }[] }>('/api/releases/publisher/support', await publisherInit()),
      supportAction: async (body: { action: 'set-tier' | 'declare' | 'update-service'; [k: string]: unknown }) =>
        req<Record<string, unknown>>('/api/releases/publisher/support', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      ticketAction: async (id: string, body: { action: string; by: string; text?: string; priority?: string }) =>
        req<{ ticket: TicketView }>(`/api/releases/publisher/support/${encodeURIComponent(id)}`, await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      escrow: async () => req<{ deposits: (EscrowStatusRow & { nationId?: string })[]; reviews: SourceReview[]; nations: Record<string, string>; agent: string; depositWithinDays: number }>('/api/releases/publisher/escrow', await publisherInit()),
      escrowAction: async (body: { action: 'deposit' | 'verify' | 'review'; by: string; [k: string]: unknown }) =>
        req<{ ok: true }>('/api/releases/publisher/escrow', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      telemetry: async () => req<{ nations: { id: string; name: string; categories: Record<DataCategory, { shared: boolean; received: number; lastAt?: string }> }[]; recent: DataTransmission[] }>('/api/releases/publisher/telemetry', await publisherInit()),
      contracts: async () => req<{ contracts: Contract[]; modules: { key: string; label: string }[] }>('/api/releases/publisher/contracts', await publisherInit()),
      contractAction: async (body: { nationId: string; action: string; by: string; [k: string]: unknown }) =>
        req<{ ok: true }>('/api/releases/publisher/contracts', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      comms: async () => req<{ nations: { id: string; name: string; language: string }[]; locales: string[]; releases: { id: string; version: string; title: string; changes: number; resources: number }[]; coverage: Record<string, Record<string, boolean>> }>('/api/releases/publisher/comms', await publisherInit()),
      commsAction: async (body: { action: 'translate' | 'resource'; releaseId: string; by: string; [k: string]: unknown }) =>
        req<{ ok: true }>('/api/releases/publisher/comms', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      media: async () => req<{ media: MediaShipment[]; nations: { id: string; name: string; deliveryMode: DeliveryMode; mirror: LocalMirror | null }[] }>('/api/releases/publisher/media', await publisherInit()),
      mediaAction: async (body: { action: 'seal' | 'hand-over'; by: string; [k: string]: unknown }) =>
        req<{ media: MediaShipment }>('/api/releases/publisher/media', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      lifecycle: async () => req<{ lines: LifecycleLine[]; policy: LifecyclePolicy; nationsOnLine: Record<string, string[]> }>('/api/releases/publisher/lifecycle', await publisherInit()),
      setLifecycle: async (body: Partial<LifecyclePolicy> & { by: string }) =>
        req<{ policy: LifecyclePolicy; lines: LifecycleLine[] }>('/api/releases/publisher/lifecycle', await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
      setStatus: async (id: string, body: { action: 'halt' | 'resume' | 'withdraw' | 'promote'; reason?: string; by?: string }) =>
        req<{ release: DistributionRelease }>(`/api/releases/publisher/releases/${encodeURIComponent(id)}`, await publisherInit({ method: 'POST', body: JSON.stringify(body) })),
    },
  },
};
