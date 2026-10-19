// Who may reach which side of the Update Center.
//
// Nation side (/api/releases, /requests, /[id]/decision, /download): the
// nation is resolved on the server — the installed nation by default, or
// the nation whose private link key is presented. A caller can never name a
// nation id directly, so one nation cannot read another's builds.
//
// Publisher side (/api/releases/publisher/*): behind the middleware session
// gate like every non-public route, and, when CIVICOS_AUTH=enforce, also
// requires a platform-tier officer session or the automation secret.

import { NextResponse } from 'next/server';
import { platformOrCronAuthorized } from '@/lib/platform-auth';
import { resolveNation } from '@/lib/data/updates';
import type { SubscribedNation } from '@/lib/api/types';
import { pathRefusal, withOfficial } from '@/lib/auth/official';

export async function publisherAuthorized(req: Request): Promise<boolean> {
  if (process.env.CIVICOS_AUTH !== 'enforce') return true;
  return platformOrCronAuthorized(req);
}

export const unauthorized = () => NextResponse.json({ error: 'Publisher access requires a platform-tier session' }, { status: 401 });

/** The nation a chamber request speaks for, from `?link=` (or a body `link`). */
export function nationFor(link: string | null | undefined): SubscribedNation | NextResponse {
  const n = resolveNation(link);
  if (!n) return NextResponse.json({ error: 'Unknown distribution link' }, { status: 404 });
  return n;
}

/** Check who may take this step, parse a JSON object body and resolve the nation it speaks for (body `link`, else `?link=`). */
export async function chamberBody<T extends object>(req: Request): Promise<{ b: T; nation: SubscribedNation } | NextResponse> {
  // Who may take this step (lib/auth/roles.ts): installation-level decisions are for this nation's
  // government-wide administrators, the ordinary Update Center work for any official (review H-4).
  const refused = await pathRefusal(req);
  if (refused) return refused;
  let b: unknown;
  // A signed-in official's verified name replaces any name in the body (lib/auth/official.ts).
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const link = (b as { link?: unknown }).link;
  const nation = nationFor(typeof link === 'string' ? link : new URL(req.url).searchParams.get('link'));
  if (nation instanceof NextResponse) return nation;
  return { b: b as T, nation };
}
