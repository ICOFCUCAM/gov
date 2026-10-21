// HX-005: recall notices and safety alerts from the medicines authority to
// authorised health institutions (field series Part 6 §9.2; Health I4
// dependency exchange-hx-005). A notice is issued only once a recall or safety
// alert is decided (sealed) and its public notice published; it carries the
// product's publicProductView() and the recall class, reference and dates,
// nothing else; it reaches only integrations two officials approved for the
// service and a purpose (none ships); every delivery is recorded with its
// purpose and exchange receipt; no payload carries personal data.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, attach, getCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, registerIntegration, listIntegrations } = await import('@/lib/data/store');
const { listAudit } = await import('@/lib/data/store/audit');
const { proposeIntegrationApproval, confirmIntegrationApproval } = await import('@/lib/data/store/federation');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { callService, serviceDirectory } = await import('@/lib/exchange/services');
const { resetExchangeLog, listExchanges } = await import('@/lib/exchange/log');
const { CATALOGUE_CONTRACTS } = await import('@/lib/forms/library/catalogue-contracts');
const { PRODUCT_PROCEDURES } = await import('./procedures');
const { resetProducts } = await import('./register');
const { resetNotices, listNotices, noticeDeliveries, noticeSubscribers, SAFETY_NOTICE_SERVICE } = await import('./notices');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof PRODUCT_PROCEDURES)[number];

