// The directives register, owned by the platform (lib/data/directives.ts;
// architecture review D8). With the shared database connected its
// civicos_directives table is a mirror written after each change
// (lib/db/mirror.ts); directives it held from before are taken over once.
// GET lists them (?status, ?issuer,
// ?limit): drafts only for the issuing institution's officials (all of them
// while sign-in is neither used nor enforced, as before). POST drafts one
// under the named (verified, when signed in) official; an official with an
// institution always drafts for it, and auditors cannot draft.
import { NextRequest, NextResponse } from 'next/server';
import { listDirectives, draftDirective, settleDirectives } from '@/lib/data/directives';
import { withOfficial, currentOfficial, refusal } from '@/lib/auth/official';
import { canDraftDirective, canSeeDraft, directiveIssuer } from '@/lib/auth/roles';
import { adoptSubstrateDirectives, queueMirror } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await adoptSubstrateDirectives();
  for (const ref of settleDirectives()) queueMirror('directive', ref);
  const q = req.nextUrl.searchParams;
  const o = await currentOfficial();
  const hideDrafts = !o && process.env.CIVICOS_AUTH === 'enforce';
  const rows = listDirectives({ status: q.get('status') ?? undefined, issuer: q.get('issuer') ?? undefined, limit: Number(q.get('limit')) || undefined })
    .filter(d => d.status !== 'drafting' || (o ? canSeeDraft(o, d.issued_by_charter_id) : !hideDrafts));
  return NextResponse.json({ directives: rows });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(canDraftDirective);
  if (refused) return refused;
  await adoptSubstrateDirectives();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { issuedByCharterId?: string };
  const r = draftDirective({ ...b, issuedByCharterId: directiveIssuer(await currentOfficial(), b.issuedByCharterId ?? '') });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  queueMirror('directive', r.ref);
  return NextResponse.json({ directive: r }, { status: 201 });
}
