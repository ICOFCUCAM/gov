// The medicines regulator's second set of procedures (Health I4 dependencies
// procedure-inspection, procedure-import-and-controlled, procedure-safety-intake,
// procedure-reconsideration; batch-2 forms HLT-MED-012, 013, 014, 015, 020,
// 023): corrective action tracked to closure against its inspection, import and
// controlled-medicine authorisation with customs kept apart and limits from the
// nation's rules, product-level safety intake assessed by an officer with
// reasons (never a score, never AI) that may refer the product to its own case
// or decide a safety alert, and reconsideration by officials other than those
// who decided. Every decision step classified under a proposed, unapproved
// mapping and refused in production until the nation approves one; no period,
// fee or outcome typed.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-plant-a' ? { id, state: 'published' } : undefined) }));
let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { openCase, act, attach, assign, getCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { resetPermitAuthorities, installProposedDefaults, listMappings, mappingInForce } = await import('@/lib/permits/authority');
const { classifyDecision, checkDecision } = await import('@/lib/permits/decisions');
const { listView } = await import('@/lib/casework/view');
const { isPersonalField } = await import('@/lib/forms/contract');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { callService, serviceDirectory } = await import('@/lib/exchange/services');
const { registerIntegration, listIntegrations } = await import('@/lib/data/store');
const { proposeIntegrationApproval, confirmIntegrationApproval } = await import('@/lib/data/store/federation');
const { resetExchangeLog } = await import('@/lib/exchange/log');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { PRODUCT_PROCEDURES, OVERSIGHT_PROCEDURES, PROCEDURE_PERMITS } = await import('./procedures');
const { resetProducts, getProduct } = await import('./register');
const { resetImports, importOfCase, getImportAuthorisation } = await import('./imports');
const { resetControlled, controlledOfCase, authoriseControlled, proposeControlledLimits, confirmControlledLimits, controlledLimits } = await import('./controlled');
const { resetNotices } = await import('./notices');
const casesRoute = await import('@/app/api/cases/[id]/route');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof PRODUCT_PROCEDURES)[number];

let MED = '', CTRL = '', OTHER = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const med = at(() => MED), ctrl = at(() => CTRL), other = at(() => OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor = med('clerk')) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const decide = async (id: string, action: string, reason: string, fields: Record<string, unknown> = {}, who: (id: string, role: 'signatory') => Actor = med) => {
  const first = await step(id, action, who('s1', 'signatory'), { reason, fields });
  expect(first).toMatchObject({ pending: true });
  return step(id, action, who('s2', 'signatory'));
};

/** The nation's version: its day counts and the lists it configures (none ship), as the drafting official enters them. */
const LISTS: Record<string, string[]> = {
  'medicines.country.entry_points': ['port-a'], 'medicines.country.controlled_schedules': ['schedule-ii'], 'medicines.country.controlled_activities': ['import'],
  'medicines.country.recall_classes': ['class-1'], 'medicines.country.safety_concern_kinds': ['quality-defect'], 'medicines.country.device_incident_kinds': ['malfunction'],
  'medicines.country.reporter_kinds': ['pharmacist'],
};
const nation = (p: Ref) => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};

let holder = '', importer = '', product = '', authCase = '', inspection = '';

async function authorise(name: string): Promise<{ number: string; caseId: string }> {
  const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: name, strength: '200 mg' } }, med('clerk')) as { id: string };
  doc(c.id, 'application-form'); await step(c.id, 'register', med('clerk'));
  doc(c.id, 'dossier'); await step(c.id, 'record-dossier', med('clerk'));
  doc(c.id, 'assessment-report'); await step(c.id, 'assess', med('clerk'), { reason: 'Benefits outweigh risks' });
  const r = await decide(c.id, 'authorise', 'Quality, safety and efficacy shown');
  return { number: (r.decision!.content.facts as { product: string }).product, caseId: c.id };
}
/** A licence of the medicines authority's register types, through its own procedure; returns the case (with its inspection report). */
async function licence(procedure: string, org: string, extra: Record<string, unknown> = {}): Promise<string> {
  const c = openCase({ procedure, fields: { organisation: org, ...extra } }, med('clerk')) as { id: string };
  await step(c.id, 'check', med('clerk'));
  doc(c.id, 'premises-evidence'); doc(c.id, 'fee-receipt');
  await step(c.id, 'inspect', med('clerk'));
  doc(c.id, 'inspection-report'); await step(c.id, 'inspected', med('clerk'));
  await decide(c.id, 'grant', 'Licensed');
  return getCase(c.id)!.ref;
}

