// No patient or clinical field in the health application (CLAUDE.md, Health:
// "public, administrative and clinical data stay apart: no patient or clinical
// field anywhere, no national patient record; returns are aggregates";
// audit B §6.5, acceptance P0-06). A scan of every source file of
// apps/ministry-health for the words a patient or clinical field carries, with
// each exception named and justified; and a check that the administrative
// engine the screens read (lib/gov/health-admin.ts) answers with no such field.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { workforceDesk, serviceAccess, portalUsage, bayBoard, emergencyAttendance } from '@/lib/gov/health-admin';

const ROOT = join(__dirname);
const FORBIDDEN: [string, RegExp][] = [
  // A word starting with "patient" (Outpatients and Inpatient wards are service lines).
  ['patient', /(?<![a-z])patient/i],
  ['triage', /triage/i],
  ['diagnosis', /diagnos/i],
  ['clinical risk', /clinical risk/i],
  ['risk score or band', /risk[ -_]?(score|band)/i],
  ['health score', /health[ -_]?score/i],
  ['medical record number', /\bMRN\b/],
  ['vital signs', /vital[ -]?signs?|\bvitals\b/i],
  ['electronic health record', /\bEHR\b/],
  ['medical record', /medical record/i],
  ['allergy', /allerg/i],
  ['chief complaint', /chief ?complaint/i],
  ['clinical record', /clinical record/i],
];

/**
 * Tokens that carry a forbidden word but no patient or clinical field, each
 * with its reason. They are removed from a line before it is checked.
 */
const ALLOWED: { file: RegExp; token: RegExp; why: string }[] = [
  { file: /./, token: /'patient'|\bpatient:|d === 'patient'|'master-patient-index'|'patient-portal'|'longitudinal-ehr'/g, why: 'route and domain keys kept so earlier links (/app/health/<key>) keep working (preservation doctrine); the screens behind them are administrative' },
  { file: /./, token: /\bPatientSystem\b|\bMasterPatientIndex\b|\bLongitudinalEHR\b|subsystems\/PatientSystem/g, why: 'component names kept so imports and the shell registry keep working; their content is administrative and aggregate' },
  { file: /./, token: /HEALTH_DS\.triage|\btriage: '#[0-9a-f]+'/g, why: 'a colour token (amber); no data' },
  { file: /design-system\/health-ds\.tsx$/, token: /'vitals'|\bvitals:/g, why: 'a layout archetype key kept for compatibility; no screen uses it' },
  { file: /./, token: /keeps no patient or clinical record|no patient or clinical field|never a patient|no patient index|keeps no clinical record/g, why: 'states that the platform keeps no such record' },
];

/** Whole files left out, each with its reason. */
const EXCLUDED: { file: RegExp; why: string }[] = [
  { file: /\.test\.tsx?$/, why: 'tests name what they check' },
  { file: /^workflows\/health-workflows\.ts$/, why: 'process definitions (step and role names) carrying no data field; no screen shows them as records. Listed for the I4 health rebuild, where procedures come from approved packages (lib/casework/packages.ts)' },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe('the health application carries no patient or clinical field', () => {
  it('no source file names one, outside the justified exceptions', () => {
    const found: string[] = [];
    for (const path of files(ROOT)) {
      const rel = relative(ROOT, path);
      if (EXCLUDED.some(e => e.file.test(rel))) continue;
      readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
        const rest = ALLOWED.filter(a => a.file.test(rel)).reduce((l, a) => l.replace(a.token, ''), line);
        for (const [name, re] of FORBIDDEN) if (re.test(rest)) found.push(`${rel}:${i + 1} (${name}): ${line.trim().slice(0, 140)}`);
      });
    }
    expect(found).toEqual([]);
  });

  it('every exception has a reason', () => {
    for (const a of [...ALLOWED, ...EXCLUDED]) expect(a.why.length).toBeGreaterThan(20);
  });

  it('the administrative engine the screens read answers with no patient or clinical field', () => {
    const outputs = [workforceDesk('health', 100), workforceDesk('health', 250, 'DR-1003'), serviceAccess('health', 100), portalUsage('health', 100), bayBoard('health', 100), emergencyAttendance('health', 100)];
    const words = JSON.stringify(outputs);
    for (const [name, re] of FORBIDDEN) expect(re.test(words), name).toBe(false);
    // Facility boards say how a bay stands, never who is in it.
    expect(bayBoard('health', 100).bays.every(b => !('occupant' in b))).toBe(true);
  });
});
