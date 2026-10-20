// Cycle 3 recovery (owner's directive, non-negotiable 9): the new registers
// are saved and restored like every other store, keep every version, and a
// restored register never gives a number it already gave.
import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileAdapter, flush, restore } from './persist';
import { resetTax, registerTaxpayer, getTaxpayer } from '@/lib/tax/register';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';
import { resetEducation, recordAward, correctAward, getAward } from '@/lib/education/register';
import { resetProfessions, registerProfessional, getProfessional } from '@/lib/professions/register';
import { resetHealth, recordCapacity, capacityOf } from '@/lib/health/register';
import { resetCustoms, lodgeDeclaration, amendGoods, getDeclaration } from '@/lib/customs/register';
import { resetPermitAuthorities, installProposedDefaults, listMappings } from '@/lib/permits/authority';

const STORES = ['__civicosTax', '__civicosOrganisations', '__civicosEducation', '__civicosProfessions', '__civicosHealth', '__civicosCustoms', '__civicosPermitAuthorities'];
const g = globalThis as unknown as Record<string, unknown> & { __persistLast?: unknown };

describe('cycle 3 registers survive a save and restore', () => {
  it('restores taxpayers, qualifications with their versions, professionals, returns, declarations and draft mappings, and numbering continues', async () => {
    for (const r of [resetTax, resetOrganisations, resetEducation, resetProfessions, resetHealth, resetCustoms, resetPermitAuthorities]) r();
    g.__persistLast = undefined;
    const tin = (registerTaxpayer({ party: { kind: 'person', id: 'BR-1', name: 'A' }, taxTypes: ['income'] }, 'c1', 'Officer') as { tin: string }).tin;
    const school = createOrganisation({ name: 'Hill School', kind: 'school' }, 'c', 'R') as { id: string; number: string };
    setStanding(school.id, { register: 'schools', state: 'granted', reason: 'ok' }, 'R');
    const hospital = createOrganisation({ name: 'Hill Hospital', kind: 'hospital' }, 'c', 'R') as { id: string; number: string };
    setStanding(hospital.id, { register: 'health-facilities', state: 'granted', reason: 'ok' }, 'R');
    const qua = (recordAward({ holderRef: 'BR-2', holderName: 'B', title: 'Certificate', awardingBody: school.number, awardedOn: '2026-01-01' }, 'c2', 'Officer') as { number: string }).number;
    correctAward(qua, { holderName: 'B. B.' }, 'Name corrected', 'c3', 'Officer');
    const prn = (registerProfessional({ profession: 'nurse', personRef: 'BR-3', name: 'C' }, 'c4', 'Officer') as { number: string }).number;
    recordCapacity({ organisation: hospital.number, period: '2026-Q3', counts: { 'beds.total': 50 } }, 'Officer');
    const cus = (lodgeDeclaration({ direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-1', name: 'D' }, shipment: { mode: 'sea', transportRef: 'BL-1', from: 'CN', to: 'KE' }, currency: 'KES', goods: '0901 | coffee | ET | 1 kg | 100' }, 'c5', 'Officer') as { number: string }).number;
    amendGoods(cus, '0901 | green coffee | ET | 1 kg | 100', 'Description', 'c5', 'Officer');
    installProposedDefaults('Administrator');

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'civicos-cycle3-'));
    const adapter = fileAdapter(dir);
    const written = await flush(adapter);
    for (const k of STORES) expect(written, k).toContain(k);
    const saved = await adapter.loadAll();

    // Lose everything, then restore.
    for (const k of STORES) g[k] = undefined;
    expect(getTaxpayer(tin)).toBeUndefined();
    // Reading started an empty store; a restore never overwrites a live one, so clear it again.
    for (const k of STORES) g[k] = undefined;
    expect(restore(saved)).toEqual(expect.arrayContaining(STORES));

    expect(getTaxpayer(tin)).toMatchObject({ state: 'active' });
    expect(getAward(qua)!.versions.map(v => v.holderName)).toEqual(['B', 'B. B.']);
    expect(getProfessional(prn)).toMatchObject({ state: 'registered' });
    expect(capacityOf(hospital.number)[0]!.versions[0]!.counts).toEqual({ 'beds.total': 50 });
    expect(getDeclaration(cus)!.versions).toHaveLength(2);
    expect(listMappings().every(m => m.state === 'draft')).toBe(true);
    // Numbering continues after the restore.
    const next = registerTaxpayer({ party: { kind: 'person', id: 'BR-9', name: 'Z' }, taxTypes: ['income'] }, 'c9', 'Officer') as { tin: string };
    expect(next.tin).not.toBe(tin);
  });
});
