// /api/constitution/separation — the separation-of-powers checks, observed
// (plan phase 4; audit G): each one read from the configuration that the
// platform enforces (institution register, who is responsible, accounts,
// offices, access-log retention, directives), with the page that holds the
// record. Configuration facts only: no personal data, no case. GET only.
import { NextResponse } from 'next/server';
import { separationFacts } from '@/lib/nation/separation-facts';
import { separationChecks } from '@/lib/gov/separation';

export const dynamic = 'force-dynamic';

export function GET() {
  const r = separationChecks(separationFacts());
  return NextResponse.json({ ...r, observedAt: new Date().toISOString() });
}
