import { NextRequest, NextResponse } from 'next/server';
import { listMinistries, createMinistry } from '@/lib/data/store';
import type { ArchetypeKey } from '@/lib/api/types';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { queueMirror } from '@/lib/db/mirror';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ ministries: listMinistries() }); }
export async function POST(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  let b: { archetype?: string; name?: string; slug?: string; by?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.archetype || !b.name || !b.slug) return NextResponse.json({ error: 'archetype, name, slug required' }, { status: 422 });
  const r = createMinistry({ archetype: b.archetype as ArchetypeKey, name: b.name, slug: b.slug, by: await actingName(b.by) });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  queueMirror('institutions'); // the substrate's charter rows mirror the registry (lib/db/mirror.ts)
  return NextResponse.json({ ministry: r }, { status: 201 });
}
