// The mechanical consequences of recorded transitions (plan phase 6;
// guidance §4.2, §4.7), in one place, read by the case engine's decision
// guard (./guard.ts) and by directives (lib/data/directives.ts):
//
//   caretaker      while a caretaker period is in force for an institution (or
//                  for the whole government, covering every institution that
//                  is not independent), decisions under the procedures and of
//                  the kinds the nation's adopted caretaker rules list, and
//                  directives of the kinds they list, are refused. Only what
//                  the nation listed: with no rule adopted nothing is refused
//                  (the screen warns; the platform never invents a restriction).
//   court rulings  a decision or directive citing a provision a court's ruling
//                  in force declared invalid or suspended is refused (a stayed
//                  ruling never blocks; read-down, interpretation and remittal
//                  flag, they do not block).
//
// Nothing here grants anything, and nothing here reads an emergency: an
// emergency never widens or lifts a rule (lib/transitions/transitions.test.ts).

import { institutionBounds } from '@/lib/data/store/institutions';
import { getMinistry } from '@/lib/data/store/ministries';
import { EXECUTIVE_OFFICE } from '@/lib/auth/roles';
import { caretakersInForce, judicialEffectsOn, transitionsDb, JUDICIAL_EFFECTS } from './state';

const nameOf = (id: string) => (id === EXECUTIVE_OFFICE ? 'the whole government' : getMinistry(id)?.name ?? id);
const matches = (key: string, listed: string) => key === listed || key.startsWith(`${listed}.`) || key.startsWith(`${listed}-`);

/** The caretaker period in force that covers this institution (its own, or the whole government's when it is not independent). */
function caretakerFor(institution: string, now: Date) {
  const periods = caretakersInForce(now);
  if (!periods.length) return undefined;
  const own = periods.find(p => p.institution === institution);
  if (own) return own;
  const whole = periods.find(p => p.institution === EXECUTIVE_OFFICE);
  if (!whole) return undefined;
  if (institution === EXECUTIVE_OFFICE) return whole;
  // The national government's caretaker period covers neither independent
  // institutions nor regional and local governments with their own powers.
  const bounds = institutionBounds(now);
  return bounds.independent.includes(institution) || bounds.subnational?.includes(institution) ? undefined : whole;
}

/**
 * Whether a caretaker restriction refuses this act: a decision (`procedure`,
 * `decision`) by `institution`, or a directive of `directive` kind issued by
 * it. Null when nothing the nation listed applies.
 */
export function caretakerRefusal(act: { institution: string; procedure?: string; decision?: string; directive?: string }, now = new Date()): string | null {
  const period = caretakerFor(act.institution, now);
  if (!period) return null;
  const r = transitionsDb().rules;
  const hit = (act.procedure && r.caretakerProcedures.find(p => matches(act.procedure!, p)))
    || (act.decision && r.caretakerDecisions.includes(act.decision) && act.decision)
    || (act.directive && r.caretakerDirectives.includes(act.directive) && act.directive);
  if (!hit) return null;
  return `${nameOf(period.institution)} is in a caretaker period (${period.ref}, from ${period.from}): the nation's caretaker rules do not allow ${act.directive ? `directives of the kind ${hit}` : `decisions under ${hit}`} until it ends. Routine work continues.`;
}

/** Whether a court's ruling in force refuses an act citing these provisions; null otherwise. */
export function judicialRefusal(citations: { instrument: string; eId?: string; title?: string; num?: string }[], now = new Date()): string | null {
  const hit = judicialEffectsOn(citations, now).find(h => h.blocks);
  if (!hit) return null;
  const label = JUDICIAL_EFFECTS.find(e => e.key === hit.effect)?.label.toLowerCase() ?? hit.effect;
  const c = citations.find(x => x.instrument === hit.target.instrument && (!hit.target.eId || x.eId === hit.target.eId));
  return `${c ? `${c.title ?? c.instrument} ${c.num ?? c.eId ?? ''}`.trim() : hit.target.instrument} was ${label} by ${hit.court ? nameOf(hit.court) : 'a court'}${hit.reference ? ` (${hit.reference})` : ''} from ${hit.from} (${hit.ref}): no new decision or directive rests on it. Cite another provision, or record the later ruling if it changed.`;
}
