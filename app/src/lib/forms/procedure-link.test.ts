// A library contract's procedure link (owner's direction of 21 October 2026,
// health integration §2): missing, draft, under review or approved, computed
// from the package register on every read, never stored or set through an
// API; a form whose required procedure is missing does not pass its go-live
// gate, and the state shows on the form's library details.
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { installReferenceProcedures as installAll } from '@/lib/casework/modules';
import { draftPackage, approvePackage, resetPackages, listPackages } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { GET, POST } from '@/app/api/case-packages/route';
import { CATALOGUE_CONTRACTS } from './library/catalogue-contracts';
import { procedureLink } from './procedure-link';
import { libraryPublicationOf, findLibraryForm, libraryInfo, serviceIds } from './page-data';
import { resetPublication } from './publication';
import { installAdministrationProcedures } from '@/lib/administration/procedures';
import { installProcurementProcedures } from '@/lib/procurement/procedures';

const FIELD_SERIES = 'docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md';
const lib = (id: string) => CATALOGUE_CONTRACTS.find(f => f.specId === id)!;
const found = (id: string) => findLibraryForm(lib(id).identity)!;
const req = (q: string) => new NextRequest(`http://localhost/api/case-packages?${q}`);
let CIVIL = '';
let citation = { instrument: '', eId: 'sec_12', version: '', digest: '', on: '2026-01-01' };

/** A procedure version (the birth reference's stages and fields) whose form carries the HLT-FAC-001 contract by its identity. */
const carrying = (tests = true) => draftPackage({
  ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: [citation], ...(tests ? {} : { tests: [] }),
  form: { ...REFERENCE_BIRTH.form!, catalogueIds: ['HLT-FAC-001'], catalogueSource: FIELD_SERIES, spec: { id: 'HLT-FAC-001', version: '1' } },
} as never, 'Official rg', 'rg', registeredEffects());

