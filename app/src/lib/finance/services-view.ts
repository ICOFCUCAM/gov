// The economic group's services at a glance (plan step I5): for budget and
// treasury, public procurement and the Cabinet office, each procedure with its
// state in this installation's package register (a template: which
// institutions adopted it), the permit type each decision rests on and
// whether its mapping is approved, its periods (set by the nation or not), the
// rules it reads (approved or shipped unset), and the catalogue forms it
// carries by identity with their procedure-link state, beside the forms that
// still wait for a procedure. Configuration only: no amount, payee, bid or
// paper is read here (those are the registers', under their read rules).

import { listPackages } from '@/lib/casework/packages';
import { classifyDecision } from '@/lib/permits/decisions';
import { listMappings, mappingInForce } from '@/lib/permits/authority';
import { ruleInForce } from '@/lib/law/rules';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { procedureLink, type ProcedureLinkState } from '@/lib/forms/procedure-link';
import { FINANCE_PROCEDURES, PAYMENT_TIERS_RULE } from './procedures';
import { PROCUREMENT_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT, METHOD_THRESHOLDS_RULE } from '@/lib/procurement/procedures';
import { CABINET_PROCEDURES } from '@/lib/cabinet/procedures';
import { cabinetRules } from '@/lib/cabinet/register';
import type { Case, CasePackage } from '@/lib/casework/types';

export type EconomicGroup = 'finance' | 'procurement' | 'cabinet';
export interface ServiceForm { identity: string; specId: string; title: string; batch: number; stage: string; action?: string; link: ProcedureLinkState }
export interface ServiceProcedure {
  key: string; title: string;
  /** A template each institution adopts as its own (procurement), or one procedure of the slot's institution. */
  template: boolean;
  state: 'not-installed' | 'draft' | 'approved';
  version?: number;
  /** For a template: the institutions that adopted it, with the state of their version. */
  adoptedBy?: { institution: string; state: CasePackage['state']; version: number }[];
  stages: number;
  decisions: { step: string; label: string; permitType: string | null; mapping: 'approved' | 'draft' | 'none' }[];
  periods: { label: string; set: boolean }[];
  forms: ServiceForm[];
}
export interface ServicesView {
  group: EconomicGroup;
  procedures: ServiceProcedure[];
  rules: { key: string; label: string; state: 'approved' | 'not approved (ships unset)' }[];
  waiting: { identity: string; specId: string; title: string; batch: number; why: string }[];
  counts: { forms: number; linked: number; waiting: number; procedures: number; approved: number; mappingsApproved: number; permitTypes: number };
}

type Proc = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const GROUPS: Record<EconomicGroup, { procedures: Proc[]; template: boolean; forms: (f: (typeof CATALOGUE_CONTRACTS)[number]) => boolean }> = {
  finance: { procedures: FINANCE_PROCEDURES, template: false, forms: f => f.owner === 'finance' },
  procurement: { procedures: [...PROCUREMENT_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT], template: true, forms: f => f.owner === 'procurementReview' || /^procurement\./.test(f.specId) || /^ADM-PRC-/.test(f.specId) },
  cabinet: { procedures: CABINET_PROCEDURES, template: false, forms: f => f.owner === 'cabinetOffice' },
};

export function economicServicesView(group: EconomicGroup): ServicesView {
  const g = GROUPS[group];
  const forms = CATALOGUE_CONTRACTS.filter(g.forms);
  const packages = listPackages();
  const types = new Set<string>();
  const procedures: ServiceProcedure[] = g.procedures.map(p => {
    const template = p.owner === 'institution';
    const mine = packages.filter(x => (template ? x.key.startsWith(`${p.key}.`) : x.key === p.key) && x.state !== 'superseded').sort((a, b) => b.version - a.version);
    const approved = mine.find(x => x.state === 'approved');
    const top = approved ?? mine[0];
    const decisions = p.actions.filter(a => a.decision).map(a => {
      const cls = classifyDecision({ fields: {}, owner: '' } as unknown as Case, a, p);
      const permitType = cls?.kind === 'mapping' ? cls.permitType : null;
      if (permitType) types.add(permitType);
      const mapping = !permitType ? 'none' as const : mappingInForce(permitType) ? 'approved' as const : listMappings(permitType).length ? 'draft' as const : 'none' as const;
      return { step: a.key, label: a.label, permitType, mapping };
    });
    const carried = forms.filter(f => f.procedure?.key === p.key);
    return {
      key: p.key, title: p.title, template, state: approved ? 'approved' : top ? 'draft' : 'not-installed', ...(top && !template ? { version: top.version } : {}),
      ...(template ? { adoptedBy: mine.map(x => ({ institution: x.owner, state: x.state, version: x.version })) } : {}),
      stages: p.stages.length, decisions,
      periods: (template ? p : top ?? p).deadlines.map(d => ({ label: d.label, set: d.days !== undefined })),
      forms: carried.map(f => ({ identity: f.identity, specId: f.specId, title: f.title, batch: f.batch, stage: f.procedure!.stage, ...(f.procedure!.action ? { action: f.procedure!.action } : {}), link: procedureLink({ identity: f.identity, procedure: f.procedure }, { packages }).state })),
    };
  });
  const rules = group === 'finance' ? [{ key: PAYMENT_TIERS_RULE, label: 'Payment approval tiers' }]
    : group === 'procurement' ? [{ key: METHOD_THRESHOLDS_RULE, label: 'Procurement method thresholds' }] : [];
  const ruleStates = rules.map(r => ({ ...r, state: ruleInForce(r.key) ? 'approved' as const : 'not approved (ships unset)' as const }));
  if (group === 'cabinet') ruleStates.push({ key: 'cabinet.rules', label: 'Cabinet composition, quorum and decision rule (a country rule set)', state: cabinetRules().version ? 'approved' : 'not approved (ships unset)' });
  const waiting = forms.filter(f => !f.procedure).map(f => ({ identity: f.identity, specId: f.specId, title: f.title, batch: f.batch, why: f.awaits ?? '' }));
  const permitTypes = [...types];
  return {
    group, procedures, rules: ruleStates, waiting,
    counts: {
      forms: forms.length, linked: forms.length - waiting.length, waiting: waiting.length, procedures: procedures.length, approved: procedures.filter(p => p.state === 'approved').length,
      mappingsApproved: permitTypes.filter(t => mappingInForce(t)).length, permitTypes: permitTypes.length,
    },
  };
}
