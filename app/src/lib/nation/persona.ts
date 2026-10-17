// The demo persona: the sample citizen, officers and home place that citizen
// and officer screens show. Names are a fixed, multicultural set tied to no
// single country; places, money and payment rail follow the installed nation.

import { nationRegions, nationPaymentRail, formatMoney } from './registry';

export const DEMO_CITIZEN = { name: 'Amina Hassan', short: 'Amina H.' };

export const DEMO_OFFICERS = {
  caseworker: 'K. Adamu',
  clinician: 'Dr. K. Mehta',
  pharmacist: 'L. Mensah',
  ops: 'W. Tanaka',
  platform: 'L. Petrov',
};

/** The persona's home place: the nation's first region, or the reference one. */
export function homePlace(): string {
  return nationRegions()[0] ?? 'Capital District';
}

/** A full (non-compact) amount in the nation's currency, e.g. "UGX 2,400". */
export function money(amount: number): string {
  return formatMoney(amount, { compact: false });
}

export { nationPaymentRail };
