// Withdraw a twin import (a correction, lib/twin/register.ts): its
// observations are marked superseded from now, never deleted, so as-of
// queries for what was known before still see them. Under the nation's twin
// policy (four-eyes, on by default; /api/twin/policy) one official proposes
// with a reason (action "propose", the default) and a different official
// confirms (action "confirm") or either cancels (action "cancel"); with the
// policy off a proposal withdraws at once. Each step is named and audited. A
// signed-in official's verified name replaces any name in the request
// (withOfficial), so the second official cannot be typed in.

import { NextRequest, NextResponse } from 'next/server';
import { proposeWithdrawal, confirmWithdrawal, cancelWithdrawal } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; reason?: string; action?: 'propose' | 'confirm' | 'cancel' };
  const action = b.action ?? 'propose';
  if (!['propose', 'confirm', 'cancel'].includes(action)) return NextResponse.json({ error: 'action is propose, confirm or cancel' }, { status: 400 });
  const r = action === 'confirm' ? confirmWithdrawal(params.id, String(b.by ?? ''))
    : action === 'cancel' ? cancelWithdrawal(params.id, String(b.by ?? ''), String(b.reason ?? ''))
    : proposeWithdrawal(params.id, String(b.by ?? ''), String(b.reason ?? ''));
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such import' ? 404 : /different official/.test(r.error) ? 403 : 422 });
  return NextResponse.json(r);
}
