import { NextRequest, NextResponse } from 'next/server';
import { verifyDocument } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.code) {
    return NextResponse.json({ error: 'code is required' }, { status: 422 });
  }
  return NextResponse.json(verifyDocument(body.code));
}
