// Test helpers for the Update Center suites (not a test file itself).
//
// Suites that exercise probation, fallback or the security store turn the
// staging policy off for the installed nation, so each suite tests one
// thing; staging and preflight have their own suites.

import { HOME_NATION, nationRecord, decide, type DecisionInput, type DecisionResult } from './updates';
import { stagingInstall, signUat, superviseStaging, registerStaging, stagingEnvironment } from './readiness';
import { releaseFor } from './updates';

export function stagingOff(nationId = HOME_NATION): void {
  const n = nationRecord(nationId);
  if (n) n.settings = { ...n.settings, stagingRequired: false };
}

/** Put a release through staging probation and user acceptance. */
export function stageForProduction(nationId: string, releaseId: string): void {
  const n = nationRecord(nationId)!;
  const r = releaseFor(nationId, releaseId)!;
  if (!stagingEnvironment(n).provisioned) registerStaging(n, { name: 'Test staging', url: 'https://staging.test.example', by: 'Test' });
  const run = stagingInstall(n, r, 'Staging operator');
  if ('error' in run) throw new Error(run.error);
  superviseStaging(Date.parse(run.endsAt) + 1000);
  const u = signUat(n, r, { tester: 'UAT lead', date: new Date().toISOString(), evidence: 'All acceptance scripts passed on staging' });
  if ('error' in u) throw new Error(u.error);
}

/** Four-eyes in tests: the named official proposes, a second official approves. */
export function cosign(nationId: string, releaseId: string, input: DecisionInput, second = 'Second official'): DecisionResult {
  const first = decide(nationId, releaseId, input);
  if ('error' in first || !first.pending) return first;
  return decide(nationId, releaseId, { ...input, by: second });
}
