// Health facility and pharmacy licensing on the workflow foundation (owner's
// Cycle 3 directive, workstream 3): the shared licence, renewal, suspension
// and revocation procedures under the health regulator's keys, acting on the
// `health-facilities` and `pharmacies` registers, with the premises named as
// registered sites when sent for inspection. Drafts for the regulator to adapt
// to its law and approve. Referrals to other institutions (a fire inspection,
// the professional regulator) use the engine's referral to that institution's
// referral procedure (lib/casework/referral.ts). No clinical data.

import { registeredEffects } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { sectorProcedures } from '@/lib/organisations/procedures';
import type { CasePackage } from '@/lib/casework/types';
import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;

export const HEALTH_PROCEDURES: Ref[] = [
  // The specification's health facility registration form, attached to the licence application (lib/forms/library).
  ...sectorProcedures({ prefix: 'health.facility', owner: 'healthRegulation', register: 'health-facilities', word: 'health facility licence', refPrefix: 'HFL', linkSites: true, form: libraryForm('health.facility-registration') }),
  ...sectorProcedures({ prefix: 'health.pharmacy', owner: 'healthRegulation', register: 'pharmacies', word: 'pharmacy licence', refPrefix: 'PHL', linkSites: true }),
];

export function installHealthProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of HEALTH_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
