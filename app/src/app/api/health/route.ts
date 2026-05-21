// /api/health — diagnostic ping with a substrate reachability probe.
// Public (no auth) — returns minimal information so it's safe to expose
// to monitoring systems. Reports: ok flag, substrate-configured flag,
// substrate-reachable flag (via a cheap count on a public view).

import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = publicClient();
  const configured = sb != null;
  let reachable = false;
  let latency_ms: number | null = null;
  if (sb) {
    const start = Date.now();
    try {
      const { error } = await sb.from('civicos_institutions').select('id', { head: true, count: 'exact' }).limit(1);
      reachable = !error;
    } catch { reachable = false; }
    latency_ms = Date.now() - start;
  }
  return NextResponse.json({
    ok: configured && reachable,
    at: new Date().toISOString(),
    substrate: { configured, reachable, latency_ms },
  });
}

export const POST = GET;
