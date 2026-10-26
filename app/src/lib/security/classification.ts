// The nation's security classification scheme and this installation's
// declared accreditation (plan step I12; catalogue Part 11 §3, CFG-SEC-003
// "Classification levels and handling restrictions", CFG-SEC-013 "National
// cryptographic and hosting accreditation requirements").
//
// One country rule set, changed only through lib/law/policy-change.ts: an
// administrator proposes it citing the laws register, a different official
// confirms it, every version is kept, values left out of a proposal keep
// their setting. Two parts:
//
//   scheme         the nation's classification levels, lowest first, each
//                  with its handling rule, and the handling caveats it
//                  allows. Ships empty: CivicOS never assumes that labels,
//                  levels or handling rules are the same across nations.
//   accreditation  the highest level of the scheme this installation is
//                  accredited to hold, and the reference of the
//                  accreditation decision (the competent authority's own,
//                  outside the platform). Ships unset.
//
// The platform default is "not classified" (an empty marking). A record or an
// upload marked above the installation's accreditation is refused
// (markingRefusal()): catalogue §3.3 "If CivicOS's hosting environment is not
// accredited for a classification level, it must not store that class of
// information. It may hold approved metadata or a reference to a record in an
// accredited external system". With no scheme adopted, nothing is held above
// the platform default; with a scheme but no accreditation, the same. A
// production installation says so (classificationStatus().statement).
//
// A marking is a label, never an access rule: who may read a record is decided
// by need to know, purpose and the action (lib/auth/roles.ts
// securityAccessRefusal()); a clearance is necessary for a marked record and
// never sufficient. Nothing here stores classified content: the platform holds
// metadata only.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';

export interface ClassificationLevel {
  /** A short key (lowercase letters, digits, -), stable across versions. */
  key: string;
  /** The label as the nation's law writes it. */
  label: string;
  /** How a record at this level is handled, in the nation's words. */
  handling: string;
}
export interface ClassificationScheme {
  /** The scheme's name and version as the nation's instrument gives them. */
  name: string;
  /** Lowest first: a level's rank is its position (1 = lowest). */
  levels: ClassificationLevel[];
  /** Handling caveats the scheme allows (dissemination or distribution restrictions), by label. */
  caveats: string[];
}
export interface Accreditation {
  /** The highest level of the scheme this installation may hold. */
  level: string;
  /** The accreditation decision it rests on (reference of the competent authority's decision). */
  statement: string;
}
export interface SecurityClassificationValues { scheme: ClassificationScheme | null; accreditation: Accreditation | null }

/** The audit name and the constitutional profile part (lib/constitution/profile-state.ts PART_AUDIT). */
export const CLASSIFICATION_AUDIT = 'security.classification';
/** The platform default marking: not classified. */
export const NOT_CLASSIFIED = '';

type Db = { changes: PolicyChanges<SecurityClassificationValues>; adopted: (SecurityClassificationValues & { version: number }) | null };
const seed = (): Db => ({ changes: {}, adopted: null });
const g = globalThis as unknown as { __civicosSecurityClassification?: Db };
const db = (): Db => touch('__civicosSecurityClassification', g.__civicosSecurityClassification = withDefaults(g.__civicosSecurityClassification ??= seed(), seed()));
export function resetSecurityClassification(): void { g.__civicosSecurityClassification = undefined; }

const KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Parse a scheme from a request: levels lowest first, each with a key, a label and a handling rule. */
export function parseScheme(v: unknown): ClassificationScheme | null | { error: string } {
  if (v === null) return null;
  const x = (v ?? {}) as { name?: unknown; levels?: unknown; caveats?: unknown };
  const name = str(x.name, 200);
  if (!name) return { error: 'Name the classification scheme and its version as the nation\'s instrument gives them' };
  const raw = Array.isArray(x.levels) ? x.levels.slice(0, 12) : [];
  if (!raw.length) return { error: 'A scheme lists its levels, lowest first' };
  const levels: ClassificationLevel[] = [];
  for (const l of raw) {
    const y = (l ?? {}) as { key?: unknown; label?: unknown; handling?: unknown };
    const key = str(y.key, 40).toLowerCase(), label = str(y.label, 80), handling = str(y.handling, 1000);
    if (!KEY.test(key)) return { error: 'Each level has a short key (lowercase letters, digits and -)' };
    if (!label || !handling) return { error: `Level ${key}: give its label and its handling rule` };
    if (levels.some(z => z.key === key)) return { error: `Level ${key} is listed twice` };
    levels.push({ key, label, handling });
  }
  const caveats = (Array.isArray(x.caveats) ? x.caveats : []).map(c => str(c, 80)).filter(Boolean).slice(0, 30);
  return { name, levels, caveats: [...new Set(caveats)] };
}

function check(v: SecurityClassificationValues): string | null {
  if (v.accreditation) {
    if (!v.scheme) return 'An accreditation names a level of the adopted scheme: adopt the scheme first';
    if (!v.scheme.levels.some(l => l.key === v.accreditation!.level)) return `${v.accreditation.level} is not a level of the scheme`;
    if (!v.accreditation.statement) return 'Give the reference of the accreditation decision the installation rests on';
  }
  return null;
}
const describe = (v: SecurityClassificationValues) => `${v.scheme ? `scheme "${v.scheme.name}" with ${v.scheme.levels.length} level(s)` : 'no scheme'}; ${v.accreditation ? `accredited up to ${levelOf(v.scheme, v.accreditation.level)?.label ?? v.accreditation.level}` : 'no accreditation declared (nothing above the platform default)'}`;
const levelOf = (s: ClassificationScheme | null, key: string) => s?.levels.find(l => l.key === key);

/** The rule set in force (scheme and accreditation, each null until two officials adopt it) and its version. */
export function securityClassification(): SecurityClassificationValues & { version: number } {
  const a = db().adopted;
  return a ? structuredClone(a) : { scheme: null, accreditation: null, version: 0 };
}
export const securityClassificationChanges = (): PolicyChanges<SecurityClassificationValues> => structuredClone(db().changes);

/** Propose a scheme and/or an accreditation (an administrator; the route checks the role), citing the laws register. */
export function proposeSecurityClassification(input: { scheme?: unknown; accreditation?: unknown }, legalBasis: unknown, by: { name: string; id?: string }, now = new Date(), pendingHours = 24): (PolicyVersion<SecurityClassificationValues> & { expiresAt: string }) | { error: string } {
  const cur = securityClassification();
  const change: Partial<SecurityClassificationValues> = {};
  if (input.scheme !== undefined) {
    const s = parseScheme(input.scheme);
    if (s && 'error' in s) return s;
    change.scheme = s;
  }
  if (input.accreditation !== undefined) {
    if (input.accreditation === null) change.accreditation = null;
    else {
      const a = (input.accreditation ?? {}) as { level?: unknown; statement?: unknown };
      change.accreditation = { level: str(a.level, 40).toLowerCase(), statement: str(a.statement, 300) };
    }
  }
  if (!Object.keys(change).length) return { error: 'Propose a scheme, an accreditation, or both' };
  return proposePolicy(db().changes, { scheme: cur.scheme, accreditation: cur.accreditation }, change, legalBasis, {
    by: by.name, ...(by.id ? { byId: by.id } : {}), now, pendingHours, audit: CLASSIFICATION_AUDIT, context: 'security classification scheme and accreditation', check, describe,
  });
}
export function confirmSecurityClassification(by: { name: string; id?: string }, now = new Date(), requireIdentityBinding = false): PolicyVersion<SecurityClassificationValues> | { error: string } {
  const d = db();
  return confirmPolicy(d.changes, {
    by: by.name, ...(by.id ? { byId: by.id } : {}), now, audit: CLASSIFICATION_AUDIT, requireIdentityBinding, describe,
    adopt: v => { d.adopted = { scheme: structuredClone(v.values.scheme), accreditation: structuredClone(v.values.accreditation), version: (d.adopted?.version ?? 0) + 1 }; },
  });
}
export const withdrawSecurityClassification = (by: string, reason?: string) => withdrawPolicy(db().changes, { by, ...(reason ? { reason } : {}), audit: CLASSIFICATION_AUDIT });

