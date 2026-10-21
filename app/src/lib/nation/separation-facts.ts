// The configuration facts the separation-of-powers checks read (plan phase 4;
// audit G; lib/gov/separation.ts turns them into checks). Read at use from the
// systems that hold them, never a copy: the institution register (standing,
// branch, independence), who is responsible, the official accounts, the
// offices and their holders, the access-log retention rule and the directives
// register. Read-only.

import type { BranchKey } from '@/lib/gov/constitution';
import { constitutionFor } from '@/lib/gov/constitution';
import { getSovereign, authorityFor, listMinistries, getMinistry, termsOf, institutionBounds, independentTargets } from '@/lib/data/store';
import { listAccounts, demoAccountRefused } from '@/lib/auth/officials';
import { roleOf, COMMUNICATION_KINDS } from '@/lib/auth/roles';
import { retentionChanges } from '@/lib/data/retention';
import { listDirectives } from '@/lib/data/directives';
import { listOffices } from '@/lib/nation/office-register';
import type { AuthorityKey } from '@/lib/nation/deployment';
import type { SeparationFacts, Named } from '@/lib/gov/separation';

const OVERSIGHT_SLOTS: AuthorityKey[] = ['supremeAudit', 'ombudsman', 'anticorruption', 'humanRights', 'dataProtection'];
const BRANCH_SLOTS: Partial<Record<BranchKey, AuthorityKey[]>> = {
  legislature: ['legislature'], judiciary: ['judiciary', 'constitutionalCourt'], crown: ['headOfState'], electoral: ['electoral'], oversight: OVERSIGHT_SLOTS,
};

export function separationFacts(now = new Date()): SeparationFacts {
  const p = getSovereign();
  const bounds = institutionBounds(now);
  const active = listMinistries().filter(m => m.status === 'active');
  const named = (id: string): Named => ({ id, name: getMinistry(id)?.name ?? id });

  const inBranch = (key: BranchKey): Named[] => {
    const slots = new Set((BRANCH_SLOTS[key] ?? []).map(k => authorityFor(k)).filter((x): x is string => !!x));
    return active.filter(m => {
      const t = termsOf(m, now);
      if (t.branch) return t.branch === key;
      if (slots.has(m.id)) return true;
      switch (key) {
        case 'executive': return t.standing === 'executive-ministry' || t.standing === 'executive-agency';
        case 'legislature': return t.standing === 'legislature';
        case 'judiciary': return t.standing === 'judiciary' || bounds.judicial.includes(m.id);
        case 'crown': return t.standing === 'head-of-state';
        case 'oversight': return t.standing === 'independent-constitutional' || t.standing === 'independent-statutory';
        case 'federal-council': return t.standing === 'subnational';
        default: return false;
      }
    }).map(m => ({ id: m.id, name: m.name }));
  };
  const branches = constitutionFor(p.stateForm, p.constitution).branches.map(b => ({ key: b.key, name: b.name, institutions: inBranch(b.key) }));

  const accounts = listAccounts().filter(a => !a.disabled && !demoAccountRefused(a));
  const independent = bounds.independent.map(id => ({
    ...named(id), ownAdministrators: accounts.filter(a => a.institution === id && roleOf(a) === 'administrator').length,
  }));

  const byId = new Map(accounts.map(a => [a.id, a]));
  const outsideHolders: SeparationFacts['outsideHolders'] = [];
  for (const o of listOffices(now)) {
    if (!o.inForce || !o.institution || !bounds.independent.includes(o.institution)) continue;
    for (const h of o.holders) {
      const a = byId.get(h.accountId);
      if (a && !a.institution) outsideHolders.push({ office: o.title, institution: o.institutionName ?? o.institution, holder: h.name });
    }
  }

  const dpa = authorityFor('dataProtection');
  const confirmers = dpa
    ? accounts.filter(a => a.institution === dpa && roleOf(a) === 'signatory').length
    : accounts.filter(a => roleOf(a) === 'auditor').length;
  const adoptedWithoutOversight = retentionChanges().filter(c => c.category === 'access-log' && c.state === 'confirmed' && c.rule.action === 'delete' && !c.oversightBy).length;

  const directivesToIndependent: SeparationFacts['directivesToIndependent'] = [];
  for (const d of listDirectives({ limit: 500 })) {
    if (d.status === 'rescinded' || COMMUNICATION_KINDS.includes(d.kind)) continue;
    for (const t of independentTargets(d.targets ?? [], now)) directivesToIndependent.push({ ref: d.ref, target: t.name });
  }

  return {
    branches,
    judicial: bounds.judicial.map(named),
    independent,
    outsideHolders,
    ...(dpa ? { dataProtection: named(dpa) } : {}),
    retention: { oversightConfirmers: confirmers, adoptedWithoutOversight },
    directivesToIndependent,
  };
}
