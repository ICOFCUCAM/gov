// Every output of the register of medicines and medical devices carries
// publicProductView() only (Health I4 dependencies product-register and
// public-product-view; as parcels-privacy.test.ts scans the parcel
// register's outputs for holders): a scan of the list and the one-product
// answer for every viewer without need, a refused full read, the product.status
// exchange service, the twin's OGC collections, the setup hub and the audit
// chain and access log, for dossier content, the assessment, composition,
// sites, grounds, recall completions, unpublished notices and personal data,
// under the shipped (empty) classification and one listing every publishable
// attribute. Only the medicines authority's own officials read the full
// record, and every such read, allowed or refused, is in the access log.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { asNationSets } from '@/lib/casework/testkit';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { listAudit } = await import('@/lib/data/store/audit');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { callService } = await import('@/lib/exchange/services');
const { onboardingStatus } = await import('@/lib/onboarding/status');
const { PRODUCT_PROCEDURES } = await import('@/lib/health/products/procedures');
const { resetProducts, proposeProductDisclosure, confirmProductDisclosure, PUBLISHABLE_ATTRIBUTES } = await import('@/lib/health/products/register');
const route = await import('./route');
const collections = await import('@/app/api/twin/ogc/collections/route');
type Actor = import('@/lib/casework/engine').Actor;

const DOSSIER = 'DOSSIER-CTD-27182818', COMPOSITION = 'EXCIPIENT-RATIO-264575', SITES = 'SITE-CONFIDENTIAL-141421', ASSESSMENT = 'ASSESSMENT-RESTRICTED-161803';
const GROUNDS = 'GROUNDS-UNDISCLOSED-223606', COMPLETION = 'COMPLETION-RECONCILED-173205', UNPUBLISHED = 'UNPUBLISHED-WITHDRAWAL-314159', PACKAGING = 'PACKAGING-SECRET-577215';
const PRIVATE = new RegExp([DOSSIER, COMPOSITION, SITES, ASSESSMENT, GROUNDS, COMPLETION, UNPUBLISHED, PACKAGING, '"grounds"', '"completion"', '"dossier"', '"assessmentReport"', '"composition"', '"manufacturingSites"', '"packagingAndLabelling"', '"versions"', '"case"'].join('|'), 'i');

let MED = '', OTHER = '', LAW = '', number = '', withdrawnNumber = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const med = at(() => MED);
const pdf = (s: string) => new Uint8Array(Buffer.from(`%PDF-1.7\n${s}\n%%EOF`));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: `${cls} ${DOSSIER}`, institution: MED, belongsTo: { kind: 'case', id: caseId }, bytes: pdf(DOSSIER) }, 'Clerk') as { id: string }; attach(caseId, d.id, med('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const decide = async (id: string, action: string, reason: string, fields: Record<string, unknown> = {}) => { await step(id, action, med('s1', 'signatory'), { reason, fields }); return step(id, action, med('s2', 'signatory')); };
const req = (q: string) => new NextRequest(`http://localhost/api/health-regulation/products${q}`);

async function authorised(holder: string, name: string): Promise<string> {
  const c = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: name, strength: '200 mg', activeIngredients: 'ibuprofen', composition: COMPOSITION, manufacturingSites: SITES, packagingAndLabelling: PACKAGING } }, med('clerk')) as { id: string };
  doc(c.id, 'application-form'); await step(c.id, 'register', med('clerk'));
  doc(c.id, 'dossier'); await step(c.id, 'record-dossier', med('clerk'), { fields: { dossierNote: DOSSIER } });
  doc(c.id, 'assessment-report'); await step(c.id, 'assess', med('clerk'), { reason: 'Assessed', fields: { assessmentSummary: ASSESSMENT } });
  const r = await decide(c.id, 'authorise', 'Authorised', { conditions: 'Prescription only', validUntil: '2031-05-01' });
  return (r.decision!.content.facts as { product: string }).product;
}

