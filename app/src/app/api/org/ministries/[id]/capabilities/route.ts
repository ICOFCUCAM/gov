// /api/org/ministries/{id}/capabilities — the institution's capability
// manifest, computed from records each time (plan I2;
// lib/institution/capabilities.ts): the responsibilities the nation named, the
// registers it is legally responsible for, its procedures in force and in
// draft, the permit mappings that give it a power, the exchange services it
// answers, its modules, departments and internal administration. Read within
// reach (canReadAdministration()).
import { NextRequest, NextResponse } from 'next/server';
import { readRefusal } from '@/lib/auth/official';
import { canReadAdministration } from '@/lib/auth/roles';
import { capabilityManifest } from '@/lib/institution/capabilities';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const refused = await readRefusal(s => canReadAdministration(s, id), { register: 'institution', id });
  if (refused) return refused;
  const m = capabilityManifest(id);
  if (!m) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  return NextResponse.json({ manifest: m });
}
