import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { checkCode, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { ORGANISATION_PROCEDURES } from './procedures';
import { resetOrganisations, getOrganisation, listOrganisations, defineRegisterType } from './register';

let REG = '', EDU = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const reg = at(() => REG), edu = at(() => EDU);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));

async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) {
  const r = await act(id, { action, ...extra }, who);
  if ('error' in r) throw new Error(`${action}: ${r.error}`);
  return r;
}
function docs(caseId: string, inst: string, classes: string[]) {
  for (const c of classes) {
    const d = addDocument({ class: c, title: c, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string };
    attach(caseId, d.id, reg('clerk'));
  }
}

function setup() {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [REG, EDU] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { businessRegister: REG, higherEducationAccreditation: EDU } } }, 'Administrator');
    for (const p of ORGANISATION_PROCEDURES) {
      const d = draftPackage(p, 'Author', 'author', registeredEffects());
      if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
}

describe('organisation procedures', () => {
  beforeEach(setup);

  it('registers a company, licenses it, suspends, reinstates and revokes the licence, each with four eyes', async () => {
    const c = openCase({ procedure: 'org.registration', fields: { orgName: 'Riverside Pharmacy Ltd', orgKind: 'pharmacy', representativeName: 'A. Owner' } }, reg('clerk')) as { id: string };
    docs(c.id, REG, ['constitution', 'representative-identity']);
    await step(c.id, 'check', reg('clerk'));
    await step(c.id, 'verify', reg('clerk'));
    expect(await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'Documents in order' })).toMatchObject({ pending: true });
    const done = await step(c.id, 'register', reg('s2', 'signatory'));
    const number = getOrganisationFrom(done);
    const org = getOrganisation(number)!;
    expect(org.standings).toEqual([expect.objectContaining({ register: 'companies', state: 'granted' })]);
    const issued = await step(c.id, 'issue', reg('clerk'));
    expect(issued.case.stage).toBe('certificate-issued');
    expect(getOrganisation(number)!.standings[0]!.certificate).toBeTruthy();

    // A licence: applied when checked, granted after inspection with conditions, certificate verifiable.
    const l = openCase({ procedure: 'org.licence', fields: { organisation: number, conditions: 'Pharmacist on duty during opening hours' } }, reg('clerk')) as { id: string };
    await step(l.id, 'check', reg('clerk'));
    expect(getOrganisation(number)!.standings.find(s => s.register === 'business-licences')?.state).toBe('applied');
    docs(l.id, REG, ['premises-evidence', 'fee-receipt']);
    await step(l.id, 'inspect', reg('clerk'));
    docs(l.id, REG, ['inspection-report']);
    await step(l.id, 'inspected', reg('clerk'));
    await step(l.id, 'grant', reg('s1', 'signatory'), { reason: 'Inspection passed' });
    await step(l.id, 'grant', reg('s2', 'signatory'));
    await step(l.id, 'issue', reg('clerk'));
    const licence = getOrganisation(number)!.standings.find(s => s.register === 'business-licences')!;
    expect(licence).toMatchObject({ state: 'granted', conditions: ['Pharmacist on duty during opening hours'] });
    expect(licence.history.at(-1)?.decision ?? licence.history.find(h => h.state === 'granted')?.decision).toBeTruthy();
    expect(checkCode(licence.certificate!)).toMatchObject({ status: 'valid' });

    // Suspension, reinstatement, revocation.
    const s = openCase({ procedure: 'org.licence-suspension', fields: { organisation: number } }, reg('clerk')) as { id: string };
    docs(s.id, REG, ['grounds']);
    await step(s.id, 'notify', reg('clerk'), { reason: 'Unlicensed sale reported' });
    await step(s.id, 'propose', reg('clerk'), { reason: 'Representations not convincing' });
    await step(s.id, 'suspend', reg('s1', 'signatory'), { reason: 'Suspended pending compliance' });
    await step(s.id, 'suspend', reg('s2', 'signatory'));
    expect(getOrganisation(number)!.standings.find(x => x.register === 'business-licences')?.state).toBe('suspended');
    await step(s.id, 'reinstate', reg('s1', 'signatory'), { reason: 'Complied' });
    await step(s.id, 'reinstate', reg('s2', 'signatory'));
    expect(getOrganisation(number)!.standings.find(x => x.register === 'business-licences')?.state).toBe('granted');
    const v = openCase({ procedure: 'org.licence-revocation', fields: { organisation: number } }, reg('clerk')) as { id: string };
    docs(v.id, REG, ['grounds']);
    await step(v.id, 'notify', reg('clerk'), { reason: 'Repeated breach' });
    await step(v.id, 'propose', reg('clerk'), { reason: 'Considered' });
    await step(v.id, 'revoke', reg('s1', 'signatory'), { reason: 'Revoked' });
    await step(v.id, 'revoke', reg('s2', 'signatory'));
    expect(getOrganisation(number)!.standings.find(x => x.register === 'business-licences')?.state).toBe('revoked');
  });

  it('refuses to change a standing in a register another authority keeps', async () => {
    const c = openCase({ procedure: 'org.registration', fields: { orgName: 'Northern University', orgKind: 'university', representativeName: 'V. C.' } }, reg('clerk')) as { id: string };
    docs(c.id, REG, ['constitution', 'representative-identity']);
    await step(c.id, 'check', reg('clerk')); await step(c.id, 'verify', reg('clerk'));
    await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'ok' });
    const done = await step(c.id, 'register', reg('s2', 'signatory'));
    const number = getOrganisationFrom(done);
    // The business register's licence procedure cannot touch the higher-education register.
    const l = openCase({ procedure: 'org.licence', fields: { organisation: number, register: 'higher-education' } }, reg('clerk')) as { id: string };
    const refused = await act(l.id, { action: 'check' }, reg('clerk'));
    expect(refused, JSON.stringify(refused)).toMatchObject({ error: expect.stringMatching(/kept by another authority/) });
    // The accreditation authority can, and a new register type can be kept by any institution.
    const a = openCase({ procedure: 'org.accreditation', fields: { organisation: number } }, edu('clerk')) as { id: string };
    await step(a.id, 'check', edu('clerk'));
    expect(getOrganisation(number)!.standings.find(s => s.register === 'higher-education')?.state).toBe('applied');
    expect(defineRegisterType({ key: 'licensed-pharmacies', title: 'Licensed pharmacies', kind: 'licence', authority: EDU, orgKinds: ['pharmacy'] }, 'Administrator')).not.toHaveProperty('error');
  });
});

