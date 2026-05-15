import { NextRequest, NextResponse } from 'next/server';
import { listWebhooks, subscribeWebhook } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ webhooks: listWebhooks() }); }
export async function POST(req: NextRequest) {
  let b: { topic?: string; url?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.topic || !b.url) return NextResponse.json({ error: 'topic and url required' }, { status: 422 });
  return NextResponse.json(subscribeWebhook({ topic: b.topic, url: b.url }), { status: 201 });
}
