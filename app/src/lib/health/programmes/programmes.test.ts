// The register of public-health programmes and its procedures (Health I4
// dependency public-health-programmes): programmes established, amended,
// suspended and closed by two officials with eligibility cited from the laws
// register; interventions only under the nation's adopted rules (CFG-PH-003)
// in production; aggregate returns by area and period with reported,
// suspected, confirmed and modelled counts kept apart, small cells suppressed
// by the nation's threshold, and only counted observations reaching the twin
// through a registered source; a risk communication approved by two officials
// and released exactly as approved. Every decision step classified under a
// proposed, unapproved mapping and refused in production until approved.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, attach, getCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { resetPermitAuthorities, installProposedDefaults, listMappings, mappingInForce } = await import('@/lib/permits/authority');
const { classifyDecision, checkDecision } = await import('@/lib/permits/decisions');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetTwin, syncRegister, regionEntities, signalFor } = await import('@/lib/twin/register');
const { PRODUCT_PROCEDURES } = await import('@/lib/health/products/procedures');
const { resetProducts } = await import('@/lib/health/products/register');
const { PROGRAMME_PROCEDURES, PROGRAMME_PERMITS } = await import('./procedures');
const { resetProgrammes, getProgramme, interventionOfCase, returnOfCase, getReturn, listPublishedReturns, proposeInterventionRules, confirmInterventionRules, interventionRules, recordIntervention } = await import('./register');
const { resetSmallCells, proposeSmallCellRule, confirmSmallCellRule, smallCellRule } = await import('@/lib/health/small-cells');
const { programmeTwinRows, publishProgrammeReturns, metricId } = await import('./twin');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof PROGRAMME_PROCEDURES)[number];

let PH = '', MED = '', OTHER = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const ph = at(() => PH), med = at(() => MED), other = at(() => OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor = ph('clerk')) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const decide = async (id: string, action: string, reason: string, fields: Record<string, unknown> = {}, who: (id: string, role: 'signatory') => Actor = ph) => {
  const first = await step(id, action, who('s1', 'signatory'), { reason, fields });
  expect(first).toMatchObject({ pending: true });
  return step(id, action, who('s2', 'signatory'));
};

