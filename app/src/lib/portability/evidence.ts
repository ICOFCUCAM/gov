// Audit evidence an institution brought with its records (Health I4
// standalone-and-pilot; lib/portability/import.ts). When an institution's own
// export is imported into another installation, its sealed decisions keep the
// seals they were made with and its audit and access-log entries stay in the
// chains they were written to. This store keeps those segments, with the trust
// list the export carried, exactly as exported, so each imported decision
// still verifies (lib/portability/verify.ts) and a later export of the same
// institution carries them on: record identity and its evidence travel
// together, never rewritten. Held in platform state; it is the nation's data,
// so a restore treats it like any register.

import { touch } from '@/lib/data/repo/track';
import type { AuditEntry } from '@/lib/api/types';
import type { AuditLink } from '@/lib/data/store/audit';
import type { AccessEntry, AccessLink } from '@/lib/records/access-log';
import type { TrustListEntry, SealPurpose } from '@/lib/keys/seal-register';

export interface TrustListCopy { format: 'civicos.trust-list'; version: 1; generatedAt: string; since: Partial<Record<SealPurpose, string>>; keys: TrustListEntry[] }

/** One export's evidence, as it was sealed into that export. */
export interface EvidenceSegment {
  /** The export it came from, and its manifest digest. */
  export: string;
  digest: string;
  institution: string;
  createdAt: string;
  audit: { head: { seq: number; hash: string } | null; items: (AuditEntry | AuditLink)[] };
  accessLog: { base: { hash: string; removed: number }; items: (AccessEntry | AccessLink)[] };
  trustList: TrustListCopy;
}

interface Db { segments: EvidenceSegment[] }
const g = globalThis as unknown as { __civicosImportedEvidence?: Db };
const db = (): Db => { const d = touch('__civicosImportedEvidence', g.__civicosImportedEvidence ??= { segments: [] }); d.segments ??= []; return d; };
export function resetImportedEvidence(): void { g.__civicosImportedEvidence = undefined; }

/** The evidence segments imported for an institution, oldest first. */
export const importedEvidence = (institution: string): EvidenceSegment[] => db().segments.filter(s => s.institution === institution).map(s => structuredClone(s));

/** Keep the evidence of an imported export (lib/portability/import.ts, after the import is confirmed); kept once per export. */
export function keepEvidence(segments: EvidenceSegment[]): void {
  const d = db();
  for (const s of segments) if (!d.segments.some(x => x.export === s.export && x.institution === s.institution)) d.segments.push(structuredClone(s));
}
