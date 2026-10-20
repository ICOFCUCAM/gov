// The citizen behind a request (server components and routes): signed in
// through the nation's identity service (lib/auth/citizen-session.ts), or,
// in training and demonstration installations only, the demo citizen.
import { cookies } from 'next/headers';
import { verifyCitizen, CITIZEN_COOKIE, type CitizenClaims } from './citizen-session';
import { samplesAllowed } from '@/lib/ops/mode';

export async function currentCitizen(): Promise<(CitizenClaims & { demo?: false }) | { demo: true; sub: 'demo'; name: string } | null> {
  let token: string | undefined;
  try { token = (await cookies()).get(CITIZEN_COOKIE)?.value; } catch { token = undefined; }
  const c = await verifyCitizen(token, process.env.CIVICOS_SESSION_SECRET);
  if (c) return c;
  return samplesAllowed() ? { demo: true, sub: 'demo', name: 'Demo citizen' } : null;
}
