// Protected disclosures about security institutions (plan step I12; catalogue
// Part 11 §9 REG-SEC-015 "Protected disclosure register", CFG-SEC-015
// "Protected disclosure, whistleblower and complaint protections").
//
// No second mechanism: a disclosure goes through the existing protected
// intake (lib/oversight/intake.ts receiveProtected()) as an integrity
// disclosure to the anti-corruption commission, or a complaint to the
// ombudsman, the bodies the nation names. The person making it is kept apart
// from the case in the protected-identity vault (never in a list, a case
// read, a search or an export; read only by the assigned or specifically
// authorised official with a purpose, every read logged).
//
// What this adds is the classification rule: the disclosed material itself is
// never taken in when it is marked above the installation's accreditation
// (markingRefusal()); the person describes the matter, and the material's
// location in an accredited channel is recorded as a reference only. An
// intelligence complaint (SEC-INT-013) is not taken here: it waits for the
// nation's legal review (integration register 25).

import { receiveProtected, type ProtectedIntake } from '@/lib/oversight/intake';
import { markingRefusal } from './classification';
import type { Actor } from '@/lib/casework/engine';

export const SECURITY_DISCLOSURE_PROCEDURES = ['integrity.disclosure', 'ombudsman.complaint'];

export function receiveSecurityDisclosure(input: ProtectedIntake & { materialMarking?: unknown; materialReference?: unknown }, actor: Actor, now = new Date()): ReturnType<typeof receiveProtected> {
  if (!SECURITY_DISCLOSURE_PROCEDURES.includes(input.procedure)) return { error: `A disclosure about a security institution goes to ${SECURITY_DISCLOSURE_PROCEDURES.join(' or ')}` };
  const marked = markingRefusal(input.materialMarking ?? '');
  if (marked) return { error: `The disclosed material is not taken in here: ${marked}` };
  const reference = typeof input.materialReference === 'string' ? input.materialReference.trim().slice(0, 300) : '';
  const fields = { ...(input.fields ?? {}) };
  const text = input.procedure === 'integrity.disclosure' ? 'allegation' : 'description';
  if (reference) fields[text] = `${String(fields[text] ?? '').trim()}\n\nMaterial held in an accredited channel at: ${reference} (reference only)`.trim();
  return receiveProtected({ ...input, fields }, actor, now);
}
