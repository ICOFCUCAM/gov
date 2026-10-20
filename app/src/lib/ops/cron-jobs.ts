// The platform's scheduled jobs (app/src/app/api/cron/<name>) as the app
// reads them: the one list (scripts/cron-jobs.json, shared with the self-host
// scheduler, the Helm chart and pg_cron) and, next to it, each job's retry
// policy and what its answer reports as the items it processed.
//
// Retry policy (register 18.39): a failed run is retried by the job's next
// invocation once its backoff has passed (backoffMinutes, doubled after each
// failure in a row); an invocation that arrives sooner is deferred, so a job
// called every minute never retries in a tight loop. After `attempts` failures
// in a row the subscribed officials are alerted once (lib/ops/cron-runs.ts);
// later invocations run on the job's own schedule until one succeeds.
// leaseMinutes: how long a run may hold the job before another invocation
// treats it as abandoned (the instance stopped) and may run.

import jobList from '../../../scripts/cron-jobs.json';
import { previousMatch, nextMatch } from '../../../scripts/cron-lib.mjs';

export interface CronJob { name: string; schedule: string; method: 'GET' | 'POST'; substrate: boolean }
export interface RetryPolicy {
  /** Failures in a row before the run counts as failed for good and officials are alerted. */
  attempts: number;
  /** Wait before the first retry; doubled after each further failure. */
  backoffMinutes: number;
  /** How long one run may hold the job. */
  leaseMinutes: number;
  /** The field of the job's answer that counts the items it processed (a number, or a list counted). */
  items?: string;
}

export const CRON_JOBS: readonly CronJob[] = (jobList as { jobs: CronJob[] }).jobs;

/** One row per job (cron-jobs.test.ts holds it equal to the job list). */
export const RETRY_POLICY: Readonly<Record<string, RetryPolicy>> = {
  'deliver-events':      { attempts: 3, backoffMinutes: 5,  leaseMinutes: 10, items: 'total_delivered' },
  'substrate-metrics':   { attempts: 3, backoffMinutes: 10, leaseMinutes: 10, items: 'samples' },
  'audit-anchor':        { attempts: 3, backoffMinutes: 10, leaseMinutes: 10, items: 'scopes_anchored' },
  'witness-sweep':       { attempts: 3, backoffMinutes: 15, leaseMinutes: 15, items: 'attested' },
  'witness-divergence':  { attempts: 3, backoffMinutes: 15, leaseMinutes: 15, items: 'scopes_checked' },
  'posture-digest':      { attempts: 3, backoffMinutes: 30, leaseMinutes: 15, items: 'snapshots' },
  'expire-consents':     { attempts: 3, backoffMinutes: 5,  leaseMinutes: 15, items: 'expired_count' },
  'audit-self':          { attempts: 3, backoffMinutes: 5,  leaseMinutes: 10 },
  'update-watchdog':     { attempts: 5, backoffMinutes: 1,  leaseMinutes: 5 },
  'site-feeds':          { attempts: 3, backoffMinutes: 30, leaseMinutes: 10, items: 'sites' },
  'twin-ingest':         { attempts: 3, backoffMinutes: 5,  leaseMinutes: 15, items: 'runs' },
  'retention':           { attempts: 3, backoffMinutes: 5,  leaseMinutes: 15 },
  'deliver-cloudevents': { attempts: 5, backoffMinutes: 2,  leaseMinutes: 5,  items: 'total_delivered' },
  'deliver-messages':    { attempts: 5, backoffMinutes: 1,  leaseMinutes: 5,  items: 'attempted' },
  'backup':              { attempts: 3, backoffMinutes: 5,  leaseMinutes: 30 },
  'case-deadlines':      { attempts: 3, backoffMinutes: 15, leaseMinutes: 15, items: 'lapsed' },
  'sla':                 { attempts: 3, backoffMinutes: 5,  leaseMinutes: 10, items: 'escalated' },
  'telemetry-stale':     { attempts: 3, backoffMinutes: 5,  leaseMinutes: 10, items: 'escalated' },
  'promote-directives':  { attempts: 3, backoffMinutes: 5,  leaseMinutes: 10, items: 'promoted' },
};

export function cronJob(name: string): CronJob & { retry: RetryPolicy } {
  const j = CRON_JOBS.find(x => x.name === name);
  const retry = RETRY_POLICY[name];
  if (!j || !retry) throw new Error(`Not a scheduled job in scripts/cron-jobs.json: ${name}`);
  return { ...j, retry };
}

/** Whether the Supabase substrate is configured (the substrate-only jobs need it; as scripts/self-host-lib.mjs decides). */
export const substrateConfigured = (env: Record<string, string | undefined> = process.env): boolean =>
  !!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

/** The jobs this installation runs: without the substrate, the substrate-only ones are left out. */
export const jobsHere = (env: Record<string, string | undefined> = process.env): CronJob[] =>
  CRON_JOBS.filter(j => !j.substrate || substrateConfigured(env));

/** The minute the schedule last fell on at or before `at` (the run's scheduled slot). */
export const slotOf = (job: Pick<CronJob, 'schedule'>, at: Date): Date | null => previousMatch(job.schedule, at);
/** The next minute the schedule falls on after `at`. */
export const nextRunOf = (job: Pick<CronJob, 'schedule'>, at: Date): Date | null => nextMatch(job.schedule, at);

/** Minutes between the job's slot at `at` and the following one. */
export function intervalMinutes(job: Pick<CronJob, 'schedule'>, at = new Date()): number {
  const prev = slotOf(job, at), next = prev ? nextRunOf(job, prev) : null;
  return prev && next ? Math.round((next.getTime() - prev.getTime()) / 60_000) : 24 * 60;
}

/** The run key of a scheduled slot: `slot:2026-10-20T14:05Z` (the same text pg_cron sends). */
export const slotKey = (slot: Date): string => `slot:${slot.toISOString().slice(0, 16)}Z`;

/** The wait before retry number `failures` (1 = after the first failure). */
export const backoffMs = (p: RetryPolicy, failures: number): number =>
  p.backoffMinutes * 60_000 * 2 ** Math.max(0, Math.min(failures, p.attempts) - 1);
