// The parts of the constitutional profile as they stand now (plan phase 5;
// guidance §7, §7.4): each part is read from the system that keeps it, never
// copied or moved, and summarised as a reference (the count of its adopted
// changes, a version number that only grows) and a SHA-256 digest of its
// values in force today. A profile captures these references when drafted;
// the security step checks they still hold before approval; the screen shows
// which parts changed since the active profile was approved.
//
//   classification  the state's classification (sovereign profile; recorded at setup or adopted since)
//   institutions    each institution's standing, branch, independence, prohibitions, records (terms in force)
//   authorities     who is responsible for each register and power (deployment profile)
//   offices         offices of state in force (holders are people, not configuration: not included)
//   relationships   relationships between institutions, the adopted version in force of each
//   dualControl     the country's two-official rules for decisions
//   suspension      the country's emergency suspension rules for authority mappings
//   competences     the allocation of powers between national and regional institutions in force (plan phase 6)
//   transitionRules the country's rules for transitions: caretaker restrictions, who records each impeachment
//                   stage, who may declare an emergency and for how long (plan phase 6)
//   sealKeys        who approves the state's seal keys, how many, whether the legislature must too
//                   (lib/keys/seal-register.ts); counted only once the nation adopts its rules, so the
//                   digest of every profile drafted before stays as it was
//   cabinetRules    the Cabinet's members counted, quorum and decision rule (lib/cabinet/register.ts, plan
//                   step I5); counted only once the nation adopts them

import { sha256Hex } from '@/lib/audit/sha256';
import { canonicalJson } from '@/lib/data/store/shared';
import { getSovereign, classificationChanges, authorityChanges } from '@/lib/data/store/sovereign';
import { listMinistries } from '@/lib/data/store/ministries';
import { termsOf } from '@/lib/data/store/institutions';
import { listRelationships } from '@/lib/data/store/relationships';
import { listOffices, officeHistory } from '@/lib/nation/office-register';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { suspensionPolicy } from '@/lib/permits/authority';
import { classificationOf } from '@/lib/nation/classification';
import { PART_KEYS, PART_LABELS, type PartKey, type PartRef } from './profile-state';
import { sealKeyRules } from '@/lib/keys/seal-register';
import { competencesInForce, competenceVersions, competencesWaiting, transitionRules } from '@/lib/transitions/state';
import { cabinetRules, cabinetRuleChanges } from '@/lib/cabinet/register';

const digestOf = (v: unknown) => sha256Hex(canonicalJson(v));
const adoptedCount = (h?: { history?: { outcome: string }[] }) => (h?.history ?? []).filter(x => x.outcome === 'adopted').length;
const waitingOf = (h?: { pending?: unknown }) => (h?.pending ? 1 : 0);

export interface LivePart extends PartRef { waiting: number }

