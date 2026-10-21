// GET /api/exchange/overview — the data-sharing services at a glance
// (lib/exchange/overview.ts): every exchange service with the authority
// responsible for it (deployment profile), the register it answers from, the
// integrations approved for it and their purposes, and aggregate call counts
// and refusal reasons from the exchange log. Counts only: never a request's
// input, purpose text or answer. Read only; approvals are made on
// /integrations by two officials.
import { NextResponse } from 'next/server';
import { serviceOverview } from '@/lib/exchange/overview';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ services: serviceOverview(), at: new Date().toISOString() });
}