let MED = '';
const med = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: MED } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: MED, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, med('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const decide = async (id: string, action: string, reason: string, fields: Record<string, unknown> = {}) => { await step(id, action, med('s1', 'signatory'), { reason, fields }); return step(id, action, med('s2', 'signatory')); };
const nation = (p: Ref) => ({ ...asNationSets(p), ...(p.key === 'medicines.recall' ? { form: { version: 'nation-1', lists: { 'medicines.country.recall_classes': { values: [{ value: 'class-1', label: 'Class 1' }] } } } } : {}) });

// What must never leave in a notice: the grounds, the risk assessment, the completion, the report and its reporter, officials, the dossier.
const GROUNDS = 'RECALL-GROUNDS-271828', COMPLETION = 'COMPLETION-RECONCILED-314159', REPORTER = 'REPORTER-NAME-161803', CONTACT = 'reporter-577215@example.org', CONCERN = 'CONCERN-TEXT-141421', ALERT_GROUNDS = 'ALERT-GROUNDS-173205', COMPOSITION = 'EXCIPIENTS-223606';
const PRIVATE = new RegExp([GROUNDS, COMPLETION, REPORTER, CONTACT, CONCERN, ALERT_GROUNDS, COMPOSITION, 'Official s1', 'Official s2', 'Official clerk', '"grounds"', '"completion"', '"reporter', '"concern"', '"by"', '"dossier"', '"composition"'].join('|'), 'i');
// Audit entries name the official who acted (as every audit entry does); never the report, its reporter or the grounds.
const CONTENT = new RegExp([GROUNDS, COMPLETION, REPORTER, CONTACT, CONCERN, ALERT_GROUNDS, COMPOSITION].join('|'), 'i');
const PAYLOAD_KEYS = ['notice', 'kind', 'product', 'recallClass', 'reference', 'decidedOn', 'publishedOn', 'supplyChainNotice', 'sample'];
const PRODUCT_KEYS = ['productId', 'kind', 'fields', 'notices', 'source'];

let product = '';
async function setup() {
  const holder = (createOrganisation({ name: 'Sample Pharma Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
  const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Sampleprofen', strength: '200 mg', composition: COMPOSITION } }, med('clerk')) as { id: string };
  doc(c.id, 'application-form'); await step(c.id, 'register', med('clerk'));
  doc(c.id, 'dossier'); await step(c.id, 'record-dossier', med('clerk'));
  doc(c.id, 'assessment-report'); await step(c.id, 'assess', med('clerk'), { reason: 'Assessed' });
  const r = await decide(c.id, 'authorise', 'Authorised');
  product = (r.decision!.content.facts as { product: string }).product;
}
/** A subscriber (another institution, a facility or a pharmacy) approved by two officials for HX-005 with a purpose. */
function subscriber(name: string, approve = true) {
  const r = registerIntegration({ kind: 'integration', name: `${name} ${Math.random()}`, ownerOrg: name, contact: 'ops@example.gov', scopes: [`service:${SAFETY_NOTICE_SERVICE}`] });
  if ('error' in r) throw new Error(r.error);
  if (approve) {
    proposeIntegrationApproval(r.id, { purposes: { [SAFETY_NOTICE_SERVICE]: ['act-on-recalls-and-safety-alerts'] } }, 'Official A');
    const ok = confirmIntegrationApproval(r.id, 'Official B');
    if ('error' in ok) throw new Error(ok.error);
  }
  return { kind: 'integration' as const, id: r.id, name };
}
async function recall(cls?: string) {
  const c = openCase({ procedure: 'medicines.recall', fields: { product, grounds: GROUNDS } }, med('clerk')) as { id: string };
  doc(c.id, 'recall-notification'); await step(c.id, 'assess-risk', med('clerk'));
  doc(c.id, 'risk-assessment'); await step(c.id, 'propose', med('clerk'), { reason: 'Contamination' });
  await decide(c.id, 'recall', 'Recall batch 7', cls ? { recallClass: cls } : {});
  return c.id;
}

describe('HX-005: recall notices and safety alerts', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOrganisations, resetProducts, resetNotices, resetExchangeLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    MED = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { medicinesRegulation: MED } } }, 'Administrator');
    for (const p of PRODUCT_PROCEDURES.filter(x => x.owner === 'medicinesRegulation')) {
      const d = draftPackage(nation(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    await setup();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is declared in the directory, owned by the medicines authority, ships with no approved subscriber, and HLT-MED-017 names it', () => {
    expect(serviceDirectory().find(s => s.id === SAFETY_NOTICE_SERVICE)).toMatchObject({ owner: 'medicinesRegulation', kind: 'query', dataClass: 'public', scope: `service:${SAFETY_NOTICE_SERVICE}` });
    expect(serviceDirectory().find(s => s.id === SAFETY_NOTICE_SERVICE)!.returns.notices).toMatch(/supply-chain-notice document/);
    expect(noticeSubscribers()).toEqual([]);
    expect(listIntegrations().filter(i => i.status === 'approved' && i.scopes.includes(`service:${SAFETY_NOTICE_SERVICE}`))).toEqual([]);
    // The deviation no-recall-exchange is gone; the catalogue's HX-005 lines are met by the service; the supply-chain notice stays on the recall.
    const f = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-MED-017')!;
    expect(f.deviations.map(d => d.id)).not.toContain('no-recall-exchange');
    expect(f.items.filter(i => i.met_by.exchange === SAFETY_NOTICE_SERVICE).length).toBeGreaterThanOrEqual(3);
    expect(PRODUCT_PROCEDURES.find(p => p.key === 'medicines.recall')!.documents.map(d => d.class)).toContain('supply-chain-notice');
  });

  it('reaches only subscribers two officials approved, only after the recall is decided and its notice published, each delivery recorded', async () => {
    const hospital = subscriber('Sample Hospital'), pharmacy = subscriber('Sample Pharmacy'), unapproved = subscriber('Unapproved Clinic', false);
    // One official alone does not approve a subscriber.
    const half = registerIntegration({ kind: 'integration', name: `Half ${Math.random()}`, ownerOrg: 'Half', contact: 'x@example.gov', scopes: [`service:${SAFETY_NOTICE_SERVICE}`] }) as { id: string };
    proposeIntegrationApproval(half.id, { purposes: { [SAFETY_NOTICE_SERVICE]: ['act-on-recalls-and-safety-alerts'] } }, 'Official A');
    expect(confirmIntegrationApproval(half.id, 'Official A')).toHaveProperty('error');
    expect(noticeSubscribers().map(s => s.id).sort()).toEqual([hospital.id, pharmacy.id].sort());
    const id = await recall('class-1');
    // Decided, not yet published: nothing is issued or delivered.
    expect(listNotices()).toEqual([]);
    expect((await callService(hospital, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts')).data).toEqual({ notices: [] });
    await step(id, 'publish-notice', med('clerk'), { fields: { publicNotice: 'Return batch 7 to the pharmacy.' } });
    const [n] = listNotices();
    expect(n).toMatchObject({ kind: 'recall', recallClass: 'class-1', reference: getCase(id)!.ref, product: { productId: product }, supplyChainNotice: 'not yet recorded', decidedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), publishedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(n!.product.notices).toEqual([{ kind: 'recall', at: expect.any(String), notice: 'Return batch 7 to the pharmacy.' }]);
    expect(noticeDeliveries().map(d => d.subscriber).sort()).toEqual([hospital.id, pharmacy.id].sort());
    // An unapproved integration, or a purpose not approved, gets nothing.
    expect((await callService(unapproved, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts')).status).toBe(403);
    expect((await callService(hospital, SAFETY_NOTICE_SERVICE, {}, 'marketing')).status).toBe(403);
    // The hospital collects it once: the delivery is recorded with its purpose and the exchange receipt.
    const got = await callService(hospital, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts');
    expect(got.status).toBe(200);
    expect((got.data!.notices as unknown[]).length).toBe(1);
    const d = noticeDeliveries().find(x => x.subscriber === hospital.id)!;
    expect(d).toMatchObject({ collectedAt: expect.any(String), purpose: 'act-on-recalls-and-safety-alerts', receipt: got.receipt.id });
    expect(listExchanges({ channel: 'service' }).some(e => e.receiptId === got.receipt.id)).toBe(true);
    expect((await callService(hospital, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts')).data).toEqual({ notices: [] });
    // The pharmacy's stays queued until it collects; the supply-chain notice recorded on the recall shows when it does.
    doc(id, 'supply-chain-notice'); await step(id, 'notify-supply-chain', med('clerk'), { reason: 'Wholesalers told' });
    const late = await callService(pharmacy, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts');
    expect((late.data!.notices as { supplyChainNotice: string }[])[0]!.supplyChainNotice).toBe('recorded');
    // A subscriber approved after the notice was issued receives later notices only.
    const later = subscriber('Later Clinic');
    expect((await callService(later, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts')).data).toEqual({ notices: [] });
    expect(listAudit().some(e => e.action === 'product.notice.issue' && /queued for 2 approved subscriber/.test(e.detail ?? ''))).toBe(true);
  });

  it('never carries personal data, grounds, a completion, a report or an official in any payload: recalls and safety alerts', async () => {
    const hospital = subscriber('Scan Hospital');
    const id = await recall('class-1');
    await step(id, 'publish-notice', med('clerk'), { fields: { publicNotice: 'Return batch 7.' } });
    doc(id, 'supply-chain-notice'); await step(id, 'notify-supply-chain', med('clerk'), { reason: 'Wholesalers told' });
    doc(id, 'completion-report'); await step(id, 'report-completion', med('clerk'));
    await step(id, 'verify-completion', med('s1', 'signatory'), { reason: 'Reconciled', fields: { completionSummary: COMPLETION } });
    // A safety alert from a report naming a reporter.
    const s = openCase({ procedure: 'medicines.safety-report', fields: { productNamed: 'Sampleprofen', product, concern: CONCERN, reporterName: REPORTER, reporterContact: { method: 'email', value: CONTACT } } }, med('clerk')) as { id: string };
    doc(s.id, 'report'); await step(s.id, 'register', med('clerk'));
    doc(s.id, 'assessment-report'); await step(s.id, 'assess', med('clerk'), { reason: 'Signal' });
    await step(s.id, 'propose-alert', med('clerk'), { reason: 'Alert', fields: { grounds: ALERT_GROUNDS } });
    await decide(s.id, 'issue-alert', 'Alert users');
    await step(s.id, 'publish-alert', med('clerk'), { fields: { publicNotice: 'Check tablets before use.' } });
    const got = await callService(hospital, SAFETY_NOTICE_SERVICE, {}, 'act-on-recalls-and-safety-alerts');
    const payloads = [...(got.data!.notices as Record<string, unknown>[]), ...listNotices() as unknown as Record<string, unknown>[]];
    expect(payloads.map(p => p.kind).sort()).toEqual(['recall', 'recall', 'safety_notice', 'safety_notice']);
    for (const p of payloads) {
      expect(JSON.stringify(p)).not.toMatch(PRIVATE);
      expect(Object.keys(p).every(k => PAYLOAD_KEYS.includes(k)), Object.keys(p).join()).toBe(true);
      expect(Object.keys(p.product as object).sort()).toEqual([...PRODUCT_KEYS].sort());
    }
    // A safety alert carries no recall class; the audit entries name no reporter either.
    expect(payloads.find(p => p.kind === 'safety_notice')).not.toHaveProperty('recallClass');
    expect(JSON.stringify(listAudit().filter(e => e.action.startsWith('product.notice')))).not.toMatch(CONTENT);
    expect(JSON.stringify(noticeDeliveries())).not.toMatch(PRIVATE);
  });
});
