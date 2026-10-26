// The demo cast (wiring audit, proposal A): officials to show a demonstration
// or training installation end to end without making accounts by hand. The
// cast is planned from the deployment profile (lib/nation/deployment.ts, the
// institutions the nation named in `authorities`, read through
// authorityFor()): for each institution one Officer and two officials who
// "Can sign" (so a four-eyes step has two different accounts), plus one
// whole-government Administrator pair and one Auditor. The data-protection
// authority, when one is named, is one of those institutions, so its two
// signatories are there for the access-log oversight steps.
//
// Production guards (all four, each tested):
//   1. /api/demo/* answer 404 when !samplesAllowed() (lib/ops/mode.ts);
//   2. the middleware refuses /api/demo/* in a production installation;
//   3. checkPassword(), passkey and identity-provider sign-in and
//      currentOfficial() refuse every cast account when !samplesAllowed(),
//      so a demo snapshot restored into production signs nobody in as the cast;
//   4. switching needs a signed-in administrator or cast member.
// Cast accounts are separate accounts: dual control still compares accounts
// (lib/casework/engine.ts) and records the independence it found.

import { AUTHORITIES, type AuthorityKey } from '@/lib/nation/deployment';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { listDemoAccounts, syncDemoCast, accountById, type DemoCastSpec, type PublicAccount } from './officials';
import { roleOf, type OfficialRole } from './roles';
import type { OfficialClaims } from './session-token';
import { SESSION_HOURS } from './session-token';

/** What an official of each register's institution is called in the cast ("Demo registrar A (sample)"). */
const NOUN: Record<AuthorityKey, string> = {
  lawRegister: 'law registrar',
  civilRegistration: 'registrar',
  identity: 'identity officer',
  businessRegister: 'business registrar',
  higherEducationAccreditation: 'accreditation officer',
  immigration: 'immigration officer',
  police: 'police officer',
  judiciary: 'court officer',
  statistics: 'statistician',
  dataProtection: 'data-protection officer',
  tax: 'tax officer',
  customs: 'customs officer',
  education: 'education officer',
  healthRegulation: 'health regulator',
  professionalRegulation: 'professions regulator',
  legislature: 'parliamentary clerk',
  headOfState: 'head of state\'s office official',
  constitutionalCourt: 'constitutional court officer',
  supremeAudit: 'public auditor',
  electoral: 'electoral officer',
  centralBank: 'central bank officer',
  ombudsman: 'ombudsman officer',
  anticorruption: 'anti-corruption officer',
  humanRights: 'human rights officer',
  trustServices: 'seal keys officer',
  medicinesRegulation: 'medicines regulator',
  controlledSubstances: 'controlled substances officer',
  publicHealth: 'public health officer',
  // Human services (plan step I6).
  travelDocuments: 'passport officer',
  citizenship: 'citizenship officer',
  labour: 'labour officer',
  socialProtection: 'benefits officer',
};

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'institution';

/** The institutions named as responsible in the deployment profile, each with the registers it keeps (profile order). */
export function castInstitutions(): { id: string; name: string; keys: AuthorityKey[] }[] {
  const out = new Map<string, { id: string; name: string; keys: AuthorityKey[] }>();
  for (const { key } of AUTHORITIES) {
    const id = authorityFor(key);
    if (!id) continue;
    const m = getMinistry(id);
    if (!m) continue;
    const e = out.get(id) ?? { id, name: m.name, keys: [] };
    e.keys.push(key);
    out.set(id, e);
  }
  return [...out.values()];
}

