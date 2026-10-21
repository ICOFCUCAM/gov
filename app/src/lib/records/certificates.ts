// Certificates (docs/GOVERNMENT_OPERATING_MODEL.md §7.3, directions 9.4): a
// birth certificate, a licence, an accreditation, issued from a sealed
// decision (./decisions.ts) with a verification code anyone can check at
// /verify/<code>. The check shows only what the procedure says the
// certificate itself states (`publicFacts`), who issued it, when, whether
// it is still valid, superseded by a reissue or revoked, and whether the
// decision's seal verifies; never the case or anything else. Codes are 12
// characters from an alphabet without look-alikes, drawn at random. Held in
// platform state; certificates are never deleted.

import { randomInt } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { getDecision, sealReport } from './decisions';
import type { SealState } from '@/lib/keys/seal-register';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12;
export const newCode = (): string => Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
/** Codes as people type them: spaces, dashes and case ignored. */
export const normaliseCode = (s: string): string => s.toUpperCase().replace(/[\s-]/g, '');
/** Printed in groups of four. */
export const printableCode = (c: string): string => c.replace(/(.{4})(?=.)/g, '$1-');

export interface Certificate {
  id: string;
  code: string;
  kind: string;
  title: string;
  decision: string;
  institution: { id: string; name: string };
  /** What the certificate itself states, as the procedure names it (and nothing more is shown publicly). */
  publicFacts: Record<string, string>;
  issuedAt: string;
  issuedBy: string;
  status: 'valid' | 'superseded' | 'revoked';
  reissueOf?: string;
  supersededBy?: string;
  revoked?: { at: string; by: string; reason: string };
}

interface CertDb { certificates: Certificate[] }
const g = globalThis as unknown as { __civicosCertificates?: CertDb };
const db = (): CertDb => touch('__civicosCertificates', g.__civicosCertificates ??= { certificates: [] });
export function resetCertificates(): void { g.__civicosCertificates = undefined; }

export function issueCertificate(input: { kind: string; title: string; decision: string; publicFacts: Record<string, string>; reissueOf?: string }, by: string, now = new Date()): Certificate | { error: string } {
  const d = getDecision(input.decision);
  if (!d) return { error: 'A certificate is issued from a sealed decision' };
  if (d.supersededBy) return { error: 'That decision has been superseded' };
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(input.kind)) return { error: 'A certificate kind is a short name in lowercase letters, digits and -' };
  const prev = input.reissueOf ? db().certificates.find(c => c.id === input.reissueOf) : undefined;
  if (input.reissueOf && (!prev || prev.status !== 'valid')) return { error: 'Only a valid certificate can be reissued' };
  let code = newCode();
  while (db().certificates.some(c => c.code === code)) code = newCode();
  const facts = Object.fromEntries(Object.entries(input.publicFacts).slice(0, 30).map(([k, v]) => [k.slice(0, 60), String(v).slice(0, 300)]));
  const c: Certificate = { id: uuid7(), code, kind: input.kind, title: input.title.slice(0, 200), decision: d.id, institution: d.content.institution, publicFacts: facts, issuedAt: now.toISOString(), issuedBy: by, status: 'valid', ...(prev ? { reissueOf: prev.id } : {}) };
  db().certificates.push(c);
  if (prev) { prev.status = 'superseded'; prev.supersededBy = c.id; }
  recordAudit(by, 'certificate.issue', `Certificate:${c.id}`, 'ok', `${c.kind} · decision ${d.id}${prev ? ` · reissue of ${prev.id}` : ''}`);
  return structuredClone(c);
}

export function revokeCertificate(id: string, reason: string, by: string, now = new Date()): Certificate | { error: string } {
  const c = db().certificates.find(x => x.id === id);
  if (!c) return { error: 'No such certificate' };
  if (c.status === 'revoked') return { error: 'Already revoked' };
  if (!reason?.trim()) return { error: 'Say why it is revoked' };
  c.status = 'revoked'; c.revoked = { at: now.toISOString(), by, reason: reason.trim().slice(0, 300) };
  recordAudit(by, 'certificate.revoke', `Certificate:${c.id}`, 'ok', reason.trim().slice(0, 200));
  return structuredClone(c);
}

/** What the seal key register says about the seal's key (lib/keys/seal-register.ts): no names of officials. */
export interface PublicSeal { state: SealState; keyId: string; fingerprint?: string; validFrom?: string; validUntil?: string; basis: string[]; compromisedFrom?: string; sample?: boolean; note: string }
export interface PublicCheck { kind: string; title: string; institution: string; issuedAt: string; status: Certificate['status']; sealOk: boolean; publicFacts: Record<string, string>; seal?: PublicSeal }

/** What anyone may see for a code: the certificate's own statements and its standing. Null when no certificate has it. */
export function checkCode(code: string): PublicCheck | null {
  const c = db().certificates.find(x => x.code === normaliseCode(code));
  if (!c) return null;
  const d = getDecision(c.decision);
  const r = d ? sealReport(d) : null;
  const k = r?.key;
  const seal: PublicSeal | undefined = k ? { state: k.state, keyId: k.keyId, ...(k.fingerprint ? { fingerprint: k.fingerprint } : {}), ...(k.key?.validFrom ? { validFrom: k.key.validFrom } : {}), ...(k.key?.validUntil ? { validUntil: k.key.validUntil } : {}),
    basis: k.key?.basis ?? [], ...(k.key?.compromisedFrom ? { compromisedFrom: k.key.compromisedFrom } : {}), ...(k.key?.sample ? { sample: true } : {}), note: k.note } : undefined;
  return { kind: c.kind, title: c.title, institution: c.institution.name, issuedAt: c.issuedAt, status: c.status, sealOk: !!r?.ok, publicFacts: { ...c.publicFacts }, ...(seal ? { seal } : {}) };
}

export const certificatesFor = (decisionIds: string[]): Certificate[] => db().certificates.filter(c => decisionIds.includes(c.decision)).map(c => structuredClone(c));
export const getCertificate = (id: string): Certificate | undefined => { const c = db().certificates.find(x => x.id === id); return c ? structuredClone(c) : undefined; };
