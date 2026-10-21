// Separation of powers, observed (plan phase 4; audit G). Each check reads a
// configuration fact the platform enforces (the institution register, who is
// responsible, accounts, offices, the access-log retention rule, directives)
// and links to the record that decides it; nothing here is generated. The
// facts are gathered on the server (lib/nation/separation-facts.ts,
// GET /api/constitution/separation); this file turns them into checks and is
// pure, so the screens and the tests share it.

import type { BranchKey } from '@/lib/gov/constitution';

export interface Named { id: string; name: string }
export interface SeparationFacts {
  /** The branches the nation's constitution sets up, each with the registered institutions recorded in it. */
  branches: { key: BranchKey; name: string; institutions: Named[] }[];
  /** Courts (standing judiciary, or named for the judiciary or a constitutional court): closed to every other institution. */
  judicial: Named[];
  /** Independent institutions, each with its own enabled administrators. */
  independent: (Named & { ownAdministrators: number })[];
  /** Offices of an independent institution held by an account that serves the whole government. */
  outsideHolders: { office: string; institution: string; holder: string }[];
  /** The data-protection authority named under Who is responsible. */
  dataProtection?: Named;
  /** Access-log shortening: who can confirm it besides the administrators, and adopted rules that lacked that confirmation. */
  retention: { oversightConfirmers: number; adoptedWithoutOversight: number };
  /** Directives in force or draft that instruct (not request, inform or refer) an independent institution. */
  directivesToIndependent: { ref: string; target: string }[];
}

export interface SeparationCheck {
  key: string;
  label: string;
  /** Held (true) or not (false), as observed in the records now. */
  ok: boolean;
  detail: string;
  /** The page where the deciding record is kept. */
  href: string;
  kind: 'observed';
}

const list = (xs: string[], n = 4) => (xs.length > n ? `${xs.slice(0, n).join(', ')} and ${xs.length - n} more` : xs.join(', '));

/** The checks, each observed from a fact with a link to the record that decides it. */
export function separationChecks(f: SeparationFacts): { checks: SeparationCheck[]; intact: boolean } {
  const checks: SeparationCheck[] = [];
  const add = (c: Omit<SeparationCheck, 'kind'>) => checks.push({ ...c, kind: 'observed' });

  for (const b of f.branches) {
    add({
      key: `branch:${b.key}`, label: `${b.name}: a registered institution`, ok: b.institutions.length > 0, href: '/ministries',
      detail: b.institutions.length ? list(b.institutions.map(i => i.name)) : 'No institution recorded in this branch (its standing in the register)',
    });
  }
  add({
    key: 'judiciary-isolated', label: 'Courts closed to other institutions', ok: f.judicial.length > 0, href: '/gov/configuration/responsible',
    detail: f.judicial.length ? `Isolated: ${list(f.judicial.map(j => j.name))}` : 'No court recorded or named for the judiciary, so no court\'s cases are isolated yet',
  });
  add({
    key: 'no-outside-holder', label: 'No whole-government account in an independent institution\'s office', ok: f.outsideHolders.length === 0, href: '/gov/configuration/offices',
    detail: f.outsideHolders.length ? list(f.outsideHolders.map(h => `${h.holder} holds ${h.office} (${h.institution})`), 3) : 'None found among the offices recorded',
  });
  const without = f.independent.filter(i => i.ownAdministrators === 0);
  add({
    key: 'own-administrators', label: 'Independent institutions have their own administrator', ok: without.length === 0, href: '/admin/officials',
    detail: !f.independent.length ? 'No independent institution recorded' : without.length ? `Without one: ${list(without.map(i => i.name))}` : `${f.independent.length} of ${f.independent.length} have one`,
  });
  add({
    key: 'data-protection', label: 'Data-protection authority named', ok: !!f.dataProtection, href: '/gov/configuration/responsible',
    detail: f.dataProtection ? f.dataProtection.name : 'Not named: auditors confirm access-log changes until it is',
  });
  add({
    key: 'retention-oversight', label: 'Shortening the access log needs oversight, not administrators alone', ok: f.retention.oversightConfirmers > 0 && f.retention.adoptedWithoutOversight === 0, href: '/gov/access-log',
    detail: f.retention.adoptedWithoutOversight ? `${f.retention.adoptedWithoutOversight} rule(s) adopted without the oversight confirmation`
      : f.retention.oversightConfirmers ? `${f.retention.oversightConfirmers} official(s) outside administration can confirm` : 'Nobody outside administration can confirm yet (an official who can sign at the data-protection authority, or an auditor)',
  });
  add({
    key: 'no-directive-to-independent', label: 'No directive instructs an independent institution', ok: f.directivesToIndependent.length === 0, href: '/gov/directives',
    detail: f.directivesToIndependent.length ? list(f.directivesToIndependent.map(d => `${d.ref} → ${d.target}`), 3) : 'None: independent bodies receive requests, communications or referrals only',
  });
  return { checks, intact: checks.every(c => c.ok) };
}
