// Confirm or cancel email updates from the link in an email. The page at
// /subscriptions asks first and posts here; mail clients' one-click
// unsubscribe (RFC 8058, List-Unsubscribe-Post) posts here directly with the
// token in the address.

import { NextRequest, NextResponse } from 'next/server';
import { confirmSubscription, unsubscribe } from '@/lib/data/site-subscriptions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get('token') ?? req.nextUrl.searchParams.get('token') ?? '');
  const oneClick = form?.get('List-Unsubscribe') === 'One-Click';
  const action = oneClick ? 'unsubscribe' : String(form?.get('action') ?? req.nextUrl.searchParams.get('action') ?? '');
  if (action !== 'confirm' && action !== 'unsubscribe') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  const r = action === 'confirm' ? confirmSubscription(token) : unsubscribe(token);
  if (oneClick) return 'error' in r ? NextResponse.json(r, { status: 404 }) : new NextResponse(null, { status: 204 });
  const status = 'error' in r ? 'invalid' : action === 'confirm' ? 'confirmed' : 'unsubscribed';
  return NextResponse.redirect(new URL(`/subscriptions?status=${status}${'error' in r ? '' : `&site=${r.siteId}`}`, req.url), 303);
}
