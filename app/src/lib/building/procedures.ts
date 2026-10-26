// Planning and building control procedures (plan step I7; specification
// Part 3 §D.13 "Workflow: building permit"; catalogue Part 9 §4.2
// "Construction and infrastructure approvals"; supplement Part 20 HPC-PLN-009,
// 012, 013, HPC-BLD-014 … 020). Reference drafts the nation adapts and a
// second official approves; none is approved, none names a body: each belongs
// to the `buildingControl` slot of the deployment profile, empty until the
// nation names it. Who holds each power over a planning permission, a
// building permit, an enforcement order or an occupancy certificate still
// comes from the permit authority registry (lib/permits/decisions.ts,
// BUILDING_DECISION_PERMITS), where a local government can be the lead for
// its area.
//
//   building.planning  a planning application on a parcel: validated, consulted on, decided (HPC-PLN-009, 012, 013)
//   building.permit    a building permit through its life: plans and technical review, the decision against one
//                      approved design version, commencement, inspections recorded as findings with reasons,
//                      stop-work orders and their lifting, design variations decided again, completion and the
//                      occupancy decision (HPC-BLD-014 … 020)
//
// What they share:
//   - The site is a published parcel of the register (lib/data/parcels.ts);
//     each decision records the parcel version it was taken on. No map, model
//     or drawing overrides the authoritative parcel or planning record.
//   - Every decision records the version of the nation's building control
//     rules it applied (lib/building/register.ts, adopted by two officials
//     citing the law); without adopted rules nothing is decided.
//   - Planning permission, building approval, construction and occupancy are
//     separate states of separate records; a permit names the planning
//     decision it relies on, and a changed design is decided again.
//   - An inspection is findings with reasons (each observation with the
//     nation's severity, never a score), recorded by the signed-in inspector.
//   - No day count or fee ships set.

import { registerEffect, registerDecisionGuard, registeredEffects, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { getParcel, type Parcel } from '@/lib/data/parcels';
import { getDocument } from '@/lib/records/documents';
import {
  buildingRules, rulesRef, recordPlanningDecision, openPermit, submitDesign, decidePermit, decideVariation, setConstruction, recordInspection,
  issueStopWork, liftStopWork, decideOccupancy, permitOfCase, getPlanning, inspectionsOf, RESULTS, type AdoptedBuildingRules, type InspectionFinding,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown) => str(v).split('\n').map(x => x.trim()).filter(Boolean);

/** The permit type whose approved mapping governs each decision (lib/permits/decisions.ts reads it by procedure and decision). */
export const BUILDING_DECISION_PERMITS: Record<string, string> = {
  'building.planning': 'planning-permission',
  'stop-work': 'building-enforcement', 'lift-stop': 'building-enforcement',
  'certify-occupancy': 'occupancy-certificate', 'refuse-occupancy': 'occupancy-certificate',
  'building.permit': 'building-permit',
};

function keeper(c: Case): { error: string } | null {
  const id = authorityFor('buildingControl');
  return id && id === c.owner ? null : { error: 'Planning and building control is kept by the institution the nation names for it under Who is responsible: this institution is not it' };
}
function rules(): AdoptedBuildingRules | { error: string } {
  return buildingRules() ?? { error: 'The nation has not adopted its building control rules (categories, uses, inspection checklists, severities): two officials adopt them citing the law before anything is decided' };
}
function site(c: Case): Parcel | { error: string } {
  const id = str(c.fields.parcel);
  if (!id) return { error: 'Name the parcel the development is on (its national parcel id or record number)' };
  const p = getParcel(id);
  if (!p) return { error: `No parcel ${id} in the register: the site is a registered parcel` };
  if (p.state !== 'published') return { error: `Parcel ${p.parcelId} is ${p.state}: a planning or building decision is taken on a published parcel` };
  return p;
}
const parcelRef = (p: Parcel) => ({ id: p.id, parcelId: p.parcelId, version: p.versions.length });
/** The latest design document attached to the case (plans and drawings), by its stored digest. */
function latestDesign(c: Case): { document: string; sha256?: string } | null {
  const docs = c.documents.map(id => getDocument(id)).filter(d => d?.class === 'design-documents');
  const d = docs.at(-1);
  return d ? { document: d.id, ...(d.versions.at(-1)?.sha256 ? { sha256: d.versions.at(-1)!.sha256 } : {}) } : null;
}
const sample = (c: Case) => c.source === 'sample';
const reasonOf = (c: Case) => c.history.at(-1)?.reason ?? '';
const withRules = (r: AdoptedBuildingRules, more: Omit<EffectResult, 'rules'> = {}): EffectResult => ({ ...more, rules: [{ key: 'building.rules', ...rulesRef(r) }] });
type Check = (ctx: EffectContext) => EffectResult | { error: string };
const CHECKS = new Map<string, Check>();
/** Register an effect, and keep it so the decision guard below runs its checks when a decision is proposed. */
const effect = (name: string, fn: Check) => { CHECKS.set(name, fn); registerEffect(name, fn); };

// ── Planning ─────────────────────────────────────────────────────────────────

effect('building.site', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const r = rules();
  if ('error' in r) return r;
  const p = site(c);
  if ('error' in p) return p;
  if (!r.uses.includes(str(c.fields.proposedUse))) return { error: `The proposed use is one of the nation's uses: ${r.uses.join(', ')}` };
  return { facts: { parcel: p.parcelId, parcelVersion: p.versions.length } };
});

