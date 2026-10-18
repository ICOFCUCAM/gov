// One platform directive. POST { action: 'sign' | 'rescind', effectiveAt? }
// under the named (verified, when signed in) official; audited. A signed-in
// official signs or withdraws only when they can sign, and only their own
// institution's directives (lib/auth/roles.ts); drafts are seen only there.
import { NextRequest, NextResponse } from 'next/server';
import { directive, signDirective, rescindDirective, settleDirectives } from '@/lib/data/directives';
import { withOfficial, currentOfficial, refusal } from '@/lib/auth/official';
import { canSeeDraft, canSignDirective } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
  settleDirectives();
  const d = directive(params.ref);
  const o = await currentOfficial();
  const hidden = d?.status === 'drafting' && (o ? !canSeeDraft(o, d.issued_by_charter_id) : process.env.CIVICOS_AUTH === 'enforce');
  if (!d || hidden) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  return NextResponse.json({ directive: d });
}

export async function POST(req: NextRequest, { params }: { params: { ref: string } }) {
  const d = directive(params.ref);
  if (!d) return NextResponse.json({ error: 'No such directive' }, { status: 404 });
  const refused = await refusal(s => canSignDirective(s, d.issued_by_charter_id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string; effectiveAt?: string | null };
  const r = b.action === 'sign' ? signDirective(params.ref, b.by, b.effectiveAt)
    : b.action === 'rescind' ? rescindDirective(params.ref, b.by)
    : { error: 'action must be sign or rescind' };
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such directive' ? 404 : 422 });
  return NextResponse.json({ directive: r });
}
