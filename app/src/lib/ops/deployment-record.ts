// The installation's deployment record (plan I9; specification Part 5 I
// "Deployment profiles": availability and recovery-time objective,
// recovery-point objective, data residency, administrator and subcontractor
// access, network zones, contractual and technical exit; register 24.16).
//
// One rule set of the installation, changed only through
// lib/law/policy-change.ts: an administrator proposes it citing the law or
// the contract it rests on from the laws register, a different official
// confirms it, every version is kept, values left out of a proposal keep their
// setting. Nothing ships: no objective, residency rule, zone or exit term is
// assumed for a nation; each part reads "not recorded" until two officials
// adopt it. Five parts:
//
//   recovery            the recovery-point and recovery-time objectives (minutes) and where disaster recovery runs
//   residency           where the data may be held (in the country, a region, no rule) and the locations named
//   administratorAccess who may reach the running installation (the nation's operators, the publisher's support,
//                       a hosting provider, subcontractors), with what access and on which conditions
//   networkZones        the zones the installation runs in and what each is exposed to
//   exit                how the nation leaves a hosting arrangement: the export it takes, the notice and the steps
//
// Read where the platform already asks for these values: the backup service
// takes its RPO and RTO targets from the record once adopted and refuses a
// backup interval that cannot meet the RPO (lib/data/backups.ts); a hosting
// request may not ask for a looser residency rule than the record's, and the
// hosting questionnaire starts from the record (lib/data/hosting.ts).

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';

export type Residency = 'in-country' | 'regional' | 'none';
export const RESIDENCY_RANK: Record<Residency, number> = { none: 0, regional: 1, 'in-country': 2 };
export const ACCESS_KINDS = ['none', 'break-glass', 'support', 'operations'] as const;
export type AccessKind = typeof ACCESS_KINDS[number];
export const EXPOSURES = ['public', 'internal', 'restricted', 'isolated'] as const;

export interface DeploymentRecordValues {
  recovery: { rpoMinutes: number; rtoMinutes: number; drLocation: string } | null;
  residency: { rule: Residency; locations: string[]; statement: string } | null;
  administratorAccess: { party: string; access: AccessKind; conditions: string }[] | null;
  networkZones: { key: string; label: string; purpose: string; exposure: typeof EXPOSURES[number] }[] | null;
  exit: { exportFormat: string; noticeDays: number | null; steps: string[]; dataReturn: string } | null;
}
export const DEPLOYMENT_RECORD_AUDIT = 'ops.deployment-record';
const EMPTY: DeploymentRecordValues = { recovery: null, residency: null, administratorAccess: null, networkZones: null, exit: null };

