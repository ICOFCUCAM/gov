// CivicOS — Update Center release readiness: preflight compatibility and
// staging, server-side.
//
// Preflight scans the nation's registered customisations against a target
// release before approval: nation-supplied modules, integrations and builds
// (the security store's own-software registry), and — for the installed
// nation — its integration clients, signed configuration bundles and
// institutions chartered beyond the canonical set. Each finding is
// compatible / needs change / blocking, with the reason. Blocking findings
// stop approval until resolved or waived by two named officials.
//
// Staging: each nation has a staging environment (hosted nations get one
// provisioned). A production install needs the same release to have passed
// staging probation and a recorded user-acceptance sign-off, unless the
// nation turns the policy off. decide() in ./updates enforces both gates.

import type { DistributionRelease, PreflightFinding, PreflightReport, StagingEnvironment, StagingRun, SubscribedNation } from '@/lib/api/types';
import { recordAudit, listIntegrations, listConfigs, listMinistries } from './store';
import { listSoftware } from './security-store';
import { federationSeed } from '@/lib/institution/federation';

interface ReadinessDb {
  reports: Record<string, PreflightReport>;
  waivers: Record<string, NonNullable<PreflightFinding['waiver']>>;
  staging: Record<string, StagingEnvironment>;
}
const g = globalThis as unknown as { __civicosReadiness?: ReadinessDb };
function rdb(): ReadinessDb { return (g.__civicosReadiness ??= { reports: {}, waivers: {}, staging: {} }); }
export function resetReadiness(): void { g.__civicosReadiness = { reports: {}, waivers: {}, staging: {} }; }

const key = (nationId: string, releaseId: string) => `${nationId}:${releaseId}`;
let canonical: Set<string> | undefined;
const canonicalSlugs = () => (canonical ??= new Set(federationSeed().map(m => m.slug)));

/** The scan itself: deterministic rules, each finding with its reason. */
export function scan(n: SubscribedNation, r: DistributionRelease): PreflightFinding[] {
  const breaking = r.breakingChanges;
  const removals = r.changes.filter(c => c.kind === 'deprecation' && /remov/i.test(c.text)).map(c => c.text);
  const inPlace = r.migrations.filter(m => !m.reversible || m.pattern === 'in-place');
  const configMigrations = r.migrations.filter(m => m.kind === 'configuration');
  const out: PreflightFinding[] = [];

  for (const s of listSoftware(n.id)) {
    const k = `software:${s.id}`;
    if (s.kind === 'module' && (breaking.length || removals.length)) {
      out.push({ key: k, subject: `${s.name} ${s.version}`, kind: 'module', status: 'blocking', reason: `Modules run inside the platform. ${[...breaking, ...removals][0]} — the module must be updated or confirmed against ${r.version}.` });
    } else if (s.kind === 'build' && inPlace.length) {
      out.push({ key: k, subject: `${s.name} ${s.version}`, kind: 'build', status: 'blocking', reason: `Your own build reads the database directly; ${inPlace[0]!.description.toLowerCase()} changes data in place.` });
    } else if (s.kind === 'integration' && (breaking.length || removals.length)) {
      out.push({ key: k, subject: `${s.name} ${s.version}`, kind: 'integration', status: 'needs-change', reason: `${[...breaking, ...removals][0]} — check the calls this integration makes.` });
    } else {
      out.push({ key: k, subject: `${s.name} ${s.version}`, kind: s.kind, status: 'compatible', reason: 'No breaking change, removal or in-place migration affects it.' });
    }
  }
  if (n.home) {
    for (const c of listIntegrations().filter(i => i.status === 'approved')) {
      out.push(breaking.length
        ? { key: `integration:${c.id}`, subject: c.name, kind: 'integration', status: 'needs-change', reason: `${breaking[0]} — confirm ${c.ownerOrg} is not using it.` }
        : { key: `integration:${c.id}`, subject: c.name, kind: 'integration', status: 'compatible', reason: 'API surface it uses is unchanged.' });
    }
    const applied = listConfigs().filter(c => c.state === 'applied');
    for (const c of applied) {
      out.push(configMigrations.length
        ? { key: `config:${c.id}`, subject: `Configuration bundle v${c.version} (${c.scope})`, kind: 'configuration', status: 'needs-change', reason: `${configMigrations[0]!.description}: review the merged configuration before production.` }
        : { key: `config:${c.id}`, subject: `Configuration bundle v${c.version} (${c.scope})`, kind: 'configuration', status: 'compatible', reason: 'No configuration migration in this release.' });
    }
    for (const m of listMinistries().filter(x => x.status !== 'merged' && !canonicalSlugs().has(x.slug))) {
      out.push(inPlace.length
        ? { key: `institution:${m.id}`, subject: `${m.name} (custom charter)`, kind: 'institution', status: 'needs-change', reason: `${inPlace[0]!.description} — verify the institution's custom modules after migration.` }
        : { key: `institution:${m.id}`, subject: `${m.name} (custom charter)`, kind: 'institution', status: 'compatible', reason: 'Charter modules are unaffected.' });
    }
  }
  return out.map(f => {
    const w = rdb().waivers[`${key(n.id, r.id)}:${f.key}`];
    return w && f.status === 'blocking' ? { ...f, waiver: w } : f;
  });
}

