// services/actor-resolver — bridge between in-memory writes and the
// signed-in identity. Callers ask for the current actor when persisting;
// when the substrate identity is wired and someone is signed in, we
// return their real id/name so the substrate records WHO acted.
//
// Memory-only fallback: when no one is signed in, returns null and the
// caller continues to use whatever fallback actor string it has
// (preserves existing demo / seed behavior unchanged).

import { currentActorSnapshot } from '@/services/identity';

export interface ResolvedActor {
  id: string;
  name: string;
  kind: 'officer' | 'citizen';
  role: string | null;
}

/** Returns the signed-in actor if any, else null. */
export function resolvedActor(): ResolvedActor | null {
  const a = currentActorSnapshot();
  if (!a) return null;
  return { id: a.id, name: a.name, kind: a.kind, role: a.role };
}

/** Enrich a free-form actor string with the substrate identity tag so
 *  the audit chain records the linkage. The tag is appended in a
 *  consistent shape ("name [officer:UUID]" / "name [citizen:UUID]")
 *  that downstream consumers can parse without ambiguity. */
export function enrichActorString(actor: string): string {
  const a = currentActorSnapshot();
  if (!a) return actor;
  // If the caller already passed the canonical name, prefer that label.
  const label = actor && actor !== a.name ? actor : a.name;
  return `${label} [${a.kind}:${a.id}]`;
}
