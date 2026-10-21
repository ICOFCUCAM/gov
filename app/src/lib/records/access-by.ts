// Who an access-log entry names (guidance §5.4: "which institution and office
// they were acting under"; plan phase 5): the signed-in official, their
// institution, and the office of state they hold today in that institution
// (lib/nation/office-register.ts), when they hold one. Holding an office grants
// no permission; it is recorded so the log says in which capacity a read was
// made. Used by every route that writes the access log.

import { officesHeldBy } from '@/lib/nation/office-register';
import type { AccessEntry, AccessOffice } from './access-log';

/** The office an official (session subject, e.g. `local:abc`) acts under: one held in their institution, else the first held. */
export function officeActedUnder(subject: string | undefined, institution?: string, now = new Date()): AccessOffice | undefined {
  if (!subject?.startsWith('local:')) return undefined;
  try {
    const held = officesHeldBy(subject.slice('local:'.length), now);
    const o = held.find(h => !institution || h.institution === institution) ?? held[0];
    return o ? { id: o.id, title: o.title, ...(o.acting ? { acting: true } : {}) } : undefined;
  } catch { return undefined; }
}

/** The `by` and `office` of an access-log entry for the official of a request. */
export function accessBy(s: { id?: string; label: string; institution?: string }, now = new Date()): Pick<AccessEntry, 'by' | 'office'> {
  const office = officeActedUnder(s.id, s.institution, now);
  return { by: { ...(s.id ? { id: s.id } : {}), name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, ...(office ? { office } : {}) };
}
