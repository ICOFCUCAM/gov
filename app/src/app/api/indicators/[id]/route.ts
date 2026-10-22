// /api/indicators/[id] — one indicator definition (plan step I3): every
// version of its terms, every approval (withdrawn ones kept), its value for
// the month and the last twelve months for one institution (?institution=ID;
// a slot's institution by default, the whole government for a definition each
// institution keeps), each institution's value, and the value in the common
// indicator contract (spec Part 1 §12, Part 2 F). Read only: changes go
// through POST /api/indicators.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { getMinistry, listMinistries } from '@/lib/data/store';
import { getDefinition, ownerInstitutionOf, ownerLabel, versionFor } from '@/lib/indicators/register';
import { computeValue, governmentValue, institutionFor, seriesOf, monthPeriod } from '@/lib/indicators/compute';
import { contractOf } from '@/lib/indicators/contract';
import { getMethod } from '@/lib/indicators/methods';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const def = getDefinition(decodeURIComponent(id));
  if (!def) return NextResponse.json({ error: 'No such indicator' }, { status: 404 });
  const q = req.nextUrl.searchParams;
  const month = q.get('month') ?? undefined;
  const viewer = (await routeActor()).scope;
  const requested = q.get('institution')?.trim() || undefined;
  if (requested && !getMinistry(requested)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  const institution = institutionFor(def, requested);
  const each = 'each' in def.owner;
  const value = each && !institution ? governmentValue(def, { month, viewer }) : computeValue(def, { month, viewer, ...(institution ? { institution } : {}) });
  const series = institution || !each ? seriesOf(def.id, 12, { month, viewer, ...(institution ? { institution } : {}) }) : [];
  const owner = ownerInstitutionOf(def.owner);
  const byInstitution = each ? listMinistries().filter(m => m.status !== 'merged').map(m => {
    const v = computeValue(def, { month, viewer, institution: m.id });
    return { institution: { id: m.id, name: m.name }, status: versionFor(def, m.id).status, version: v.version, value: v.value, kind: v.kind, unit: v.unit, reason: v.reason ?? null, coverage: v.coverage };
  }) : [];
  return NextResponse.json({
    period: monthPeriod(month), definition: def, ownerLabel: ownerLabel(def.owner),
    ownerInstitution: owner ? { id: owner, name: getMinistry(owner)?.name ?? owner } : owner === '' ? null : undefined,
    methods: def.versions.map(v => ({ version: v.n, method: getMethod(v.terms.method.id, v.terms.method.version)?.label ?? 'no longer offered' })),
    institution: institution ? { id: institution, name: getMinistry(institution)?.name ?? institution } : null,
    value, series, byInstitution, contract: contractOf(def, value),
  });
}
