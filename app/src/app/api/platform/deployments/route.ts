import { NextRequest, NextResponse } from 'next/server';
import { listDeployments, startDeployment } from '@/lib/data/store';
import type { DeployStrategy } from '@/lib/api/types';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ deployments: listDeployments() }); }
export async function POST(req: NextRequest) {
  let b: { releaseId?: string; strategy?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.releaseId || !b.strategy) return NextResponse.json({ error: 'releaseId and strategy required' }, { status: 422 });
  const r = startDeployment(b.releaseId, b.strategy as DeployStrategy);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ deployment: r }, { status: 201 });
}
