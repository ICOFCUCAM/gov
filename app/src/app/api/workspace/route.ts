// /api/workspace — the signed-in official's workspace panels (plan phase 4;
// docs/CONSTITUTIONAL_ARCHITECTURE.md §6.6): My authority, Awaiting my
// action, Institution status, Legal changes, Oversight and Exceptions, from
// the official's own office and institution (lib/workspace/panels.ts). Within
// what lib/auth/roles.ts lets the official read: counts, titles and
// configuration, never another institution's restricted records. "My work"
// is GET /api/work. GET only.
import { NextResponse } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { workspaceFor } from '@/lib/workspace/panels';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  return NextResponse.json({ workspace: workspaceFor(o), generatedAt: new Date().toISOString() });
}
