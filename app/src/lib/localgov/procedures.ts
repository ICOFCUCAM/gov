// Local and regional government procedures (plan step I7; specification
// Part 3 §C.9; supplement Part 19 LRG-ORG-004, 005, LRG-FIN-008, LRG-SVC-013,
// 014). Templates each local government adopts as its own
// (lg.<template>.<institution>, installLocalGovernmentProcedures()), drafted
// by one of its officials and approved by another: the owner is the
// institution itself, never a slot or a ministry, and only an institution of
// standing `subnational` adopts them. Its own officials work the cases; the
// whole government's officials and administrators have no authority there
// (caseActRefusal(): a subnational institution is outside whole-government
// reach), and the centre reads a case only under an approved relationship.
//
//   lg.resolution  a council resolution: the vote recorded, checked against the council's rules in force
//                  (quorum, then the majority), certified by two officials with the signed minutes
//   lg.budget      the local budget: revenue, expenditure and capital lines entered by officials in whole
//                  minor units (no figure ships), adopted by two officials on a certified resolution
//   lg.service     a local public service request: the place recorded (a point checked against the map, or a
//                  region of the nation), triaged, resolved with reasons
//   lg.complaint   a local complaint or grievance: the same, closed with a decision and reasons
//
// No day count ships; service levels are the local government's own.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getMinistry } from '@/lib/data/store';
import { termsOf } from '@/lib/data/store/institutions';
import { placePoint } from '@/lib/data/facilities';
import { nationRegions } from '@/lib/nation/registry';
import {
  councilRules, checkVote, recordResolution, getResolution, adoptBudget, openRequest, closeRequest, requestOfCase, type BudgetLine, type Vote,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown) => (typeof v === 'number' ? v : Number(str(v)));
const sample = (c: Case) => c.source === 'sample';

/** The local government whose own procedure this is: a registered institution of standing `subnational`. */
function local(c: Case): { error: string } | null {
  const m = getMinistry(c.owner);
  if (!m) return { error: 'No such institution' };
  return termsOf(m).standing === 'subnational' ? null : { error: `${m.name} is not recorded as a regional or local government (standing subnational): these are a local government's own procedures` };
}

function vote(c: Case): { rules: NonNullable<ReturnType<typeof councilRules>>; vote: Vote; check: ReturnType<typeof checkVote> } | { error: string } {
  const rules = councilRules(c.owner);
  if (!rules) return { error: 'The council has no standing rules in force (seats, quorum, majority): two of its officials adopt them citing the law first' };
  const v: Vote = { present: int(c.fields.membersPresent), for: int(c.fields.votesFor), against: int(c.fields.votesAgainst), abstain: int(c.fields.abstentions || 0), recused: int(c.fields.recusals || 0) };
  return { rules, vote: v, check: checkVote(rules, v) };
}

registerEffect('lg.check-vote', ({ case: c }: EffectContext) => {
  const l = local(c);
  if (l) return l;
  const r = vote(c);
  if ('error' in r) return r;
  if ('error' in r.check) return r.check;
  return { facts: { quorate: r.check.quorate, carried: r.check.carried, required: r.check.required, present: r.vote.present } };
});

function settleResolution(carried: boolean) {
  return ({ case: c, now }: EffectContext) => {
    const l = local(c);
    if (l) return l;
    const r = vote(c);
    if ('error' in r) return r;
    if ('error' in r.check) return r.check;
    if (carried && !r.check.quorate) return { error: `${r.check.why}: a resolution is certified only when the meeting was quorate` };
    if (carried && !r.check.carried) return { error: `${r.check.why}: record it as not carried` };
    if (!carried && r.check.carried) return { error: 'The motion was carried on this vote: certify it' };
    const check = r.check;
    return {
      facts: { quorate: check.quorate, carried: check.carried, required: check.required, present: r.vote.present, for: r.vote.for, against: r.vote.against },
      rules: [{ key: `lg.council-rules.${c.owner}`, version: r.rules.version, digest: r.rules.digest }],
      after: (d: { id: string } | undefined, done: Case) => {
        if (!carried) return;
        const minutes = done.documents.at(-1);
        recordResolution({ council: c.owner, case: { id: c.id, ref: c.ref }, meeting: { id: str(c.fields.meetingId), date: str(c.fields.meetingDate) }, agendaItem: str(c.fields.agendaItem), text: str(c.fields.resolutionText),
          vote: r.vote, check, rules: { version: r.rules.version, digest: r.rules.digest }, conflicts: str(c.fields.conflictDeclarations).split('\n').map(x => x.trim()).filter(Boolean),
          ...(minutes ? { minutes } : {}), ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name, sample: sample(c) }, now);
      },
    };
  };
}
registerEffect('lg.certify', settleResolution(true));
registerEffect('lg.not-carried', settleResolution(false));

