// The offices and institutions a nation's public surfaces name: head of state
// and government, executive office and seat, chambers, apex court, and how
// the government styles itself. Derived from the sovereign profile and its
// constitution; before setup the reference wording is kept unchanged.

import type { SovereignProfile } from '@/lib/api/types';
import { constitutionFor } from '@/lib/gov/constitution';

export interface NationOffices {
  /** e.g. "The Republic of Uganda" */
  stateName: string;
  /** e.g. "Government of the Republic of Uganda" */
  government: string;
  headOfState: string;
  headOfGovernment: string;
  /** e.g. "Office of the President" */
  executiveOffice: string;
  /** e.g. "State House" */
  executiveSeat: string;
  primaryChamber: string;
  /** Undefined for a unicameral legislature. */
  upperChamber?: string;
  apexCourt: string;
}

export const REFERENCE_OFFICES: NationOffices = {
  stateName: 'the Republic',
  government: 'Government of the Republic',
  headOfState: 'President',
  headOfGovernment: 'President',
  executiveOffice: 'Office of the President',
  executiveSeat: 'Executive Mansion',
  primaryChamber: 'National Assembly',
  upperChamber: 'Senate',
  apexCourt: 'Supreme Court',
};

const strip = (s: string) => s.replace(/\s*\(.*\)\s*$/, '').trim();

/** Offices for an installed nation; the reference wording until setup is complete. */
export function nationOffices(p: SovereignProfile | null | undefined, configured: boolean): NationOffices {
  if (!p || !configured) return REFERENCE_OFFICES;
  const c = constitutionFor(p.stateForm, p.constitution);
  const headOfGovernment = p.executiveTitle?.trim() || 'Head of Government';
  const headOfState = p.constitution?.headOfStateTitle?.trim()
    || (p.stateForm === 'republic' ? headOfGovernment : strip(c.authorityChain[0]?.office ?? headOfGovernment));
  const name = p.stateName?.trim() || 'the State';
  return {
    stateName: name,
    government: `Government of ${name.replace(/^The /, 'the ')}`,
    headOfState,
    headOfGovernment,
    executiveOffice: `Office of the ${headOfGovernment}`,
    executiveSeat: p.constitution?.executiveSeat?.trim() || 'Seat of Government',
    primaryChamber: c.legislature.chambers[0]?.name ?? p.legislatureName,
    upperChamber: c.legislature.chambers[1]?.name,
    apexCourt: c.judicialApex,
  };
}
