// Verifying an institution's export with no running server (spec Part 5 L 9:
// "An exported record can be validated without depending on access to the
// original production interface"; Health I4 standalone-and-pilot). Uses the
// platform's own checks on what the export carries, never a live store:
//
//   - the archive opens with the key and every part matches its SHA-256 in
//     the sealed manifest (lib/backup/archive.ts openExport());
//   - the audit segment holds (lib/data/store/audit.ts verifyAuditSegment():
//     every full entry rehashed, every link chained) and ends at the head the
//     manifest names; the access-log segment likewise (verifyAccessSegment());
//   - every sealed decision verifies: its hash, its Ed25519 seal, its
//     `decision.seal` entry in the audit segment (or in evidence it brought
//     from an earlier export) and the key's standing in the trust list it
//     carried (lib/records/decisions.ts verifyDecisionOffline());
//   - every document version matches its SHA-256;
//   - the parts belong to one institution and refer to each other: each
//     decision's case is in the export, each case's decisions and documents
//     are, each record is the institution's own;
//   - (plan I9) its configuration and verification material, when it carries
//     them: every mapping and rule version is the institution's own, every
//     rule version and law version its decisions record is listed, every
//     certificate comes from one of its decisions, and its federation key's id
//     is the key's own;
//   - (plan I9) its records management register, when it carries one: every
//     record is the institution's own; each migration's per-record manifest
//     gives back the digests the plan recorded (source, target, whole), its
//     length is the source count, and every reconciliation's counts are the
//     statuses its records carry for it (acceptance P5-06).
//
// Used by the import (lib/portability/import.ts) before anything is written,
// by the export route's check, and by app/scripts/verify-institution-export.mjs.

import { openExport, sha256 } from '@/lib/backup/archive';
import { verifyAuditSegment, type AuditLink } from '@/lib/data/store/audit';
import { verifyAccessSegment, type AccessEntry, type AccessLink } from '@/lib/records/access-log';
import { verifyDecisionOffline, type SignedDecision } from '@/lib/records/decisions';
import type { AuditEntry } from '@/lib/api/types';
import type { Case, CasePackage } from '@/lib/casework/types';
import type { PortableDocument } from '@/lib/records/documents';
import type { EvidenceSegment, TrustListCopy } from './evidence';
import type { ExportManifest, PortableConfiguration } from './export';
import type { Certificate } from '@/lib/records/certificates';
import { keyIdOfPem } from '@/lib/crypto/signing-key';
import { sourceDigestOf, targetDigestOf, manifestDigestOf, type recordkeepingOf } from '@/lib/recordkeeping/register';

export interface ExportReport {
  ok: boolean;
  export: string;
  institution: { id: string; name: string };
  installation: string;
  createdAt: string;
  /** What was checked and held. */
  checks: string[];
  /** What did not hold: any one makes the export unverified. */
  problems: string[];
  /** Notes that do not fail it (sample keys of a demonstration, records sealed before key registration). */
  notes: string[];
  counts: Record<string, number>;
  decisions: { id: string; ok: boolean; key: string; sealedAt: string; timeFrom: 'audit-chain' | 'record'; problem?: string }[];
}

type Parts = Map<string, Buffer>;
const read = <T,>(parts: Parts, name: string): T => {
  const b = parts.get(name);
  if (!b) throw new Error(`The export has no part ${name}`);
  return JSON.parse(b.toString('utf8')) as T;
};

/** Open and verify an export archive (needs the key it was sealed under: CIVICOS_DATA_KEK or the key provider). */
export async function verifyInstitutionExport(archive: Buffer): Promise<ExportReport> {
  let opened: { manifest: ExportManifest; parts: Parts };
  try { opened = await openExport<ExportManifest>(archive); } catch (e) {
    return { ok: false, export: 'unknown', institution: { id: '', name: '' }, installation: 'unknown', createdAt: '', checks: [], problems: [(e as Error).message], notes: [], counts: {}, decisions: [] };
  }
  return verifyExportParts(opened.manifest, opened.parts);
}

