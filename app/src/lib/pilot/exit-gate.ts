// The pilot's exit gate (spec Part 6 I, roadmap 05, S6-I-11: "authorised
// users complete the service with real records and verifiable audit
// evidence"; Health I4 standalone-and-pilot). Computed every time from the
// records, never stored, never a status field anyone sets:
//
//   procedures  an approved version of each of the pilot institutions'
//               procedures applies today (lib/casework/packages.ts)
//   cases       cases completed under them (a terminal stage with a sealed
//               decision) that are not samples (never `source: 'sample'`),
//               counted per procedure
//   decisions   their sealed decisions verify: hash, seal, the seal's audit
//               entry and a key the seal key register approved, never a
//               sample key (lib/records/decisions.ts sealReport()); decisions
//               brought from another installation verify against the
//               evidence they came with (lib/portability/verify.ts)
//   mappings    each decision was made under an approved authority mapping
//               in force today, or under the deployment profile, never
//               unmapped (lib/permits/decisions.ts)
//   audit       the audit chain verifies (lib/data/store/audit.ts)
//   reads       the access log holds reads of each completed case
//   officials   the officials who acted are named and signed in, at least two
//               people, every decision step by a verified official
//
// "Met" only when every item is; otherwise it lists exactly what is missing.
// A demonstration, where every case is a sample, is never met. The gate
// reports evidence: it never calls Health (or any institution) complete
// (docs/HEALTH_I4_DEPENDENCIES.md tracks that).

import { AUTHORITIES, provisionalOwner, type AuthorityKey } from '@/lib/nation/deployment';
import { authorityFor, getSovereign } from '@/lib/data/store/sovereign';
import { listMinistries } from '@/lib/data/store/ministries';
import { auditVerification } from '@/lib/data/store/audit';
import { editionOf } from '@/lib/nation/deployment';
import { casesOf } from '@/lib/casework/engine';
import { listPackages, activePackage, ownerInstitution } from '@/lib/casework/packages';
import { getDecision, sealReport, verifyDecisionOffline, type SignedDecision } from '@/lib/records/decisions';
import { listAccess } from '@/lib/records/access-log';
import { mappingInForce } from '@/lib/permits/authority';
import { importedEvidence } from '@/lib/portability/evidence';
import { installationMode } from '@/lib/ops/mode';
import type { Case } from '@/lib/casework/types';

/** The health slots a pilot of the health institutions covers when no Institutional Edition names them. */
export const HEALTH_PILOT_SLOTS: AuthorityKey[] = ['healthRegulation', 'professionalRegulation', 'medicinesRegulation', 'controlledSubstances', 'publicHealth'];

export interface GateItem { key: string; label: string; met: boolean; detail: string; missing: string[] }
export interface ProcedureEvidence {
  key: string; title: string; institution: string;
  /** The approved version that applies today, if any. */
  approved?: number;
  completed: number;
  /** Completed sample cases: shown, never counted. */
  samples: number;
  decisions: { total: number; verified: number };
}
export interface PilotGate {
  computedAt: string;
  installation: string;
  scope: { label: string; from: 'edition' | 'health-slots'; institutions: { id: string; name: string }[] };
  met: boolean;
  items: GateItem[];
  procedures: ProcedureEvidence[];
  officials: { name: string; id?: string; acts: number }[];
  /** Everything missing, in the order of the items. */
  missing: string[];
  note: string;
}

const NOTE = 'Computed from the records each time it is read; it reports evidence and never declares a service or an institution complete.';

/** The institutions the pilot is: the Institutional Edition's, else those named for the health slots. */
export function pilotScope(): PilotGate['scope'] {
  const names = new Map(listMinistries().map(m => [m.id, m.name]));
  const e = editionOf(getSovereign().deployment);
  if (e) return { label: e.label, from: 'edition', institutions: e.institutions.map(id => ({ id, name: names.get(id) ?? id })) };
  const ids = [...new Set(HEALTH_PILOT_SLOTS.map(k => provisionalOwner(k, authorityFor).institution).filter((x): x is string => !!x))];
  return { label: 'The health institutions', from: 'health-slots', institutions: ids.map(id => ({ id, name: names.get(id) ?? id })) };
}

