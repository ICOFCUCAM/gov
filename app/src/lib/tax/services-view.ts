// The tax services at a glance (plan step I5, forms batch 6): each tax
// procedure with its state in this installation's package register, the
// permit type each decision rests on and whether its mapping is approved,
// and the catalogue forms each carries by identity (their procedure-link
// state), beside the forms that still wait for a procedure and why.
// Configuration only: no taxpayer, return, assessment, balance or refund is
// read here (those are the tax register's, under canReadTax(), /api/tax).

import { listPackages } from '@/lib/casework/packages';
import { classifyDecision } from '@/lib/permits/decisions';
import { listMappings, mappingInForce } from '@/lib/permits/authority';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { procedureLink, type ProcedureLinkState } from '@/lib/forms/procedure-link';
import { TAX_PROCEDURES } from './procedures';
import type { Case } from '@/lib/casework/types';

export interface TaxServiceForm { identity: string; specId: string; title: string; batch: number; stage: string; action?: string; link: ProcedureLinkState }
export interface TaxServiceProcedure {
  key: string; title: string;
  /** Where the procedure stands in this installation: not installed, a draft, approved (in force). */
  state: 'not-installed' | 'draft' | 'approved';
  version?: number;
  stages: number;
  decisions: { step: string; label: string; permitType: string | null; mapping: 'approved' | 'draft' | 'none' }[];
  periods: { label: string; set: boolean }[];
  forms: TaxServiceForm[];
}
export interface TaxServicesView {
  procedures: TaxServiceProcedure[];
  waiting: { identity: string; specId: string; title: string; batch: number; why: string }[];
  counts: { forms: number; linked: number; waiting: number; procedures: number; approved: number; mappingsApproved: number; permitTypes: number };
}

const TAX_FORMS = () => CATALOGUE_CONTRACTS.filter(f => f.owner === 'tax');

export function taxServicesView(): TaxServicesView {
  const forms = TAX_FORMS();
  const packages = listPackages();
  const types = new Set<string>();
  const procedures: TaxServiceProcedure[] = TAX_PROCEDURES.map(p => {
    const versions = packages.filter(x => x.key === p.key && x.state !== 'superseded').sort((a, b) => b.version - a.version);
    const approved = versions.find(x => x.state === 'approved');
    const top = approved ?? versions[0];
    const decisions = p.actions.filter(a => a.decision).map(a => {
      const cls = classifyDecision({ fields: {}, owner: '' } as unknown as Case, a, p);
      const permitType = cls?.kind === 'mapping' ? cls.permitType : null;
      if (permitType) types.add(permitType);
      const mapping = !permitType ? 'none' as const : mappingInForce(permitType) ? 'approved' as const : listMappings(permitType).length ? 'draft' as const : 'none' as const;
      return { step: a.key, label: a.label, permitType, mapping };
    });
    const carried = forms.filter(f => f.procedure?.key === p.key);
    return {
      key: p.key, title: p.title, state: approved ? 'approved' : top ? 'draft' : 'not-installed', ...(top ? { version: top.version } : {}),
      stages: p.stages.length, decisions,
      periods: (top ?? p).deadlines.map(d => ({ label: d.label, set: d.days !== undefined })),
      forms: carried.map(f => ({ identity: f.identity, specId: f.specId, title: f.title, batch: f.batch, stage: f.procedure!.stage, ...(f.procedure!.action ? { action: f.procedure!.action } : {}), link: procedureLink({ identity: f.identity, procedure: f.procedure }, { packages }).state })),
    };
  });
  const waiting = forms.filter(f => !f.procedure).map(f => ({ identity: f.identity, specId: f.specId, title: f.title, batch: f.batch, why: f.awaits ?? '' }));
  const linked = forms.length - waiting.length;
  const permitTypes = [...types];
  return {
    procedures, waiting,
    counts: {
      forms: forms.length, linked, waiting: waiting.length, procedures: procedures.length, approved: procedures.filter(p => p.state === 'approved').length,
      mappingsApproved: permitTypes.filter(t => mappingInForce(t)).length, permitTypes: permitTypes.length,
    },
  };
}