describe('procedure-link states', () => {
  beforeEach(() => {
    for (const r of [resetLaw, resetPackages, resetPublication]) r();
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ languages: [], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL, healthRegulation: CIVIL, professionalRegulation: CIVIL } } } as never, 'Administrator');
    const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
    citation = { ...citation, instrument: v.instrument.id, version: v.version.id, digest: v.version.digest };
    setNationDays();
  });

  it('is missing for every form without a procedure (batch-2 forms no product procedure carries, batch-1 forms without one), and that fails the go-live gate', () => {
    for (const f of CATALOGUE_CONTRACTS.filter(x => !x.procedure)) {
      const pub = libraryPublicationOf(found(f.specId));
      expect(pub.procedure.state, f.identity).toBe('missing');
      const gate = pub.automatic.find(g => g.id === 'procedure-link')!;
      if (pub.procedure.required) expect(gate, f.identity).toMatchObject({ passed: false, detail: [expect.stringMatching(/^procedure: missing/)] });
    }
    expect(libraryPublicationOf(found('HLT-MED-001')).blockers.join(' ')).toMatch(/procedure: missing/);
  });

  it('needs no procedure where an exchange service answers, but needs that service', () => {
    for (const id of ['HLT-FAC-010', 'HLT-LIC-014']) {
      const pub = libraryPublicationOf(found(id));
      expect(pub.procedure, id).toMatchObject({ required: false, exchange: { exists: true } });
      expect(pub.automatic.find(g => g.id === 'procedure-link')!.passed, id).toBe(true);
    }
    expect(serviceIds()).toContain('organisation.standing');
    // The product check is answered by the product.status service (Health I4): its gate finds the service; a form naming a service that does not exist cannot go live.
    expect(serviceIds()).toContain('product.status');
    const product = libraryPublicationOf(found('HLT-MED-024'));
    expect(product.procedure).toMatchObject({ required: false, exchange: { id: 'product.status', exists: true } });
    expect(product.automatic.find(g => g.id === 'procedure-link')).toMatchObject({ passed: true });
    expect(procedureLink({ identity: lib('HLT-MED-024').identity, procedure: null, deviations: [{ id: 'no-case' }] }, { services: [], packages: [] })).toMatchObject({ state: 'missing', exchange: { id: null, exists: false } });
  });

  it('is draft for a linked batch-1 form once its reference procedure is in the register, until a version carries the contract', () => {
    expect(procedureLink({ identity: lib('HLT-FAC-002').identity, procedure: { key: 'health.facility' } }).state).toBe('missing');
    installAll('Administrator');
    expect(listPackages({ key: 'health.facility' }).length).toBeGreaterThan(0);
    // Internal-administration templates are adopted per institution (the next test); local-government templates by each local government (below).
    for (const f of CATALOGUE_CONTRACTS.filter(x => x.procedure && x.batch !== 5 && !x.procedure.key.startsWith('lg.') && !x.procedure.key.startsWith('xi.'))) {
      const l = procedureLink({ identity: f.identity, procedure: f.procedure });
      expect(l.state, f.identity).toBe('draft');
      expect(l.detail).toMatch(/no version of it carries this contract yet/);
    }
  });

  it('is draft for each batch-5 form once an institution has adopted its internal-administration template, never before', () => {
    const adm = CATALOGUE_CONTRACTS.filter(f => f.batch === 5 && f.procedure);
    // Nine internal-administration forms, and since plan step I5 the procurement requisition, evaluation and order (proc.plan, proc.tender).
    expect(adm).toHaveLength(12);
    for (const f of adm) expect(procedureLink({ identity: f.identity, procedure: f.procedure }).state, f.identity).toBe('missing');
    const r = installAdministrationProcedures(CIVIL, 'Administrator', 'admin');
    if ('error' in r) throw new Error(r.error);
    const p = installProcurementProcedures(CIVIL, 'Administrator', 'admin');
    if ('error' in p) throw new Error(p.error);
    for (const f of adm) {
      const l = procedureLink({ identity: f.identity, procedure: f.procedure });
      expect(l, f.identity).toMatchObject({ state: 'draft', linked: { key: f.procedure!.key, inRegister: true } });
      expect(libraryPublicationOf(findLibraryForm(f.identity)!).status, f.identity).toBe('contract_draft');
    }
  });

  it('is draft for each batch-10 local-government form once a local government has adopted its template, never before (plan I7)', async () => {
    const lg = CATALOGUE_CONTRACTS.filter(f => f.batch === 10 && f.procedure?.key.startsWith('lg.'));
    expect(lg.map(f => f.specId).sort()).toEqual(['LRG-FIN-008', 'LRG-ORG-004', 'LRG-ORG-005', 'LRG-SVC-013', 'LRG-SVC-014']);
    for (const f of lg) expect(procedureLink({ identity: f.identity, procedure: f.procedure }).state, f.identity).toBe('missing');
    const { createMinistry } = await import('@/lib/data/store');
    const { recordTermsDuringSetup } = await import('@/lib/data/store/institutions');
    const { installLocalGovernmentProcedures } = await import('@/lib/localgov/procedures');
    const m = createMinistry({ archetype: 'GENERIC', name: 'Lakeside District Council', slug: `lakeside-${Math.random().toString(36).slice(2, 7)}` });
    if ('error' in m) throw new Error(m.error);
    const t = recordTermsDuringSetup(m.id, { standing: 'subnational', branch: 'executive' }, 'Setup');
    if (t && typeof t === 'object' && 'error' in t) throw new Error(String(t.error));
    const r = installLocalGovernmentProcedures(m.id, 'District clerk', 'local:clerk');
    if ('error' in r) throw new Error(r.error);
    for (const f of lg) expect(procedureLink({ identity: f.identity, procedure: f.procedure }), f.identity).toMatchObject({ state: 'draft', linked: { key: f.procedure!.key, inRegister: true } });
  });

  it('is draft for each batch-11 form once an institution has adopted the cross-institution templates, never before (plan I9)', async () => {
    const xi = CATALOGUE_CONTRACTS.filter(f => f.batch === 11 && f.procedure);
    expect(xi).toHaveLength(12);
    for (const f of xi) expect(procedureLink({ identity: f.identity, procedure: f.procedure }).state, f.identity).toBe('missing');
    const { installCrossInstitutionProcedures } = await import('@/lib/federation/procedures');
    const r = installCrossInstitutionProcedures(CIVIL, 'Administrator', 'admin');
    if ('error' in r) throw new Error(r.error);
    for (const f of xi) expect(procedureLink({ identity: f.identity, procedure: f.procedure }), f.identity).toMatchObject({ state: 'draft', linked: { key: f.procedure!.key, inRegister: true } });
  });

  it('is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it', () => {
    const med = CATALOGUE_CONTRACTS.filter(f => f.batch === 2 && f.procedure);
    // 14 since the product register, 6 more since corrective action, import and controlled-medicine authorisation, safety intake and reconsideration.
    expect(med).toHaveLength(20);
    for (const id of ['HLT-MED-012', 'HLT-MED-013', 'HLT-MED-014', 'HLT-MED-015', 'HLT-MED-020', 'HLT-MED-023']) expect(med.map(f => f.specId), id).toContain(id);
    // Not installed: the procedure each names is not in the register yet.
    for (const f of med) expect(libraryPublicationOf(findLibraryForm(f.identity)!).procedure.state, f.identity).toBe('missing');
    installAll('Administrator');
    for (const f of med) {
      const pub = libraryPublicationOf(findLibraryForm(f.identity)!);
      expect(pub.procedure, f.identity).toMatchObject({ state: 'draft' });
      expect(procedureLink({ identity: f.identity, procedure: f.procedure }), f.identity).toMatchObject({ state: 'draft', linked: { key: f.procedure!.key, inRegister: true } });
      expect(pub.status, f.identity).not.toBe('approved');
      expect(pub.human.filter(g => g.applies && g.passed), f.identity).toEqual([]);
    }
    // Every batch-2 form now names a procedure, except the product check, which the product.status service answers.
    expect(CATALOGUE_CONTRACTS.filter(x => x.batch === 2 && !x.procedure).map(f => f.specId)).toEqual(['HLT-MED-024']);
  });

  it('is draft for the public-health forms and the complaint forms once their procedures are in the register, linked by identity, never approved by it', () => {
    const linked: Record<string, string> = { 'HLT-PH-011': 'public-health.programme-return', 'HLT-PH-015': 'public-health.programme-return', 'HLT-PH-014': 'public-health.risk-communication', 'HLT-FAC-009': 'health.complaint', 'HLT-LIC-008': 'prof.complaint' };
    for (const [id, key] of Object.entries(linked)) {
      expect(lib(id).procedure, id).toMatchObject({ key });
      expect(lib(id).identity, id).toBe(`FIELD-SERIES-PARTS-05-07:${id}@1`);
      expect(libraryPublicationOf(found(id)).procedure.state, id).toBe('missing');
    }
    installAll('Administrator');
    for (const id of Object.keys(linked)) {
      const pub = libraryPublicationOf(found(id));
      expect(pub.procedure, id).toMatchObject({ state: 'draft' });
      expect(procedureLink({ identity: lib(id).identity, procedure: lib(id).procedure }), id).toMatchObject({ state: 'draft', linked: { key: linked[id], inRegister: true } });
      expect(pub.status, id).not.toBe('approved');
      expect(pub.human.filter(g => g.applies && g.passed), id).toEqual([]);
    }
  });

  it('is draft for the tax-services forms (batch 6) and batch 3\'s change forms once the tax procedures are in the register, linked by identity, never approved by it', () => {
    const tax = CATALOGUE_CONTRACTS.filter(f => (f.batch === 6 || f.batch === 3) && f.procedure && f.procedure.key !== 'tax.registration');
    // 56 of batch 6 and the 7 registration change forms of batch 3 (tax.registration-amendment).
    expect(tax.filter(f => f.batch === 6)).toHaveLength(56);
    expect(tax.filter(f => f.batch === 3).map(f => f.procedure!.key)).toEqual(Array(7).fill('tax.registration-amendment'));
    for (const f of tax) expect(libraryPublicationOf(findLibraryForm(f.identity)!).procedure.state, f.identity).toBe('missing');
    installAll('Administrator');
    for (const f of tax) {
      expect(f.identity, f.specId).toBe(`FIELD-SERIES-PARTS-01-02:${f.specId}@1`);
      const pub = libraryPublicationOf(findLibraryForm(f.identity)!);
      expect(pub.procedure, f.identity).toMatchObject({ state: 'draft' });
      expect(procedureLink({ identity: f.identity, procedure: f.procedure }), f.identity).toMatchObject({ state: 'draft', linked: { key: f.procedure!.key, inRegister: true } });
      expect(pub.status, f.identity).toBe('contract_draft');
      expect(pub.human.filter(g => g.applies && g.passed), f.identity).toEqual([]);
    }
    // The tax procedures arrive as drafts: nothing is approved by installing them.
    for (const key of new Set(tax.map(f => f.procedure!.key))) expect(listPackages({ key }).map(p => p.state), key).toEqual(['draft']);
  });

  it('moves draft → under review → approved only as the register changes', () => {
    installReferenceProcedures('Administrator');
    const state = () => libraryPublicationOf(found('HLT-FAC-001')).procedure.state;
    expect(state()).toBe('missing');
    expect(carrying(false)).not.toHaveProperty('error');
    expect(state()).toBe('draft');
    resetPackages(); installReferenceProcedures('Administrator');
    expect(carrying()).not.toHaveProperty('error');
    expect(state()).toBe('under_review');
    const ok = approvePackage('civil.birth', 2, 'Official drg', 'drg', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    expect(ok).not.toHaveProperty('error');
    expect(state()).toBe('approved');
    expect(libraryPublicationOf(found('HLT-FAC-001')).procedure.carriedBy).toMatchObject({ key: 'civil.birth', version: 2, state: 'approved' });
  });

  it('is shown on the library details and in the API, and cannot be set through it', async () => {
    const info = libraryInfo(found('HLT-MED-004'));
    expect(info.procedureLink).toMatchObject({ state: 'missing', label: 'missing', required: true });
    const j = await GET(req(`form=${encodeURIComponent(lib('HLT-MED-004').identity)}`)).json() as { library: { procedureLink: { state: string } } };
    expect(j.library.procedureLink.state).toBe('missing');
    // A state sent with a draft is ignored: the register decides.
    installReferenceProcedures('Administrator');
    const body = { op: 'draft', package: { ...asNationSets(REFERENCE_BIRTH), version: 2, citations: [citation], procedureLink: 'approved', state: 'approved', form: { ...REFERENCE_BIRTH.form!, catalogueIds: ['HLT-FAC-001'], catalogueSource: FIELD_SERIES, spec: { id: 'HLT-FAC-001', version: '1' }, procedureLink: 'approved' } } };
    const r = await POST(new NextRequest('http://localhost/api/case-packages', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
    expect(r.status).toBe(201);
    const stored = listPackages({ key: 'civil.birth' }).find(p => p.version === 2)!;
    expect(stored.state).toBe('draft');
    expect(stored).not.toHaveProperty('procedureLink');
    expect(['draft', 'under_review']).toContain(libraryPublicationOf(found('HLT-FAC-001')).procedure.state);
    const lib2 = await GET(req('library=1')).json() as { forms: { identity: string; procedureLink: { state: string } }[] };
    expect(lib2.forms.find(f => f.identity === lib('HLT-FAC-001').identity)!.procedureLink.state).not.toBe('approved');
  });
});