/** A decision's check: live (seal key register, audit chain), else against the evidence it was brought with. */
function decisionCheck(d: SignedDecision): { ok: boolean; sample: boolean; problem?: string } {
  const live = sealReport(d);
  if (live.ok || live.key.state !== 'no-audit-record') return { ok: live.ok, sample: !!live.key.key?.sample, ...(live.problem ? { problem: live.problem } : {}) };
  for (const seg of importedEvidence(d.content.institution.id)) {
    const e = seg.audit.items.find(x => 'action' in x && x.action === 'decision.seal' && x.resource === `Decision:${d.id}`);
    if (!e || !('action' in e)) continue;
    const r = verifyDecisionOffline(d, e, seg.trustList);
    return { ok: r.ok, sample: !!r.key.key?.sample, ...(r.problem ? { problem: r.problem } : {}) };
  }
  return { ok: false, sample: false, problem: live.problem };
}

export function pilotExitGate(now = new Date()): PilotGate {
  const scope = pilotScope();
  const ids = scope.institutions.map(i => i.id);
  const today = now.toISOString().slice(0, 10);
  const items: GateItem[] = [];
  const item = (key: string, label: string, missing: string[], detail: string) => items.push({ key, label, met: missing.length === 0, detail, missing });

  item('scope', 'Pilot institutions named', ids.length ? [] : ['No institution is named for the health registers, and no Institutional Edition is recorded (National settings → Who is responsible, or Institutional Edition)'],
    ids.length ? `${scope.label}: ${scope.institutions.map(i => i.name).join(', ')}` : 'None');

  // Procedures of the pilot institutions, by key.
  const byKey = new Map<string, { title: string; institution: string }>();
  for (const p of listPackages()) {
    const inst = ownerInstitution(p.owner, authorityFor);
    if (inst && ids.includes(inst) && !byKey.has(p.key)) byKey.set(p.key, { title: p.title, institution: inst });
  }
  const cases: Case[] = ids.flatMap(id => casesOf(id));
  // Completed: it reached a terminal stage of its procedure (the engine closes it there) with a sealed decision.
  const isDone = (c: Case) => !!c.closedAt && c.decisions.length > 0;
  const done = cases.filter(isDone);
  const real = done.filter(c => c.source !== 'sample');
  const procedures: ProcedureEvidence[] = [...byKey.entries()].map(([key, p]) => {
    const active = activePackage(key, today);
    const mine = real.filter(c => c.package.key === key);
    const decisions = mine.flatMap(c => c.decisions.map(getDecision).filter((d): d is SignedDecision => !!d));
    return { key, title: p.title, institution: p.institution, ...(active ? { approved: active.version } : {}), completed: mine.length, samples: done.filter(c => c.package.key === key && c.source === 'sample').length,
      decisions: { total: decisions.length, verified: decisions.filter(d => { const r = decisionCheck(d); return r.ok && !r.sample; }).length } };
  }).sort((a, b) => a.key.localeCompare(b.key));

  const approved = procedures.filter(p => p.approved);
  const unapprovedInUse = procedures.filter(p => p.completed && !p.approved);
  item('procedures', 'Approved procedures in force', [
    ...(approved.length ? [] : [`No approved procedure of ${scope.label.toLowerCase()} applies today (${procedures.length} drafted; each is approved by a second official before use)`]),
    ...unapprovedInUse.map(p => `${p.title}: cases were completed but no approved version applies today`),
  ], `${approved.length} of ${procedures.length} procedure(s) approved and in force`);

  const samples = done.length - real.length;
  item('cases', 'Completed cases that are not samples, per procedure', real.length ? [] : [`No case of ${scope.label.toLowerCase()} has been completed with real records${samples ? ` (${samples} completed sample case(s) are not counted)` : ''}`],
    procedures.filter(p => p.completed).map(p => `${p.title}: ${p.completed}`).join(' · ') || `None${samples ? ` (${samples} sample)` : ''}`);

  const decisions = real.flatMap(c => c.decisions.map(id => ({ c, d: getDecision(id) })));
  const decisionMissing: string[] = [];
  let verified = 0;
  for (const { c, d } of decisions) {
    if (!d) { decisionMissing.push(`${c.ref}: a decision it names is not in the decision records`); continue; }
    const r = decisionCheck(d);
    if (!r.ok) decisionMissing.push(`${c.ref}: decision ${d.id.slice(0, 8)}… does not verify (${r.problem})`);
    else if (r.sample) decisionMissing.push(`${c.ref}: decision ${d.id.slice(0, 8)}… is sealed with a sample key, not a key the seal key register approved`);
    else verified++;
  }
  item('decisions', 'Sealed decisions verify against approved seal keys', decisions.length ? decisionMissing : ['No sealed decision on a completed case that is not a sample'], `${verified} of ${decisions.length} verify`);

  const mappingMissing: string[] = [];
  for (const { c, d } of decisions) {
    if (!d) continue;
    const a = d.content.authority;
    if (!a) { mappingMissing.push(`${c.ref}: the decision records no authority it was made under`); continue; }
    if (a.basis === 'unmapped') mappingMissing.push(`${c.ref}: decided without an approved authority mapping (${a.permitType ?? 'unclassified'})`);
    else if (a.basis === 'mapping' && !mappingInForce(a.permitType, today)) mappingMissing.push(`${c.ref}: the mapping for ${a.permitType} (version ${a.version}) is no longer in force`);
  }
  item('mappings', 'Decisions made under an approved mapping in force (or the deployment profile)', decisions.length ? mappingMissing : ['No decision to check'], decisions.length ? `${decisions.length - mappingMissing.length} of ${decisions.length}` : 'None');

  const av = auditVerification(now.getTime());
  item('audit', 'The audit chain verifies', av.ok ? [] : [`The audit chain is broken at entry ${av.brokenAtSeq}`], av.ok ? `${av.checked} entries checked${av.complete ? '' : ' (more catching up)'}` : 'Broken');

  const unread = real.filter(c => !listAccess({ register: 'cases', recordId: c.ref, limit: 1 }).some(e => e.result === 'allowed'));
  item('reads', 'Access-log entries present for the reads', real.length ? unread.map(c => `${c.ref}: no read of the case is in the access log`) : ['No completed case to check'], real.length ? `${real.length - unread.length} of ${real.length} case(s) read and logged` : 'None');

  const acts = new Map<string, { name: string; id?: string; acts: number }>();
  const unsigned: string[] = [];
  for (const c of real) for (const s of c.history) {
    for (const who of [s.by, ...(s.confirmedBy ? [s.confirmedBy] : [])]) {
      const k = who.id ?? `name:${who.name}`;
      const x = acts.get(k) ?? { name: who.name, ...(who.id ? { id: who.id } : {}), acts: 0 };
      x.acts++; acts.set(k, x);
    }
    if (s.decision && (!s.by.id || (s.confirmedBy && !s.confirmedBy.id))) unsigned.push(`${c.ref}: the ${s.action} decision was taken without a verified sign-in`);
  }
  const officials = [...acts.values()].sort((a, b) => b.acts - a.acts);
  const signedIn = officials.filter(o => o.id).length;
  item('officials', 'Named officials who acted', real.length ? [...unsigned, ...(signedIn < 2 ? ['Fewer than two signed-in officials acted on the completed cases'] : [])] : ['No completed case: no official has acted on real records'],
    officials.length ? officials.map(o => `${o.name} (${o.acts})`).join(', ').slice(0, 400) : 'None');

  const missing = items.flatMap(i => i.missing);
  return { computedAt: now.toISOString(), installation: installationMode(), scope, met: missing.length === 0, items, procedures, officials, missing, note: NOTE };
}

/** Labels for the slots the health pilot covers (for screens). */
export const pilotSlotLabels = () => HEALTH_PILOT_SLOTS.map(k => AUTHORITIES.find(a => a.key === k)!.label);