/** A level's rank: 0 for the platform default (not classified), 1… for the scheme's levels; -1 for a label the scheme does not have. */
export function rankOf(marking: string | undefined, s: SecurityClassificationValues = securityClassification()): number {
  const m = (marking ?? '').trim().toLowerCase();
  if (!m) return 0;
  const i = s.scheme?.levels.findIndex(l => l.key === m) ?? -1;
  return i < 0 ? -1 : i + 1;
}
/** The highest rank this installation may hold: 0 (the platform default) until an accreditation is adopted. */
export function accreditedRank(s: SecurityClassificationValues = securityClassification()): number {
  return s.accreditation ? rankOf(s.accreditation.level, s) : 0;
}
export const markingLabel = (marking: string | undefined, s: SecurityClassificationValues = securityClassification()): string =>
  !marking ? 'Not classified (platform default)' : levelOf(s.scheme, marking.toLowerCase())?.label ?? marking;

/**
 * May a record or an upload with this marking (and these handling caveats) be
 * held here? null when yes. Refused: a label the adopted scheme does not have,
 * any marking while no scheme is adopted, a level above the installation's
 * accreditation (only its reference to an accredited system may be recorded,
 * unmarked), a caveat the scheme does not list.
 */
export function markingRefusal(marking: unknown, caveats: unknown = []): string | null {
  const s = securityClassification();
  const m = str(marking, 40).toLowerCase();
  const cs = (Array.isArray(caveats) ? caveats : []).map(c => str(c, 80)).filter(Boolean);
  if (!m) return cs.length && !s.scheme ? 'No classification scheme is adopted: there are no handling caveats to apply' : cs.find(c => !s.scheme!.caveats.includes(c)) ? `"${cs.find(c => !s.scheme!.caveats.includes(c))}" is not a handling caveat of the adopted scheme` : null;
  if (!s.scheme) return 'No classification scheme is adopted: nothing is held above the platform default. Keep the record in an accredited system and record only its reference here, unmarked';
  const r = rankOf(m, s);
  if (r < 0) return `${m} is not a level of the adopted classification scheme (${s.scheme.name})`;
  const top = accreditedRank(s);
  if (r > top) return `This installation is ${top ? `accredited up to ${markingLabel(s.accreditation!.level, s)}` : 'not accredited above the platform default'}: a record or file marked ${markingLabel(m, s)} is not held here. Keep it in an accredited system and record only its reference, unmarked`;
  const bad = cs.find(c => !s.scheme!.caveats.includes(c));
  return bad ? `"${bad}" is not a handling caveat of the adopted scheme` : null;
}

/** Where the installation stands, for its screens and the onboarding hub (production says it plainly). */
export function classificationStatus(): { scheme: ClassificationScheme | null; accreditation: (Accreditation & { label: string }) | null; version: number; waiting: boolean; highest: string; statement: string } {
  const s = securityClassification();
  const waiting = !!db().changes.pending;
  const highest = s.accreditation ? markingLabel(s.accreditation.level, s) : 'Not classified (platform default)';
  const statement = !s.scheme
    ? 'No classification scheme is adopted: this installation holds nothing above the platform default; a classified record stays in an accredited system and only its reference is recorded here'
    : !s.accreditation
      ? `The scheme "${s.scheme.name}" is adopted, but no accreditation is declared: this installation holds nothing above the platform default`
      : `This installation is accredited up to ${highest} (${s.accreditation.statement}); anything marked above it is refused`;
  return { scheme: s.scheme, accreditation: s.accreditation ? { ...s.accreditation, label: highest } : null, version: s.version, waiting, highest, statement };
}
