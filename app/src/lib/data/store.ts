// CivicOS — Phase 1 mock data adapter (server-side).
//
// This is the SWAPPABLE backend. In production, replace this module with the
// sovereign datastore adapter (Postgres/CockroachDB + CivicBus + Audit Vault,
// per Companions 05/06/76). The API route handlers depend only on these
// function signatures, so the swap is mechanical.
//
// Persistence note: this in-memory store persists for the life of the server
// process. It is sufficient for Phase 1 demo/preview. Production uses a
// durable sovereign datastore.

import type {
  Bill,
  Citizen,
  CreatePermitInput,
  MunicipalityOnboardingInput,
  MunicipalityOnboardingResult,
  Notification,
  PaymentReceipt,
  Permit,
  Session,
  SignatureRequest,
  SignatureResult,
  VerifyResult,
} from '@/lib/api/types';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function hash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0') + '…' + (h & 0xffff).toString(16);
}

const citizen: Citizen = {
  id: 'cz-amina',
  displayName: 'Amina Hassan Mwangi',
  preferredLocale: 'en',
  municipality: 'Kiambu',
};

// Module-level singletons (process-lifetime).
const g = globalThis as unknown as { __civicos?: ReturnType<typeof seed> };

function seed() {
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86400000).toISOString();

  const permits: Permit[] = [
    {
      id: 'PM-4F21',
      type: 'business',
      title: 'Bakery — small business permit',
      applicantName: citizen.displayName,
      municipality: 'Kiambu',
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
    { id: 'BL-9001', kind: 'water', description: 'Water — April 2026', amountMinor: 84000, currency: 'KES', dueDate: days(6), status: 'due' },
    { id: 'BL-9002', kind: 'waste', description: 'Solid waste — Q2 2026', amountMinor: 30000, currency: 'KES', dueDate: days(12), status: 'due' },
    { id: 'BL-9003', kind: 'property-tax', description: 'Property tax — 2025 (paid)', amountMinor: 540000, currency: 'KES', dueDate: days(-40), status: 'paid' },
  ];

  const receipts: PaymentReceipt[] = [
    { id: 'PR-3001', billId: 'BL-9003', amountMinor: 540000, currency: 'KES', rail: 'M-Pesa', paidAt: days(-40), hash: hash('BL-9003') },
  ];

  const notifications: Notification[] = [
    { id: 'NT-7001', from: 'Ministry of Education', subject: 'School transfer approved', body: 'The transfer of Aisha to Mukuvisi Primary is confirmed.', at: days(-1), read: false, channel: 'wallet' },
    { id: 'NT-7002', from: 'Tax authority', subject: 'Your 2026 tax draft is ready', body: 'A pre-filled draft is ready for your review. No signature is needed yet.', at: days(-3), read: false, channel: 'wallet', aiClass: 'C' },
    { id: 'NT-7003', from: 'Civic Assistant', subject: 'Pension eligibility', body: 'Here is the information you asked for about pension eligibility.', at: days(-7), read: true, channel: 'wallet', aiClass: 'A' },
  ];

  return { permits, bills, receipts, notifications };
}

const db = (g.__civicos ??= seed());

// ── Session ───────────────────────────────────────────────────────────
export function getSession(): Session {
  return { authenticated: true, citizen, method: 'demo' };
}

// ── Permits ───────────────────────────────────────────────────────────
export function listPermits(): Permit[] {
  return db.permits;
}

export function getPermit(id: string): Permit | undefined {
  return db.permits.find(p => p.id === id);
}

export function createPermit(input: CreatePermitInput): Permit {
  const now = new Date().toISOString();
  const permit: Permit = {
    id: uid('PM'),
    type: input.type,
    title: input.title,
    applicantName: input.applicantName,
    municipality: input.municipality,
    status: 'submitted',
    submittedAt: now,
    decisionDue: new Date(Date.now() + 12 * 86400000).toISOString(),
    fields: input.fields,
    timeline: [{ status: 'submitted', at: now }],
    contestable: true,
  };
  db.permits.unshift(permit);
  return permit;
}

// ── Payments ──────────────────────────────────────────────────────────
export function listBills(): Bill[] {
  return db.bills;
}

export function listReceipts(): PaymentReceipt[] {
  return db.receipts;
}

export function payBill(billId: string, rail: string): PaymentReceipt | { error: string } {
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) return { error: 'Bill not found' };
  if (bill.status === 'paid') return { error: 'Bill already paid' };
  bill.status = 'paid';
  const receipt: PaymentReceipt = {
    id: uid('PR'),
    billId,
    amountMinor: bill.amountMinor,
    currency: bill.currency,
    rail,
    paidAt: new Date().toISOString(),
    hash: hash(billId + Date.now()),
  };
  db.receipts.unshift(receipt);
  return receipt;
}

// ── Notifications ─────────────────────────────────────────────────────
export function listNotifications(): Notification[] {
  return db.notifications;
}

// ── Document verification ─────────────────────────────────────────────
export function verifyDocument(code: string): VerifyResult {
  // Demo logic: codes starting with VC- are valid; REV- are revoked; else invalid.
  const c = code.trim().toUpperCase();
  if (c.startsWith('VC-')) {
    return {
      valid: true,
      subject: 'Amina Hassan Mwangi',
      issuer: 'Ministry of Education',
      credentialType: 'Diploma in Nursing',
      issuedAt: new Date(Date.now() - 400 * 86400000).toISOString(),
      revoked: false,
    };
  }
  if (c.startsWith('REV-')) {
    return { valid: false, revoked: true, reason: 'Credential was revoked by the issuer.' };
  }
  return { valid: false, reason: 'Signature did not verify. This document may be altered or not issued by the state.' };
}

// ── Digital signatures ────────────────────────────────────────────────
export function signDocument(req: SignatureRequest): SignatureResult {
  const now = new Date().toISOString();
  return {
    id: uid('SG'),
    documentId: req.documentId,
    signerName: req.signerName,
    signedAt: now,
    hash: hash(req.documentId + req.signerName + now),
    nonRepudiation: true,
  };
}

// ── Municipal onboarding ──────────────────────────────────────────────
export function onboardMunicipality(
  input: MunicipalityOnboardingInput,
): MunicipalityOnboardingResult {
  const checks = [
    {
      label: 'Inclusion floor (USSD / IVR / agent / walk-in)',
      passed:
        input.inclusionFloor.ussd &&
        input.inclusionFloor.ivr &&
        input.inclusionFloor.agentNetwork &&
        input.inclusionFloor.walkIn,
      detail: 'All four channels are required before go-live (Companion 67).',
    },
    {
      label: 'At least one official language declared',
      passed: input.officialLanguages.length >= 1,
      detail: 'Multilingual is structural, not optional (Companion 148).',
    },
    {
      label: 'Constitutional officer signoff',
      passed: input.constitutionalOfficerSignoff,
      detail: 'Required for any citizen-affecting deployment (Companion 28).',
    },
    {
      label: 'Admin contact provided',
      passed: input.adminContact.trim().length > 3,
    },
    {
      label: 'At least one module selected',
      passed: input.modules.length >= 1,
    },
  ];
  const allPassed = checks.every(c => c.passed);
  return {
    id: uid('MU'),
    name: input.name,
    status: allPassed ? 'provisioned' : 'blocked',
    checks,
    goLiveEstimateDays: allPassed ? 14 : 0,
  };
}
