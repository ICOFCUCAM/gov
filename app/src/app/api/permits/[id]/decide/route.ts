import { NextRequest, NextResponse } from 'next/server';
import { decidePermit, permitHolders, getPermit, authorityFor } from '@/lib/data/store';
import type { DecidePermitInput } from '@/lib/api/types';
import { refusal, withOfficial, caseScope } from '@/lib/auth/official';
import { canDecidePermit } from '@/lib/auth/roles';
import { ownerInstitution } from '@/lib/casework/packages';
import { powerRefusal, LEGACY_PERMIT_TYPES } from '@/lib/permits/authority';
import { samplesAllowed } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';

const VALID = ['approve', 'decline', 'request-info', 'escalate'];

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Only the issuing institution (or the whole government) decides a permit it may read (review M-3).
  const refused = await refusal(s => canDecidePermit(s, permitHolders()));
  if (refused) return refused;
  let body: Partial<DecidePermitInput>;
  try {
    body = (await withOfficial(await req.json())) as Partial<DecidePermitInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.decision || !VALID.includes(body.decision)) {
    return NextResponse.json(
      { error: 'decision must be one of: ' + VALID.join(', ') },
      { status: 422 },
    );
  }
  if (!body.officerName) {
    return NextResponse.json(
      { error: 'officerName is required (named accountability)' },
      { status: 422 },
    );
  }
  // Approving or declining is a decision of the authority the nation's approved mapping designates
  // (lib/permits/authority.ts); a production installation needs that mapping first.
  const permit = getPermit(params.id);
  if (permit && (body.decision === 'approve' || body.decision === 'decline')) {
    const key = LEGACY_PERMIT_TYPES[permit.type] ?? permit.type;
    const scope = await caseScope();
    const why = powerRefusal(key, 'issue', scope?.institution ?? '', a => ownerInstitution(a, authorityFor), { required: !samplesAllowed() });
    if (why && (!samplesAllowed() || scope?.institution)) return NextResponse.json({ error: why }, { status: 409 });
  }
  const result = decidePermit(params.id, {
    decision: body.decision,
    officerName: body.officerName,
    note: body.note,
    aiClass: body.aiClass,
  });
  if ('error' in result) {
    const status = result.error === 'Permit not found' ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ permit: result });
}
