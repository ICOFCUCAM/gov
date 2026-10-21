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

/** The titles of the head of state and head of government the nation recorded as offices (lib/nation/office-register.ts). */
export interface HeadOffices { headOfState?: string; headOfGovernment?: string }

/**
 * Offices for an installed nation; the reference wording until setup is
 * complete. `head`: the titles of the offices the nation recorded (plan
 * phase 4); without them the head of government is the profile's executive
 * title, as before, and the head of state comes from the constitution.
 */
export function nationOffices(p: SovereignProfile | null | undefined, configured: boolean, head?: HeadOffices): NationOffices {
  if (!p || !configured) return REFERENCE_OFFICES;
  const c = constitutionFor(p.stateForm, p.constitution);
  const headOfGovernment = head?.headOfGovernment?.trim() || p.executiveTitle?.trim() || 'Head of Government';
  const headOfState = head?.headOfState?.trim() || p.constitution?.headOfStateTitle?.trim()
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

/** The deputy to the head of government: "Vice-President" in presidential systems, otherwise "Deputy …". */
export function deputyTitle(o: NationOffices): string {
  return /^president$/i.test(o.headOfGovernment) ? 'Vice-President' : `Deputy ${o.headOfGovernment}`;
}

/**
 * Order of succession to the executive, from the nation's offices: deputy,
 * the presiding officers of the chambers (upper first), the apex court and
 * finance. The reference order is kept until setup is complete.
 */
export function successionOrder(o: NationOffices): string[] {
  if (o === REFERENCE_OFFICES) return ['Vice-President', 'Senate President', 'Speaker of the Assembly', 'Chief Justice', 'Treasury Secretary'];
  return [
    deputyTitle(o),
    ...(o.upperChamber ? [`President of the ${o.upperChamber}`] : []),
    `Speaker of the ${o.primaryChamber}`,
    `Chief Justice of the ${o.apexCourt}`,
    'Minister of Finance',
  ];
}

const REFERENCE_CHAMBER_WORDS = /National Assembly|\bAssembly\b|\b[Ss]enate\b|\b[Ss]enators?\b/g;

/**
 * Chamber wording in the legislature apps, rewritten for the nation's own
 * chambers: "Senate" → its upper chamber, "Senators" → its members,
 * "National Assembly" / "Assembly" → its primary chamber. Unchanged before
 * setup, and the upper-chamber words stay as they are when the nation has a
 * single chamber (the Senate app keeps its reference wording there).
 */
export function chamberText(text: string, o: NationOffices): string {
  if (o === REFERENCE_OFFICES) return text;
  const upper = o.upperChamber;
  const member = upper && /senate/i.test(upper) ? 'Senator' : upper && /lords/i.test(upper) ? 'Lord' : 'Member';
  return text.replace(REFERENCE_CHAMBER_WORDS, w => {
    if (w === 'National Assembly') return o.primaryChamber;
    // The short form stays when the nation's chamber is itself an "… Assembly".
    if (w === 'Assembly') return /\bAssembly$/.test(o.primaryChamber) ? w : o.primaryChamber;
    if (!upper) return w;
    if (/^[Ss]enate$/.test(w)) return upper;
    const plural = w.endsWith('s') ? 's' : '';
    return w[0] === 's' ? `${member.toLowerCase()}${plural}` : `${member}${plural}`;
  });
}
