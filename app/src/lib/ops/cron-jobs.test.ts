// One list of scheduled jobs (scripts/cron-jobs.json) for every scheduler:
// the self-host script reads it, and the Helm chart's values (cron.jobs) and
// pg_cron's schedule (supabase/cron/schedule.sql, and the migration that
// sets it on the substrate, 20261027010000_civicos_cron_schedule.sql) must say
// the same thing; every job has a retry policy (src/lib/ops/cron-jobs.ts).

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadJobs, jobsFor, parseCron, type CronJob as Job } from '../../../scripts/self-host-lib.mjs';
import { CRON_JOBS, RETRY_POLICY } from './cron-jobs';

const app = join(__dirname, '..', '..', '..');
const jobs: Job[] = loadJobs(app);

/** cron.jobs in the chart's values: `name: { schedule: "…", method: GET, substrate: true }` lines. */
function helmJobs(): Job[] {
  const yaml = readFileSync(join(app, '..', 'infra', 'helm', 'civicos', 'values.yaml'), 'utf8');
  const cron = yaml.slice(yaml.search(/^cron:/m));
  const block = cron.slice(cron.search(/^ {2}jobs:/m)).split('\n').slice(1);
  const out: Job[] = [];
  for (const line of block) {
    const m = /^ {4}([a-z0-9-]+):\s*\{(.*)\}\s*$/.exec(line);
    if (!m) break;
    const f = Object.fromEntries(m[2]!.split(',').map(p => p.split(':').map(s => s.trim().replace(/^"|"$/g, ''))));
    out.push({ name: m[1]!, schedule: f.schedule, method: (f.method ?? 'GET') as Job['method'], substrate: f.substrate === 'true' });
  }
  return out;
}

function pgCronJobs(file = join('supabase', 'cron', 'schedule.sql')): Omit<Job, 'substrate'>[] {
  const sql = readFileSync(join(app, file), 'utf8').split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  return [...sql.matchAll(/cron\.schedule\('civicos-([a-z0-9-]+)', '([^']+)', \$\$select civicos\.cron_call\('[^']+', '\/api\/cron\/[a-z0-9-]+'(, 'POST')?\)\$\$\)/g)]
    .map(m => ({ name: m[1]!, schedule: m[2]!, method: m[3] ? 'POST' : 'GET' }));
}

const byName = <T extends { name: string }>(l: T[]) => [...l].sort((a, b) => a.name.localeCompare(b.name));

describe('scripts/cron-jobs.json', () => {
  it('names every cron route once, with a valid schedule', () => {
    const routes = readdirSync(join(app, 'src', 'app', 'api', 'cron')).filter(d => existsSync(join(app, 'src', 'app', 'api', 'cron', d, 'route.ts')));
    expect(byName(jobs).map(j => j.name)).toEqual([...routes].sort());
    for (const j of jobs) {
      expect(() => parseCron(j.schedule), j.name).not.toThrow();
      expect(['GET', 'POST']).toContain(j.method);
      expect(typeof j.substrate).toBe('boolean');
    }
  });

  it('matches the Helm chart (cron.jobs in infra/helm/civicos/values.yaml)', () => {
    expect(byName(helmJobs())).toEqual(byName(jobs));
  });

  it('matches pg_cron (supabase/cron/schedule.sql)', () => {
    expect(byName(pgCronJobs())).toEqual(byName(jobs.map(j => ({ name: j.name, schedule: j.schedule, method: j.method }))));
  });

  it('matches the pg_cron migration (supabase/migrations/20261027010000_civicos_cron_schedule.sql)', () => {
    expect(byName(pgCronJobs(join('supabase', 'migrations', '20261027010000_civicos_cron_schedule.sql')))).toEqual(byName(jobs.map(j => ({ name: j.name, schedule: j.schedule, method: j.method }))));
  });

  it('is the list the app reads, with a retry policy for every job', () => {
    expect(byName([...CRON_JOBS])).toEqual(byName(jobs));
    expect(Object.keys(RETRY_POLICY).sort()).toEqual(jobs.map(j => j.name).sort());
  });

  it('leaves the substrate-only jobs out when the substrate is not configured', () => {
    const local: Job[] = jobsFor(jobs, {});
    expect(local.every(j => !j.substrate)).toBe(true);
    expect(local.map(j => j.name)).toEqual(expect.arrayContaining(['update-watchdog', 'deliver-messages', 'backup', 'audit-anchor']));
    expect(jobsFor(jobs, { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' })).toHaveLength(jobs.length);
  });
});
