// The actor a case route acts as: the verified official, or, only where
// sign-in is not enforced (demonstrations, tests), the declared name.
import { caseScope } from '@/lib/auth/official';
import type { Actor } from './engine';
import { UNVERIFIED_ACTOR } from '@/lib/data/store/audit';

export async function routeActor(declared?: unknown): Promise<Actor> {
  const s = await caseScope();
  if (s) return { id: s.id, name: s.label, scope: s, ...(s.institution ? { institution: s.institution } : {}) };
  const name = typeof declared === 'string' && declared.trim() ? declared.trim().slice(0, 120) : UNVERIFIED_ACTOR;
  return { name, scope: null };
}

/** The name a structural change is recorded under: the verified official's (with their office), else the declared name, else UNVERIFIED_ACTOR. */
export async function actingName(declared?: unknown): Promise<string> {
  return (await routeActor(declared)).name;
}
