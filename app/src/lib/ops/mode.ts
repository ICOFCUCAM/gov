// What this installation is (docs/GOVERNMENT_OPERATING_MODEL.md §3.1,
// directions 10.2, 10.3): the one place that decides, read by the seeds, the
// banners, the citizen demo session, /api/health and the start-up check. No
// imports: the middleware and client components read it too.
//
//   CIVICOS_MODE=production   a real government: no sample record is created,
//                             the demo citizen session is refused, simulated
//                             figures say so
//   CIVICOS_MODE=training     samples and simulations, with a permanent banner
//                             "nothing here is real"
//   CIVICOS_MODE=demo         samples and simulations, with a permanent banner
//   not set                   demo in development and tests (next dev, vitest);
//                             in a production build (next build / next start,
//                             the container image) it fails closed: it runs as
//                             production, warns at every start and shows a
//                             banner until an administrator sets the mode.
//
// The design asked for a refusal to start when unset; failing closed instead
// keeps an already-running deployment reachable while still never showing
// sample records as a nation's own.

export type InstallationMode = 'production' | 'training' | 'demo';

export interface ModeEnv { CIVICOS_MODE?: string; NODE_ENV?: string }

// Read field by field so the build inlines what it inlines (middleware, client).
const fromProcess = (): ModeEnv => ({ CIVICOS_MODE: process.env.CIVICOS_MODE, NODE_ENV: process.env.NODE_ENV });

export type ModeDecision = { mode: InstallationMode; why: 'set' | 'not set (production build)' | 'development default' };

export const isInstallationMode = (v: unknown): v is InstallationMode => v === 'production' || v === 'training' || v === 'demo';

export function modeDecision(env: ModeEnv = fromProcess()): ModeDecision {
  const v = (env.CIVICOS_MODE ?? '').trim().toLowerCase();
  if (isInstallationMode(v)) return { mode: v, why: 'set' };
  return env.NODE_ENV === 'production' ? { mode: 'production', why: 'not set (production build)' } : { mode: 'demo', why: 'development default' };
}

export const installationMode = (env?: ModeEnv): InstallationMode => modeDecision(env).mode;

/** Sample records (example cases, bills, notifications, the demo citizen) may exist: training and demo only. */
export const samplesAllowed = (env?: ModeEnv): boolean => installationMode(env) !== 'production';

/** A production build started without CIVICOS_MODE: warned at start and shown on every page until set. */
export const modeUnset = (env: ModeEnv = fromProcess()): boolean => modeDecision(env).why === 'not set (production build)';

export const MODE_UNSET_WARNING = 'CIVICOS_MODE IS NOT SET: this production server runs as a production installation (no sample records, no demo citizen). Set CIVICOS_MODE=production for a real government, or CIVICOS_MODE=demo or training for a demonstration, and restart.';

/** Plain words for each mode, shown on banners and in setup. */
export const MODE_LABEL: Record<InstallationMode, string> = {
  production: 'Production installation',
  training: 'Training installation',
  demo: 'Demonstration installation',
};
