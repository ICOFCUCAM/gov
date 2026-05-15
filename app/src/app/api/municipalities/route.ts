import { NextRequest, NextResponse } from 'next/server';
import { onboardMunicipality } from '@/lib/data/store';
import type { MunicipalityOnboardingInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: Partial<MunicipalityOnboardingInput>;
  try {
    body = (await req.json()) as Partial<MunicipalityOnboardingInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.name || !body.country || !body.adminContact) {
    return NextResponse.json(
      { error: 'name, country, adminContact are required' },
      { status: 422 },
    );
  }
  const result = onboardMunicipality({
    name: body.name,
    country: body.country,
    adminContact: body.adminContact,
    population: body.population ?? 0,
    officialLanguages: body.officialLanguages ?? [],
    inclusionFloor: body.inclusionFloor ?? {
      ussd: false,
      ivr: false,
      agentNetwork: false,
      walkIn: false,
    },
    modules: body.modules ?? [],
    constitutionalOfficerSignoff: body.constitutionalOfficerSignoff ?? false,
  });
  return NextResponse.json({ result }, { status: result.status === 'provisioned' ? 201 : 200 });
}