function planningDecision(granted: boolean) {
  return (ctx: EffectContext) => {
    const { case: c, now } = ctx;
    const k = keeper(c);
    if (k) return k;
    const r = rules();
    if ('error' in r) return r;
    const p = site(c);
    if ('error' in p) return p;
    const conditions = lines(c.fields.conditions);
    const outcome = granted ? (conditions.length ? 'granted-with-conditions' as const : 'granted' as const) : 'refused' as const;
    return withRules(r, {
      facts: { parcel: p.parcelId, parcelVersion: p.versions.length, outcome, conditions: conditions.length },
      after: (d, done) => {
        recordPlanningDecision({ case: { id: c.id, ref: c.ref }, parcel: parcelRef(p), proposedUse: str(c.fields.proposedUse), description: str(c.fields.description), outcome, conditions,
          representations: lines(c.fields.representations).length, rules: rulesRef(r), ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name, sample: sample(c) }, now);
      },
    });
  };
}
effect('building.planning-grant', planningDecision(true));
effect('building.planning-refuse', planningDecision(false));

// ── Building permits ─────────────────────────────────────────────────────────

effect('building.validate', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const r = rules();
  if ('error' in r) return r;
  const p = site(c);
  if ('error' in p) return p;
  if (!r.categories.includes(str(c.fields.buildingCategory))) return { error: `The building category is one of the nation's: ${r.categories.join(', ')}` };
  if (!r.uses.includes(str(c.fields.buildingUse))) return { error: `The use is one of the nation's uses: ${r.uses.join(', ')}` };
  const planning = str(c.fields.planningDecision);
  if (planning) {
    const d = getPlanning(planning);
    if (!d) return { error: `No planning decision ${planning} in the register` };
    if (d.outcome === 'refused') return { error: `Planning decision ${planning} refused permission: a building permit does not rest on it` };
    if (d.parcel.id !== p.id) return { error: `Planning decision ${planning} is for parcel ${d.parcel.parcelId}, not ${p.parcelId}` };
  }
  const design = latestDesign(c);
  if (!design) return { error: 'Attach the design documents (plans and drawings)' };
  const area = Number(c.fields.floorArea);
  return {
    facts: { parcel: p.parcelId, parcelVersion: p.versions.length },
    after: () => {
      openPermit({ case: { id: c.id, ref: c.ref }, parcel: parcelRef(p), ...(planning ? { planning } : {}), category: str(c.fields.buildingCategory), use: str(c.fields.buildingUse), ...(Number.isFinite(area) && area > 0 ? { floorAreaM2: area } : {}), rules: rulesRef(r), sample: sample(c) });
      submitDesign(c.id, { ...design, by: c.history.at(-1)?.by.name ?? 'Applicant', note: 'Submitted with the application' });
    },
  };
});

