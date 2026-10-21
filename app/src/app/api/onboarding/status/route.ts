import { NextResponse } from 'next/server';
import { refusal } from '@/lib/auth/official';
import { canSeeOnboarding } from '@/lib/auth/roles';
import { onboardingStatus } from '@/lib/onboarding/status';
export const dynamic = 'force-dynamic';

/** Where setup stands: each track's checks with the page that does the work, and changes waiting for a second official. */
export async function GET() {
  const refused = await refusal(canSeeOnboarding);
  if (refused) return refused;
  return NextResponse.json(onboardingStatus());
}
