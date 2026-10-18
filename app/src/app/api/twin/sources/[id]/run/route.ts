// Import a source now: fetch its CSV from its own address, or take the CSV in
// the request (uploaded sources, air-gapped nations). Every row is checked;
// refusals come back with reasons (lib/twin/register.ts runSource).

import { NextRequest, NextResponse } from 'next/server';
import { runSource } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; csv?: string };
  if (b.csv !== undefined && (typeof b.csv !== 'string' || b.csv.length > 20_000_000)) return NextResponse.json({ error: 'The CSV must be text up to 20 MB' }, { status: 413 });
  const r = await runSource(params.id, { by: b.by ?? '', csv: b.csv });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ run: r });
}
