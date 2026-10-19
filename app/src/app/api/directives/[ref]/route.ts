// One directive of the platform's register (the substrate mirrors it, lib/db/mirror.ts). POST { action: 'sign' | 'rescind', effectiveAt? }
// under the named (verified, when signed in) official; audited. A signed-in
// official signs or withdraws only when they can sign, and only their own
// institution's directives (lib/auth/roles.ts); drafts are seen only there.
import { authEnforced } from '@/lib/auth/mode';
import { NextRequest, NextResponse } from 'next/server';
import { directive, signDirective, rescindDirective, settleDirectives } from '@/lib/data/directives';
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
  return NextResponse.json({ directive: d });
}

export async function POST(req: NextRequest, props: { params: Promise<{ ref: string }> }) {
  const params = await props.params;
  await adoptSubstrateDirectives();
  const d = directive(params.ref);
  if (!d) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  const refused = await refusal(s => canSignDirective(s, d.issued_by_charter_id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string; effectiveAt?: string | null };
  const r = b.action === 'sign' ? signDirective(params.ref, b.by, b.effectiveAt)
    : b.action === 'rescind' ? rescindDirective(params.ref, b.by)
    : { error: 'action must be sign or rescind' };
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such directive' ? 404 : 422 });
  queueMirror('directive', r.ref);
  return NextResponse.json({ directive: r });
}
