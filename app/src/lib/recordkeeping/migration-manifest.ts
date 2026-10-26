// A migration's per-record manifest (plan I9; acceptance P5-06 "A migrated
// record retains its source, transformation history and verification
// status"; specification Part 5 J). Given with the plan of a records
// migration (rec.migration, field `recordManifest`), one item per record:
//
//   sourceId         the record's id in the source system
//   sourceSha256     SHA-256 of the record as extracted from the source
//   transformations  the steps it went through, in order, separated by `;` or
//                    `>`: `step[:rule][@version]` (e.g. `normalise-dates@1;
//                    map-fields:permit-mapping@3`), each a named step of the
//                    migration plan, never free text about a person
//   targetId         its id here (a document id, a case id) or in the external
//                    system
//   targetSha256     the SHA-256 it must have here (a document's content as
//                    loaded); optional for cases and external targets
//
// An official may give the items as lines, columns separated by `|`. The plan
// refuses a manifest whose length is not the source count or whose source
// digest is not the plan's source manifest (lib/recordkeeping/register.ts
// planMigration()). Each reconciliation verifies every record against the
// platform's own records (verifyRecords(), here) and keeps its status.

import { createHash } from 'node:crypto';
import type { MigratedRecord, Transformation, VerificationStatus } from './register';

const HEX64 = /^[0-9a-f]{64}$/;
const STEP = /^[a-z0-9][a-z0-9._-]{0,59}$/;
const ID = /^[^\s|;][^|;\n]{0,199}$/;
export const MANIFEST_MAX = 5000;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');

/** Parse `step[:rule][@version]; …` into transformations. */
export function parseTransformations(v: unknown): Transformation[] | { error: string } {
  const text = str(v, 2000);
  if (!text) return [];
  const out: Transformation[] = [];
  for (const raw of text.split(/[;>]/).map(x => x.trim()).filter(Boolean)) {
    const m = /^([^:@]+)(?::([^@]+))?(?:@(.+))?$/.exec(raw);
    const step = m?.[1]?.trim().toLowerCase() ?? '';
    if (!STEP.test(step)) return { error: `"${raw.slice(0, 60)}" is not a transformation step: a short name (lowercase letters, digits, . _ -), then :rule and @version where they apply` };
    const rule = m?.[2]?.trim().slice(0, 120), version = m?.[3]?.trim().slice(0, 40);
    out.push({ step, ...(rule ? { rule } : {}), ...(version ? { version } : {}) });
    if (out.length > 50) return { error: 'At most 50 transformations per record' };
  }
  return out;
}

/** The items of the `recordManifest` field (objects, or lines with `|` between columns) as manifest records. */
export function parseManifest(v: unknown, targetKind: 'documents' | 'cases' | 'external'): Omit<MigratedRecord, 'verification'>[] | { error: string } {
  const cols = ['sourceId', 'sourceSha256', 'transformations', 'targetId', 'targetSha256'];
  const rows: Record<string, unknown>[] = typeof v === 'string'
    ? v.split('\n').map(l => l.trim()).filter(Boolean).map(l => Object.fromEntries(l.split('|').map((x, i) => [cols[i] ?? `c${i}`, x.trim()])))
    : Array.isArray(v) ? v.filter(x => x && typeof x === 'object') as Record<string, unknown>[] : [];
  if (!rows.length) return { error: 'The per-record manifest lists each record: source id, source SHA-256, transformations, target id and target SHA-256' };
  if (rows.length > MANIFEST_MAX) return { error: `At most ${MANIFEST_MAX} records in one manifest: plan the migration in batches` };
  const kind: MigratedRecord['target']['kind'] = targetKind === 'documents' ? 'document' : targetKind === 'cases' ? 'case' : 'external';
  const out: Omit<MigratedRecord, 'verification'>[] = [];
  const sources = new Set<string>(), targets = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const at = `Record ${i + 1}`;
    const sourceId = str(r.sourceId, 200), sourceSha256 = str(r.sourceSha256, 64).toLowerCase();
    const targetId = str(r.targetId, 200), targetSha256 = str(r.targetSha256, 64).toLowerCase();
    if (!ID.test(sourceId)) return { error: `${at}: give its id in the source system` };
    if (!HEX64.test(sourceSha256)) return { error: `${at}: the source SHA-256 is 64 hexadecimal characters` };
    if (!ID.test(targetId)) return { error: `${at}: give its id where it landed` };
    if (targetSha256 && !HEX64.test(targetSha256)) return { error: `${at}: the target SHA-256 is 64 hexadecimal characters` };
    if (kind === 'document' && !targetSha256) return { error: `${at}: a document's target SHA-256 is its content as loaded` };
    if (sources.has(sourceId)) return { error: `${at}: source id ${sourceId} is listed twice` };
    if (targets.has(targetId)) return { error: `${at}: target id ${targetId} is listed twice` };
    const t = parseTransformations(r.transformations);
    if ('error' in t) return { error: `${at}: ${t.error}` };
    sources.add(sourceId); targets.add(targetId);
    out.push({ source: { id: sourceId, sha256: sourceSha256 }, transformations: t, target: { kind, id: targetId, ...(targetSha256 ? { sha256: targetSha256 } : {}) } });
  }
  return out;
}

/** What the platform's own records say of one target record (read at reconciliation). */
export interface TargetRecord { owner: string; group?: string; sha256?: string; sample?: boolean }

/**
 * Verify each record of a manifest against the platform's own records: the
 * target is the institution's, under the migration's target (class or
 * procedure), with the hash the manifest names. An external target is not
 * verifiable here (its count and manifest are entered and compared as a
 * whole). `unexpected` counts records under the target the manifest does not
 * list.
 */
export function verifyRecords(records: Omit<MigratedRecord, 'verification'>[], target: { institution: string; kind: 'documents' | 'cases' | 'external'; ref?: string }, read: (id: string) => TargetRecord | undefined, underTarget: string[] = []): { perRecord: { status: VerificationStatus; detail?: string }[]; unexpected: number } {
  const listed = new Set(records.map(r => r.target.id));
  const perRecord = records.map((r): { status: VerificationStatus; detail?: string } => {
    if (target.kind === 'external') return { status: 'not-verifiable-here' };
    const t = read(r.target.id);
    if (!t || t.owner !== target.institution || (target.ref && t.group !== target.ref)) return { status: 'missing', detail: !t ? 'not found' : t.owner !== target.institution ? 'another institution\'s record' : `not under ${target.ref}` };
    if (r.target.sha256 && t.sha256 !== r.target.sha256) return { status: 'hash-mismatch', detail: `here ${String(t.sha256).slice(0, 12)}…, manifest ${r.target.sha256.slice(0, 12)}…` };
    return { status: 'verified' };
  });
  return { perRecord, unexpected: underTarget.filter(id => !listed.has(id)).length };
}

/** SHA-256 of bytes or text (for tests and the source side of a tool that builds a manifest). */
export const sha256Of = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex');
