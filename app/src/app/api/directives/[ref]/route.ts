// One directive of the platform's register (the substrate mirrors it, lib/db/mirror.ts). POST { action: 'sign' | 'rescind', effectiveAt? }
// or { action: 'respond', text } (an official of a recipient institution, when the directive requires a response: plan step I5);
// under the named (verified, when signed in) official; audited. A signed-in
// official signs or withdraws only when they can sign, and only their own
// institution's directives (lib/auth/roles.ts); drafts are seen only there.
import { authEnforced } from '@/lib/auth/mode';
import { NextRequest, NextResponse } from 'next/server';
import { directive, signDirective, rescindDirective, settleDirectives, respondToDirective, outstandingResponses } from '@/lib/data/directives';
import { withOfficial, currentOfficial, refusal } from '@/lib/auth/official';
import { canSeeDraft, canSignDirective } from '@/lib/auth/roles';
import { adoptSubstrateDirectives, queueMirror } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  await adoptSubstrateDirectives();
  for (const ref of settleDirectives()) queueMirror('directive', ref);
  const d = directive(params.ref);
  const o = await currentOfficial();
  const hidden = d?.status === 'drafting' && (o ? !canSeeDraft(o, d.issued_by_charter_id) : authEnforced());
  if (!d || hidden) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  return NextResponse.json({ directive: d, outstanding: outstandingResponses(d) });
}

export async function POST(req: NextRequest, props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  await adoptSubstrateDirectives();
  const d = directive(params.ref);
  if (!d) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  const raw = (await req.json().catch(() => ({}))) as { action?: string; institution?: string; text?: string };
  // A recipient's response (plan step I5): an official of a recipient institution, never the issuer on its behalf.
  if (raw.action === 'respond') {
    const o = await currentOfficial();
    const refusedRespond = await refusal(s => (s.institution && d.targets.includes(s.institution) ? null : 'A directive is answered by an official of a recipient institution'));
    if (refusedRespond) return refusedRespond;
    const b = (await withOfficial(raw)) as { by?: string; institution?: string; text?: string };
    const r = respondToDirective(params.ref, o?.institution ?? String(b.institution ?? ''), String(b.text ?? ''), b.by);
    if ('error' in r) return NextResponse.json(r, { status: 422 });
    queueMirror('directive', r.ref);
    return NextResponse.json({ directive: r, outstanding: outstandingResponses(r) });
  }
  const refused = await refusal(s => canSignDirective(s, d.issued_by_charter_id));
  if (refused) return refused;
  const b = (await withOfficial(raw)) as { action?: string; by?: string; effectiveAt?: string | null };
  const r = b.action === 'sign' ? signDirective(params.ref, b.by, b.effectiveAt)
    : b.action === 'rescind' ? rescindDirective(params.ref, b.by)
    : { error: 'action must be sign, rescind or respond' };
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such directive' ? 404 : 422 });
  queueMirror('directive', r.ref);
  return NextResponse.json({ directive: r });
}