/** Budget lines as officials enter them: `line | amount in minor units`, one per line. */
function lines(v: unknown, what: string): BudgetLine[] | { error: string } {
  const out: BudgetLine[] = [];
  for (const [i, l] of str(v).split('\n').map(x => x.trim()).filter(Boolean).entries()) {
    const [line = '', amount = ''] = l.split('|').map(x => x.trim());
    const n = Number(amount);
    if (!line || !Number.isInteger(n) || n < 0) return { error: `${what} line ${i + 1}: name | a whole amount in minor units` };
    out.push({ line, amountMinor: n });
  }
  return out;
}
function budget(c: Case) {
  const revenue = lines(c.fields.revenueLines, 'Revenue'), expenditure = lines(c.fields.expenditureLines, 'Expenditure'), capital = lines(c.fields.capitalLines, 'Capital');
  for (const x of [revenue, expenditure, capital]) if ('error' in x) return x;
  const [rv, ex, cp] = [revenue, expenditure, capital] as BudgetLine[][];
  if (!rv!.length || !ex!.length) return { error: 'A budget has revenue and expenditure lines' };
  const sum = (xs: BudgetLine[]) => xs.reduce((n, x) => n + x.amountMinor, 0);
  return { revenue: rv!, expenditure: ex!, capital: cp!, totals: { revenue: sum(rv!), expenditure: sum(ex!), capital: sum(cp!), balance: sum(rv!) - sum(ex!) - sum(cp!) } };
}

registerEffect('lg.check-budget', ({ case: c }: EffectContext) => {
  const l = local(c);
  if (l) return l;
  const b = budget(c);
  return 'error' in b ? b : { facts: { revenue: b.totals.revenue, expenditure: b.totals.expenditure, capital: b.totals.capital, balance: b.totals.balance } };
});

registerEffect('lg.adopt-budget', ({ case: c, now }: EffectContext) => {
  const l = local(c);
  if (l) return l;
  const b = budget(c);
  if ('error' in b) return b;
  const res = getResolution(str(c.fields.approvalResolution));
  if (!res) return { error: 'Name the council resolution that approved the budget (its number): a budget is adopted on a certified resolution' };
  if (res.council !== c.owner) return { error: `Resolution ${res.number} is another council's` };
  const to = str(c.fields.submittedTo);
  if (to && !getMinistry(to)) return { error: `${to} is not a registered institution` };
  return {
    facts: { resolution: res.number, revenue: b.totals.revenue, expenditure: b.totals.expenditure, balance: b.totals.balance },
    after: (d: { id: string } | undefined) => { adoptBudget({ council: c.owner, case: { id: c.id, ref: c.ref }, fiscalYear: str(c.fields.fiscalYear), version: str(c.fields.budgetVersion), ...b, approvedBy: res.number, ...(to ? { submittedTo: to } : {}), ...(d ? { decision: d.id } : {}), sample: sample(c) }, now); },
  };
});

/** Where a request is: a point checked against the map (region and district derived, never typed), or one of the nation's regions. */
async function placeOf(c: Case): Promise<{ place: NonNullable<Parameters<typeof openRequest>[0]['place']> } | { error: string }> {
  const lng = c.fields.longitude, lat = c.fields.latitude;
  if (lng !== undefined && lng !== '' && lat !== undefined && lat !== '') {
    const p = await placePoint({ lng: Number(lng), lat: Number(lat), noun: 'place' });
    if (p.errors.length) return { error: p.errors[0]! };
    if (!p.place.inside) return { error: 'The place is outside the nation as the map draws it' };
    return { place: { ...(p.place.regionCode ? { regionCode: p.place.regionCode, region: p.place.region } : {}), ...(p.place.districtCode ? { districtCode: p.place.districtCode, district: p.place.district } : {}), point: [Number(lng), Number(lat)] } };
  }
  const region = str(c.fields.region);
  if (!region) return { error: 'Say where: a position on the map, or a region' };
  if (!nationRegions().includes(region)) return { error: `The region is one of the nation's: ${nationRegions().join(', ')}` };
  return { place: { region } };
}

function intake(kind: 'service' | 'complaint') {
  return async ({ case: c, now }: EffectContext) => {
    const l = local(c);
    if (l) return l;
    const p = await placeOf(c);
    if ('error' in p) return p;
    const service = str(c.fields.serviceCode);
    if (!service) return { error: 'Name the service concerned' };
    return { facts: { service, ...(p.place.region ? { region: p.place.region } : {}) }, after: () => { openRequest({ institution: c.owner, case: { id: c.id, ref: c.ref }, kind, service, place: p.place, sample: sample(c) }, now); } };
  };
}
registerEffect('lg.service-intake', intake('service'));
registerEffect('lg.complaint-intake', intake('complaint'));