/** Verify the opened parts of an export against each other and the evidence they carry. */
export function verifyExportParts(manifest: ExportManifest, parts: Parts): ExportReport {
  const report: ExportReport = { ok: false, export: manifest.id, institution: manifest.institution, installation: manifest.installation, createdAt: manifest.createdAt, checks: [], problems: [], notes: [], counts: manifest.counts ?? {}, decisions: [] };
  const { checks, problems, notes } = report;
  const inst = manifest.institution.id;
  checks.push(`${manifest.parts.length} parts opened; every SHA-256 matches the sealed manifest (digest ${manifest.digest.slice(0, 16)}…)`);
  try {
    const institution = read<{ id: string; slots: { slot: string }[] }>(parts, 'institution.json');
    if (institution.id !== inst) problems.push(`institution.json names ${institution.id}, the manifest ${inst}`);
    const slots = new Set(institution.slots.map(s => s.slot));
    const owns = (owner: string) => owner === inst || slots.has(owner);

    // The audit segment and the access-log segment.
    const audit = read<{ head: { seq: number; hash: string } | null; items: (AuditEntry | AuditLink)[] }>(parts, 'audit.json');
    const av = verifyAuditSegment(audit.items);
    const last = audit.items[audit.items.length - 1];
    if (!av.ok) problems.push(`The audit segment is broken at entry ${av.brokenAtSeq}`);
    else if ((last?.seq ?? null) !== (audit.head?.seq ?? null) || (last?.hash ?? null) !== (audit.head?.hash ?? null) || audit.head?.seq !== manifest.audit.head?.seq || audit.head?.hash !== manifest.audit.head?.hash) problems.push('The audit segment does not end at the head the manifest names');
    else checks.push(`Audit chain: ${av.checked} entries chained to head ${audit.head?.seq ?? 0}; ${av.full} about this institution's records rehashed`);
    const access = read<{ base: { hash: string }; head: { seq: number; hash: string } | null; items: (AccessEntry | AccessLink)[] }>(parts, 'access-log.json');
    const xv = verifyAccessSegment(access.items);
    if (!xv.ok) problems.push(`The access-log segment is broken at entry ${xv.brokenAt}`);
    else if (access.items.length && access.items[0]!.prev !== access.base.hash && access.items[0]!.seq === 1) problems.push('The access log does not start from its recorded base');
    else checks.push(`Access log: ${xv.checked} entries chained; ${xv.full} reads by its officials or of its records rehashed`);

    // Evidence brought from earlier exports: each segment holds by itself.
    const evidence = read<EvidenceSegment[]>(parts, 'evidence/imported.json');
    for (const seg of evidence) {
      const a = verifyAuditSegment(seg.audit.items), x = verifyAccessSegment(seg.accessLog.items);
      if (!a.ok || !x.ok) problems.push(`Evidence from export ${seg.export} is broken (${!a.ok ? `audit at ${a.brokenAtSeq}` : `access log at ${x.brokenAt}`})`);
    }
    if (evidence.length) checks.push(`${evidence.length} evidence segment(s) from earlier exports verified`);

    // Records and their references.
    const cases = read<Case[]>(parts, 'cases.json');
    const decisions = read<SignedDecision[]>(parts, 'decisions.json');
    const docs = read<PortableDocument[]>(parts, 'documents.json');
    const packages = read<CasePackage[]>(parts, 'procedures.json');
    const caseIds = new Set(cases.map(c => c.id)), decisionIds = new Set(decisions.map(d => d.id)), docIds = new Set(docs.map(d => d.id));
    const foreign = [
      ...cases.filter(c => c.owner !== inst).map(c => `case ${c.ref}`),
      ...decisions.filter(d => d.content.institution.id !== inst).map(d => `decision ${d.id}`),
      ...docs.filter(d => d.institution !== inst).map(d => `document ${d.id}`),
      ...packages.filter(p => !owns(p.owner)).map(p => `procedure ${p.key}`),
    ];
    if (foreign.length) problems.push(`Records of another institution: ${foreign.slice(0, 5).join(', ')}${foreign.length > 5 ? ` and ${foreign.length - 5} more` : ''}`);
    else checks.push(`Every case, decision, document and procedure is ${manifest.institution.name}'s own`);
    const dangling = [
      ...decisions.filter(d => d.content.subject.kind === 'case' && !caseIds.has(d.content.subject.id)).map(d => `decision ${d.id} → case ${d.content.subject.id}`),
      ...cases.flatMap(c => c.decisions.filter(x => !decisionIds.has(x)).map(x => `case ${c.ref} → decision ${x}`)),
      ...cases.flatMap(c => c.documents.filter(x => !docIds.has(x)).map(x => `case ${c.ref} → document ${x}`)),
      ...docs.filter(d => d.belongsTo.kind === 'case' && !caseIds.has(d.belongsTo.id)).map(d => `document ${d.id} → case ${d.belongsTo.id}`),
      ...cases.filter(c => !packages.some(p => p.key === c.package.key && p.version === c.package.version)).map(c => `case ${c.ref} → procedure ${c.package.key}@${c.package.version}`),
    ];
    if (dangling.length) problems.push(`References outside the export: ${dangling.slice(0, 5).join('; ')}${dangling.length > 5 ? ` and ${dangling.length - 5} more` : ''}`);
    else checks.push(`${cases.length} case(s), ${decisions.length} decision(s), ${docs.length} document(s): every reference between them resolves inside the export`);

    // Documents: each version's content against its SHA-256.
    let versions = 0;
    for (const d of docs) for (const v of d.versions) {
      if (v.bytes === undefined) continue;
      versions++;
      if (sha256(Buffer.from(v.bytes, 'base64')) !== v.sha256) problems.push(`Document ${d.id} version ${v.n} does not match its SHA-256`);
    }
    checks.push(`${versions} document version(s) checked against their SHA-256`);

    // Sealed decisions: hash, seal, the seal's audit entry and the trust list.
    const trust = read<TrustListCopy>(parts, 'trust-list.json');
    const sealEntries = new Map<string, AuditEntry>();
    const keep = (items: (AuditEntry | AuditLink)[]) => { for (const e of items) if ('action' in e && e.action === 'decision.seal' && !sealEntries.has(e.resource)) sealEntries.set(e.resource, e); };
    keep(audit.items);
    const trustFor = new Map<string, TrustListCopy>();
    for (const seg of evidence) { for (const e of seg.audit.items) if ('action' in e && e.action === 'decision.seal' && !sealEntries.has(e.resource)) { sealEntries.set(e.resource, e); trustFor.set(e.resource, seg.trustList); } }
    let samples = 0;
    for (const d of decisions) {
      const resource = `Decision:${d.id}`;
      const r = verifyDecisionOffline(d, sealEntries.get(resource), trustFor.get(resource) ?? trust);
      report.decisions.push({ id: d.id, ok: r.ok, key: r.key.keyId, sealedAt: r.sealedAt, timeFrom: r.timeFrom, ...(r.problem ? { problem: r.problem } : {}) });
      if (!r.ok) problems.push(`Decision ${d.id}: ${r.problem}`);
      if (r.key.key?.sample) samples++;
    }
    const good = report.decisions.filter(x => x.ok).length;
    checks.push(`${good} of ${decisions.length} sealed decision(s) verify: hash, Ed25519 seal, the seal's audit entry and the key's standing in the trust list`);
    if (samples) notes.push(`${samples} decision(s) sealed with a sample key of a demonstration or training installation: they verify as samples, never as a nation's decisions`);
    if (manifest.installation !== 'production') notes.push(`Taken in a ${manifest.installation} installation: its records may be samples`);

    // Plan I9: configuration (as evidence) and verification material.
    if (parts.has('configuration.json') && parts.has('verification.json')) {
      const conf = read<PortableConfiguration>(parts, 'configuration.json');
      const ver = read<{ certificates: Certificate[]; federationKey: { keyId: string; publicKeyPem: string } | null }>(parts, 'verification.json');
      const before = problems.length;
      if (conf.adoptedOnImport !== false) problems.push('configuration.json must say it is not adopted on import');
      for (const m of conf.mappings) if (!owns(m.lead)) problems.push(`Mapping ${m.permitType} v${m.version} is led by ${m.lead}, not by ${manifest.institution.name}`);
      for (const r of conf.rules) if (!owns(String(r.owner))) problems.push(`Rule ${r.key} v${r.version} is owned by ${r.owner}, not by ${manifest.institution.name}`);
      const ruleRefs = new Set(conf.usedByDecisions.rules.map(r => `${r.key}@${r.version}@${r.digest}`));
      const laws = new Set(conf.laws.map(l => `${l.instrument}@${l.version}`));
      for (const d of decisions) {
        for (const r of d.content.rules ?? []) if (!ruleRefs.has(`${r.key}@${r.version}@${r.digest}`)) problems.push(`Decision ${d.id} used rule ${r.key} v${r.version}, which configuration.json does not list`);
        for (const c of d.content.citations ?? []) if (!laws.has(`${c.instrument}@${c.version}`)) problems.push(`Decision ${d.id} cites ${c.instrument} ${c.version}, which configuration.json does not list`);
      }
      for (const c of ver.certificates) {
        if (!decisionIds.has(c.decision)) problems.push(`Certificate ${c.id} comes from decision ${c.decision}, which is not in the export`);
        if (c.institution.id !== inst) problems.push(`Certificate ${c.id} is another institution's`);
      }
      if (ver.federationKey && keyIdOfPem(ver.federationKey.publicKeyPem) !== ver.federationKey.keyId) problems.push('The federation key\'s id is not its own');
      if (problems.length === before) checks.push(`Configuration: ${conf.mappings.length} mapping and ${conf.rules.length} rule version(s) of its own, ${conf.relationships.length} relationship(s), ${conf.laws.length} law version(s) cited, every rule and law its decisions record listed; ${ver.certificates.length} certificate(s) from its decisions${ver.federationKey ? `; federation key ${ver.federationKey.keyId}` : ''}`);
    } else notes.push('Taken before plan I9: it carries no configuration or verification material (certificates, federation key)');

    // Plan I9 (acceptance P5-06): records management, each migrated record's provenance and verification history.
    if (parts.has('registers/records-management.json')) {
      const rm = read<ReturnType<typeof recordkeepingOf>>(parts, 'registers/records-management.json');
      const before = problems.length;
      const theirs = [...rm.classes, ...rm.holds, ...rm.incoming, ...rm.disposals, ...rm.transfers, ...rm.migrations].filter(x => x.institution !== inst);
      if (theirs.length) problems.push(`Records management entries of another institution: ${theirs.length}`);
      let migrated = 0;
      for (const m of rm.migrations) {
        if (!m.records || !m.manifest) continue;
        migrated += m.records.length;
        if (m.records.length !== m.manifest.count || m.manifest.count !== m.source.count) problems.push(`Migration ${m.id}: the per-record manifest lists ${m.records.length} record(s), the plan ${m.manifest.count}, the source ${m.source.count}`);
        if (sourceDigestOf(m.records) !== m.manifest.sourceDigest || m.manifest.sourceDigest !== m.source.manifest) problems.push(`Migration ${m.id}: the records' sources do not give the source manifest the plan recorded`);
        if (targetDigestOf(m.records) !== m.manifest.targetDigest) problems.push(`Migration ${m.id}: the records' targets do not give the target digest the plan recorded`);
        if (manifestDigestOf(m.records) !== m.manifest.digest) problems.push(`Migration ${m.id}: a record's source, transformations or target differ from the manifest the plan recorded`);
        for (const [i, r] of (m.reconciliation ?? []).entries()) {
          if (!r.records) continue;
          const at = m.records.map(x => x.verification.find(v => v.reconciliation === i + 1)?.status);
          const n = (s: string) => at.filter(x => x === s).length;
          if (at.some(x => !x) || n('verified') !== r.records.verified || n('hash-mismatch') !== r.records.mismatched || n('missing') !== r.records.missing || n('not-verifiable-here') !== r.records.notVerifiable) problems.push(`Migration ${m.id}: reconciliation ${i + 1}'s counts are not the statuses its records carry`);
        }
      }
      if (problems.length === before) checks.push(`Records management: ${rm.classes.length} class(es), ${rm.holds.length} hold(s), ${rm.migrations.length} migration(s) of its own; ${migrated} migrated record(s), each manifest giving back its recorded digests and every reconciliation's counts its records' statuses`);
    }
    // Plan I9 (register 25.16): security registers, unmarked records only in full; a marked one only as a reference.
    if (parts.has('registers/security.json')) {
      const sec = read<{ records: { number: string; owner: string; marking: string }[]; references: { number: string; owner: string; summary?: string; terms?: unknown }[] }>(parts, 'registers/security.json');
      const before = problems.length;
      if (sec.records.some(r => r.marking)) problems.push('A marked security record is carried in full: an export carries a marked record as a reference only');
      if (sec.references.some(r => 'summary' in r || 'terms' in r)) problems.push('A marked security record\'s reference carries its summary or terms');
      if ([...sec.records, ...sec.references].some(r => r.owner !== inst)) problems.push('Security records of another institution');
      if (problems.length === before) checks.push(`Security registers: ${sec.records.length} unmarked record(s) of its own; ${sec.references.length} marked record(s) as references only`);
    }
  } catch (e) {
    problems.push((e as Error).message);
  }
  report.ok = problems.length === 0;
  return report;
}
