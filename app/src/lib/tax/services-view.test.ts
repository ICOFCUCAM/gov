// The tax services view (/api/tax/services, the Tax services tab and the
// onboarding track): configuration only, read from the package register,
// the permit authority mappings and the form library; nothing approved by
// installing the references; no taxpayer data.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetPackages } from '@/lib/casework/packages';
import { installReferenceProcedures } from '@/lib/casework/modules';
import { installProposedDefaults, resetPermitAuthorities } from '@/lib/permits/authority';
import { resetTax, registerTaxpayer } from './register';
import { taxServicesView } from './services-view';
import { GET } from '@/app/api/tax/services/route';

describe('tax services view', () => {
  beforeEach(() => { resetPackages(); resetPermitAuthorities(); resetTax(); });

  it('shows every tax procedure not installed, then as drafts with proposed mappings, never approved', () => {
    const before = taxServicesView();
    expect(before.procedures).toHaveLength(11);
    expect(before.procedures.every(p => p.state === 'not-installed')).toBe(true);
    installReferenceProcedures('Administrator');
    installProposedDefaults('Administrator');
    const v = taxServicesView();
    expect(v.procedures.every(p => p.state === 'draft')).toBe(true);
    expect(v.counts).toMatchObject({ procedures: 11, approved: 0, mappingsApproved: 0, waiting: 39 + 12 + 2 });  // I9: + the tax status check and its response (forms batch 11, answered by taxpayer.status)
    // Every decision is classified; each permit type's mapping is a proposal, unapproved.
    for (const p of v.procedures) for (const d of p.decisions) expect(d, `${p.key} ${d.step}`).toMatchObject({ permitType: expect.any(String), mapping: 'draft' });
    // The forms each procedure carries read draft (in the register, no version carries them yet).
    const forms = v.procedures.flatMap(p => p.forms);
    expect(forms.length).toBe(56 + 17);
    expect(new Set(forms.map(f => f.link))).toEqual(new Set(['draft']));
    expect(v.procedures.find(p => p.key === 'tax.refund')!.forms.map(f => f.specId)).toEqual(expect.arrayContaining(['tax.refund.application', 'tax.refund.decision', 'tax.refund.reconciliation']));
    // Periods ship unset.
    expect(v.procedures.flatMap(p => p.periods).every(d => !d.set)).toBe(true);
  });

  it('carries no taxpayer data', async () => {
    registerTaxpayer({ party: { kind: 'organisation', id: 'ORG-9', name: 'Secret Traders' }, taxTypes: ['income'] }, 'c1', 'Officer');
    const body = JSON.stringify(await (await GET()).json());
    expect(body).not.toMatch(/Secret Traders|TIN-|ORG-9/);
  });
});