function close(state: 'resolved' | 'closed') {
  return ({ case: c, now }: EffectContext) => {
    if (!requestOfCase(c.id)) return { error: 'The request has not been triaged' };
    return { after: (d: { id: string } | undefined, done: Case) => { const last = done.history.at(-1)!; closeRequest(c.id, state, { at: now.toISOString(), by: last.by.name, reasons: last.reason ?? '', ...(d ? { decision: d.id } : {}) }); } };
  };
}
registerEffect('lg.resolve', close('resolved'));
registerEffect('lg.close', close('closed'));

// ── Templates ────────────────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const per = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], owner: 'institution' };

export const LOCAL_GOVERNMENT_TEMPLATES: (Ref & { forms: string[] })[] = [
  {
    ...base, sensitivity: 'normal', retention: 'council-record', key: 'lg.resolution', version: 1, title: 'Council resolution', refPrefix: 'LRES', forms: ['LRG-ORG-005', 'LRG-ORG-004'],
    fields: [
      adm('meetingId', 'Meeting (its reference)'), adm('meetingDate', 'Date of the meeting', 'date'), adm('agendaItem', 'Agenda item'),
      adm('resolutionText', 'The resolution as moved', 'longtext'),
      adm('membersPresent', 'Members present', 'number'), adm('votesFor', 'Votes for', 'number'), adm('votesAgainst', 'Votes against', 'number'),
      adm('abstentions', 'Abstentions', 'number'), adm('recusals', 'Members who stepped aside (a declared interest)', 'number'),
      adm('conflictDeclarations', 'Declarations of interest recorded at the meeting (one per line)', 'longtext'),
    ],
    documents: [
      { class: 'agenda', label: 'The agenda and papers of the meeting', required: true },
      { class: 'signed-minutes', label: 'The signed minutes recording the vote', required: true },
    ],
    stages: [
      { key: 'moved', label: 'Moved at a meeting' }, { key: 'recorded', label: 'Vote recorded and checked against the council\'s rules' },
      { key: 'certified', label: 'Certified resolution of the council', terminal: true }, { key: 'not-carried', label: 'Recorded as not carried', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
    ],
    actions: [
      { key: 'record', label: 'Record the vote: quorum and majority checked against the council\'s rules in force', from: ['moved'], to: 'recorded', needs: { role: 'officer' }, requires: { fields: ['meetingId', 'agendaItem', 'resolutionText', 'membersPresent', 'votesFor', 'votesAgainst'], documents: ['agenda'] }, effects: ['lg.check-vote'] },
      { key: 'certify', label: 'Certify the resolution with the signed minutes (a second official confirms)', from: ['recorded'], to: 'certified', decision: 'certify-resolution', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['signed-minutes'], reasons: true }, effects: ['lg.certify'] },
      { key: 'record-not-carried', label: 'Record that the motion was not carried, or the meeting not quorate', from: ['recorded'], to: 'not-carried', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['lg.not-carried'] },
      { key: 'withdraw', label: 'Withdrawn before the vote', from: ['moved'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [
      { name: 'recorded and certified', steps: [
        { action: 'record', expect: 'refused' },
        { action: 'record', fields: { meetingId: 'x', agendaItem: 'x', resolutionText: 'x', membersPresent: 1, votesFor: 1, votesAgainst: 0 }, documents: ['agenda'], expect: 'recorded' },
        { action: 'certify', expect: 'refused' },
        { action: 'certify', documents: ['signed-minutes'], expect: 'certified' },
      ] },
      { name: 'not carried', steps: [
        { action: 'record', fields: { meetingId: 'x', agendaItem: 'x', resolutionText: 'x', membersPresent: 1, votesFor: 0, votesAgainst: 1 }, documents: ['agenda'], expect: 'recorded' },
        { action: 'record-not-carried', expect: 'not-carried' },
      ] },
    ],
  },
  {
    ...base, sensitivity: 'normal', retention: 'local-budget', key: 'lg.budget', version: 1, title: 'Local budget', refPrefix: 'LBUD', forms: ['LRG-FIN-008'],
    fields: [
      adm('fiscalYear', 'Fiscal year'), adm('budgetVersion', 'Budget version (e.g. original, first revision)'),
      adm('revenueLines', 'Revenue estimates: one per line, line | amount in minor units', 'longtext'),
      adm('expenditureLines', 'Expenditure estimates: one per line, line | amount in minor units', 'longtext'),
      adm('capitalLines', 'Capital projects: one per line, project | amount in minor units', 'longtext'),
      adm('approvalResolution', 'The council resolution that approved it (its number)'),
      adm('submittedTo', 'Institution it is submitted to as the law requires (its id; a reference only)'),
    ],
    documents: [{ class: 'budget-document', label: 'The budget as approved by the council', required: true }],
    stages: [
      { key: 'draft', label: 'Draft' }, { key: 'review', label: 'Lines checked' },
      { key: 'adopted', label: 'Adopted on a certified resolution', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
    ],
    actions: [
      { key: 'submit', label: 'Submit the lines for checking', from: ['draft'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['fiscalYear', 'budgetVersion', 'revenueLines', 'expenditureLines'] }, effects: ['lg.check-budget'] },
      { key: 'adopt', label: 'Adopt the budget on the council\'s certified resolution (a second official confirms)', from: ['review'], to: 'adopted', decision: 'adopt-budget', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['approvalResolution'], documents: ['budget-document'], reasons: true }, effects: ['lg.adopt-budget'] },
      { key: 'withdraw', label: 'Withdrawn', from: ['draft', 'review'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [
      { name: 'checked and adopted', steps: [
        { action: 'submit', expect: 'refused' },
        { action: 'submit', fields: { fiscalYear: 'x', budgetVersion: 'x', revenueLines: 'x', expenditureLines: 'x' }, expect: 'review' },
        { action: 'adopt', fields: { approvalResolution: 'x' }, documents: ['budget-document'], expect: 'adopted' },
      ] },
    ],
  },
  ...(['service', 'complaint'] as const).map(kind => ({
    ...base, sensitivity: kind === 'complaint' ? 'restricted' as const : 'normal' as const, retention: 'local-service-record', key: `lg.${kind}`, version: 1,
    title: kind === 'service' ? 'Local public service request' : 'Local complaint or grievance', refPrefix: kind === 'service' ? 'LSRV' : 'LCMP', forms: [kind === 'service' ? 'LRG-SVC-013' : 'LRG-SVC-014'],
    fields: [
      adm('serviceCode', 'Service concerned (the local government\'s own list)'),
      adm('longitude', 'Where: longitude (from the map or a device)', 'number'), adm('latitude', 'Where: latitude', 'number'),
      adm('region', 'Or the region (one of the nation\'s), where no position is given'),
      per('description', kind === 'service' ? 'What is needed' : 'What happened, and what the person asks', 'longtext'),
      adm('urgency', 'Urgency', 'choice', { options: ['routine', 'urgent', 'emergency'] }),
      adm('resolution', 'What was done', 'longtext'),
    ],
    documents: [{ class: 'evidence', label: 'Photographs or documents sent with it', required: false, multiple: true }],
    stages: [
      { key: 'received', label: 'Received' }, { key: 'in-progress', label: 'Triaged and assigned' },
      { key: 'resolved', label: kind === 'service' ? 'Resolved' : 'Upheld or resolved, with reasons', terminal: true }, { key: 'closed', label: 'Closed without action, with reasons', terminal: true },
    ],
    actions: [
      { key: 'triage', label: 'Triage: the place recorded, the service named, assigned', from: ['received'], to: 'in-progress', needs: { role: 'officer' as const }, requires: { fields: ['serviceCode', 'description'] }, effects: [kind === 'service' ? 'lg.service-intake' : 'lg.complaint-intake'] },
      { key: 'resolve', label: 'Resolved: what was done, with reasons', from: ['in-progress'], to: 'resolved', ...(kind === 'complaint' ? { decision: 'decide-complaint' } : {}), needs: { role: kind === 'complaint' ? 'signatory' as const : 'officer' as const }, requires: { fields: ['resolution'], reasons: true }, effects: ['lg.resolve'] },
      { key: 'close', label: 'Close without action, with reasons', from: ['in-progress'], to: 'closed', ...(kind === 'complaint' ? { decision: 'decide-complaint' } : {}), needs: { role: 'signatory' as const }, requires: { reasons: true }, effects: ['lg.close'] },
    ],
    tests: [
      { name: 'triaged and resolved', steps: [
        { action: 'triage', expect: 'refused' },
        { action: 'triage', fields: { serviceCode: 'x', description: 'x' }, expect: 'in-progress' },
        { action: 'resolve', fields: { resolution: 'x' }, expect: 'resolved' },
      ] },
    ],
  })),
];

/** The key of a local government's own adopted procedure: lg.<template>.<institution>. */
export const localKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** A local government adopts the templates as its own drafts (a different official of it approves each). */
export function installLocalGovernmentProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  if (termsOf(m).standing !== 'subnational') return { error: `${m.name} is not recorded as a regional or local government (standing subnational): its terms are changed through the institution register first` };
  const drafted: string[] = [], present: string[] = [];
  for (const t of LOCAL_GOVERNMENT_TEMPLATES) {
    const key = localKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _f, ...pkg } = t;
    void _f;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if (!('error' in d)) drafted.push(key);
  }
  return { drafted, present };
}