describe('corrective action, import and controlled-medicine authorisation, safety intake and reconsideration', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetProducts, resetImports, resetControlled, resetNotices, resetPermitAuthorities, resetAccessLog, resetExchangeLog, resetLaw]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [MED, CTRL, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { medicinesRegulation: MED, controlledSubstances: CTRL, healthRegulation: OTHER } } }, 'Administrator');
    for (const p of PRODUCT_PROCEDURES) {
      const d = draftPackage(nation(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    holder = (createOrganisation({ name: 'Sample Pharma Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
    importer = (createOrganisation({ name: 'Sample Importers Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
    ({ number: product, caseId: authCase } = await authorise('Sampleprofen'));
    inspection = await licence('medicines.manufacturer', holder, { campuses: 'site-plant-a' });
    await licence('medicines.importer', importer);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('tracks a corrective action plan to closure, linked to its inspection, against the period the nation sets', async () => {
    // A plan answers a recorded inspection of the medicines authority: an unknown case, or one without an inspection report, is refused.
    const bad = openCase({ procedure: 'medicines.corrective-action', fields: { site: holder, inspection: 'MML-1999-000999' } }, med('clerk')) as { id: string };
    doc(bad.id, 'corrective-action-plan');
    expect(await act(bad.id, { action: 'register' }, med('clerk'))).toMatchObject({ error: expect.stringMatching(/No inspection case/) });
    const c = openCase({ procedure: 'medicines.corrective-action', fields: { site: holder, inspection, findings: 'FINDING-RESTRICTED' } }, med('clerk')) as { id: string };
    doc(c.id, 'corrective-action-plan');
    const reg = await step(c.id, 'register', med('clerk'));
    expect(reg.case.stage).toBe('review');
    await step(c.id, 'request-revision', med('clerk'), { reason: 'Dates missing for finding 2' });
    doc(c.id, 'corrective-action-plan'); await step(c.id, 'record-revision', med('clerk'));
    // The regulator accepts the plan: that act starts the deadline, counted with the nation's day count (the reference ships none).
    const accepted = await step(c.id, 'accept-plan', med('s1', 'signatory'), { reason: 'Actions answer each finding' });
    expect(accepted.decision!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'good-practice-corrective-action' });
    expect(accepted.case.deadlines.map(d => d.key)).toEqual(['corrective-actions']);
    expect(OVERSIGHT_PROCEDURES.find(p => p.key === 'medicines.corrective-action')!.deadlines[0]!.days).toBeUndefined();
    doc(c.id, 'progress-report'); await step(c.id, 'record-progress', med('clerk'));
    doc(c.id, 'completion-evidence'); await step(c.id, 'report-completion', med('clerk'));
    const closed = await decide(c.id, 'close', 'All actions verified at the follow-up visit');
    expect(closed.case).toMatchObject({ stage: 'closed', closedAt: expect.any(String) });
    expect(closed.case.deadlines[0]!.met).toBeTruthy();
    expect(getDecision(closed.decision!.id)!.content.facts).toMatchObject({ site: holder, inspection });
  });

  it('authorises an import for a licensed importer, an authorised product, a quantity and a point of entry; customs learns only whether it is valid', async () => {
    // An organisation without the importers' licence is refused.
    const c0 = openCase({ procedure: 'medicines.import-authorisation', fields: { importer: holder, product, quantity: { amount: 500, unit: 'packs' } } }, med('clerk')) as { id: string };
    doc(c0.id, 'application-form');
    expect(await act(c0.id, { action: 'register' }, med('clerk'))).toMatchObject({ error: expect.stringMatching(/no granted standing in the register of licensed importers/) });
    const c = openCase({ procedure: 'medicines.import-authorisation', fields: { importer, product, quantity: { amount: 500, unit: 'packs' }, customsDeclaration: 'CUS-2026-000001', supplier: 'SUPPLIER-CONFIDENTIAL' } }, med('clerk')) as { id: string };
    doc(c.id, 'application-form'); await step(c.id, 'register', med('clerk'));
    doc(c.id, 'assessment-report'); await step(c.id, 'propose', med('clerk'), { reason: 'GDP-compliant supplier' });
    // The point of entry is the nation's list (shipped empty): the decision needs one from it.
    expect(await act(c.id, { action: 'authorise', reason: 'x' }, med('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Point of entry is needed/) });
    expect(await act(c.id, { action: 'authorise', reason: 'x', fields: { entryPoint: 'harbour-z' } }, med('s1', 'signatory'))).toHaveProperty('error');
    const first = await step(c.id, 'authorise', med('s1', 'signatory'), { reason: 'Authorised for one consignment', fields: { entryPoint: 'port-a', validUntil: '2031-01-31' } });
    expect(first).toMatchObject({ pending: true });
    expect(importOfCase(c.id)).toBeUndefined();
    const r = await step(c.id, 'authorise', med('s2', 'signatory'));
    const a = importOfCase(c.id)!;
    expect(a).toMatchObject({ importer, product, quantity: { amount: 500, unit: 'packs' }, entryPoint: 'port-a', customsDeclaration: 'CUS-2026-000001', decision: r.decision!.id });
    expect(a.number).toMatch(/^MIA-\d{4}-\d{6}$/);
    expect(getDecision(r.decision!.id)!.content.authority).toMatchObject({ permitType: 'medicine-import-authorisation' });
    // Customs: the service is in the directory, ships no approved caller, and answers only valid and until when.
    expect(serviceDirectory().find(s => s.id === 'product.import-authorisation')).toMatchObject({ owner: 'medicinesRegulation', returns: { valid: expect.any(String), validUntil: expect.any(String) } });
    expect(listIntegrations().filter(i => i.status === 'approved' && i.scopes.includes('service:product.import-authorisation'))).toEqual([]);
    const reg = registerIntegration({ kind: 'integration', name: `Customs ${Date.now()}`, ownerOrg: 'Customs', contact: 'ops@example.gov', scopes: ['service:product.import-authorisation'] });
    if ('error' in reg) throw new Error(reg.error);
    const customs = { kind: 'integration' as const, id: reg.id, name: 'Customs' };
    expect((await callService(customs, 'product.import-authorisation', { number: a.number }, 'release-of-goods')).status).toBe(403);
    proposeIntegrationApproval(reg.id, { purposes: { 'product.import-authorisation': ['release-of-goods'] } }, 'Official A');
    expect(confirmIntegrationApproval(reg.id, 'Official A')).toHaveProperty('error');
    confirmIntegrationApproval(reg.id, 'Official B');
    const ok = await callService(customs, 'product.import-authorisation', { number: a.number }, 'release-of-goods');
    expect(ok.data).toEqual({ valid: 'yes', validUntil: '2031-01-31' });
    expect(JSON.stringify(ok.data)).not.toMatch(new RegExp(`${importer}|${product}|SUPPLIER|packs|port-a`));
    expect((await callService(customs, 'product.import-authorisation', { number: a.number, on: '2031-02-01' }, 'release-of-goods')).data).toEqual({ valid: 'no' });
    expect((await callService(customs, 'product.import-authorisation', { number: 'MIA-1999-000001' }, 'release-of-goods')).data).toEqual({ valid: 'no' });
    // The authorisation is the regulator's record (the commercially confidential supplier stays on the case); customs gains no power over it.
    expect(getImportAuthorisation(a.number)).not.toHaveProperty('supplier');
  });

  it('authorises controlled medicines for an organisation, a product and a quantity within the limits the nation adopts; never a named patient', async () => {
    const pkg = OVERSIGHT_PROCEDURES.find(p => p.key === 'medicines.controlled')!;
    expect(pkg.owner).toBe('controlledSubstances');
    expect(pkg.fields.map(f => `${f.key} ${f.label}`).join(' ')).not.toMatch(/patient|prescri|dispens|birth|identity number/i);
    expect(pkg.fields.filter(f => f.type === 'person' || f.personalDataClass === 'personal')).toEqual([]);
    // The medicines authority cannot open it: the controlled-substances authority keeps it.
    expect(openCase({ procedure: 'medicines.controlled', fields: { organisation: holder, product, quantity: { amount: 10, unit: 'g' } } }, med('clerk'))).toHaveProperty('error');
    const c = openCase({ procedure: 'medicines.controlled', fields: { organisation: holder, product, quantity: { amount: 10, unit: 'g' } } }, ctrl('clerk')) as { id: string };
    doc(c.id, 'application-form', ctrl('clerk')); doc(c.id, 'security-arrangements', ctrl('clerk'));
    await step(c.id, 'register', ctrl('clerk'));
    doc(c.id, 'assessment-report', ctrl('clerk')); await step(c.id, 'propose', ctrl('clerk'), { reason: 'Secure storage shown' });
    // Limits ship unset: a demonstration records that none was adopted; production refuses (below).
    expect(controlledLimits()).toEqual({ limits: [], version: 0 });
    const r = await decide(c.id, 'authorise', 'Within the law', { schedule: 'schedule-ii', activity: 'import' }, ctrl);
    expect(controlledOfCase(c.id)).toMatchObject({ organisation: holder, product, schedule: 'schedule-ii', quantity: { amount: 10, unit: 'g' }, limit: { none: true }, decision: r.decision!.id });
    expect(getDecision(r.decision!.id)!.content.authority).toMatchObject({ permitType: 'controlled-medicine-authorisation' });
    expect(authoriseControlled({ organisation: holder, product, schedule: 'schedule-ii', activity: 'import', quantity: { amount: 10, unit: 'g' } }, 'case-x', 'Official', { required: true })).toMatchObject({ error: expect.stringMatching(/No limit for schedule schedule-ii/) });
    // Two officials adopt the limits, citing the law; a quantity above them is refused.
    const law = recordVersion({ instrument: { title: 'Controlled Substances Act', type: 'act', jurisdiction: 'xx', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_4', num: '4', text: 'Limits.' }], source: { kind: 'sample' } }, 'Recorder', 'rec') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'Confirmer', 'conf');
    expect(proposeControlledLimits([{ schedule: 'schedule-ii', unit: 'g', max: 50 }], [{ instrument: law.instrument.id, eId: 'sec_4' }], 'Admin A', 'admin-a')).not.toHaveProperty('error');
    expect(confirmControlledLimits('Admin A', 'admin-a')).toHaveProperty('error');
    expect(confirmControlledLimits('Admin B', 'admin-b')).not.toHaveProperty('error');
    expect(authoriseControlled({ organisation: holder, product, schedule: 'schedule-ii', activity: 'import', quantity: { amount: 60, unit: 'g' } }, 'case-y', 'Official', { required: true })).toMatchObject({ error: expect.stringMatching(/above the limit/) });
    expect(authoriseControlled({ organisation: holder, product, schedule: 'schedule-ii', activity: 'import', quantity: { amount: 40, unit: 'g' } }, 'case-z', 'Official', { required: true })).toMatchObject({ limit: { max: 50, version: 1 } });
  });

  it.each([['medicines.safety-report', 'quality-defect'], ['medicines.device-incident', 'malfunction']])('takes a %s about the product only, assessed by the assigned officer with reasons, and refers it to a recall case', async (procedure, category) => {
    const pkg = OVERSIGHT_PROCEDURES.find(p => p.key === procedure)!;
    // Product-level: no patient, clinical, reaction, outcome, harm, age, sex or history field; no score; no AI step.
    for (const f of pkg.fields) {
      expect(`${f.key} ${f.label}`, f.key).not.toMatch(/patient|clinical|diagnos|treatment|medication|reaction|outcome|harm|\bage\b|\bsex\b|history|score|rating/i);
      expect(['number', 'money'], f.key).not.toContain(f.type);
    }
    expect(JSON.stringify(pkg.actions)).not.toMatch(/\bai\b|advisory|model/i);
    // The reporter is restricted: never in a list, and the case is read by its assigned officials and supervisors only.
    for (const k of ['reporterName', 'reporterContact', 'reporterAnonymous', 'concern']) expect(isPersonalField(pkg.fields.find(f => f.key === k)!), k).toBe(true);
    expect(pkg.sensitivity).toBe('restricted');
    const c = openCase({ procedure, fields: { productNamed: 'Sampleprofen 200 mg', product, batch: 'B7', category, concern: 'Seal broken on several packs', reporterKind: 'pharmacist', reporterName: 'REPORTER-NAME-RESTRICTED', reporterContact: { method: 'email', value: 'reporter@example.org' } } }, med('clerk')) as { id: string };
    expect(JSON.stringify(listView(getCase(c.id)!))).not.toMatch(/REPORTER-NAME-RESTRICTED|reporter@example\.org|Seal broken/);
    doc(c.id, 'report'); await step(c.id, 'register', med('clerk'));
    // Assessed by the assigned officer, with reasons: another officer cannot record it, and no reasons is refused.
    doc(c.id, 'assessment-report');
    expect(await act(c.id, { action: 'assess', reason: 'x' }, med('other-officer'))).toHaveProperty('error');
    expect(await act(c.id, { action: 'assess' }, med('clerk'))).toMatchObject({ error: 'State the reasons' });
    await step(c.id, 'assess', med('clerk'), { reason: 'Signal confirmed by two reports from different pharmacies' });
    expect(getProduct(product)!.enforcement).toEqual([]);
    // Refer the product to its own recall case (the engine's referral): linked both ways, nothing decided by the report itself.
    const r = await step(c.id, 'refer', med('s1', 'signatory'), { reason: 'Risk to users', fields: { followUp: 'medicines.recall' } });
    expect(r.decision).toBeUndefined();
    const link = getCase(c.id)!.links.find(l => l.kind === 'referral')!;
    const recall = getCase(link.case)!;
    expect(recall).toMatchObject({ package: { key: 'medicines.recall' }, stage: 'notified', fields: { product }, links: [{ kind: 'referred-from', case: c.id }] });
    expect(JSON.stringify(recall.fields)).not.toMatch(/REPORTER|reporter@/);
    // The other institution reads nothing of it; a read by the assigned official is in the access log.
    official = { id: 'clerk', name: 'Official clerk', label: 'Official clerk', institution: MED, role: 'officer' };
    expect((await casesRoute.GET(new NextRequest(`http://localhost/api/cases/${c.id}`), { params: Promise.resolve({ id: c.id }) })).status).toBe(200);
    official = { id: 'nosy', name: 'Official nosy', label: 'Official nosy', institution: OTHER, role: 'officer' };
    expect((await casesRoute.GET(new NextRequest(`http://localhost/api/cases/${c.id}`), { params: Promise.resolve({ id: c.id }) })).status).toBe(403);
    const log = listAccess({}).filter(e => e.record.id === getCase(c.id)!.ref);
    expect(log.map(e => e.result).sort()).toEqual(['allowed', 'refused']);
  });

  it('links possible duplicates without merging them, and decides and publishes a safety alert with four eyes', async () => {
    const open = () => { const c = openCase({ procedure: 'medicines.safety-report', fields: { productNamed: 'Sampleprofen', product, concern: 'Tablets discoloured' } }, med('clerk')) as { id: string }; doc(c.id, 'report'); return c.id; };
    const a = open(), b = open();
    await step(a, 'register', med('clerk')); await step(b, 'register', med('clerk'));
    await step(b, 'link-report', med('clerk'), { reason: 'Same batch, same week', fields: { linkedReports: getCase(a)!.ref } });
    expect(getCase(a)!.stage).toBe('assessment');
    expect(await act(b, { action: 'link-report', reason: 'x', fields: { linkedReports: 'MSR-1999-000001' } }, med('clerk'))).toHaveProperty('error');
    doc(b, 'assessment-report'); await step(b, 'assess', med('clerk'), { reason: 'Quality defect likely' });
    await step(b, 'propose-alert', med('clerk'), { reason: 'Users should check tablets', fields: { grounds: 'ALERT-GROUNDS-RESTRICTED' } });
    const d = await decide(b, 'issue-alert', 'Alert users of batch 7');
    expect(getDecision(d.decision!.id)!.content.authority).toMatchObject({ permitType: 'product-safety-assessment' });
    expect(getProduct(product)!.enforcement[0]).toMatchObject({ kind: 'safety_notice', approvedBy: expect.anything() });
    await step(b, 'publish-alert', med('clerk'), { fields: { publicNotice: 'Check tablets of batch 7 before use.' } });
    expect(getProduct(product)!.enforcement[0]).toMatchObject({ publishedAt: expect.any(String), publicNotice: 'Check tablets of batch 7 before use.' });
  });

  it('reconsiders a decision only by officials who neither made nor confirmed it; a court appeal stays with the judiciary, by reference', async () => {
    const original = getCase(authCase)!;
    const c = openCase({ procedure: 'medicines.reconsideration', fields: { decision: original.ref, applicant: holder, grounds: 'Condition 2 is disproportionate', courtReference: 'HC-2026-17' } }, med('reviewer')) as { id: string };
    doc(c.id, 'request-form', med('reviewer'));
    const reg = await step(c.id, 'register', med('reviewer'));
    expect(reg.case.stage).toBe('review');
    // The request period comes from the nation's version of the original procedure (none ships): recorded as not set.
    expect(getCase(c.id)!.history.length).toBe(2);
    doc(c.id, 'review-report', med('reviewer'));
    // An official who made the decision cannot review it, even when assigned.
    assign(c.id, { id: 's1', name: 'Official s1' }, med('s3', 'signatory'));
    expect(await act(c.id, { action: 'propose', reason: 'Reviewed' }, med('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/decided the decision reconsidered/) });
    assign(c.id, { id: 'reviewer', name: 'Official reviewer' }, med('s3', 'signatory'));
    await step(c.id, 'propose', med('reviewer'), { reason: 'Condition 2 is supported by the assessment' });
    // Neither original official may take part in the two-official decision.
    expect(await step(c.id, 'uphold', med('s2', 'signatory'), { reason: 'Upheld' })).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'uphold' }, med('s3', 'signatory'))).toMatchObject({ error: expect.stringMatching(/confirmed the decision reconsidered/) });
    const { cancelPending } = await import('@/lib/casework/engine');
    cancelPending(c.id, med('s3', 'signatory'), 'Proposed by an official who confirmed the original decision');
    await step(c.id, 'uphold', med('s3', 'signatory'), { reason: 'The condition stands' });
    const r = await step(c.id, 'uphold', med('s4', 'signatory'));
    expect(getDecision(r.decision!.id)!.content).toMatchObject({ decision: 'uphold', facts: { originalCase: original.ref, courtReference: 'HC-2026-17' }, authority: { permitType: 'medicines-decision-reconsideration' } });
    // The court reference is a reference only: no court case is opened or read.
    expect(getCase('HC-2026-17')).toBeUndefined();
    // Another institution's decision is reconsidered there, not here.
    const elsewhere = openCase({ procedure: 'medicines.reconsideration', fields: { decision: 'MAA-1999-000001', applicant: holder } }, med('reviewer')) as { id: string };
    doc(elsewhere.id, 'request-form', med('reviewer'));
    expect(await act(elsewhere.id, { action: 'register' }, med('reviewer'))).toMatchObject({ error: expect.stringMatching(/No decision/) });
  });

  it('classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one', async () => {
    installProposedDefaults('Administrator');
    const expected: Record<string, string> = {
      'medicines.corrective-action': 'good-practice-corrective-action', 'medicines.import-authorisation': 'medicine-import-authorisation', 'medicines.controlled': 'controlled-medicine-authorisation',
      'medicines.safety-report': 'product-safety-assessment', 'medicines.device-incident': 'product-safety-assessment', 'medicines.reconsideration': 'medicines-decision-reconsideration',
    };
    expect(PROCEDURE_PERMITS).toEqual(expected);
    for (const p of OVERSIGHT_PROCEDURES) {
      const t = expected[p.key]!;
      const m = listMappings(t);
      expect(m, t).toHaveLength(1);
      expect(m[0], t).toMatchObject({ state: 'draft', proposal: true, lead: p.key === 'medicines.controlled' ? 'controlledSubstances' : 'medicinesRegulation', legalBasis: [] });
      expect(mappingInForce(t), t).toBeUndefined();
      const decisions = p.actions.filter(a => a.decision);
      expect(decisions.length, p.key).toBeGreaterThan(0);
      for (const a of decisions) {
        expect(classifyDecision({ fields: {} } as never, a as never, { key: p.key }), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: t });
        // No period, fee or outcome list typed.
        expect(p.fields.filter(f => f.type === 'money'), p.key).toEqual([]);
      }
      for (const d of p.deadlines) expect(d.days ?? d.sampleDays, `${p.key} ${d.key}`).toBeUndefined();
      expect(p.appeal, p.key).toBeUndefined();
      for (const f of p.fields.filter(x => x.type === 'enum')) expect(f.valuesSource, `${p.key} ${f.key}`).toMatchObject({ kind: 'configured' });
    }
    vi.stubEnv('CIVICOS_MODE', 'production');
    for (const p of OVERSIGHT_PROCEDURES) for (const a of p.actions.filter(x => x.decision)) {
      const owner = p.key === 'medicines.controlled' ? CTRL : MED;
      expect(checkDecision({ owner, fields: {} } as never, a as never, { ...p, state: 'approved' } as never, new Date()), `${p.key} ${a.key}`).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs/) });
    }
    // The first step of each refuses too (the power is checked before anything is recorded).
    const c = openCase({ procedure: 'medicines.safety-report', fields: { productNamed: 'X', concern: 'Y' } }, med('clerk')) as { id: string };
    doc(c.id, 'report');
    expect(await act(c.id, { action: 'register' }, med('clerk'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs product-safety-assessment/) });
  });
});