effect('building.plans', ({ case: c }: EffectContext) => {
  const design = latestDesign(c);
  if (!design) return { error: 'Attach the plans submitted' };
  if (!permitOfCase(c.id)) return { error: 'The application has not been validated' };
  return { after: () => { submitDesign(c.id, { ...design, by: c.history.at(-1)!.by.name, note: reasonOf(c) }); } };
});

function permitDecision(granted: boolean) {
  return (ctx: EffectContext) => {
    const { case: c, now } = ctx;
    const k = keeper(c);
    if (k) return k;
    const r = rules();
    if ('error' in r) return r;
    const p = site(c);
    if ('error' in p) return p;
    const permit = permitOfCase(c.id);
    if (!permit?.designs.length) return { error: 'No design has been submitted' };
    const conditions = lines(c.fields.conditions);
    return withRules(r, {
      facts: { permit: permit.number, parcel: p.parcelId, parcelVersion: p.versions.length, design: permit.designs.length, outcome: granted ? 'granted' : 'refused' },
      after: d => { decidePermit(c.id, { granted, conditions, rules: rulesRef(r), ...(d ? { decision: d.id } : {}) }, now); },
    });
  };
}
effect('building.grant', permitDecision(true));
effect('building.refuse', permitDecision(false));

effect('building.commence', ({ case: c }: EffectContext) => {
  const permit = permitOfCase(c.id);
  if (permit?.permit.state !== 'granted') return { error: 'Construction commences under a granted permit' };
  const on = str(c.fields.commencementDate);
  if (!on) return { error: 'Give the date construction commences' };
  return { facts: { permit: permit.number, commenced: on }, after: () => { setConstruction(c.id, { state: 'commenced', on }); } };
});

/** Findings as the inspector records them: one per line, `checklist item | what was observed | severity`. */
function findingsOf(c: Case, r: AdoptedBuildingRules, items: string[]): InspectionFinding[] | { error: string } {
  const out: InspectionFinding[] = [];
  for (const [i, l] of lines(c.fields.inspectionFindings).entries()) {
    const [item = '', observation = '', severity = ''] = l.split('|').map(x => x.trim());
    if (!items.includes(item)) return { error: `Finding ${i + 1}: the item is one of this stage's checklist: ${items.join(', ')}` };
    if (!observation) return { error: `Finding ${i + 1}: say what was observed` };
    if (!r.severities.includes(severity)) return { error: `Finding ${i + 1}: the severity is one of the nation's: ${r.severities.join(', ')}` };
    out.push({ item, observation, severity });
  }
  return out;
}

effect('building.inspect', (ctx: EffectContext) => {
  const { case: c, now, actor } = ctx;
  const r = rules();
  if ('error' in r) return r;
  const permit = permitOfCase(c.id);
  if (permit?.permit.state !== 'granted') return { error: 'Inspections are recorded on a granted permit' };
  const stage = str(c.fields.inspectionStage);
  const list = r.checklists.find(x => x.stage === stage);
  if (!list) return { error: `The inspection stage is one of the nation's: ${r.checklists.map(x => x.stage).join(', ')}` };
  const findings = findingsOf(c, r, list.items);
  if ('error' in findings) return findings;
  const result = str(c.fields.inspectionResult) as (typeof RESULTS)[number];
  if (!RESULTS.includes(result)) return { error: `The result is one of ${RESULTS.join(', ')}` };
  if (result !== 'pass' && !findings.length) return { error: 'A result other than a pass records the findings it rests on' };
  const date = str(c.fields.inspectionDate) || now.toISOString().slice(0, 10);
  return withRules(r, {
    facts: { permit: permit.number, stage, result, findings: findings.length },
    after: (_d, done) => {
      recordInspection({ permit: permit.number, case: { id: c.id, ref: c.ref }, stage, date, inspector: { ...(actor.id ? { id: actor.id } : {}), name: actor.name }, checklist: { rules: rulesRef(r), items: list.items }, findings, result, reasons: done.history.at(-1)?.reason ?? '', sample: sample(c) }, now);
    },
  });
});