type Db = { changes: PolicyChanges<DeploymentRecordValues>; adopted: (DeploymentRecordValues & { version: number; at: string }) | null };
const seed = (): Db => ({ changes: {}, adopted: null });
const g = globalThis as unknown as { __civicosDeploymentRecord?: Db };
const db = (): Db => touch('__civicosDeploymentRecord', g.__civicosDeploymentRecord = withDefaults(g.__civicosDeploymentRecord ??= seed(), seed()));
export function resetDeploymentRecord(): void { g.__civicosDeploymentRecord = undefined; }

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
const KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Parse each part a proposal gives (null clears a part); the problems in plain words. */
export function parseParts(input: Record<string, unknown>): Partial<DeploymentRecordValues> | { error: string } {
  const out: Partial<DeploymentRecordValues> = {};
  if ('recovery' in input) {
    if (input.recovery === null) out.recovery = null;
    else {
      const r = (input.recovery ?? {}) as Record<string, unknown>;
      const rpo = int(r.rpoMinutes, 1, 525_600), rto = int(r.rtoMinutes, 1, 525_600), dr = str(r.drLocation, 200);
      if (rpo === null || rto === null) return { error: 'Recovery: the recovery-point and recovery-time objectives are whole minutes (1 to 525600), as the nation or its contract sets them' };
      if (!dr) return { error: 'Recovery: say where disaster recovery runs (a site, a region, a provider)' };
      out.recovery = { rpoMinutes: rpo, rtoMinutes: rto, drLocation: dr };
    }
  }
  if ('residency' in input) {
    if (input.residency === null) out.residency = null;
    else {
      const r = (input.residency ?? {}) as Record<string, unknown>;
      const rule = str(r.rule, 20) as Residency;
      if (!(rule in RESIDENCY_RANK)) return { error: 'Residency: the rule is in-country, regional or none' };
      const locations = (Array.isArray(r.locations) ? r.locations : []).map(x => str(x, 120)).filter(Boolean).slice(0, 30);
      if (rule !== 'none' && !locations.length) return { error: 'Residency: name where the data may be held' };
      out.residency = { rule, locations, statement: str(r.statement, 1000) };
    }
  }
  if ('administratorAccess' in input) {
    if (input.administratorAccess === null) out.administratorAccess = null;
    else {
      const list = Array.isArray(input.administratorAccess) ? input.administratorAccess.slice(0, 30) : [];
      if (!list.length) return { error: 'Administrator access: list who may reach the running installation (the nation\'s operators, the publisher\'s support, a hosting provider, subcontractors)' };
      const parsed: NonNullable<DeploymentRecordValues['administratorAccess']> = [];
      for (const x of list) {
        const y = (x ?? {}) as Record<string, unknown>;
        const party = str(y.party, 160), access = str(y.access, 20) as AccessKind, conditions = str(y.conditions, 1000);
        if (!party || !ACCESS_KINDS.includes(access)) return { error: `Administrator access: each party is named with its access (${ACCESS_KINDS.join(', ')})` };
        if (access !== 'none' && !conditions) return { error: `Administrator access: say on which conditions ${party} has ${access} access` };
        parsed.push({ party, access, conditions });
      }
      out.administratorAccess = parsed;
    }
  }
  if ('networkZones' in input) {
    if (input.networkZones === null) out.networkZones = null;
    else {
      const list = Array.isArray(input.networkZones) ? input.networkZones.slice(0, 30) : [];
      if (!list.length) return { error: 'Network zones: list the zones the installation runs in' };
      const parsed: NonNullable<DeploymentRecordValues['networkZones']> = [];
      for (const x of list) {
        const y = (x ?? {}) as Record<string, unknown>;
        const key = str(y.key, 40).toLowerCase(), label = str(y.label, 120), purpose = str(y.purpose, 500), exposure = str(y.exposure, 20) as typeof EXPOSURES[number];
        if (!KEY.test(key) || !label || !EXPOSURES.includes(exposure)) return { error: `Network zones: each has a short key, a label and an exposure (${EXPOSURES.join(', ')})` };
        if (parsed.some(z => z.key === key)) return { error: `Network zones: ${key} is listed twice` };
        parsed.push({ key, label, purpose, exposure });
      }
      out.networkZones = parsed;
    }
  }
  if ('exit' in input) {
    if (input.exit === null) out.exit = null;
    else {
      const e = (input.exit ?? {}) as Record<string, unknown>;
      const steps = (Array.isArray(e.steps) ? e.steps : []).map(x => str(x, 300)).filter(Boolean).slice(0, 30);
      const exportFormat = str(e.exportFormat, 200), dataReturn = str(e.dataReturn, 500);
      const notice = e.noticeDays === undefined || e.noticeDays === null ? null : int(e.noticeDays, 0, 3650);
      if (!exportFormat || !steps.length || !dataReturn) return { error: 'Exit: give the export the nation takes, how its data is returned and deleted, and the steps' };
      if (e.noticeDays !== undefined && e.noticeDays !== null && notice === null) return { error: 'Exit: the notice is a whole number of days, as the contract sets it' };
      out.exit = { exportFormat, noticeDays: notice, steps, dataReturn };
    }
  }
  if (!Object.keys(out).length) return { error: 'Propose at least one part: recovery, residency, administratorAccess, networkZones or exit' };
  return out;
}

