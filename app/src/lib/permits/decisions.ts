// Which authority every decision rests on (acceptance hardening, item E).
//
// Every decision step of every procedure is classified here, explicitly:
//
//   mapping     the decision exercises a power over a permit, licence,
//               registration, credential or liability type; the approved
//               authority mapping in force (lib/permits/authority.ts) must
//               give that power to the case's institution. Missing, draft,
//               withdrawn, suspended, expired or not-yet-effective mappings
//               refuse the decision in a production installation.
//   deployment  the decision belongs to an institution the nation designates
//               in its deployment profile for the whole domain (civil
//               registration, immigration, the judiciary, police intake,
//               a referral to an institution's own procedure); no permit
//               mapping applies.
//
// A decision step that is neither (a procedure the platform does not know,
// without an `authority` on its approved package) is refused in production:
// nothing consequential is decided under an authority nobody named. The
// check runs in the case engine (registerDecisionGuard) when a decision is
// proposed and again when it is made, and the sealed decision records the
// exact mapping version it rested on (item F).

import { registerDecisionGuard, type DecisionAuthority } from '@/lib/casework/engine';
import { ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { samplesAllowed } from '@/lib/ops/mode';
import { registerType } from '@/lib/organisations/register';
import { registerOfCase } from '@/lib/organisations/procedures';
import { getProfessional, profession } from '@/lib/professions/register';
import { getProduct, productOfCase } from '@/lib/health/products/register';
import { PRODUCT_PERMIT_TYPES, PROCEDURE_PERMITS } from '@/lib/health/products/procedures';
import { PROGRAMME_PERMITS } from '@/lib/health/programmes/procedures';
import { OVERSIGHT_PERMITS } from '@/lib/oversight/procedures';
import { mappingInForce, powerRefusal, type Power } from './authority';
import type { ActionSpec, Case, CasePackage } from '@/lib/casework/types';

export type DecisionClass = { kind: 'mapping'; permitType: string; power: Power } | { kind: 'deployment'; authority: string };

/** The power a decision exercises, from the decision's own key. */
export function powerOf(decision: string): Power {
  if (decision === 'renew') return 'renew';
  if (decision === 'suspend' || decision === 'reinstate') return 'suspend';
  if (decision === 'revoke' || decision === 'withdraw') return 'revoke';
  return 'issue';
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const is = (key: string, prefix: string) => key === prefix || key.startsWith(`${prefix}-`) || key.startsWith(`${prefix}.`);

/** The procedures whose decisions belong to an authority the deployment profile designates for the whole domain. */
const DEPLOYMENT_DOMAINS: [prefix: string, authority: string][] = [
  ['civil', 'civilRegistration'], ['immigration', 'immigration'], ['court', 'judiciary'], ['police', 'police'], ['referral', 'the institution whose referral procedure it is'],
];

/** Classify a decision step; null when the platform cannot say which authority it rests on. */
export function classifyDecision(c: Case, a: ActionSpec, pkg: Pick<CasePackage, 'key' | 'authority'>): DecisionClass | null {
  const power = powerOf(a.decision ?? '');
  const key = pkg.key;
  const mapped = (permitType: string | undefined): DecisionClass | null => (permitType ? { kind: 'mapping', permitType, power } : null);
  if (is(key, 'tax.registration')) return mapped('tax-registration');
  if (is(key, 'tax.return') || is(key, 'tax.objection')) return mapped('tax-assessment');
  if (is(key, 'customs.declaration')) return mapped('customs-clearance');
  if (is(key, 'edu.qualification')) return mapped('qualification-record');
  if (key.startsWith('prof.')) {
    const p = profession(str(c.fields.profession) || getProfessional(str(c.fields.professional))?.profession || '');
    return mapped(p?.permitType);
  }
  if (key.startsWith('org.') || is(key, 'edu.school') || is(key, 'health.facility') || is(key, 'health.pharmacy')
    || is(key, 'medicines.manufacturer') || is(key, 'medicines.importer') || is(key, 'medicines.wholesaler')) {
    const t = registerType(registerOfCase(c) ?? '');
    return mapped(t?.permitType);
  }
  // The register of medicines and medical devices (lib/health/products): a recall by the recall mapping, a device by
  // the device registration mapping, every other product decision by the marketing authorisation mapping.
  if (key.startsWith('medicines.')) {
    // Corrective action, import and controlled-medicine authorisation, safety intake and reconsideration: each its own
    // permit type (a controlled-medicine authorisation under the controlled-substances slot's mapping).
    for (const [k, permitType] of Object.entries(PROCEDURE_PERMITS)) if (is(key, k)) return mapped(permitType);
    if (is(key, 'medicines.recall')) return mapped(PRODUCT_PERMIT_TYPES.recall);
    if (is(key, 'medicines.device-registration')) return mapped(PRODUCT_PERMIT_TYPES.device);
    const p = getProduct(str(c.fields.product)) ?? productOfCase(c.id);
    return mapped(p ? PRODUCT_PERMIT_TYPES[p.kind] : (pkg.authority?.permitType ?? PRODUCT_PERMIT_TYPES.medicine));
  }
  // Public-health programmes (lib/health/programmes): establishment and change, interventions and risk communications, each
  // under its own permit type (lead: the publicHealth slot).
  if (key.startsWith('public-health.')) for (const [k, permitType] of Object.entries(PROGRAMME_PERMITS)) if (is(key, k)) return mapped(permitType);
  // Independent oversight (plan I8, lib/oversight): admissibility, issued findings and recommendations, approved audit reports and the
  // data-protection authority's decisions, each family under its own permit type (lead: the body's slot). Proposed, unapproved.
  for (const [prefix, permitType] of Object.entries(OVERSIGHT_PERMITS)) if (key.startsWith(prefix)) return mapped(permitType);
  for (const [prefix, authority] of DEPLOYMENT_DOMAINS) if (key.startsWith(`${prefix}.`)) return { kind: 'deployment', authority };
  return mapped(pkg.authority?.permitType);
}

/** The platform's decision guard: refuse what no approved authority covers in production; say what the authority was. */
export function checkDecision(c: Case, a: ActionSpec, pkg: CasePackage, now: Date): { error: string } | { authority?: DecisionAuthority } {
  const production = !samplesAllowed();
  const cls = classifyDecision(c, a, pkg);
  if (!cls) return production
    ? { error: `${pkg.title}: this decision is not classified under any authority (an approved authority mapping, or a domain the deployment profile designates); name the permit type on the procedure and have its mapping approved` }
    : { authority: { basis: 'unmapped', note: 'Not classified; a demonstration or training installation only' } };
  if (cls.kind === 'deployment') return { authority: { basis: 'deployment', authority: cls.authority } };
  const on = now.toISOString().slice(0, 10);
  const why = powerRefusal(cls.permitType, cls.power, c.owner, a2 => ownerInstitution(a2, authorityFor), { on, required: production });
  if (why) return { error: why };
  const m = mappingInForce(cls.permitType, on);
  return { authority: m
    ? { basis: 'mapping', permitType: cls.permitType, power: cls.power, version: m.version, lead: m.lead, ...(m.approvedAt ? { approvedAt: m.approvedAt } : {}) }
    : { basis: 'unmapped', permitType: cls.permitType, note: 'No approved mapping; a demonstration or training installation only' } };
}

registerDecisionGuard('permit-authority', checkDecision);