effect('building.stop', ({ case: c, now }: EffectContext) => {
  const permit = permitOfCase(c.id);
  if (permit?.construction.state !== 'commenced') return { error: 'A stop-work order is made while construction is under way' };
  const grounds = str(c.fields.stopGrounds);
  if (!grounds) return { error: 'State the grounds of the order (what was found, and the provision it breaches)' };
  return { facts: { permit: permit.number }, after: (d, done) => { issueStopWork({ permit: permit.number, case: { id: c.id, ref: c.ref }, grounds, ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name, sample: sample(c) }, now); } };
});

effect('building.lift', ({ case: c, now }: EffectContext) => {
  const permit = permitOfCase(c.id);
  if (permit?.construction.state !== 'stopped') return { error: 'No stop-work order is in force' };
  return { facts: { permit: permit.number }, after: (d, done) => { liftStopWork(permit.number, { ...(d ? { decision: d.id } : {}), at: now.toISOString(), by: done.history.at(-1)!.by.name, reasons: done.history.at(-1)?.reason ?? '' }); } };
});

effect('building.vary', ({ case: c }: EffectContext) => {
  const permit = permitOfCase(c.id);
  if (permit?.permit.state !== 'granted') return { error: 'A design variation is made to a granted permit' };
  const design = latestDesign(c);
  if (!design || permit.designs.some(x => x.document === design.document)) return { error: 'Attach the changed design: a material change is assessed again, never added to the approval silently' };
  return { facts: { permit: permit.number }, after: (_d, done) => { submitDesign(c.id, { ...design, by: done.history.at(-1)!.by.name, note: done.history.at(-1)?.reason ?? 'Variation' }); } };
});

function variation(approved: boolean) {
  return ({ case: c }: EffectContext) => {
    const r = rules();
    if ('error' in r) return r;
    const permit = permitOfCase(c.id);
    if (!permit?.variationPending) return { error: 'No changed design waits for a decision' };
    return withRules(r, { facts: { permit: permit.number, design: permit.variationPending, approved }, after: () => { decideVariation(c.id, approved); } });
  };
}
effect('building.approve-variation', variation(true));
effect('building.refuse-variation', variation(false));

effect('building.complete', ({ case: c }: EffectContext) => {
  const permit = permitOfCase(c.id);
  if (permit?.construction.state !== 'commenced') return { error: permit?.construction.state === 'stopped' ? 'Construction is stopped by an order: lift it first' : 'Completion is notified for construction under way' };
  if (permit.variationPending) return { error: 'A changed design waits for its decision' };
  const on = str(c.fields.completionDate);
  if (!on) return { error: 'Give the date the work was completed' };
  return { facts: { permit: permit.number, completed: on }, after: () => { setConstruction(c.id, { state: 'completed', on }); } };
});

function occupancy(certified: boolean) {
  return ({ case: c, now }: EffectContext) => {
    const k = keeper(c);
    if (k) return k;
    const r = rules();
    if ('error' in r) return r;
    const permit = permitOfCase(c.id);
    if (!permit || permit.construction.state !== 'completed') return { error: 'Occupancy is decided once completion is notified' };
    // The final inspection: the latest one recorded after completion.
    const last = inspectionsOf(permit.number).filter(i => i.date >= (permit.construction.completedOn ?? '')).at(-1);
    if (!last) return { error: 'Record the final inspection after completion first' };
    if (certified && !['pass', 'conditional'].includes(last.result)) return { error: `The final inspection ${last.number} found ${last.result.replace('-', ' ')}: occupancy is certified only after a pass or a conditional pass` };
    return withRules(r, { facts: { permit: permit.number, finalInspection: last.number, certified }, after: d => { decideOccupancy(c.id, { certified, finalInspection: last.number, ...(d ? { decision: d.id } : {}) }, now); } });
  };
}
effect('building.occupancy', occupancy(true));
effect('building.refuse-occupancy', occupancy(false));

