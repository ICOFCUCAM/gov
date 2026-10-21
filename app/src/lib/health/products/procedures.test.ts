// The medicines regulator's procedures on the register of medicines and
// medical devices (Health I4 dependencies procedure-*, product-register,
// permit-mappings): each runs to a sealed decision with four eyes and writes
// the register only through its effect; versions and status history are kept;
// a status comes only from a sealed decision; another institution, and in
// production every institution without an approved mapping, is refused.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { resetPermitAuthorities, installProposedDefaults, mappingInForce, listMappings } = await import('@/lib/permits/authority');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { PRODUCT_PROCEDURES } = await import('./procedures');
const { resetProducts, getProduct, publicProduct, listPublicProducts, productRecord, expireProducts } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let MED = '', OTHER = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const med = at(() => MED), other = at(() => OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: MED, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, med('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
/** Both officials of a two-official decision. */
async function decide(id: string, action: string, reason: string, fields: Record<string, unknown> = {}) {
  const first = await step(id, action, med('s1', 'signatory'), { reason, fields });
  expect(first).toMatchObject({ pending: true });
  return step(id, action, med('s2', 'signatory'));
}
let holder = '';

/** A marketing authorisation from application to decision; returns the product number. */
async function authorise(name = 'Sampleprofen', fields: Record<string, unknown> = {}) {
  const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: name, strength: '200 mg', activeIngredients: 'ibuprofen', composition: 'EXCIPIENTS-SECRET' } }, med('clerk')) as { id: string };
  doc(c.id, 'application-form');
  await step(c.id, 'register', med('clerk'));
  doc(c.id, 'dossier');
  await step(c.id, 'record-dossier', med('clerk'));
  doc(c.id, 'information-request');
  await step(c.id, 'request-information', med('clerk'), { reason: 'Stability data for 25 °C' });
  doc(c.id, 'applicant-response');
  await step(c.id, 'record-response', med('clerk'));
  doc(c.id, 'assessment-report');
  await step(c.id, 'assess', med('clerk'), { reason: 'Benefits outweigh risks', fields: { assessmentSummary: 'ASSESSMENT-RESTRICTED' } });
  const r = await decide(c.id, 'authorise', 'Quality, safety and efficacy shown', { conditions: 'Prescription only', validUntil: '2031-05-01', ...fields });
  return { caseId: c.id, number: (r.decision!.content.facts as { product: string }).product, decision: r.decision! };
}

