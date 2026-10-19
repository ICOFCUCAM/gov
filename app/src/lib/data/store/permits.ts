// Session, permits, notifications, documents, signatures and municipal onboarding.
import type {
  CreatePermitInput,
  DecidePermitInput,
  MunicipalityOnboardingInput,
  MunicipalityOnboardingResult,
  Notification,
  Permit,
  PermitStatus,
  Session,
  SignatureRequest,
  SignatureResult,
  VerifyResult,
} from '@/lib/api/types';
import { db } from './state';
import { uid, hash, citizen } from './shared';
import { recordAudit } from './audit';
import { institutionsKeeping } from './ministries';

// ── Session ───────────────────────────────────────────────────────────
export function getSession(): Session {
  return { authenticated: true, citizen, method: 'demo' };
}

// ── Permits ───────────────────────────────────────────────────────────
/** The institutions that issue permits and may read their applicants (review M-3): those whose kind keeps the permit register. */
export const permitHolders = (): string[] => institutionsKeeping('Permit');

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
  recordAudit('citizen', 'permit.create', `Permit:${permit.id}`, 'ok', permit.title);
  return permit;
}

// Officer decision workflow. Valid transitions only; every decision is
// named to the officer, appended to the timeline, and audited.
const NEXT_STATUS: Record<string, PermitStatus> = {
  approve: 'approved',
  decline: 'declined',
  'request-info': 'needs-info',
  escalate: 'in-review',
};

export function decidePermit(
  id: string,
  input: DecidePermitInput,
): Permit | { error: string } {
  const permit = db.permits.find(p => p.id === id);
  if (!permit) return { error: 'Permit not found' };
  if (permit.status === 'approved' || permit.status === 'declined') {
    return { error: 'Permit already decided' };
  }
  const next = NEXT_STATUS[input.decision];
  if (!next) return { error: 'Unknown decision' };

  const now = new Date().toISOString();
  permit.status = next;
  permit.officerName = input.officerName;
  if (input.aiClass) permit.aiClass = input.aiClass;
  permit.timeline.push({
    status: next,
    at: now,
    officerName: input.officerName,
    note:
      input.decision === 'escalate'
        ? `Escalated for senior review${input.note ? `: ${input.note}` : ''}`
        : input.note,
  });
  recordAudit(
    input.officerName,
    `permit.${input.decision}`,
    `Permit:${id}`,
    'ok',
    input.note,
  );
  return permit;
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
      subject: 'Amina Hassan',
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
