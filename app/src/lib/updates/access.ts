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