// A decision is checked when the first of two officials proposes it, not only when the second confirms: the same checks the
// effects run (the rules adopted, the parcel published, the final inspection passed), without changing anything.
registerDecisionGuard('building-checks', (c, a, pkg, now): { error: string } | Record<string, never> => {
  if (!pkg.key.startsWith('building.') || !a.needs.fourEyes) return {};
  for (const name of a.effects ?? []) {
    const fn = CHECKS.get(name);
    const r = fn ? fn({ case: c, package: pkg, action: a, actor: { name: 'Building control check', scope: null }, now }) : undefined;
    if (r && 'error' in r && r.error) return { error: r.error };
  }
  return {};
});

// ── Reference procedures ─────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const per = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'building-control-file', sensitivity: 'normal' as const, owner: 'buildingControl' };

export const REFERENCE_PLANNING_APPLICATION: Ref = {
  ...base, key: 'building.planning', version: 1, title: 'Planning application on a registered parcel', refPrefix: 'PLA',
  fields: [
    adm('parcel', 'Site: the parcel (its national parcel id or record number, from the register)'),
    adm('proposedUse', 'Proposed use (one of the nation\'s uses)'),
    adm('description', 'The development proposed', 'longtext'),
    adm('referralNeeded', 'An environmental or heritage referral is needed', 'boolean'),
    adm('consultationNotice', 'How the application was publicised (as the law requires)'),
    per('representations', 'Representations and objections received: one per line, a summary (the full text is a document of the case)', 'longtext'),
    adm('conditions', 'Conditions of the permission: one per line', 'longtext'),
  ],
  documents: [
    { class: 'site-plan', label: 'Site plan', required: true },
    { class: 'design-statement', label: 'Description of the development and its drawings', required: false, multiple: true },
    { class: 'referral-response', label: 'Response of an environmental, heritage or other authority consulted', required: false, multiple: true },
    { class: 'representation', label: 'A representation or objection received', required: false, multiple: true },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'consultation', label: 'Validated: notice and consultation' }, { key: 'assessment', label: 'Assessment against the plan and the rules' },
    { key: 'granted', label: 'Permission granted (with any conditions)', terminal: true }, { key: 'not-granted', label: 'Permission refused, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'validate', label: 'Validate: the site is a registered parcel, the use one of the nation\'s, the plans attached', from: ['received'], to: 'consultation', needs: { role: 'officer' }, requires: { fields: ['parcel', 'proposedUse', 'description'], documents: ['site-plan'] }, effects: ['building.site'] },
    { key: 'close-consultation', label: 'Close the consultation, the representations recorded', from: ['consultation'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['consultationNotice'], reasons: true } },
    { key: 'grant', label: 'Grant permission (with any conditions), with reasons', from: ['assessment'], to: 'granted', decision: 'grant', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['building.planning-grant'] },
    { key: 'refuse', label: 'Refuse permission, with reasons and the appeal route', from: ['assessment'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['building.planning-refuse'] },
    { key: 'withdraw', label: 'Withdrawn by the applicant', from: ['received', 'consultation', 'assessment'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'validated, consulted and granted', steps: [
      { action: 'validate', expect: 'refused' },
      { action: 'validate', fields: { parcel: 'x', proposedUse: 'x', description: 'x' }, documents: ['site-plan'], expect: 'consultation' },
      { action: 'close-consultation', fields: { consultationNotice: 'x' }, expect: 'assessment' },
      { action: 'grant', expect: 'granted' },
    ] },
    { name: 'refused', steps: [
      { action: 'validate', fields: { parcel: 'x', proposedUse: 'x', description: 'x' }, documents: ['site-plan'], expect: 'consultation' },
      { action: 'close-consultation', fields: { consultationNotice: 'x' }, expect: 'assessment' },
      { action: 'refuse', expect: 'not-granted' },
    ] },
  ],
};

export const REFERENCE_BUILDING_PERMIT: Ref = {
  ...base, key: 'building.permit', version: 1, title: 'Building permit: plans, decision, construction, inspections and occupancy', refPrefix: 'BLD',
  fields: [
    adm('parcel', 'Site: the parcel (its national parcel id or record number, from the register)'),
    adm('planningDecision', 'The planning decision it relies on (its number), where the law requires one'),
    adm('buildingCategory', 'Building category (one of the nation\'s)'),
    adm('buildingUse', 'Use (one of the nation\'s uses)'),
    adm('floorArea', 'Floor area (square metres)', 'number'),
    per('responsibleProfessionals', 'Responsible professionals: one per line, name | profession | registration number', 'longtext'),
    adm('complianceDeclarations', 'Technical compliance declarations given (one per line)', 'longtext'),
    adm('reviewFindings', 'Technical review: what the reviewers found', 'longtext'),
    adm('conditions', 'Conditions of the permit: one per line', 'longtext'),
    adm('commencementDate', 'Date construction commences', 'date'),
    adm('inspectionStage', 'Inspection stage (one of the nation\'s)'),
    adm('inspectionDate', 'Date of the inspection', 'date'),
    adm('inspectionFindings', 'Findings: one per line, checklist item | what was observed | severity', 'longtext'),
    adm('inspectionResult', 'Result of the inspection', 'choice', { options: RESULTS }),
    adm('stopGrounds', 'Grounds of the stop-work order (what was found, the provision breached, what must be done)', 'longtext'),
    adm('completionDate', 'Date the work was completed', 'date'),
  ],
  documents: [
    { class: 'design-documents', label: 'Plans and drawings (each version kept by its digest)', required: true, multiple: true },
    { class: 'technical-review', label: 'Structural or technical review report', required: false, multiple: true },
    { class: 'professional-declaration', label: 'Declaration of a responsible professional', required: false, multiple: true },
    { class: 'commencement-notice', label: 'Notice that construction commences', required: false },
    { class: 'inspection-evidence', label: 'Inspection evidence (photographs, measurements, test results)', required: false, multiple: true },
    { class: 'completion-documents', label: 'Completion documents (as-built drawings, certificates)', required: false, multiple: true },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'plan-review', label: 'Plans under technical review' }, { key: 'decision', label: 'Waiting for the decision' },
    { key: 'permitted', label: 'Permit granted (building approval)' }, { key: 'construction', label: 'Under construction' }, { key: 'variation', label: 'A changed design waits for its decision' },
    { key: 'stopped', label: 'Stopped by order' }, { key: 'completed', label: 'Completion notified' }, { key: 'occupancy-refused', label: 'Occupancy refused: further work and inspection' },
    { key: 'occupancy-certified', label: 'Occupancy certified', terminal: true }, { key: 'not-permitted', label: 'Permit refused, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'validate', label: 'Validate: the parcel, the planning decision relied on, the category and use, the plans attached', from: ['received'], to: 'plan-review', needs: { role: 'officer' }, requires: { fields: ['parcel', 'buildingCategory', 'buildingUse'], documents: ['design-documents'] }, effects: ['building.validate'] },
    { key: 'submit-plans', label: 'Record revised plans (a new design version)', from: ['plan-review'], to: 'plan-review', needs: { role: 'officer' }, requires: { documents: ['design-documents'], reasons: true }, effects: ['building.plans'] },
    { key: 'technical-review', label: 'Record the technical review, with its findings', from: ['plan-review'], to: 'decision', needs: { role: 'officer', assigned: true }, requires: { fields: ['reviewFindings'], reasons: true } },
    { key: 'grant', label: 'Grant the permit against the latest design version, with any conditions', from: ['decision'], to: 'permitted', decision: 'grant', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['technical-review'] }, requires: { reasons: true }, effects: ['building.grant'] },
    { key: 'refuse', label: 'Refuse the permit, with reasons and the appeal route', from: ['decision'], to: 'not-permitted', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['building.refuse'] },
    { key: 'commence', label: 'Record that construction commences', from: ['permitted'], to: 'construction', needs: { role: 'officer' }, requires: { fields: ['commencementDate'] }, effects: ['building.commence'] },
    { key: 'inspect', label: 'Record an inspection: findings with reasons (the inspector is the signed-in official)', from: ['construction'], to: 'construction', needs: { role: 'officer' }, requires: { fields: ['inspectionStage', 'inspectionResult'], reasons: true }, effects: ['building.inspect'] },
    { key: 'inspect-stopped', label: 'Record an inspection while work is stopped', from: ['stopped'], to: 'stopped', needs: { role: 'officer' }, requires: { fields: ['inspectionStage', 'inspectionResult'], reasons: true }, effects: ['building.inspect'] },
    { key: 'inspect-variation', label: 'Record an inspection while a changed design waits', from: ['variation'], to: 'variation', needs: { role: 'officer' }, requires: { fields: ['inspectionStage', 'inspectionResult'], reasons: true }, effects: ['building.inspect'] },
    { key: 'inspect-after-completion', label: 'Record the final inspection after completion', from: ['completed', 'occupancy-refused'], to: 'completed', needs: { role: 'officer' }, requires: { fields: ['inspectionStage', 'inspectionResult'], reasons: true }, effects: ['building.inspect'] },
    { key: 'stop-work', label: 'Order work to stop, citing the provision (with the review route)', from: ['construction'], to: 'stopped', decision: 'stop-work', needs: { role: 'signatory' }, requires: { fields: ['stopGrounds'], reasons: true, citations: true }, effects: ['building.stop'] },
    { key: 'lift-stop', label: 'Lift the stop-work order once the work is put right (a second official confirms)', from: ['stopped'], to: 'construction', decision: 'lift-stop', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['building.lift'] },
    { key: 'submit-variation', label: 'Submit a changed design: decided again, never added silently', from: ['construction'], to: 'variation', needs: { role: 'officer' }, requires: { documents: ['design-documents'], reasons: true }, effects: ['building.vary'] },
    { key: 'approve-variation', label: 'Approve the changed design', from: ['variation'], to: 'construction', decision: 'vary', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['building.approve-variation'] },
    { key: 'refuse-variation', label: 'Refuse the changed design: the approved one stands', from: ['variation'], to: 'construction', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['building.refuse-variation'] },
    { key: 'complete', label: 'Record completion of the work', from: ['construction'], to: 'completed', needs: { role: 'officer' }, requires: { fields: ['completionDate'], documents: ['completion-documents'] }, effects: ['building.complete'] },
    { key: 'certify-occupancy', label: 'Certify occupancy after the final inspection (a second official confirms)', from: ['completed'], to: 'occupancy-certified', decision: 'certify-occupancy', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['building.occupancy'] },
    { key: 'refuse-occupancy', label: 'Refuse occupancy, with reasons: what must be done first', from: ['completed'], to: 'occupancy-refused', decision: 'refuse-occupancy', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['building.refuse-occupancy'] },
    { key: 'withdraw', label: 'Withdrawn by the applicant', from: ['received', 'plan-review', 'decision'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'permitted, built, inspected and occupied', steps: [
      { action: 'validate', expect: 'refused' },
      { action: 'validate', fields: { parcel: 'x', buildingCategory: 'x', buildingUse: 'x' }, documents: ['design-documents'], expect: 'plan-review' },
      { action: 'technical-review', fields: { reviewFindings: 'x' }, expect: 'decision' },
      { action: 'grant', expect: 'permitted' },
      { action: 'commence', fields: { commencementDate: 'x' }, expect: 'construction' },
      { action: 'inspect', fields: { inspectionStage: 'x', inspectionResult: 'pass' }, expect: 'construction' },
      { action: 'stop-work', fields: { stopGrounds: 'x' }, expect: 'stopped' },
      { action: 'lift-stop', expect: 'construction' },
      { action: 'complete', fields: { completionDate: 'x' }, documents: ['completion-documents'], expect: 'completed' },
      { action: 'inspect-after-completion', expect: 'completed' },
      { action: 'certify-occupancy', expect: 'occupancy-certified' },
    ] },
    { name: 'refused', steps: [
      { action: 'validate', fields: { parcel: 'x', buildingCategory: 'x', buildingUse: 'x' }, documents: ['design-documents'], expect: 'plan-review' },
      { action: 'technical-review', fields: { reviewFindings: 'x' }, expect: 'decision' },
      { action: 'refuse', expect: 'not-permitted' },
    ] },
  ],
};

export const BUILDING_PROCEDURES: Ref[] = [REFERENCE_PLANNING_APPLICATION, REFERENCE_BUILDING_PERMIT];

export function installBuildingProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of BUILDING_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}
