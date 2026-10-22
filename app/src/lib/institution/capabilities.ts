// An institution's capability manifest, computed from records (plan I2; spec
// Part 0 "a product architecture for every institution"; plan §2 row 1). What
// it actually has, read at use from the systems that hold each fact, never
// stored and never from an archetype's constants:
//
//   responsibilities  the deployment-profile slots that name it (who is responsible)
//   registers         the registers it is legally responsible for (lib/data/register-owners.ts)
//   procedures        its procedures in force (approved, active today) and those still drafts
//   mappings          the permit authority mappings in force that give it a power
//   exchange          the exchange services it answers (approved, by owner slot)
//   modules           the modules enabled on its registry record
//   departments       its departments in operation, with their functions (lib/institution/departments.ts)
//   administration    for each internal administration function: departments, procedures in force,
//                     records kept (lib/administration)
//
// The archetype blueprint (lib/institution/blueprint.ts) stays what it is: a
// template, shown elsewhere as such. Nothing here grants anything.

import { getMinistry } from '@/lib/data/store/ministries';
import { termsOf, isIndependentInstitution, standingLabel } from '@/lib/data/store/institutions';
import { authorityFor } from '@/lib/data/store/sovereign';
import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';
import { REGISTER_OWNERS, legalOwnerOf } from '@/lib/data/register-owners';
import { activePackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { listMappings, mappingInForce } from '@/lib/permits/authority';
import { serviceDirectory } from '@/lib/exchange/services';
import { departmentsOf, ADMIN_FUNCTIONS } from './departments';
import { ADMINISTRATION_PROCEDURES, administrationKey } from '@/lib/administration/procedures';
import { administrationCounts } from '@/lib/administration/register';

export interface CapabilityManifest {
  institution: { id: string; name: string; status: string; standing: string; independent: boolean };
  computedAt: string;
  responsibilities: { key: string; label: string }[];
  registers: { id: string; name: string; through: string }[];
  procedures: { inForce: { key: string; title: string; version: number; activeFrom?: string }[]; drafts: { key: string; title: string; version: number }[] };
  mappings: { permitType: string; title: string; version: number; powers: string[] }[];
  exchange: { id: string; title: string; kind: string }[];
  modules: string[];
  departments: { id: string; name: string; functions: string[]; office?: string; staff: number }[];
  administration: { function: string; label: string; departments: string[]; procedures: { key: string; state: 'in force' | 'draft' | 'not adopted' }[] }[];
  records: ReturnType<typeof administrationCounts>;
  /** In plain words: what the manifest leaves out (the archetype's blueprint is a template, not a capability). */
  note: string;
}

export function capabilityManifest(id: string, now = new Date()): CapabilityManifest | null {
  const m = getMinistry(id);
  if (!m) return null;
  const on = now.toISOString().slice(0, 10);
  const slots = AUTHORITIES.filter(a => authorityFor(a.key) === id);
  const slotKeys = slots.map(a => a.key as string);
  const resolve = (owner: string) => ownerInstitution(owner, authorityFor);
  const pkgs = listPackages().filter(p => resolve(p.owner) === id);
  const keys = [...new Set(pkgs.map(p => p.key))];
  const inForce = keys.map(k => activePackage(k, on)).filter((p): p is NonNullable<typeof p> => !!p);
  const drafts = pkgs.filter(p => p.state === 'draft');
  const mappings = [...new Set(listMappings().map(x => x.permitType))].map(t => mappingInForce(t, on)).filter((x): x is NonNullable<typeof x> => !!x)
    .map(x => ({ x, powers: (['issue', ...(['renew', 'suspend', 'revoke'] as const)] as const).filter(p => resolve(p === 'issue' ? x.lead : x.powers[p as 'renew' | 'suspend' | 'revoke']) === id) }))
    .filter(({ powers }) => powers.length)
    .map(({ x, powers }) => ({ permitType: x.permitType, title: x.title, version: x.version, powers: [...powers] }));
  const depts = departmentsOf(id);
  return {
    institution: { id: m.id, name: m.name, status: m.status, standing: standingLabel(termsOf(m, now).standing), independent: isIndependentInstitution(m.id, now) },
    computedAt: now.toISOString(),
    responsibilities: slots.map(a => ({ key: a.key, label: a.label })),
    registers: REGISTER_OWNERS.flatMap(r => {
      const l = legalOwnerOf(r);
      return l.kind === 'authority' && slotKeys.includes(l.key) ? [{ id: r.id, name: r.name.split(':')[0]!, through: `Named for ${AUTHORITIES.find(a => a.key === l.key)?.label ?? l.key}` }] : [];
    }),
    procedures: {
      inForce: inForce.map(p => ({ key: p.key, title: p.title, version: p.version, ...(p.activeFrom ? { activeFrom: p.activeFrom } : {}) })),
      drafts: drafts.map(p => ({ key: p.key, title: p.title, version: p.version })),
    },
    mappings,
    exchange: serviceDirectory().filter(s => slotKeys.includes(s.owner as AuthorityKey)).map(s => ({ id: s.id, title: s.title, kind: s.kind })),
    modules: m.modules.filter(x => x.enabled).map(x => x.moduleKey),
    departments: depts.map(d => ({ id: d.id, name: d.name, functions: d.functions.map(f => ADMIN_FUNCTIONS.find(x => x.key === f)?.label ?? f), ...(d.officeTitle ? { office: d.officeTitle } : {}), staff: d.staff.length })),
    administration: ADMIN_FUNCTIONS.map(f => ({
      function: f.key, label: f.label,
      departments: depts.filter(d => d.functions.includes(f.key)).map(d => d.name),
      procedures: ADMINISTRATION_PROCEDURES.filter(t => t.function === f.key).map(t => {
        const k = administrationKey(t.key, id);
        return { key: k, state: activePackage(k, on) ? 'in force' as const : listPackages({ key: k }).length ? 'draft' as const : 'not adopted' as const };
      }),
    })),
    records: administrationCounts(id),
    note: 'Computed from the records each time: who is responsible, the register owners, the procedures and mappings in force, the exchange services, the registry record and the departments. The archetype\'s blueprint is a template and is not counted here.',
  };
}