/** The organisation the registration case created. */
function getOrganisationFrom(r: { case: { fields: Record<string, unknown> } }): string {
  return listOrganisations({ q: String(r.case.fields.orgName) })[0]?.number ?? '';
}

describe('organisation procedures under the permit authority registry', () => {
  beforeEach(setup);
  it('follow the approved mapping, and in production refuse until one is approved', async () => {
    const { draftMapping, approveMapping, resetPermitAuthorities } = await import('@/lib/permits/authority');
    const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
    resetPermitAuthorities(); resetLaw();
    const run = async () => {
      const c = openCase({ procedure: 'org.registration', fields: { orgName: `Firm ${Math.random()}`, orgKind: 'company', representativeName: 'R' } }, reg('clerk')) as { id: string };
      docs(c.id, REG, ['constitution', 'representative-identity']);
      await step(c.id, 'check', reg('clerk')); await step(c.id, 'verify', reg('clerk'));
      await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'ok' });
      return act(c.id, { action: 'register' }, reg('s2', 'signatory'));
    };
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await run()).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs business-registration/) });
    // The rest runs as a demonstration installation (production also needs its decision key).
    vi.stubEnv('CIVICOS_MODE', 'demo');
    const v = recordVersion({ instrument: { title: 'Companies Act', type: 'act', jurisdiction: 'X', year: 2001, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'The Registrar registers companies.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    draftMapping({ permitType: 'business-registration', title: 'Business registration', lead: 'businessRegister', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: v.instrument.id, eId: 'sec_2' }] }, 'Admin A', 'aa');
    approveMapping('business-registration', 1, 'Admin B', 'ab');
    const ok = await run();
    expect(ok, JSON.stringify(ok).slice(0, 300)).not.toHaveProperty("error");
    // An approved mapping naming another authority takes the power away from the register type's keeper.
    draftMapping({ permitType: 'business-registration', title: 'Business registration', lead: EDU, effectiveFrom: '2020-01-02', legalBasis: [{ instrument: v.instrument.id, eId: 'sec_2' }], handoverPlan: 'Test handover' }, 'Admin A', 'aa');
    approveMapping('business-registration', 2, 'Admin B', 'ab');
    expect(await run()).toMatchObject({ error: expect.stringMatching(/belongs to/) });
    vi.unstubAllEnvs();
  });
});
