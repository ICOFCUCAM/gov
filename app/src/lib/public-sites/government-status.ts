// What the public government directory (/government) says about the state of
// government, each line read from the system that holds it (audit B, P1–P2):
//   national posture and major incidents  the national snapshot and posture
//                                          (lib/data/store/national.ts), worded
//                                          by executivePosture() as /command does:
//                                          recorded incidents only in production,
//                                          the sample model only in demo and training
//   national readiness                     nothing measures it: Sample in demo and
//                                          training, Not connected in production
//   separation of powers                   the observed checks (lib/gov/separation.ts)
//   audit chain                            the chain's verification (auditVerification)
//   cabinet sittings and public briefings  no register records them: Not recorded
// Nothing is typed in. A source that fails to answer reads "Not connected".
// The wording is pure (publicGovernmentStatus); readGovernmentStatus() gathers
// the inputs on the server.

import type { NationalCoordination, NationalSnapshot } from '@/lib/api/types';
import { nationalCoordination, nationalSnapshot } from '@/lib/data/store/national';
import { auditVerification } from '@/lib/data/store/audit';
import { separationFacts } from '@/lib/nation/separation-facts';
import { separationChecks } from '@/lib/gov/separation';
import { installationMode } from '@/lib/ops/mode';
import { executivePosture } from '@/lib/gov/executive-posture';
import type { SignalKind } from '@/lib/twin/signal';
import type { InstallationMode } from '@/lib/ops/mode';

export type StatusTone = 'ok' | 'warn' | 'alert' | 'neutral';

export interface PublicStatusLine {
  label: string;
  value: string;
  kind: SignalKind;
  /** Where the value comes from, in words (shown on hover and to screen readers). */
  source: string;
  tone: StatusTone;
}

export interface PublicGovernmentStatus {
  posture: PublicStatusLine;
  readiness: PublicStatusLine;
  majorIncidents: PublicStatusLine;
  lines: PublicStatusLine[];
}

export interface GovernmentStatusInput {
  mode: InstallationMode;
  snapshot: NationalSnapshot | null;
  coordination: NationalCoordination | null;
  audit: { ok: boolean; checked: number; total?: number; brokenAtSeq?: number } | null;
  separation: { checks: { ok: boolean }[]; intact: boolean } | null;
}

export const NOT_CONNECTED = 'Not connected';
export const NOT_RECORDED = 'Not recorded';

/** The words the public directory shows, from the sources' answers. Pure. */
export function publicGovernmentStatus(i: GovernmentStatusInput): PublicGovernmentStatus {
  const production = i.mode === 'production';
  // A production installation never shows a sample, whatever a source sent.
  const nat = i.snapshot && production ? { ...i.snapshot, samples: false } : i.snapshot;
  const p = executivePosture(nat, i.coordination);
  const tone = (t: string): StatusTone => (t === 'ok' || t === 'warn' || t === 'alert' ? t : 'neutral');

  const posture: PublicStatusLine = p.loaded
    ? { label: 'National posture', value: p.risk.v, kind: p.risk.kind, source: p.risk.src, tone: tone(p.risk.t) }
    : { label: 'National posture', value: NOT_CONNECTED, kind: 'unavailable', source: 'The national snapshot did not answer', tone: 'neutral' };
  const readiness: PublicStatusLine = { label: 'National readiness', value: p.readiness.v, kind: p.readiness.kind, source: p.readiness.src, tone: tone(p.readiness.t) };

  const incidents = i.snapshot?.crossMinistryIncidents ?? [];
  const major = incidents.filter(x => x.severity === 'sev1' || x.severity === 'sev2').length;
  const samples = !production && !!nat?.samples;
  const majorIncidents: PublicStatusLine = !i.snapshot
    ? { label: 'Major incidents', value: NOT_CONNECTED, kind: 'unavailable', source: 'The national incident record did not answer', tone: 'neutral' }
    : {
        label: 'Major incidents', value: String(major), tone: major ? 'alert' : 'ok',
        kind: samples ? 'sample' : 'record',
        source: samples ? 'Seeded example incidents (demonstration or training installation)' : 'Serious incidents (severity 1–2) recorded by the institutions',
      };

  const separation: PublicStatusLine = !i.separation
    ? { label: 'Constitutional posture', value: NOT_CONNECTED, kind: 'unavailable', source: 'The separation-of-powers checks did not answer', tone: 'neutral' }
    : (() => {
        const held = i.separation.checks.filter(c => c.ok).length, all = i.separation.checks.length;
        return {
          label: 'Constitutional posture',
          value: i.separation.intact ? `✓ ${held} of ${all} separation checks hold` : `${held} of ${all} separation checks hold`,
          kind: 'observed' as const, tone: i.separation.intact ? 'ok' as const : 'warn' as const,
          source: 'Observed from the institution register, who is responsible, accounts, offices, the access-log rule and directives',
        };
      })();

  const audit: PublicStatusLine = !i.audit
    ? { label: 'Audit chain', value: NOT_CONNECTED, kind: 'unavailable', source: 'The audit chain\'s verification did not answer', tone: 'neutral' }
    : i.audit.ok
      ? { label: 'Audit chain', value: `✓ verified · ${(i.audit.total ?? i.audit.checked).toLocaleString('en')} entries`, kind: 'record', tone: 'ok', source: 'Verification of the platform\'s audit chain (also open at /api/audit/verify)' }
      : { label: 'Audit chain', value: `✗ broken${i.audit.brokenAtSeq !== undefined ? ` at entry ${i.audit.brokenAtSeq}` : ''}`, kind: 'record', tone: 'alert', source: 'Verification of the platform\'s audit chain (also open at /api/audit/verify)' };

  const lines: PublicStatusLine[] = [
    { label: 'Cabinet sitting', value: NOT_RECORDED, kind: 'unavailable', tone: 'neutral', source: 'No register in the platform records cabinet sittings yet' },
    { label: 'Public briefing', value: NOT_RECORDED, kind: 'unavailable', tone: 'neutral', source: 'No register in the platform records public briefings yet' },
    separation,
    audit,
  ];
  return { posture, readiness, majorIncidents, lines };
}

const attempt = <T,>(f: () => T): T | null => { try { return f(); } catch { return null; } };

/** Reads each source on the server (any that fails reads "Not connected") and words the answer. */
export function readGovernmentStatus(): PublicGovernmentStatus {
  return publicGovernmentStatus({
    mode: installationMode(),
    snapshot: attempt(nationalSnapshot),
    coordination: attempt(nationalCoordination),
    audit: attempt(() => auditVerification()),
    separation: attempt(() => separationChecks(separationFacts())),
  });
}
