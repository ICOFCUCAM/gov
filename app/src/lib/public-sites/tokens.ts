// Fills the placeholders in public-site content (see ./types.ts) from the
// installed nation: its name, offices, emergency numbers and AI choice.

import { aiLabel, currentOffices, formatMoney, nationEmergencyNumber } from '@/lib/nation/registry';
import { REFERENCE_OFFICES } from '@/lib/nation/offices';

type EmergencyKind = 'general' | 'police' | 'fire' | 'ambulance';
const KINDS = new Set<EmergencyKind>(['general', 'police', 'fire', 'ambulance']);

/** Values for the named placeholders, read once per render. */
export function siteTokens(year: number): Record<string, string> {
  const o = currentOffices();
  const reference = o === REFERENCE_OFFICES;
  return {
    year: String(year),
    nation: reference ? 'the Nation' : o.stateName,
    government: o.government,
    headOfState: o.headOfState,
    headOfGovernment: o.headOfGovernment,
    executiveOffice: o.executiveOffice,
    executiveSeat: o.executiveSeat,
    // "The Presidency" in presidential systems, otherwise "The Office of the Prime Minister" and so on.
    executiveBody: o.headOfGovernment === 'President' ? 'The Presidency' : `The ${o.executiveOffice}`,
    primaryChamber: o.primaryChamber,
    // A single-chamber nation keeps the reference name on the upper chamber's site.
    upperChamber: o.upperChamber ?? 'Senate',
    primaryChamberShort: o.primaryChamber === 'National Assembly' ? 'Assembly' : o.primaryChamber,
    legislatureRole: o.upperChamber ? 'Lower House' : 'The Legislature',
    legislatureRoleLong: o.upperChamber ? 'Lower House of the Legislature' : 'The Legislature',
    apexCourt: o.apexCourt,
  };
}

/** Replace every placeholder in one string; unknown placeholders are left as written. */
export function fillTokens(text: string, tokens: Record<string, string>): string {
  return text
    .replace(/\{ai:([^|{}]*)\|([^{}]*)\}/g, (_, ai: string, plain: string) => aiLabel(ai, plain))
    .replace(/\{emergency\.(\w+):([^{}]*)\}/g, (w, kind: string, ref: string) =>
      KINDS.has(kind as EmergencyKind) ? nationEmergencyNumber(kind as EmergencyKind, ref) : w)
    .replace(/\{money:(-?\d+(?:\.\d+)?)\}/g, (_, n: string) => formatMoney(Number(n), { compact: true }))
    .replace(/\{(\w+)\}/g, (w, key: string) => tokens[key] ?? w);
}

/** Fill every string in a content value (records, arrays, nested objects). */
export function fillDeep<T>(value: T, tokens: Record<string, string>): T {
  if (typeof value === 'string') return fillTokens(value, tokens) as T;
  if (Array.isArray(value)) return value.map(v => fillDeep(v, tokens)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(v, tokens)])) as T;
  }
  return value;
}