function report(n: SubscribedNation, r: DistributionRelease, findings: PreflightFinding[], by: string, at: string): PreflightReport {
  const blocking = findings.filter(f => f.status === 'blocking');
  return {
    nationId: n.id, releaseId: r.id, version: r.version, runAt: at, runBy: by, findings,
    summary: {
      compatible: findings.filter(f => f.status === 'compatible').length,
      needsChange: findings.filter(f => f.status === 'needs-change').length,
      blocking: blocking.length,
      waived: blocking.filter(f => f.waiver).length,
    },
    approvable: blocking.every(f => f.waiver),
  };
}

/** Run (and record) the preflight scan. Audited. */
export function runPreflight(n: SubscribedNation, r: DistributionRelease, by: string): PreflightReport {
  const at = new Date().toISOString();
  const rep = report(n, r, scan(n, r), by, at);
  rdb().reports[key(n.id, r.id)] = rep;
  recordAudit(by, 'update.preflight', `UpdateChamber:${n.id}/${r.version}`, 'ok',
    `${rep.summary.compatible} compatible · ${rep.summary.needsChange} need change · ${rep.summary.blocking} blocking${rep.summary.waived ? ` (${rep.summary.waived} waived)` : ''}`);
  return rep;
}

export function latestPreflight(nationId: string, releaseId: string): PreflightReport | undefined {
  return rdb().reports[key(nationId, releaseId)];
}

/** Two named officials waive one blocking finding, with a reason. */
export function waiveFinding(n: SubscribedNation, r: DistributionRelease, findingKey: string, input: { by?: string; secondBy?: string; reason?: string }): PreflightReport | { error: string; status: number } {
  const by = (input.by ?? '').trim(), second = (input.secondBy ?? '').trim(), reason = (input.reason ?? '').trim();
  if (!by || !second) return { error: 'A waiver needs two named officials', status: 422 };
  if (by.toLowerCase() === second.toLowerCase()) return { error: 'The second official must be a different person', status: 422 };
  if (reason.length < 15) return { error: 'Give the reason for the waiver (at least 15 characters)', status: 422 };
  const f = scan(n, r).find(x => x.key === findingKey);
  if (!f) return { error: 'Finding not found', status: 404 };
  if (f.status !== 'blocking') return { error: 'Only blocking findings can be waived', status: 409 };
  if (f.waiver) return { error: 'Already waived', status: 409 };
  const at = new Date().toISOString();
  rdb().waivers[`${key(n.id, r.id)}:${findingKey}`] = { by, secondBy: second, reason, at };
  recordAudit(`${by} + ${second}`, 'update.preflight.waive', `UpdateChamber:${n.id}/${r.version}`, 'ok', `${f.subject}: ${reason}`);
  return runPreflight(n, r, `${by} + ${second}`);
}

/** Approval gate: a recorded preflight with no unwaived blocking finding. Runs the scan if none exists. */
export function preflightGate(n: SubscribedNation, r: DistributionRelease, by: string): { ok: true; report: PreflightReport } | { ok: false; error: string } {
  // Always rescan: customisations may have changed since the last report.
  const rep = runPreflight(n, r, by);
  if (rep.approvable) return { ok: true, report: rep };
  const open = rep.findings.filter(f => f.status === 'blocking' && !f.waiver);
  return { ok: false, error: `Preflight found ${open.length} blocking issue${open.length > 1 ? 's' : ''}: ${open.map(f => f.subject).join(', ')}. Resolve, or have two officials waive, before approval` };
}

// ── Staging ──────────────────────────────────────────────────────────
export function stagingEnvironment(n: SubscribedNation): StagingEnvironment {
  const db = rdb();
  return (db.staging[n.id] ??= n.deliveryMode === 'saas'
    ? { nationId: n.id, name: 'Hosted staging', url: `https://staging.${n.id}.civicos.example`, provisioned: true, provisionedBy: 'publisher', runs: [] }
    : { nationId: n.id, name: 'Staging', provisioned: false, runs: [] });
}