const describe = (v: DeploymentRecordValues) => [
  v.recovery ? `RPO ${v.recovery.rpoMinutes} min, RTO ${v.recovery.rtoMinutes} min` : 'no recovery objectives',
  v.residency ? `residency ${v.residency.rule}${v.residency.locations.length ? ` (${v.residency.locations.join(', ').slice(0, 80)})` : ''}` : 'no residency rule',
  v.administratorAccess ? `${v.administratorAccess.length} party(ies) with access` : 'no access record',
  v.networkZones ? `${v.networkZones.length} network zone(s)` : 'no zones',
  v.exit ? 'exit terms' : 'no exit terms',
].join('; ');

/** The record in force (each part null until two officials adopt it) and its version (0: nothing adopted). */
export function deploymentRecord(): DeploymentRecordValues & { version: number; at?: string } {
  const a = db().adopted;
  return a ? structuredClone(a) : { ...structuredClone(EMPTY), version: 0 };
}
export const deploymentRecordChanges = (): PolicyChanges<DeploymentRecordValues> => structuredClone(db().changes);

/** An administrator proposes (the route checks the role), citing the law or contract from the laws register. */
export function proposeDeploymentRecord(input: Record<string, unknown>, legalBasis: unknown, by: { name: string; id?: string }, now = new Date(), pendingHours = 24): (PolicyVersion<DeploymentRecordValues> & { expiresAt: string }) | { error: string } {
  const parts = parseParts(input);
  if ('error' in parts) return parts;
  const { version: _v, at: _a, ...cur } = deploymentRecord();
  return proposePolicy(db().changes, cur, parts, legalBasis, {
    by: by.name, ...(by.id ? { byId: by.id } : {}), now, pendingHours, audit: DEPLOYMENT_RECORD_AUDIT, context: 'deployment record (recovery, residency, administrator access, network zones, exit)', check: () => null, describe,
  });
}
/** A different official confirms; the record's next version is in force from now. */
export function confirmDeploymentRecord(by: { name: string; id?: string }, now = new Date(), requireIdentityBinding = false): PolicyVersion<DeploymentRecordValues> | { error: string } {
  const d = db();
  return confirmPolicy(d.changes, {
    by: by.name, ...(by.id ? { byId: by.id } : {}), now, audit: DEPLOYMENT_RECORD_AUDIT, requireIdentityBinding, describe,
    adopt: v => { d.adopted = { ...structuredClone(v.values), version: (d.adopted?.version ?? 0) + 1, at: now.toISOString() }; },
  });
}
export const withdrawDeploymentRecord = (by: string, reason?: string) => withdrawPolicy(db().changes, { by, ...(reason ? { reason } : {}), audit: DEPLOYMENT_RECORD_AUDIT });

/** The recovery targets the backup service applies: the record's once adopted, else the backup policy's own. */
export function recoveryTargets(policy: { rpoMinutes: number; rtoMinutes: number }): { rpoMinutes: number; rtoMinutes: number; source: 'deployment-record' | 'backup-policy'; version?: number } {
  const r = deploymentRecord();
  return r.recovery ? { rpoMinutes: r.recovery.rpoMinutes, rtoMinutes: r.recovery.rtoMinutes, source: 'deployment-record', version: r.version } : { rpoMinutes: policy.rpoMinutes, rtoMinutes: policy.rtoMinutes, source: 'backup-policy' };
}

/** Why a hosting arrangement with this residency rule is refused by the record, or null. */
export function residencyRefusal(rule: unknown): string | null {
  const r = deploymentRecord().residency;
  if (!r || typeof rule !== 'string' || !(rule in RESIDENCY_RANK)) return null;
  return RESIDENCY_RANK[rule as Residency] < RESIDENCY_RANK[r.rule] ? `The installation's deployment record (version ${deploymentRecord().version}) requires ${r.rule} residency (${r.locations.join(', ') || 'no location named'}): a request may not ask for ${rule}` : null;
}