beforeEach(async () => {
  for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOrganisations, resetProducts, resetAccessLog, resetLaw]) r();
  vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
  official = null;
  [MED, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
  setSovereign({ deployment: { authorities: { medicinesRegulation: MED, healthRegulation: OTHER } } }, 'Administrator');
  for (const p of PRODUCT_PROCEDURES) { draftPackage(asNationSets(p), 'A', 'a', registeredEffects()); approvePackage(p.key, 1, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); }
  const v = recordVersion({ instrument: { title: 'Medicines Act', type: 'act', jurisdiction: 'X', year: 2001, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_30', num: '30', text: 'The medicines authority keeps a public register of authorised products.' }] }, 'L1', 'l1');
  if ('error' in v) throw new Error(v.error);
  confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
  LAW = v.instrument.id;
  const holder = (createOrganisation({ name: 'Sample Pharma Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
  number = await authorised(holder, 'Sampleprofen');
  // A recall decided, published and completed: its grounds and completion stay with the regulator.
  const rc = openCase({ procedure: 'medicines.recall', fields: { product: number, grounds: GROUNDS } }, med('clerk')) as { id: string };
  doc(rc.id, 'recall-notification'); await step(rc.id, 'assess-risk', med('clerk'));
  doc(rc.id, 'risk-assessment'); await step(rc.id, 'propose', med('clerk'), { reason: 'Risk' });
  await decide(rc.id, 'recall', 'Recall batch 7');
  await step(rc.id, 'publish-notice', med('clerk'), { fields: { publicNotice: 'Return batch 7 to the pharmacy.' } });
  doc(rc.id, 'supply-chain-notice'); await step(rc.id, 'notify-supply-chain', med('clerk'), { reason: 'Told' });
  doc(rc.id, 'completion-report'); await step(rc.id, 'report-completion', med('clerk'));
  await step(rc.id, 'verify-completion', med('s1', 'signatory'), { reason: 'Reconciled', fields: { completionSummary: COMPLETION } });
  // A withdrawal decided but its notice not published.
  withdrawnNumber = await authorised(holder, 'Othermol');
  const w = openCase({ procedure: 'medicines.suspension', fields: { product: withdrawnNumber, grounds: GROUNDS, publicNotice: UNPUBLISHED } }, med('clerk')) as { id: string };
  doc(w.id, 'grounds'); await step(w.id, 'notify', med('clerk'), { reason: 'Notice' });
  await step(w.id, 'propose', med('clerk'), { reason: 'Considered' });
  await decide(w.id, 'withdraw', 'Withdrawn');
  // An application not decided: never listed.
  const a = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Pendingvir', composition: COMPOSITION } }, med('clerk')) as { id: string };
  doc(a.id, 'application-form'); await step(a.id, 'register', med('clerk'));
});

describe('product privacy across every output of the register', () => {
  it('never carries confidential, restricted, personal or unpublished content in lists, the public answer, a refused full read, the exchange, the twin, the setup hub or the audit chain', async () => {
    for (const classification of ['shipped', 'every publishable attribute'] as const) {
      if (classification !== 'shipped') {
        const p = proposeProductDisclosure([...PUBLISHABLE_ATTRIBUTES], [{ instrument: LAW, eId: 'sec_30' }], 'Admin 1', 'a1');
        expect(p).not.toHaveProperty('error');
        expect(confirmProductDisclosure('Admin 2', 'a2')).not.toHaveProperty('error');
      }
      for (const viewer of [null, { id: 'o', name: 'Officer elsewhere', label: 'Officer elsewhere', institution: OTHER, role: 'officer' }, { id: 'g', name: 'Government administrator', label: 'Government administrator', role: 'administrator' }, { id: 'm', name: 'Administrator at the regulator', label: 'Administrator at the regulator', institution: MED, role: 'administrator' }]) {
        official = viewer;
        const outputs: [string, Response][] = [
          ['list', await route.GET(req(''))],
          ['list of medicines', await route.GET(req('?kind=medicine'))],
          ['one', await route.GET(req(`?number=${number}`))],
          ['one withdrawn', await route.GET(req(`?number=${withdrawnNumber}`))],
          ['full read', await route.GET(req(`?number=${number}&full=1`))],
          ['search', await route.GET(req('?search=1'))],
          ['collections', await collections.GET(req('') as never)],
        ];
        for (const [name, r] of outputs) {
          const body = await r.text();
          expect(body.length, name).toBeGreaterThan(10);
          expect(body.match(PRIVATE)?.[0] ?? null, `${name} for ${viewer?.name ?? 'no session'} (${classification})`).toBeNull();
        }
        if (viewer) expect((await route.GET(req(`?number=${number}&full=1`))).status).toBe(403);
      }
      const ex = await callService({ kind: 'module', id: 'test', name: 'Test' }, 'product.status', { number }, 'verify-product-status');
      expect(JSON.stringify(ex), classification).not.toMatch(PRIVATE);
      expect(JSON.stringify((await callService({ kind: 'module', id: 'test', name: 'Test' }, 'product.status', { number: withdrawnNumber }, 'verify')).data)).not.toMatch(PRIVATE);
    }
    // The list is not empty: two decided products, with the published recall notice only; the application is not listed.
    official = null;
    const list = await (await route.GET(req(''))).json() as { products: { productId: string; fields: Record<string, unknown>; notices: { kind: string; notice: string }[] }[] };
    expect(list.products.map(p => p.productId).sort()).toEqual([number, withdrawnNumber].sort());
    const one = list.products.find(p => p.productId === number)!;
    expect(one.notices).toEqual([{ kind: 'recall', at: expect.any(String), notice: 'Return batch 7 to the pharmacy.' }]);
    expect(one.fields).toMatchObject({ name: 'Sampleprofen', strength: '200 mg', status: 'authorised', holder: { organisation: expect.stringMatching(/^ORG-/), name: 'Sample Pharma Ltd' } });
    expect(list.products.find(p => p.productId === withdrawnNumber)!).toMatchObject({ notices: [], fields: { status: 'withdrawn' } });
    expect(JSON.stringify(onboardingStatus({ NODE_ENV: 'test', CIVICOS_MODE: 'demo' } as never))).not.toMatch(PRIVATE);
    expect(JSON.stringify(listAudit())).not.toMatch(PRIVATE);
    expect(JSON.stringify(listAccess())).not.toMatch(PRIVATE);
  }, 120_000);

  it('gives the full record to the medicines authority\'s officials only, and writes every read, allowed or refused, to the access log', async () => {
    official = { id: 'r1', name: 'Assessor', label: 'Assessor', institution: MED, role: 'officer' };
    const r = await route.GET(req(`?number=${number}&full=1`));
    expect(r.status).toBe(200);
    expect(await r.text()).toMatch(new RegExp(`${COMPOSITION}|${GROUNDS}`));
    official = { id: 'o', name: 'Officer elsewhere', label: 'Officer elsewhere', institution: OTHER, role: 'signatory' };
    expect((await route.GET(req(`?number=${number}&full=1`))).status).toBe(403);
    official = null;
    expect((await route.GET(req(`?number=${number}&full=1`))).status).toBe(401);
    const log = listAccess().filter(e => e.record.register === 'products');
    expect(log.map(e => [e.by.name, e.action, e.result]).sort()).toEqual([['Assessor', 'view', 'allowed'], ['Officer elsewhere', 'refused', 'refused']]);
  });
});