function read(key: PartKey, now: Date): LivePart {
  const label = PART_LABELS[key];
  switch (key) {
    case 'classification': {
      const p = getSovereign();
      const c = classificationOf(p);
      const ch = classificationChanges();
      return { key, label, version: adoptedCount(ch), digest: digestOf({ recorded: p.constitution?.classification ?? null, derived: c.derived ? c : null }), waiting: waitingOf(ch),
        summary: `${c.derived ? 'Derived from the form of state' : 'Recorded'}: ${[...c.stateForms, ...c.governmentForms, ...c.territorialArrangements].join(', ') || 'no forms listed'}` };
    }
    case 'institutions': {
      const list = listMinistries();
      const terms = list.map(m => { const { basis, ...t } = termsOf(m, now); return { id: m.id, status: m.status, terms: t, basis: (basis ?? []).map(c => `${c.instrument}#${c.eId}`) }; });
      const independent = terms.filter(t => t.terms.standing !== 'executive-ministry' && t.terms.standing !== 'executive-agency').length;
      return { key, label, version: list.reduce((n, m) => n + adoptedCount(m.terms), 0), digest: digestOf(terms), waiting: list.filter(m => m.terms?.pending).length,
        summary: `${list.length} institution(s), ${independent} not executive` };
    }
    case 'authorities': {
      const a = Object.fromEntries(Object.entries(getSovereign().deployment?.authorities ?? {}).filter(([, v]) => !!v));
      const ch = authorityChanges();
      return { key, label, version: adoptedCount(ch), digest: digestOf(a), waiting: waitingOf(ch), summary: `${Object.keys(a).length} register(s) and power(s) named` };
    }
    case 'offices': {
      const list = listOffices(now).filter(o => !o.derived);
      const inForce = list.filter(o => o.inForce).map(o => ({ id: o.id, title: o.title, kind: o.kind, institution: o.institution ?? null, powers: o.powers, effectiveFrom: o.effectiveFrom, effectiveTo: o.effectiveTo ?? null }));
      const version = list.reduce((n, o) => n + adoptedCount(officeHistory(o.id)), 0);
      return { key, label, version, digest: digestOf(inForce), waiting: list.filter(o => officeHistory(o.id).pending).length, summary: `${inForce.length} office(s) in force` };
    }
    case 'relationships': {
      const list = listRelationships({}, now);
      const adopted = list.filter(r => r.version).map(r => ({ id: r.id, version: r.version, status: r.status, terms: r.terms }));
      return { key, label, version: list.reduce((n, r) => n + r.history.filter(h => h.outcome === 'adopted').length, 0), digest: digestOf(adopted), waiting: list.filter(r => r.pending).length,
        summary: `${list.filter(r => r.status === 'approved').length} approved, ${list.filter(r => r.inForce).length} in force` };
    }
    case 'dualControl': {
      const d = dualControlPolicy();
      return { key, label, version: adoptedCount(d.changes), digest: digestOf({ extra: d.extra, requireIdentityBinding: d.requireIdentityBinding, pendingHours: d.pendingHours, adopted: d.adopted, ...(d.requireIdentityProvider ? { requireIdentityProvider: true } : {}) }), waiting: waitingOf(d.changes),
        summary: d.adopted ? `${d.extra.length} further step(s); proposals lapse after ${d.pendingHours} h` : 'Platform defaults (not adopted by the nation)' };
    }
    case 'suspension': {
      const s = suspensionPolicy();
      return { key, label, version: adoptedCount(s.changes), digest: digestOf({ confirmWithinHours: s.confirmWithinHours, reviewWithinDays: s.reviewWithinDays, suspendBy: s.suspendBy ?? 'administrator', adopted: s.adopted }), waiting: waitingOf(s.changes),
        summary: s.adopted ? `Confirm within ${s.confirmWithinHours} h, review within ${s.reviewWithinDays} d` : 'Platform defaults (not adopted by the nation)' };
    }
    case 'competences': {
      const c = competencesInForce(now).map(x => ({ competence: x.competence, holder: x.holder, previous: x.previous ?? null, regions: x.regions, from: x.from, event: x.ref }));
      return { key, label, version: competenceVersions(), digest: digestOf(c), waiting: competencesWaiting(), summary: c.length ? `${c.length} power(s) transferred` : 'No transfer of a power recorded' };
    }
    case 'transitionRules': {
      const r = transitionRules();
      const { changes, adopted, ...values } = r;
      const restricted = values.caretakerProcedures.length + values.caretakerDecisions.length + values.caretakerDirectives.length;
      return { key, label, version: adoptedCount(changes), digest: digestOf({ ...values, adopted }), waiting: waitingOf(changes),
        summary: adopted ? `Caretaker restricts ${restricted} kind(s); ${values.impeachmentStages.filter(Boolean).length} of 7 impeachment stages named; emergencies by ${values.emergencyDeclarers.length} declarer(s)` : 'None adopted by the nation' };
    }
    case 'sealKeys': {
      const r = sealKeyRules();
      return { key, label, version: adoptedCount(r.changes), digest: digestOf({ authority: r.authority, approvers: r.approvers, legislatureResolution: r.legislatureResolution, reviewWithinDays: r.reviewWithinDays, adopted: r.adopted }), waiting: waitingOf(r.changes),
        summary: r.adopted ? `${r.approvers} approvals${r.legislatureResolution ? ' and the legislature\'s enacted instrument' : ''} for each key; compromise reviewed within ${r.reviewWithinDays} d` : 'Platform defaults (not adopted by the nation)' };
    }
    case 'cabinetRules': {
      const { version, ...values } = cabinetRules();
      const ch = cabinetRuleChanges();
      return { key, label, version: adoptedCount(ch), digest: digestOf(values), waiting: waitingOf(ch),
        summary: version ? `${values.members} members; quorum ${values.quorum?.numerator}/${values.quorum?.denominator}; ${values.rule}` : 'None adopted by the nation' };
    }
  }
}

/** Parts that count only once the nation adopts them (added after profiles existed; their absence leaves earlier digests as they were). */
const ONCE_ADOPTED: PartKey[] = ['sealKeys', 'cabinetRules'];

/** Every part as it stands today, in a fixed order. */
export function currentParts(now = new Date()): LivePart[] {
  return PART_KEYS.map(k => read(k, now)).filter(p => !ONCE_ADOPTED.includes(p.key) || p.version > 0);
}

/** The digest a profile carries: SHA-256 over the parts' keys, versions and digests (not their summaries). */
export function partsDigest(parts: Pick<PartRef, 'key' | 'version' | 'digest'>[]): string {
  return digestOf({ type: 'civicos.constitutional-profile', v: 1, parts: parts.map(p => ({ key: p.key, version: p.version, digest: p.digest })) });
}

/** The parts whose digest differs between two captures (all of them when there is no earlier one). */
export function changedParts(a: Pick<PartRef, 'key' | 'digest'>[] | undefined, b: (Pick<PartRef, 'key' | 'digest'> & { version?: number })[]): PartKey[] {
  if (!a) return b.map(p => p.key);
  // A part added to the platform after the earlier capture (phase 6 added two) counts as changed only once it holds an adopted change.
  return b.filter(p => { const x = a.find(y => y.key === p.key); return x ? x.digest !== p.digest : (p as { version?: number }).version !== 0; }).map(p => p.key);
}