/** The nation's lists (none ship), as the drafting official enters them. */
const LISTS: Record<string, string[]> = {
  'public-health.country.intervention_kinds': ['vector-control', 'mass-campaign'], 'public-health.country.communication_audiences': ['general-public'],
  'public-health.country.communication_channels': ['radio', 'website'],
};
const nation = <P extends Ref>(p: P): P => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};
const approveAll = (list: Ref[]) => {
  for (const p of list) {
    const d = draftPackage(nation(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
    const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
  }
};
let law = { instrument: '', eId: 'sec_5' };
let reporter = '', product = '';

/** A decided product on the register of medicines and medical devices (a supply item names it). */
async function authorisedProduct(): Promise<string> {
  const holder = (createOrganisation({ name: 'Sample Vaccines Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
  const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Sample vaccine', strength: '0.5 ml' } }, med('clerk')) as { id: string };
  doc(c.id, 'application-form', med('clerk')); await step(c.id, 'register', med('clerk'));
  doc(c.id, 'dossier', med('clerk')); await step(c.id, 'record-dossier', med('clerk'));
  doc(c.id, 'assessment-report', med('clerk')); await step(c.id, 'assess', med('clerk'), { reason: 'Benefits outweigh risks' });
  const r = await decide(c.id, 'authorise', 'Quality, safety and efficacy shown', {}, med);
  return (r.decision!.content.facts as { product: string }).product;
}
const TERMS = () => ({
  title: 'Sample immunisation programme', eligibilityLaw: law.instrument, eligibilityProvision: law.eId, eligibilityNote: 'Children under the age the Act sets',
  coverageDefinition: 'Children who completed the schedule', denominator: 'Children of the eligible age', denominatorSource: 'Civil register, births by region, 2026-06-30',
  budgetReference: 'BUD-PH-01', reportingPeriod: 'quarter', indicators: 'sessions.planned\nsessions.held\ndoses.administered\nsupply.received\ncases',
  areas: ['North', 'South'], supplyItems: `${product}|doses`,
});
async function establish(): Promise<string> {
  const c = openCase({ procedure: 'public-health.programme', fields: TERMS() }, ph('clerk')) as { id: string };
  doc(c.id, 'programme-proposal'); await step(c.id, 'register', ph('clerk'));
  await step(c.id, 'propose', ph('clerk'), { reason: 'Proposal complete' });
  const r = await decide(c.id, 'establish', 'Programme established under section 5');
  return (r.decision!.content.facts as { programme: string }).programme;
}
async function returnCase(programme: string, counts: unknown[], extra: Record<string, unknown> = {}) {
  const c = openCase({ procedure: 'public-health.programme-return', fields: { reporter, programme, area: 'North', period: { from: '2026-07-01', to: '2026-09-30' }, counts, complete: true, method: 'Facility tally sheets', ...extra } }, ph('clerk')) as { id: string };
  doc(c.id, 'return-form'); await step(c.id, 'register', ph('clerk'));
  await step(c.id, 'accept', ph('clerk'), { reason: 'Validated against the tally sheets' });
  return returnOfCase(c.id)!;
}

describe('public-health programmes, interventions, returns and risk communications', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetProducts, resetProgrammes, resetSmallCells, resetPermitAuthorities, resetLaw, resetTwin]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [PH, MED, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { publicHealth: PH, medicinesRegulation: MED, healthRegulation: OTHER } } }, 'Administrator');
    await syncRegister();
    approveAll(PRODUCT_PROCEDURES.filter(p => p.key === 'medicines.authorisation') as Ref[]);
    approveAll(PROGRAMME_PROCEDURES);
    const v = recordVersion({ instrument: { title: 'Public Health Act', type: 'act', jurisdiction: 'xx', year: 2020, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_5', num: '5', text: 'Programmes and their eligibility.' }, { eId: 'sec_9', num: '9', text: 'Interventions.' }], source: { kind: 'sample' } }, 'Recorder', 'rec') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(v.instrument.id, v.version.id, 'Confirmer', 'conf');
    law = { instrument: v.instrument.id, eId: 'sec_5' };
    reporter = (createOrganisation({ name: 'North District Clinic', kind: 'hospital', region: 'North' }, 'c', 'Registrar') as { number: string }).number;
    product = await authorisedProduct();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('establishes a programme with its terms, then amends, suspends, reinstates and closes it by two officials, keeping every version', async () => {
    const number = await establish();
    expect(number).toMatch(/^PHP-\d{4}-\d{6}$/);
    const p = getProgramme(number)!;
    const t = p.versions[0]!.terms;
    // Programme identifier, approved eligibility (cited), coverage definition with its documented denominator, budget reference, reporting period (S2-C.2-16).
    expect(t.eligibility.basis[0]).toMatchObject({ instrument: law.instrument, eId: 'sec_5', num: '5' });
    expect(t.coverage).toEqual({ definition: 'Children who completed the schedule', denominator: 'Children of the eligible age', denominatorSource: 'Civil register, births by region, 2026-06-30' });
    expect(t).toMatchObject({ budgetReference: 'BUD-PH-01', reportingPeriod: 'quarter', areas: ['North', 'South'], supplyItems: [{ id: `${product}|doses`, product, unit: 'doses' }] });
    expect(p.history[0]).toMatchObject({ state: 'established', decision: expect.any(String) });
    // A supply item is a decided product of the medicines register, never typed in.
    const bad = openCase({ procedure: 'public-health.programme', fields: { ...TERMS(), title: 'Another', supplyItems: 'PRD-1999-000001|doses' } }, ph('clerk')) as { id: string };
    doc(bad.id, 'programme-proposal');
    expect(await act(bad.id, { action: 'register' }, ph('clerk'))).toMatchObject({ error: expect.stringMatching(/not a decided product/) });
    // A denominator without its documented source is refused.
    const bad2 = openCase({ procedure: 'public-health.programme', fields: { ...TERMS(), title: 'Third', denominatorSource: '' } }, ph('clerk')) as { id: string };
    doc(bad2.id, 'programme-proposal');
    expect(await act(bad2.id, { action: 'register' }, ph('clerk'))).toMatchObject({ error: expect.stringMatching(/documented source of the coverage denominator/) });
    // Another institution cannot open it.
    expect(openCase({ procedure: 'public-health.programme', fields: TERMS() }, other('clerk'))).toHaveProperty('error');

    const change = async (action: string, reason: string, fields: Record<string, unknown> = {}) => {
      const c = openCase({ procedure: 'public-health.programme-change', fields: { programme: number, ...fields } }, ph('clerk')) as { id: string };
      doc(c.id, 'change-request'); await step(c.id, 'register', ph('clerk'));
      await step(c.id, 'propose', ph('clerk'), { reason: 'Reviewed' });
      return { id: c.id, r: await decide(c.id, action, reason) };
    };
    await change('amend', 'A new indicator', { indicators: 'sessions.planned\nsessions.held\ndoses.administered\nsupply.received\ncases\ndoses.wasted' });
    expect(getProgramme(number)!.versions).toHaveLength(2);
    expect(getProgramme(number)!.versions[1]!.terms.indicators).toContain('doses.wasted');
    expect(getProgramme(number)!.versions[0]!.terms.indicators).not.toContain('doses.wasted');
    const s = await change('suspend', 'Supply interrupted');
    expect(getProgramme(number)!.state).toBe('suspended');
    await step(s.id, 'reinstate', ph('s1', 'signatory'), { reason: 'Supply restored' });
    await step(s.id, 'reinstate', ph('s2', 'signatory'));
    expect(getProgramme(number)!.state).toBe('established');
    await change('close', 'Programme completed');
    expect(getProgramme(number)!.state).toBe('closed');
    expect(getProgramme(number)!.history.map(h => h.state)).toEqual(['established', 'established', 'suspended', 'established', 'closed']);
    expect(getProgramme(number)!.history.every(h => h.decision)).toBe(true);
  });

  it('classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one', async () => {
    installProposedDefaults('Administrator');
    expect(PROGRAMME_PERMITS).toEqual({ 'public-health.programme': 'public-health-programme', 'public-health.programme-change': 'public-health-programme', 'public-health.intervention': 'public-health-intervention', 'public-health.risk-communication': 'public-health-communication' });
    for (const p of PROGRAMME_PROCEDURES) {
      const decisions = p.actions.filter(a => a.decision);
      if (p.key === 'public-health.programme-return') { expect(decisions, 'a return is validated and accepted, never decided').toEqual([]); continue; }
      const t = PROGRAMME_PERMITS[p.key]!;
      const m = listMappings(t);
      expect(m, t).toHaveLength(1);
      expect(m[0], t).toMatchObject({ state: 'draft', proposal: true, lead: 'publicHealth', legalBasis: [] });
      expect(mappingInForce(t), t).toBeUndefined();
      expect(decisions.length, p.key).toBeGreaterThan(0);
      for (const a of decisions) expect(classifyDecision({ fields: {} } as never, a as never, { key: p.key }), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: t });
      // No period, fee or outcome list typed.
      expect(p.fields.filter(f => f.type === 'money' || f.type === 'number'), p.key).toEqual([]);
      for (const d of p.deadlines) expect(d.days ?? d.sampleDays, `${p.key} ${d.key}`).toBeUndefined();
      for (const f of p.fields.filter(x => x.type === 'enum')) expect(['configured', 'regions'], `${p.key} ${f.key}`).toContain(f.valuesSource!.kind);
    }
    vi.stubEnv('CIVICOS_MODE', 'production');
    for (const p of PROGRAMME_PROCEDURES) for (const a of p.actions.filter(x => x.decision)) {
      expect(checkDecision({ owner: PH, fields: {} } as never, a as never, { ...p, state: 'approved' } as never, new Date()), `${p.key} ${a.key}`).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs/) });
    }
  });

  it('decides an intervention only under the nation\'s adopted rule in production, with the review and expiry the rule requires; never a person', async () => {
    const pkg = PROGRAMME_PROCEDURES.find(p => p.key === 'public-health.intervention')!;
    expect(pkg.fields.filter(f => f.type === 'person' || f.type === 'party' || f.personalDataClass === 'personal')).toEqual([]);
    // The rules ship empty: production refuses an intervention no adopted rule covers.
    expect(interventionRules()).toEqual({ rules: [], version: 0 });
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(recordIntervention({ kind: 'vector-control', areas: ['North'], measure: 'Indoor spraying in the district', from: '2026-11-01' }, 'case-x', 'Official', { required: true })).toMatchObject({ error: expect.stringMatching(/No intervention authority rule for vector-control is adopted/) });
    vi.unstubAllEnvs();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    // Two officials adopt the rules, citing the law.
    expect(proposeInterventionRules([{ kind: 'vector-control', authority: 'publicHealth', reviewRequired: true, expiryRequired: true }], [{ instrument: law.instrument, eId: 'sec_9' }], 'Admin A', 'admin-a')).not.toHaveProperty('error');
    expect(confirmInterventionRules('Admin A', 'admin-a')).toHaveProperty('error');
    expect(confirmInterventionRules('Admin B', 'admin-b')).not.toHaveProperty('error');
    expect(interventionRules()).toMatchObject({ version: 1, rules: [{ kind: 'vector-control', authority: 'publicHealth' }] });
    // The rule requires an expiry and a review date.
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(recordIntervention({ kind: 'vector-control', areas: ['North'], measure: 'Indoor spraying in the district', from: '2026-11-01' }, 'case-y', 'Official', { required: true })).toMatchObject({ error: expect.stringMatching(/expiry date/) });
    expect(recordIntervention({ kind: 'mass-campaign', areas: ['North'], measure: 'A measure for the area', from: '2026-11-01', to: '2026-12-01', reviewBy: '2026-11-15' }, 'case-z', 'Official', { required: true })).toMatchObject({ error: expect.stringMatching(/No intervention authority rule for mass-campaign/) });
    vi.unstubAllEnvs();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    // Through the procedure: authorised by two officials, reviewed with reasons, ended by decision.
    const c = openCase({ procedure: 'public-health.intervention', fields: { kind: 'vector-control', areas: ['North'], measure: 'Indoor residual spraying of homes in the district', effective: { from: '2026-11-01', to: '2027-01-31' }, reviewBy: '2026-12-15' } }, ph('clerk')) as { id: string };
    doc(c.id, 'evidence'); await step(c.id, 'register', ph('clerk'));
    doc(c.id, 'legal-assessment'); await step(c.id, 'propose', ph('clerk'), { reason: 'Within section 9' });
    const d = await decide(c.id, 'authorise', 'Confirmed counts rising in the district');
    expect(getDecision(d.decision!.id)!.content.authority).toMatchObject({ permitType: 'public-health-intervention' });
    expect(interventionOfCase(c.id)).toMatchObject({ kind: 'vector-control', areas: ['North'], rule: { version: 1, reviewRequired: true, expiryRequired: true }, state: 'in-force', decision: d.decision!.id });
    doc(c.id, 'review-report'); await step(c.id, 'record-review', ph('clerk'), { reason: 'Counts falling; continue to the expiry' });
    expect(interventionOfCase(c.id)!.reviews).toHaveLength(1);
    await decide(c.id, 'end', 'No longer needed');
    expect(interventionOfCase(c.id)!.state).toBe('ended');
    // A person field is refused by the approved scope wherever it is drafted.
    expect(draftPackage({ ...nation(pkg), version: 2, fields: [...pkg.fields, { key: 'patientName', label: 'Name', type: 'text' }] } as never, 'Author', 'author', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
  });

  it('records aggregate returns by area and period, keeps reported, suspected, confirmed and modelled counts apart, never reads a missing count as zero, and keeps corrected versions', async () => {
    const number = await establish();
    const r = await returnCase(number, [
      { indicator: 'cases', basis: 'reported', quality: 'counted', value: 41 },
      { indicator: 'cases', basis: 'suspected', quality: 'counted', value: 17 },
      { indicator: 'cases', basis: 'confirmed', quality: 'counted', value: 3 },
      { indicator: 'cases', basis: 'modelled', quality: 'estimated', value: 60 },
      { indicator: 'sessions.held', basis: 'reported', quality: 'not-available' },
      { indicator: 'supply.received', supplyItem: `${product}|doses`, basis: 'reported', quality: 'counted', value: 1200 },
    ]);
    expect(r.number).toMatch(/^PHR-\d{4}-\d{6}$/);
    expect(r.versions[0]!.entries.map(e => e.basis)).toEqual(['reported', 'suspected', 'confirmed', 'modelled', 'reported', 'reported']);
    // A count not available has no value: never a zero.
    expect(r.versions[0]!.entries[4]).not.toHaveProperty('value');
    const refuse = async (counts: unknown[], why: RegExp) => {
      const c = openCase({ procedure: 'public-health.programme-return', fields: { reporter, programme: number, area: 'South', period: { from: '2026-07-01', to: '2026-09-30' }, counts } }, ph('clerk')) as { id: string } | { error: string };
      if ('error' in c) { expect(c.error).toMatch(why); return; }
      doc(c.id, 'return-form');
      expect(await act(c.id, { action: 'register' }, ph('clerk'))).toMatchObject({ error: expect.stringMatching(why) });
    };
    await refuse([{ indicator: 'cases', basis: 'reported', quality: 'counted', value: 2.5 }], /whole number/);
    await refuse([{ indicator: 'cases', basis: 'reported', quality: 'not-available', value: 0 }], /never a zero/);
    await refuse([{ indicator: 'cases', basis: 'reported', quality: 'counted' }], /mark it not available/);
    await refuse([{ indicator: 'unknown.indicator', basis: 'reported', quality: 'counted', value: 1 }], /not an indicator/);
    await refuse([{ indicator: 'cases', basis: 'probable', quality: 'counted', value: 1 }], /reported, suspected, confirmed, modelled|one of/);
    // A correction is a new version; the original is kept.
    const c = await returnCase(number, [{ indicator: 'cases', basis: 'confirmed', quality: 'counted', value: 4 }], { corrects: r.number });
    expect(c.number).toBe(r.number);
    expect(getReturn(r.number)!.versions.map(v => v.n)).toEqual([1, 2]);
    expect(getReturn(r.number)!.versions[0]!.entries).toHaveLength(6);
    expect(getReturn(r.number)!.versions[1]!.corrects).toBe(r.number);
  });

  it('suppresses small cells by the nation\'s threshold, publishes nothing before one is adopted, and puts only counted observations into the twin through a registered source', async () => {
    const number = await establish();
    await returnCase(number, [
      { indicator: 'cases', basis: 'reported', quality: 'counted', value: 41 },
      { indicator: 'cases', basis: 'confirmed', quality: 'counted', value: 3 },
      { indicator: 'cases', basis: 'suspected', quality: 'counted', value: 0 },
      { indicator: 'cases', basis: 'modelled', quality: 'estimated', value: 60 },
      { indicator: 'sessions.held', basis: 'reported', quality: 'not-available' },
    ]);
    // No threshold adopted: nothing is published, and nothing reaches the twin.
    expect(smallCellRule()).toBeNull();
    expect(listPublishedReturns()[0]!.counts.map(c => c.cell)).toEqual([{ suppressed: 'no-threshold' }, { suppressed: 'no-threshold' }, { suppressed: 'no-threshold' }, { suppressed: 'no-threshold' }, { missing: true }]);
    expect(programmeTwinRows()).toEqual([]);
    expect(await publishProgrammeReturns('Officer')).toEqual({ published: false });
    // Two officials adopt the threshold, citing the law.
    expect(proposeSmallCellRule(5, [{ instrument: law.instrument, eId: 'sec_5' }], 'Admin A', 'admin-a')).not.toHaveProperty('error');
    expect(confirmSmallCellRule('Admin A', 'admin-a')).toHaveProperty('error');
    expect(confirmSmallCellRule('Admin B', 'admin-b')).not.toHaveProperty('error');
    const pub = listPublishedReturns()[0]!;
    expect(pub.rule).toEqual({ threshold: 5, version: 1 });
    expect(pub.counts.map(c => [c.basis, c.cell])).toEqual([
      ['reported', { value: 41 }], ['confirmed', { suppressed: 'below-threshold' }], ['suspected', { value: 0 }], ['modelled', { value: 60 }], ['reported', { missing: true }],
    ]);
    expect(JSON.stringify(pub)).not.toMatch(/"value":3\b/);
    // The twin: counted, unsuppressed, non-modelled counts only, each class its own metric, from a registered source's run.
    const rows = programmeTwinRows();
    expect(rows.map(r => [r.metric, r.region, r.value])).toEqual([
      [metricId(`public_health.${number}.cases.reported`), 'North', 41], [metricId(`public_health.${number}.cases.suspected`), 'North', 0],
    ]);
    const run = await publishProgrammeReturns('Officer', false, new Date('2026-10-20T00:00:00Z'));
    expect(run, JSON.stringify(run)).toMatchObject({ published: true, accepted: 2 });
    const north = regionEntities().find(e => e.name === 'North')!;
    expect(signalFor(north.id, metricId(`public_health.${number}.cases.reported`))).toMatchObject({ value: 41 });
    expect(signalFor(north.id, metricId(`public_health.${number}.cases.confirmed`))).toBeNull();
    expect(signalFor(north.id, metricId(`public_health.${number}.cases.modelled`))).toBeNull();
  });

  it('approves a risk communication by two officials and releases it only exactly as approved', async () => {
    const message = 'Boil drinking water in the northern districts until further notice.';
    const open = () => openCase({ procedure: 'public-health.risk-communication', fields: { message, audience: 'general-public', channels: ['radio'], areas: ['North'], evidenceBasis: 'Confirmed counts rising (aggregate, by district)' } }, ph('clerk')) as { id: string };
    const c = open();
    doc(c.id, 'draft-message'); await step(c.id, 'register', ph('clerk'));
    doc(c.id, 'evidence'); await step(c.id, 'propose', ph('clerk'), { reason: 'Evidence supports it' });
    // The release waits for approval; one official alone does not approve.
    expect(await act(c.id, { action: 'release' }, ph('clerk'))).toHaveProperty('error');
    const d = await decide(c.id, 'approve', 'Approved for release');
    expect(getDecision(d.decision!.id)!.content).toMatchObject({ decision: 'approve-message', authority: { permitType: 'public-health-communication' }, facts: { messageDigest: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    expect(getDecision(d.decision!.id)!.content.officials.map(o => o.name)).toEqual(['Official s1', 'Official s2']);
    // Changed after approval: refused.
    expect(await act(c.id, { action: 'release', fields: { message: `${message} Updated.` } }, ph('clerk'))).toMatchObject({ error: expect.stringMatching(/released only exactly as approved/) });
    const ok = await step(c.id, 'release', ph('clerk'), { fields: { message } });
    expect(ok.case.stage).toBe('released');
    expect(getCase(c.id)!.stage).toBe('released');
  });
});