describe('the medicines regulator\'s product procedures', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOrganisations, resetProducts, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [MED, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { medicinesRegulation: MED, healthRegulation: OTHER } } }, 'Administrator');
    for (const p of PRODUCT_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    holder = (createOrganisation({ name: 'Sample Pharma Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('runs marketing authorisation to a sealed decision with four eyes and writes the product register only through its effect', async () => {
    const { number, decision } = await authorise();
    const p = getProduct(number)!;
    expect(p).toMatchObject({ kind: 'medicine', holder, state: 'authorised' });
    // Every step a new version; the decision approves what the application recorded, and its number and validity.
    expect(p.versions.map(v => v.reason)).toEqual(['Application registered', 'Dossier version 1', 'Dossier version 2', 'Assessment recorded', 'Quality, safety and efficacy shown']);
    const v = p.versions.at(-1)!.attributes;
    expect(v.authorisationNumber!.value).toMatch(/^MA-\d{4}-\d{6}$/);
    expect(v.validUntil!.value).toBe('2031-05-01');
    for (const a of Object.values(v)) expect(a!.approvedBy?.decision).toBe(decision.id);
    expect(p.history.map(h => [h.state, !!h.decision])).toEqual([['applied', false], ['authorised', true]]);
    expect(getDecision(decision.id)!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'medicine-marketing-authorisation' });
    // The holder is the organisations register's record: only its number is kept.
    expect(JSON.stringify(p)).not.toContain('Sample Pharma Ltd');
    expect(productRecord(p).attributes.holder!.value).toEqual({ organisation: holder, name: 'Sample Pharma Ltd' });
  });

  it('keeps every version and takes a status only from a sealed decision: an application shows nothing, an import or inventory record cannot set one', async () => {
    const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Pending' } }, med('clerk')) as { id: string };
    doc(c.id, 'application-form');
    await step(c.id, 'register', med('clerk'));
    expect(listPublicProducts()).toEqual([]);
    const p = (await import('./register')).productOfCase(c.id)!;
    expect(productRecord(p).attributes.status).toBeUndefined();
    expect(publicProduct(p).fields).toEqual({});
    // The register has no import path: no export takes a status from outside a procedure.
    const mod = await import('./register');
    expect(Object.keys(mod).filter(k => /import|load|inventory|procure/i.test(k))).toEqual([]);
  });

  it('runs a variation, a renewal, a suspension with its published notice, reinstatement and withdrawal', async () => {
    const { number } = await authorise();
    // Variation: a new version, approved by the variation decision.
    const v = openCase({ procedure: 'medicines.variation', fields: { product: number, newStrength: '400 mg' } }, med('clerk')) as { id: string };
    doc(v.id, 'application-form');
    await step(v.id, 'register', med('clerk'));
    doc(v.id, 'dossier'); await step(v.id, 'record-dossier', med('clerk'));
    doc(v.id, 'assessment-report'); await step(v.id, 'assess', med('clerk'), { reason: 'Bioequivalent' });
    await decide(v.id, 'vary', 'Variation approved');
    expect(getProduct(number)!.versions.at(-1)!.attributes.strength).toMatchObject({ value: '400 mg', approvedBy: expect.anything() });
    // Renewal.
    const r = openCase({ procedure: 'medicines.renewal', fields: { product: number } }, med('clerk')) as { id: string };
    doc(r.id, 'application-form'); await step(r.id, 'register', med('clerk'));
    doc(r.id, 'dossier'); await step(r.id, 'record-dossier', med('clerk'));
    doc(r.id, 'assessment-report'); await step(r.id, 'assess', med('clerk'), { reason: 'Benefit-risk unchanged' });
    await decide(r.id, 'renew', 'Renewed', { validUntil: '2036-05-01' });
    expect(getProduct(number)!.versions.at(-1)!.attributes.validUntil!.value).toBe('2036-05-01');
    // Suspension: decided, then its notice published as its own act; the grounds never published.
    const s = openCase({ procedure: 'medicines.suspension', fields: { product: number, grounds: 'GROUNDS-RESTRICTED' } }, med('clerk')) as { id: string };
    doc(s.id, 'grounds');
    await step(s.id, 'notify', med('clerk'), { reason: 'Quality defect reported' });
    await step(s.id, 'propose', med('clerk'), { reason: 'Representations considered' });
    await decide(s.id, 'suspend', 'Pending investigation');
    expect(getProduct(number)!.state).toBe('suspended');
    expect(publicProduct(getProduct(number)!).notices).toEqual([]);
    await step(s.id, 'publish-notice', med('clerk'), { fields: { publicNotice: 'Do not use batch 7 until further notice.' } });
    expect(publicProduct(getProduct(number)!).notices).toEqual([{ kind: 'suspension', at: expect.any(String), notice: 'Do not use batch 7 until further notice.' }]);
    expect(JSON.stringify(publicProduct(getProduct(number)!))).not.toContain('GROUNDS-RESTRICTED');
    await decide(s.id, 'reinstate', 'Defect corrected');
    expect(getProduct(number)!.state).toBe('authorised');
    // Withdrawal.
    const w = openCase({ procedure: 'medicines.suspension', fields: { product: number } }, med('clerk')) as { id: string };
    doc(w.id, 'grounds');
    await step(w.id, 'notify', med('clerk'), { reason: 'Holder asked to withdraw' });
    await step(w.id, 'propose', med('clerk'), { reason: 'No objection' });
    await decide(w.id, 'withdraw', 'Withdrawn at the holder\'s request');
    await step(w.id, 'publish-withdrawal', med('clerk'), { fields: { publicNotice: 'This medicine is no longer authorised.' } });
    const p = getProduct(number)!;
    expect(p.history.map(h => h.state)).toEqual(['applied', 'authorised', 'authorised', 'authorised', 'suspended', 'authorised', 'withdrawn']);
    expect(p.history.slice(1).every(h => h.decision)).toBe(true);
    expect(classifyDecision({ fields: { product: number } } as never, { decision: 'withdraw' } as never, { key: 'medicines.suspension' })).toEqual({ kind: 'mapping', permitType: 'medicine-marketing-authorisation', power: 'revoke' });
  });

  it('runs a recall from notification to verified completion, under the recall mapping', async () => {
    const { number } = await authorise();
    const c = openCase({ procedure: 'medicines.recall', fields: { product: number, grounds: 'RECALL-GROUNDS' } }, med('clerk')) as { id: string };
    doc(c.id, 'recall-notification'); await step(c.id, 'assess-risk', med('clerk'));
    doc(c.id, 'risk-assessment'); await step(c.id, 'propose', med('clerk'), { reason: 'Contamination risk' });
    const d = await decide(c.id, 'recall', 'Recall batch 7');
    expect(getDecision(d.decision!.id)!.content.authority).toMatchObject({ permitType: 'product-recall' });
    await step(c.id, 'publish-notice', med('clerk'), { fields: { publicNotice: 'Return batch 7 to the pharmacy.' } });
    doc(c.id, 'supply-chain-notice'); await step(c.id, 'notify-supply-chain', med('clerk'), { reason: 'Wholesalers told' });
    doc(c.id, 'completion-report'); await step(c.id, 'report-completion', med('clerk'));
    await step(c.id, 'verify-completion', med('s1', 'signatory'), { reason: 'Reconciled', fields: { completionSummary: 'COMPLETION-RESTRICTED' } });
    const p = getProduct(number)!;
    expect(p.enforcement[0]).toMatchObject({ kind: 'recall', approvedBy: expect.anything(), publishedAt: expect.any(String), completion: { summary: 'COMPLETION-RESTRICTED' } });
    expect(p.state).toBe('authorised');
    const out = JSON.stringify(publicProduct(p));
    expect(out).not.toMatch(/RECALL-GROUNDS|COMPLETION-RESTRICTED/);
    expect(publicProduct(p).notices).toEqual([{ kind: 'recall', at: expect.any(String), notice: 'Return batch 7 to the pharmacy.' }]);
  });

  it('registers a medical device under the device registration mapping', async () => {
    const c = openCase({ procedure: 'medicines.device-registration', fields: { holder, productName: 'Sample infusion pump' } }, med('clerk')) as { id: string };
    doc(c.id, 'application-form'); await step(c.id, 'register-application', med('clerk'));
    doc(c.id, 'dossier'); await step(c.id, 'record-dossier', med('clerk'));
    doc(c.id, 'assessment-report'); await step(c.id, 'assess', med('clerk'), { reason: 'Conformity shown' });
    const r = await decide(c.id, 'register', 'Registered');
    const p = getProduct((r.decision!.content.facts as { product: string }).product)!;
    expect(p).toMatchObject({ kind: 'device', state: 'authorised' });
    expect(p.versions.at(-1)!.attributes.authorisationNumber!.value).toMatch(/^MDR-/);
    expect(getDecision(r.decision!.id)!.content.authority).toMatchObject({ permitType: 'medical-device-registration' });
  });

  it('lets no other institution act, and lapses an authorisation when the validity its decision set ends', async () => {
    expect(openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'X' } }, other('clerk'))).toHaveProperty('error');
    const { number } = await authorise();
    expect(expireProducts(new Date('2031-05-02'))).toEqual([number]);
    expect(getProduct(number)!.state).toBe('lapsed');
    expect(productRecord(getProduct(number)!).attributes.status!.value).toBe('lapsed');
  });

  it('ships unapproved mappings citing nothing, and refuses every product decision in production until one is approved', async () => {
    installProposedDefaults('Administrator');
    for (const t of ['medicine-marketing-authorisation', 'medical-device-registration', 'product-recall', 'medicine-manufacturing-licence', 'medicine-import-licence', 'medicine-wholesale-licence', 'medicine-import-authorisation']) {
      const m = listMappings(t);
      expect(m, t).toHaveLength(1);
      expect(m[0], t).toMatchObject({ state: 'draft', proposal: true, lead: 'medicinesRegulation', legalBasis: [] });
      expect(mappingInForce(t), t).toBeUndefined();
    }
    // Controlled-medicine authorisations go to the controlled-substances slot.
    expect(listMappings('controlled-medicine-authorisation')[0]).toMatchObject({ lead: 'controlledSubstances', state: 'draft' });
    vi.stubEnv('CIVICOS_MODE', 'production');
    const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Y' } }, med('clerk')) as { id: string };
    doc(c.id, 'application-form');
    expect(await act(c.id, { action: 'register' }, med('clerk'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs medicine-marketing-authorisation/) });
  });

  it('answers the forms\' product references from the register: a decided product by its number or authorisation number, never an application', async () => {
    const { serverCheck } = await import('@/lib/forms/server');
    const { number } = await authorise();
    const ma = getProduct(number)!.versions.at(-1)!.attributes.authorisationNumber!.value as string;
    const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Pendingvir' } }, med('clerk')) as { id: string };
    doc(c.id, 'application-form'); await step(c.id, 'register', med('clerk'));
    const pending = (await import('./register')).productOfCase(c.id)!.number;
    const field = { key: 'product', label: 'Product', type: 'registryReference' as const, register: 'product', rules: [{ rule: 'existingRecord' as const, active: true }], personalDataClass: 'administrative' as const };
    const check = (v: string) => serverCheck({ pkg: { key: 't', fields: [field], documents: [] }, input: { product: v }, mode: 'partial' }).errors.length;
    expect(check(number)).toBe(0);
    expect(check(ma)).toBe(0);
    expect(check(pending)).toBe(1);
    expect(check('MA-1999-000999')).toBe(1);
  });

  it('types no period, fee or outcome list: no deadline, no appeal days, decisions are the case\'s actions', () => {
    for (const p of PRODUCT_PROCEDURES) {
      for (const d of p.deadlines) { expect(d.days, `${p.key} ${d.key}`).toBeUndefined(); expect(d.sampleDays, `${p.key} ${d.key}`).toBeUndefined(); }
      expect(p.appeal?.days).toBeUndefined();
      expect(p.appeal?.sampleDays).toBeUndefined();
      expect(p.fields.filter(f => f.type === 'money')).toEqual([]);
      for (const f of p.fields.filter(x => x.type === 'enum')) expect(f.valuesSource).toMatchObject({ kind: 'configured' });
      expect(p.owner).toBe('medicinesRegulation');
    }
  });
});
