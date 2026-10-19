// supabase/cron/schedule.sql must never send the nation's cron secret to a
// host the nation did not configure (go-live review H-2): every job goes
// through civicos.cron_call(), which sends nothing until the Vault secret
// civicos_base_url is set (supabase/tests/go_live_security_test.sql).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const app = join(__dirname, '..', '..', '..');
const sql = readFileSync(join(app, 'supabase', 'cron', 'schedule.sql'), 'utf8');
const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
const jobs = [...code.matchAll(/cron\.schedule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\$\$(.*?)\$\$\s*\)/g)]
  .map(m => ({ name: m[1]!, schedule: m[2]!, body: m[3]! }));

describe('supabase/cron/schedule.sql', () => {
  it('schedules every job', () => {
    expect(jobs.length).toBeGreaterThanOrEqual(15);
    expect(code.match(/cron\.schedule\(/g)!.length).toBe(jobs.length);
  });

  it('has no fallback host and never reads the secret or calls pg_net in a job body', () => {
    expect(code).not.toMatch(/vercel\.app|https?:\/\/[a-z0-9]/i);
    expect(code).not.toMatch(/coalesce/i);
    for (const j of jobs) {
      expect(j.body, j.name).not.toMatch(/net\.http_|decrypted_secret/);
    }
  });

  it('runs each job through civicos.cron_call under its own name, for an existing cron route', () => {
    for (const j of jobs) {
      const m = /^select civicos\.cron_call\('([^']+)', '(\/api\/cron\/[a-z0-9-]+)'(?:, 'POST')?\)$/.exec(j.body.trim());
      expect(m, j.body).not.toBeNull();
      expect(m![1]).toBe(j.name);
      expect(existsSync(join(app, 'src', 'app', m![2]!, 'route.ts')), m![2]).toBe(true);
    }
  });
});
