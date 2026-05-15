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
