// GET /api/organisations — the organisations register (lib/organisations/register.ts)
// for officials: each organisation's public view (number, name, kind, region,
// standings), filtered by ?register=&state=&kind=&q=, and the register types.
// Representatives and history are on /api/organisations/{id} under its rule.
// Changes happen only through decided licensing and accreditation cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { listOrganisations, publicOrganisation, registerTypes, type OrgKind, type StandingState } from '@/lib/organisations/register';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const orgs = listOrganisations({ register: q.get('register') ?? undefined, state: (q.get('state') ?? undefined) as StandingState | undefined, kind: (q.get('kind') ?? undefined) as OrgKind | undefined, q: q.get('q') ?? undefined, limit: Number(q.get('limit')) || undefined });
  return NextResponse.json({ organisations: orgs.map(o => publicOrganisation(o)), types: registerTypes() });
}