/** The cast the deployment profile calls for now. */
export function planCast(): DemoCastSpec[] {
  const specs: DemoCastSpec[] = [];
  for (const inst of castInstitutions()) {
    const noun = NOUN[inst.keys[0]!];
    const Noun = noun[0]!.toUpperCase() + noun.slice(1);
    const office = `${inst.name} (sample)`;
    const base = `demo-${slug(inst.id)}`;
    specs.push({ key: `${base}-officer`, name: `Demo ${noun} (sample)`, office: `${Noun}, officer · ${office}`, role: 'officer', institution: inst.id });
    specs.push({ key: `${base}-a`, name: `Demo ${noun} A (sample)`, office: `${Noun}, can sign · ${office}`, role: 'signatory', institution: inst.id });
    specs.push({ key: `${base}-b`, name: `Demo ${noun} B (sample)`, office: `${Noun}, can sign · ${office}`, role: 'signatory', institution: inst.id });
  }
  specs.push({ key: 'demo-admin-a', name: 'Demo administrator A (sample)', office: 'Administrator · whole government (sample)', role: 'administrator' });
  specs.push({ key: 'demo-admin-b', name: 'Demo administrator B (sample)', office: 'Administrator · whole government (sample)', role: 'administrator' });
  specs.push({ key: 'demo-auditor', name: 'Demo auditor (sample)', office: 'Auditor · whole government (sample)', role: 'auditor' });
  return specs;
}

/** Create or refresh the cast from the deployment profile (audited under `by`). */
export const refreshCast = (by: string) => syncDemoCast(planCast(), by);

/** What the switch menu shows of a cast account: never its address. */
export interface CastMember { id: string; name: string; office: string; role: OfficialRole; institution?: string; institutionName?: string }
export const castMember = (a: PublicAccount): CastMember => ({
  id: a.id, name: a.name, office: a.office, role: roleOf(a),
  ...(a.institution ? { institution: a.institution, institutionName: getMinistry(a.institution)?.name ?? a.institution } : {}),
});

/** The cast that can be switched to (retired accounts left out), grouped by institution ('' for the whole government). */
export function castGroups(): { institution: string; name: string; members: CastMember[] }[] {
  const groups = new Map<string, { institution: string; name: string; members: CastMember[] }>();
  for (const a of listDemoAccounts()) {
    if (a.disabled) continue;
    const m = castMember(a);
    const key = m.institution ?? '';
    const g = groups.get(key) ?? { institution: key, name: m.institutionName ?? 'Whole government', members: [] };
    g.members.push(m);
    groups.set(key, g);
  }
  // Institutions first in the order the profile names them, the whole government last.
  const order = castInstitutions().map(i => i.id);
  return [...groups.values()].sort((x, y) => (x.institution === '' ? 1 : y.institution === '' ? -1 : order.indexOf(x.institution) - order.indexOf(y.institution)));
}

/** Whether a session subject is a cast account. */
export function isCastSubject(sub: string | undefined): boolean {
  const m = /^local:(.+)$/.exec(sub ?? '');
  return !!(m && accountById(m[1]!)?.demo);
}

/**
 * Who may switch to a cast account: an administrator or a member of the cast,
 * signed in now. Null when allowed, else the reason.
 */
export function actAsRefusal(o: Pick<OfficialClaims, 'sub' | 'role' | 'iat'> | null): string | null {
  if (!o) return 'Sign in as an administrator (or as a member of the demo cast) to switch officials';
  if (roleOf(o) === 'administrator' || isCastSubject(o.sub)) return null;
  return 'Only an administrator or a member of the demo cast can switch to a demo official';
}

/** The session claims for a cast account (as a password sign-in would give, without the second step). */
export function castClaims(id: string, now = Date.now()): OfficialClaims | { error: string } {
  const a = accountById(id);
  if (!a || !a.demo) return { error: 'No such member of the demo cast' };
  if (a.disabled) return { error: 'That member of the demo cast is retired; refresh the cast first' };
  const iat = Math.floor(now / 1000);
  return { sub: `local:${a.id}`, name: a.name, office: a.office, method: 'local', role: roleOf(a), ...(a.institution ? { institution: a.institution } : {}),
    twoStep: false, twoStepRequired: a.twoStepRequired, iat, exp: iat + SESSION_HOURS * 3600 };
}