/** Self-hosted and air-gapped nations register their own staging environment. */
export function registerStaging(n: SubscribedNation, input: { name?: string; url?: string; by?: string }): StagingEnvironment | { error: string; status: number } {
  const by = (input.by ?? '').trim(), name = (input.name ?? '').trim(), url = (input.url ?? '').trim();
  if (!by) return { error: 'Name the person registering staging', status: 422 };
  if (name.length < 2 || !/^https?:\/\/\S+$/.test(url)) return { error: 'Give the staging environment a name and its URL', status: 422 };
  const env = stagingEnvironment(n);
  env.name = name; env.url = url; env.provisioned = true; env.provisionedBy = 'nation';
  recordAudit(by, 'update.staging.register', `UpdateChamber:${n.id}/staging`, 'ok', `${name} ${url}`);
  return env;
}

export function stagingRun(nationId: string, releaseId: string): StagingRun | undefined {
  return rdb().staging[nationId]?.runs.find(x => x.releaseId === releaseId);
}

/** Install a release on staging and start its staging probation. */
export function stagingInstall(n: SubscribedNation, r: DistributionRelease, by: string, now = Date.now()): StagingRun | { error: string; status: number } {
  if (!by.trim()) return { error: 'Name the person installing on staging', status: 422 };
  const env = stagingEnvironment(n);
  if (!env.provisioned) return { error: 'Register your staging environment first', status: 409 };
  if (r.status !== 'active') return { error: `The publisher has ${r.status} ${r.version}`, status: 409 };
  const existing = env.runs.find(x => x.releaseId === r.id);
  if (existing && existing.state !== 'failed') return { error: `Already on staging (${existing.state})`, status: 409 };
  const run: StagingRun = {
    releaseId: r.id, version: r.version, state: 'probation', startedBy: by.trim(),
    startedAt: new Date(now).toISOString(), endsAt: new Date(now + n.settings.probationMinutes * 60_000).toISOString(),
  };
  env.runs = [...env.runs.filter(x => x.releaseId !== r.id), run];
  recordAudit(by.trim(), 'update.staging.install', `UpdateChamber:${n.id}/staging/${r.version}`, 'ok', `staging probation ${n.settings.probationMinutes} min`);
  return run;
}

export function stagingFail(n: SubscribedNation, r: DistributionRelease, by: string, reason: string): StagingRun | { error: string; status: number } {
  const run = stagingRun(n.id, r.id);
  if (!run || run.state !== 'probation') return { error: 'No staging probation is running for this release', status: 409 };
  if (!by.trim() || reason.trim().length < 10) return { error: 'Name yourself and describe the failure (at least 10 characters)', status: 422 };
  run.state = 'failed'; run.failedReason = reason.trim();
  recordAudit(by.trim(), 'update.staging.fail', `UpdateChamber:${n.id}/staging/${r.version}`, 'ok', reason.trim());
  return run;
}

/** Watchdog for staging: probations that ran their window without a recorded failure pass. */
export function superviseStaging(now = Date.now()): void {
  for (const env of Object.values(rdb().staging)) {
    for (const run of env.runs) {
      if (run.state === 'probation' && now >= Date.parse(run.endsAt)) {
        run.state = 'passed'; run.passedAt = run.endsAt;
        recordAudit('system (resilience watchdog)', 'update.staging.pass', `UpdateChamber:${env.nationId}/staging/${run.version}`, 'ok', 'staging probation passed');
      }
    }
  }
}

/** User-acceptance sign-off after staging passed: named tester, date, evidence. */
export function signUat(n: SubscribedNation, r: DistributionRelease, input: { tester?: string; date?: string; evidence?: string }): StagingRun | { error: string; status: number } {
  const run = stagingRun(n.id, r.id);
  if (!run || run.state !== 'passed') return { error: 'Staging probation must pass before user acceptance', status: 409 };
  const tester = (input.tester ?? '').trim(), evidence = (input.evidence ?? '').trim();
  const date = Date.parse(input.date ?? '');
  if (!tester) return { error: 'Name the tester', status: 422 };
  if (!Number.isFinite(date) || date > Date.now() + 86_400_000) return { error: 'Give the test date', status: 422 };
  if (evidence.length < 15) return { error: 'Describe the evidence (test cases run, results, ticket) — at least 15 characters', status: 422 };
  run.uat = { tester, date: new Date(date).toISOString(), evidence, signedAt: new Date().toISOString() };
  recordAudit(tester, 'update.staging.uat', `UpdateChamber:${n.id}/staging/${r.version}`, 'ok', evidence);
  return run;
}

/** Production install gate. */
export function stagingGate(n: SubscribedNation, r: DistributionRelease): { ok: true } | { ok: false; error: string } {
  if (!n.settings.stagingRequired) return { ok: true };
  const run = stagingRun(n.id, r.id);
  if (!run) return { ok: false, error: `Install ${r.version} on staging first: production needs a passed staging probation and a user-acceptance sign-off` };
  if (run.state !== 'passed') return { ok: false, error: `Staging probation of ${r.version} is ${run.state}; production needs it passed` };
  if (!run.uat) return { ok: false, error: `Record the user-acceptance sign-off for ${r.version} before the production install` };
  return { ok: true };
}
