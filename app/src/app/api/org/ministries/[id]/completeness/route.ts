// /api/org/ministries/{id}/completeness — completeness per item for one
// institution (plan I2; lib/onboarding/completeness.ts): each item's state
// (not started, in progress, verified, blocked, not applicable, not assessed),
// evidence, accountable owner, date and next action; the activation gate
// (critical items, applied in production). Never a percentage. Read within
// reach (canReadAdministration()).
import { NextRequest, NextResponse } from 'next/server';
import { readRefusal } from '@/lib/auth/official';
import { canReadAdministration } from '@/lib/auth/roles';
import { institutionCompleteness, DIMENSION_LABEL, STATE_LABEL } from '@/lib/onboarding/completeness';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const refused = await readRefusal(s => canReadAdministration(s, id), { register: 'institution', id });
  if (refused) return refused;
  const c = institutionCompleteness(id);
  if (!c) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  return NextResponse.json({ completeness: c, labels: { dimensions: DIMENSION_LABEL, states: STATE_LABEL } });
}
