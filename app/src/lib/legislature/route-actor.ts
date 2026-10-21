// The official a /api/legislature route acts as (lib/legislature/register.ts):
// the verified official and their scope, or, only where sign-in is not
// enforced, the declared name with no scope.
import { NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import type { LegislativeActor } from '@/lib/legislature/register';

export async function legislativeActor(declared?: unknown): Promise<LegislativeActor> {
  const s = await caseScope();
  if (s) return { by: s.label, byId: s.id, scope: s };
  const name = typeof declared === 'string' && declared.trim() ? declared.trim().slice(0, 120) : 'Unverified official';
  return { by: name, scope: null };
}

/** A store answer as a response: refusals of who may act are 403, other problems 422. */
export function answer(r: object, status = 200): NextResponse {
  if ('error' in r) {
    const e = (r as { error: string }).error;
    const forbidden = /^(Auditors|Name the legislature|The legislature's record is kept|An official who can sign|Assent is recorded by the head|An official who can sign at the head)/.test(e);
    return NextResponse.json(r, { status: /^No such/.test(e) ? 404 : forbidden ? 403 : 422 });
  }
  return NextResponse.json(r, { status });
}
