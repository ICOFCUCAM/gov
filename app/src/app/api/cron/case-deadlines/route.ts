// Case deadlines cron — every 15 minutes (supabase/cron/schedule.sql).
//
// Marks legal deadlines of cases that have passed (lib/casework/engine.ts
// lapseDeadlines()): escalates where the procedure says so, writes one audit
// entry per lapsed deadline (case reference, deadline, effect; never personal
// fields) and alerts the responsible institution's subscribed officials.
//
// Auth: CIVICOS_CRON_SECRET as `Authorization: Bearer …`, like every /api/cron/* worker.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { cronRoute } from '@/lib/ops/cron-runs';
import { lapseDeadlines, lapseProposals } from '@/lib/casework/engine';
import { expireStandings } from '@/lib/organisations/register';
import { expireGrants } from '@/lib/immigration/register';
import { watchAccess } from '@/lib/records/access-watch';
import { reconcileTaxPayments } from '@/lib/tax/register';
import { lapseRegistrations } from '@/lib/professions/register';
import { expireProducts } from '@/lib/health/products/register';
import { reconcileCustomsPayments } from '@/lib/customs/register';
import { raiseSuspensionAlerts, lapseSuspensionPolicy } from '@/lib/permits/authority';
import { lapseDualControlPolicy } from '@/lib/casework/dual-control-policy';
import { listReceipts, lapseClassification } from '@/lib/data/store';
import { activateDue, lapseProcess } from '@/lib/constitution/profile';

export const dynamic = 'force-dynamic';

async function runJob(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const lapsed = lapseDeadlines();
  const expired = expireStandings();
  const immigration = expireGrants();
  const access = watchAccess();
  const tax = reconcileTaxPayments(listReceipts());
  const professionals = lapseRegistrations();
  const products = expireProducts();
  const customs = reconcileCustomsPayments(listReceipts());
  const suspensions = raiseSuspensionAlerts();
  const proposals = lapseProposals();
  // Proposed changes to the country's two-official and suspension rules that nobody confirmed in time.
  lapseDualControlPolicy(); lapseSuspensionPolicy(); lapseClassification(); lapseProcess();
  // Constitutional profiles approved for a date that has come (plan phase 5): activated with their recorded approvals.
  const profilesActivated = activateDue();
  return NextResponse.json({ ok: true, lapsed: lapsed.length, cases: lapsed.map(l => ({ ref: l.ref, deadline: l.deadline, onLapse: l.onLapse })), expired, immigrationExpired: immigration.length, unusualAccessRaised: access.raised, taxPaymentsPosted: tax.posted, taxPaymentsUnmatched: tax.unmatched.length, professionalsLapsed: professionals.length, productsLapsed: products.length, customsPaymentsPosted: customs.posted, customsPaymentsUnmatched: customs.unmatched.length, suspensionAlerts: suspensions.length, proposalsLapsed: proposals.length, profilesActivated });
}

// Run recorded, deduplicated, retried and alerted on by lib/ops/cron-runs.ts (register 18.39).
export const GET = cronRoute('case-deadlines', runJob);
export const POST = GET;
