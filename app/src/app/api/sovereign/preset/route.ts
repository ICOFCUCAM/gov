// POST { key } applies a sovereign preset (a first-run template): refused (409) once setup is
// complete (lib/data/store/sovereign.ts applySovereignPreset(), plan phase 0).
import { NextRequest, NextResponse } from 'next/server';
import { applySovereignPreset, PRESET_AFTER_SETUP } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { key?: string; by?: string };
  if (!b.key) return NextResponse.json({ error: 'key required' }, { status: 422 });
  const r = applySovereignPreset(b.key, b.by ?? 'cabinet-office');
  if ('error' in r) return NextResponse.json(r, { status: r.error === PRESET_AFTER_SETUP ? 409 : 422 });
  return NextResponse.json({ sovereign: r });
}
