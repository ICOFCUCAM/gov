// Where the installation stands in setting itself up (/admin/onboarding):
// one reader over the systems that already hold each step, never a second
// copy of them. Each track lists its checks with the page that does the work;
// a track is done when every check is, blocked when the environment stops it.
// Changes waiting for a second official are gathered from every store that
// keeps them, so whoever opens the page can confirm what someone else began.
// Read-only: nothing here changes a record.

import { AUTHORITIES, REQUIRED_AUTHORITIES, HEALTH_SLOTS, provisionalOwner } from '@/lib/nation/deployment';
import { authorityFor, getSetup, getSovereign, authorityChanges, classificationChanges, editionChanges } from '@/lib/data/store/sovereign';
import { currentEdition } from '@/lib/nation/edition';
// I9: federation and cross-institution workflow.
import { listPeers } from '@/lib/federation/events';
import { adoptionOf } from '@/lib/federation/procedures';
import { pilotExitGate } from '@/lib/pilot/exit-gate';
import { listExports } from '@/lib/portability/export';
import { listImports } from '@/lib/portability/import';
import { waitingInstitutionTerms } from '@/lib/data/store/institutions';
import { listRelationships, waitingRelationships } from '@/lib/data/store/relationships';
import { waitingAccountChanges } from '@/lib/auth/account-changes';
import { listOffices, waitingOffices, waitingHoldings } from '@/lib/nation/office-register';
import { constitutionOverview, waitingProfileSteps } from '@/lib/constitution/profile';
import { activeProcedure, listBills, waitingLegislative, legislatureName } from '@/lib/legislature/register';
import { transitionsOverview, waitingTransitions } from '@/lib/transitions/events';
import { listMinistries } from '@/lib/data/store/ministries';
import { listAccounts, twoStepPolicy } from '@/lib/auth/officials';
import { listInstruments } from '@/lib/law/register';
import { listMappings } from '@/lib/permits/authority';
import { suspensionPolicy } from '@/lib/permits/authority';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import { waitingReleases } from '@/lib/forms/publication';
import { listRules } from '@/lib/law/rules';
import { registerTypes, listOrganisations } from '@/lib/organisations/register';
import { professions, disclosureChanges } from '@/lib/professions/register';
import { listIntegrations } from '@/lib/data/store/federation';
import { productCounts, publicClassification, productDisclosureChanges } from '@/lib/health/products/register';
import { PRODUCT_PROCEDURES, PRODUCT_PERMIT_TYPES, OVERSIGHT_PROCEDURES } from '@/lib/health/products/procedures';
import { controlledLimits, controlledLimitChanges } from '@/lib/health/products/controlled';
import { noticeSubscribers } from '@/lib/health/products/notices';
import { programmeCounts, interventionRules, interventionRuleChanges } from '@/lib/health/programmes/register';
import { PROGRAMME_PROCEDURES, PROGRAMME_PERMITS } from '@/lib/health/programmes/procedures';
import { COMPLAINT_PROCEDURES } from '@/lib/health/complaints/procedures';
import { INDEPENDENT_OVERSIGHT_PROCEDURES, OVERSIGHT_PERMITS } from '@/lib/oversight/procedures';
import { OVERSIGHT_SLOTS, oversightCounts } from '@/lib/oversight/register';
import { relationshipGrants } from '@/lib/data/store/relationships';
import { taxServicesView } from '@/lib/tax/services-view';
import { economicServicesView } from '@/lib/finance/services-view';
import { cabinetRuleChanges } from '@/lib/cabinet/register';
import { smallCellRule, smallCellChanges } from '@/lib/health/small-cells';
// I12: security governance and resilience.
import { SECURITY_PROCEDURES, SECURITY_PERMITS, SECURITY_SLOT_OF } from '@/lib/security/procedures';
import { classificationStatus, securityClassificationChanges } from '@/lib/security/classification';
import { securityCounts } from '@/lib/security/register';
import { indicatorSmallCells } from '@/lib/indicators/disclosure';
import { listDefinitions as listIndicators, approvedAt as indicatorApprovedAt } from '@/lib/indicators/register';
import { SITE_IDS } from '@/lib/public-sites';
import { siteEditorial } from '@/lib/data/site-editorial';
import { listBoundaryVersions } from '@/lib/data/boundaries';
import { policyChanges as facilityPolicyChanges } from '@/lib/data/facilities';
import { parcelPolicyChanges, cadastreAuthority } from '@/lib/data/parcels';
import { targetFromEnv } from '@/lib/backup/target';
import { installationMode, modeUnset, samplesAllowed } from '@/lib/ops/mode';
import { listCases } from '@/lib/casework/engine';
import { HOME_NATION, nationRecord } from '@/lib/data/updates';
import { scheduledJobsHealthy } from '@/lib/ops/cron-runs';
import { sealKeyRules, sealKeyAuthority, presentedStanding, waitingSealKeys } from '@/lib/keys/seal-register';
import { signer } from '@/lib/keys/custody';
import { institutionCompleteness, type InstitutionCompleteness } from './completeness';
import { LAND_PROCEDURES, LAND_PERMITS } from '@/lib/land/procedures';
import { landCounts } from '@/lib/land/register';
import { BUILDING_PROCEDURES, BUILDING_DECISION_PERMITS } from '@/lib/building/procedures';
import { buildingRules, buildingRuleChanges, buildingCounts } from '@/lib/building/register';
import { HOUSING_PROCEDURES, HOUSING_PERMITS } from '@/lib/housing/procedures';
import { housingCounts } from '@/lib/housing/register';
import { TRANSPORT_PROCEDURES, TRANSPORT_PERMITS } from '@/lib/transport/procedures';
import { transportCounts } from '@/lib/transport/register';
import { LOCAL_GOVERNMENT_TEMPLATES, localKey } from '@/lib/localgov/procedures';
import { councilRules, councilRuleChanges, localCounts } from '@/lib/localgov/register';
import { institutionBounds } from '@/lib/data/store/institutions';
import { getMinistry } from '@/lib/data/store/ministries';
import type { AuthorityKey } from '@/lib/nation/deployment';
import { departmentsOf, waitingDepartmentChanges } from '@/lib/institution/departments';
import { ADMINISTRATION_PROCEDURES, administrationKey } from '@/lib/administration/procedures';
import { ruleInForce } from '@/lib/law/rules';
import { IDENTITY_PROCEDURES, IDENTITY_PERMITS } from '@/lib/identity/procedures';
import { PASSPORT_PROCEDURES, PASSPORT_PERMITS } from '@/lib/passports/procedures';
import { CITIZENSHIP_PROCEDURES, CITIZENSHIP_PERMITS } from '@/lib/citizenship/procedures';
import { LABOUR_PROCEDURES, LABOUR_PERMITS } from '@/lib/labour/procedures';
import { SOCIAL_PROCEDURES, SOCIAL_PERMITS } from '@/lib/social/procedures';
import { identityCounts } from '@/lib/identity/register';
import { passportCounts, FEE_RULE } from '@/lib/passports/register';
import { labourCounts } from '@/lib/labour/register';
import { socialCounts } from '@/lib/social/register';
// I13: the digital front door and records (plan step I13).
import { catalogueCounts, waitingServices } from '@/lib/frontdoor/catalogue';
import { waitingServiceManagement } from '@/lib/frontdoor/service-management';
import { identityRoute } from '@/lib/frontdoor/journey';
import { FRONTDOOR_PROCEDURES, frontdoorKey } from '@/lib/frontdoor/procedures';
import { RECORDKEEPING_PROCEDURES, recordkeepingKey } from '@/lib/recordkeeping/procedures';
import { recordkeepingCounts } from '@/lib/recordkeeping/register';

export type TrackState = 'done' | 'in-progress' | 'not-started' | 'blocked';
/**
 * One item of setting up (plan I2, completeness per item): done or not, the
 * page that does the work, who is accountable for it (`owner`), the date of
 * its evidence where the record carries one, and the next action while it is
 * not done. No item is averaged into a percentage.
 */
export interface Check { label: string; done: boolean; href: string; detail?: string; owner?: string; date?: string; next?: string }
export interface Track {
  key: string;
  title: string;
  /** What the track is for, in one plain sentence. */
  why: string;
  href: string;
  state: TrackState;
  checks: Check[];
  /** What outside the platform stops it (the environment, another track). */
  blockedBy?: string;
  /** Only in demo and training installations. */
  samplesOnly?: boolean;
  /** Its checks read records that demo and training installations seed with samples, so "done" may rest on them. */
  samplesCounted?: boolean;
  /** Who is accountable for the track's items unless an item names another (plan I2). */
  owner?: string;
}
export interface Waiting { what: string; proposedBy: string; at?: string; href: string }
export interface OnboardingStatus {
  mode: string;
  tracks: Track[];
  done: number;
  total: number;
  waiting: Waiting[];
  /** Completeness per institution (lib/onboarding/completeness.ts): critical items failing, and counts by state; never a percentage. */
  institutions: { id: string; name: string; counts: InstitutionCompleteness['counts']; failing: InstitutionCompleteness['gate']['failing']; gateApplies: boolean }[];
}

const stateOf = (checks: Check[], blockedBy?: string): TrackState =>
  blockedBy ? 'blocked' : checks.every(c => c.done) ? 'done' : checks.some(c => c.done) ? 'in-progress' : 'not-started';

/** Who is accountable for a track's items when the track names no one else (plan I2). */
const TRACK_OWNER: Record<string, string> = {
  nation: 'Administrators serving the whole government', institutions: 'Administrators serving the whole government, a different official confirming', officials: 'Administrators of each institution',
  laws: 'The law-register authority (two officials)', authorities: 'Administrators, approved by a different one', rules: 'The authority that owns each rule (an official who can sign there)',
  procedures: 'Officials who can sign at each responsible institution', exchange: 'Two officials approve each integration', sites: 'Each institution\'s officials, published by a different one',
  maps: 'The mapping agency and the cadastre authority', operations: 'Whoever runs the servers', updates: 'Administrators serving the whole government', legislature: 'The legislature\'s clerk',
  administration: 'Administrators of each institution, a different official confirming',
  indicators: 'Officials who can sign at each institution whose figures an indicator defines', tax: 'The tax administration the nation names (officials who can sign there)',
  oversight: 'Each independent oversight body the nation names (its own officials)',
  territory: 'The land registry, building control, housing and transport bodies the nation names, and each local government for its own records',
  // I13: each institution owns its services and its records; the archive the nation names receives transfers.
  frontdoor: 'Each institution for its own services and records (an official proposes, a different one who can sign there publishes or approves)',
};

/** One track, read defensively: a store that cannot be read shows as a check not done, never breaks the page. */
function track(t: Omit<Track, 'state' | 'checks' | 'blockedBy' | 'samplesCounted'> & { seeded?: boolean }, read: () => { checks: Check[]; blockedBy?: string }): Track {
  let r: { checks: Check[]; blockedBy?: string };
  try { r = read(); } catch (e) { r = { checks: [{ label: 'Could not be read', done: false, href: t.href, detail: (e as Error).message.slice(0, 200) }] }; }
  const { seeded, ...rest } = t;
  // Completeness per item (plan I2): every item names who is accountable and, while not done, what to do next.
  const owner = rest.owner ?? TRACK_OWNER[rest.key] ?? 'Administrators serving the whole government';
  const checks = r.checks.map(c => ({ ...c, owner: c.owner ?? owner, ...(!c.done && !c.next ? { next: `${c.label}: open ${c.href}` } : {}) }));
  return { ...rest, owner, ...r, checks, state: stateOf(checks, r.blockedBy), ...(seeded && samplesAllowed() ? { samplesCounted: true } : {}) };
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export function onboardingStatus(env: NodeJS.ProcessEnv = process.env): OnboardingStatus {
  const waiting: Waiting[] = [];
  const wait = (w: Waiting) => waiting.push(w);
  const active = () => listMinistries().filter(m => m.status === 'active');

  const tracks: Track[] = [
    track({ key: 'nation', title: 'Nation and installation', why: 'The country this installation serves, its name, insignia and languages, and whether it is a real government or a demonstration.', href: '/setup' }, () => {
      const p = getSovereign();
      return { checks: [
        { label: 'First-run setup launched', done: getSetup() !== null, href: '/setup', ...(getSetup() ? { date: getSetup()!.completedAt.slice(0, 10), owner: getSetup()!.by } : {}) },
        { label: 'Installation mode set (CIVICOS_MODE)', done: !modeUnset(env), href: '/platform', detail: `Running as ${installationMode(env)}` },
        { label: 'Assistant choice made (on or off)', done: p.aiAssistant !== undefined, href: '/setup' },
      ] };
    }),

    track({ key: 'institutions', title: 'Institutions and who is responsible', why: 'Which institution is legally responsible for each register and power. Cases and registers refuse work until this is named.', href: '/gov/configuration/responsible' }, () => {
      const ids = new Set(active().map(m => m.id));
      // The constitutional bodies (legislature, audit office, central bank…) are optional slots: a nation
      // without such a body leaves them empty, so they never count as missing; those it names must be active.
      const isActive = (key: (typeof AUTHORITIES)[number]['key']) => { const id = authorityFor(key); return id !== undefined && ids.has(id); };
      const named = REQUIRED_AUTHORITIES.filter(a => isActive(a.key));
      const bodies = AUTHORITIES.filter(a => a.optional && !HEALTH_SLOTS.includes(a.key) && authorityFor(a.key) !== undefined);
      // Health bodies the catalogue forms name (medicines, controlled substances, public health): named, or stood in for
      // provisionally (lib/nation/deployment.ts provisionalOwner()). Production takes no provisional owner as competent.
      const health = HEALTH_SLOTS.map(k => ({ a: AUTHORITIES.find(x => x.key === k)!, o: provisionalOwner(k, authorityFor) }));
      const provisional = health.filter(h => h.o.provisional);
      const uncovered = health.filter(h => !h.o.institution);
      const inactiveBodies = bodies.filter(a => !isActive(a.key));
      // Relationships between institutions are optional (plan phase 3): none is fine; one approved while an end is
      // no longer active grants nothing and should be ended (or its institution reactivated).
      const rels = listRelationships();
      const approved = rels.filter(r => r.status === 'approved');
      const stale = approved.filter(r => [r.terms.from, r.terms.to].some(x => x !== 'executive-office' && !ids.has(x)));
      return { checks: [
        { label: 'Institutions created', done: ids.size > 0, href: '/gov/configuration', detail: n(ids.size, 'active institution') },
        { label: 'Every responsibility assigned to an active institution', done: named.length === REQUIRED_AUTHORITIES.length, href: '/gov/configuration/responsible', detail: `${named.length} of ${REQUIRED_AUTHORITIES.length}${named.length < REQUIRED_AUTHORITIES.length ? ` · missing: ${REQUIRED_AUTHORITIES.filter(a => !named.includes(a)).map(a => a.label).join(', ')}` : ''}` },
        { label: 'Constitutional bodies the nation named are active', done: inactiveBodies.length === 0, href: '/gov/configuration/responsible', detail: bodies.length ? `${n(bodies.length, 'body', 'bodies')} named${inactiveBodies.length ? ` · not active: ${inactiveBodies.map(a => a.label).join(', ')}` : ''}` : 'None named (only those the nation has)' },
        { label: 'Health bodies the forms name (medicines, controlled substances, public health)', done: uncovered.length === 0 && (samplesAllowed(env) || provisional.length === 0), href: '/gov/configuration/responsible#who-is-responsible',
          detail: provisional.length ? `${provisional.map(h => `${h.a.label}: ${h.o.provisional}`).join(' · ')}`.slice(0, 600) : 'Each named' },
        { label: 'Relationships between institutions are current (optional)', done: stale.length === 0, href: '/gov/configuration/relationships',
          detail: rels.length ? `${n(approved.length, 'approved')} · ${n(rels.filter(r => r.status === 'draft').length, 'draft')}${stale.length ? ` · with an institution no longer active: ${stale.map(r => `${r.fromName} → ${r.toName}`).join(', ').slice(0, 200)}` : ''}` : 'None recorded (only those the nation\'s law sets)' },
      ] };
    }),

    track({ key: 'offices', title: 'Offices of state', why: 'The offices the nation\'s law sets up (head of state, head of government, presiding officers, chief justice…), each in its institution with its legal basis, and who holds them. Optional beyond the head of government: holding an office grants no permission.', href: '/gov/configuration/offices' }, () => {
      const all = listOffices();
      const own = all.filter(o => !o.derived && o.inForce);
      const head = all.find(o => o.inForce && o.kind === 'head-of-government');
      const unsourced = own.filter(o => !o.basis?.length);
      const vacant = own.filter(o => !o.holders.length);
      return { checks: [
        { label: 'Head of government named', done: !!head, href: '/gov/configuration/offices', detail: head ? (head.derived ? `${head.title} (from the executive title set in setup; record it as an office to give it an institution and legal basis)` : head.title) : undefined },
        { label: 'Each recorded office cites its legal basis', done: unsourced.length === 0, href: '/gov/configuration/offices', detail: own.length ? `${own.length - unsourced.length} of ${own.length}${unsourced.length ? ` · without: ${unsourced.slice(0, 4).map(o => o.title).join(', ')}` : ''}` : 'No offices recorded beyond the head of government (optional)' },
        { label: 'Each recorded office has its holder linked', done: vacant.length === 0, href: '/gov/configuration/offices', detail: own.length ? `${own.length - vacant.length} of ${own.length}${vacant.length ? ` · nobody linked: ${vacant.slice(0, 4).map(o => o.title).join(', ')}` : ''}` : 'Nothing to link yet (optional)' },
      ] };
    }),

    // The constitutional profile (plan phase 5): optional in demo and training, the recommended step in production.
    track({ key: 'constitution', title: 'Constitutional profile', why: 'The parts of the constitution the platform enforces (classification, institutions\' standing, who is responsible, offices, relationships, the country\'s rules), approved together as one version through the nation\'s own legal process, with the date it applies from. Recorded, never decided, by the platform.', href: '/gov/configuration/constitution' }, () => {
      const o = constitutionOverview();
      const optional = samplesAllowed(env);
      return { checks: [
        { label: `Constitutional profile approved and active${optional ? ' (optional in demo and training)' : ' (recommended)'}`, done: !!o.inForce, href: '/gov/configuration/constitution',
          detail: o.inForce ? `Version ${o.inForce.version} from ${o.inForce.effectiveFrom} · digest ${o.inForce.digest.slice(0, 12)}` : o.profiles.length ? `${n(o.profiles.length, 'version')} recorded, none active yet` : 'None drafted: draft one once setup is complete' },
        { label: 'No part changed since the active profile was approved', done: !!o.inForce && o.drift.length === 0, href: '/gov/configuration/constitution',
          detail: !o.inForce ? 'No active profile yet' : o.drift.length ? `Changed since: ${o.drift.map(k => o.labels.parts[k]).join(', ')} (draft a new version)` : undefined },
        { label: 'No part frozen by a dispute', done: o.frozen.length === 0, href: '/gov/configuration/constitution', detail: o.frozen.length ? o.frozen.map(f => `${o.labels.parts[f.part]} (version ${f.version})`).join(', ') : undefined },
      ] };
    }),

    // Transitions and emergencies (plan phase 6): optional; the checks flag what the nation has left unset, never invent it.
    track({ key: 'transitions', title: 'Transitions and emergencies', why: 'Acting appointments, delegations, caretaker periods, courts\' rulings, states of emergency, transfers of powers and declarations of interest, recorded as the nation\'s legal events. Optional until the nation needs them; nothing is restricted that the nation has not adopted.', href: '/gov/configuration/transitions' }, () => {
      const o = transitionsOverview();
      const caretakerUnset = o.inForce.caretaker.length > 0 && !(o.rules.caretakerProcedures.length + o.rules.caretakerDecisions.length + o.rules.caretakerDirectives.length);
      return { checks: [
        { label: 'Rules for transitions adopted (optional: needed before an impeachment stage or an emergency is recorded)', done: o.rules.adopted, href: '/gov/configuration/transitions',
          detail: o.rules.adopted ? `${o.rules.impeachmentStages.filter(Boolean).length} of 7 impeachment stages named · ${o.rules.emergencyDeclarers.length} emergency declarer(s)` : 'None adopted' },
        { label: 'No caretaker period without the nation\'s restrictions', done: !caretakerUnset, href: '/gov/configuration/transitions', detail: caretakerUnset ? 'A caretaker period is in force and restricts nothing until the nation adopts its restrictions' : undefined },
        { label: 'No office held past its recorded term', done: o.pastTerm.length === 0, href: '/gov/configuration/offices', detail: o.pastTerm.length ? o.pastTerm.slice(0, 4).map(h => `${h.holderName} (${h.title}, ended ${h.termEnded})`).join(', ') : undefined },
        { label: 'Decisions touched by a court\'s ruling assessed', done: o.flagged.length === 0, href: '/gov/configuration/transitions', detail: o.flagged.length ? `${o.flagged.length} decision(s) flagged for legal assessment (flagged, never changed)` : undefined },
      ] };
    }),

    track({ key: 'officials', title: 'Officials and sign-in', why: 'Named accounts for each responsible institution: someone to do the work and two who can sign, since every decision needs two officials.', href: '/admin/officials' }, () => {
      const accounts = listAccounts().filter(a => !a.disabled);
      const admins = accounts.filter(a => a.role === 'administrator' || a.role === undefined);
      const responsible = [...new Set(AUTHORITIES.map(a => authorityFor(a.key)).filter((x): x is string => !!x))];
      const staffed = responsible.filter(id => accounts.filter(a => a.institution === id && a.role === 'signatory').length >= 2
        && accounts.some(a => a.institution === id && (a.role === 'officer' || a.role === 'signatory')));
      return { checks: [
        { label: 'At least two administrators', done: admins.length >= 2, href: '/admin/officials', detail: n(admins.length, 'administrator') },
        { label: 'Each responsible institution has two who can sign', done: responsible.length > 0 && staffed.length === responsible.length, href: '/admin/officials', detail: `${staffed.length} of ${responsible.length} institutions` },
        { label: 'Second sign-in step policy chosen', done: twoStepPolicy() !== 'none', href: '/admin/officials', detail: `Policy: ${twoStepPolicy()}` },
        { label: 'Officials linked to the identity provider', done: accounts.some(a => !!(a as { identity?: unknown }).identity), href: '/admin/officials' },
      ] };
    }),

    track({ key: 'laws', title: 'Laws', why: 'Every decision cites the law version that applied. Laws are recorded by one official and confirmed by another.', href: '/gov/law' }, () => {
      const all = listInstruments({ state: 'any' });
      const confirmed = all.filter(i => i.versions.some(v => v.state === 'confirmed'));
      for (const i of all) for (const v of i.versions) if (v.state === 'recorded') wait({ what: `Law: ${i.title ?? i.id} (${v.language}, in force ${v.dates.inForce})`, proposedBy: v.recordedBy, at: v.at, href: '/gov/law' });
      return { checks: [
        { label: 'At least one law recorded and confirmed', done: confirmed.length > 0, href: '/gov/law', detail: n(confirmed.length, 'confirmed law') },
      ] };
    }),

    track({ key: 'authorities', title: 'Who decides each permit', why: 'Which authority holds each power over a permit or licence, citing the law. A production installation refuses a power no approved mapping covers.', href: '/gov/law/permit-authorities' }, () => {
      const maps = listMappings();
      const approved = maps.filter(m => m.state === 'approved');
      for (const m of maps) if (m.state === 'draft' && !m.proposal) wait({ what: `Permit authority: ${m.title} v${m.version}`, proposedBy: m.draftedBy, at: m.draftedAt, href: '/gov/law/permit-authorities' });
      return { checks: [
        { label: 'Permit authorities approved', done: approved.length > 0, href: '/gov/law/permit-authorities', detail: `${approved.length} approved · ${maps.filter(m => m.state === 'draft').length} drafts` },
      ] };
    }),

    track({ key: 'rules', title: 'Country rules', why: 'Extra steps needing two officials, and who may suspend a mapping in an emergency. Proposed by one administrator citing the law, confirmed by another.', href: '/gov/law/permit-authorities' }, () => {
      const dc = dualControlPolicy();
      const sp = suspensionPolicy();
      if (dc.changes?.pending) wait({ what: 'Dual-control rules', proposedBy: dc.changes.pending.by, at: dc.changes.pending.at, href: '/gov/law/permit-authorities' });
      if (sp.changes?.pending) wait({ what: 'Suspension rules', proposedBy: sp.changes.pending.by, at: sp.changes.pending.at, href: '/gov/law/permit-authorities' });
      return { checks: [
        { label: 'Dual-control rules adopted', done: dc.adopted, href: '/gov/law/permit-authorities' },
        { label: 'Suspension rules adopted', done: sp.adopted, href: '/gov/law/permit-authorities' },
      ] };
    }),

    // The seal key register (lib/keys/seal-register.ts): a production installation seals no decision with a key it has not approved.
    track({ key: 'seal-keys', title: 'Seal keys', why: 'The keys that seal the state\'s decisions and certificates: each approved by the authority the nation\'s law names (two officials at least), valid for a period, published so anyone can check a certificate. A production installation seals nothing with a key that is not approved.', href: '/gov/configuration/seal-keys' }, () => {
      const r = sealKeyRules();
      const authority = sealKeyAuthority();
      const half = signer('decision').current();
      const st = half ? presentedStanding('decision', half.publicKeyPem) : null;
      const sample = st?.state === 'unregistered' && st.seals;
      const open = waitingSealKeys().filter(w => /compromis/.test(w.what));
      return { checks: [
        { label: 'Seal keys authority named (Who is responsible)', done: !!authority, href: '/gov/configuration/responsible', detail: authority ? undefined : 'Nobody can approve a seal key until the nation names the authority its law designates' },
        { label: 'Seal-key rules adopted, citing the law (recommended; the platform minimum of two approvals applies until then)', done: r.adopted, href: '/gov/configuration/seal-keys', detail: r.adopted ? `${r.approvers} approvals${r.legislatureResolution ? ' and the legislature\'s instrument' : ''} for each key` : undefined },
        { label: 'The decision key in use is approved in the register', done: !!st && (st.state === 'active' || st.state === 'approved' || sample), href: '/gov/configuration/seal-keys',
          detail: !st ? 'The key provider has not presented the key yet' : sample ? `${st.keyId}: trusted as a sample at its first seal (demonstration or training only)` : `${st.keyId}: ${st.state}` },
        { label: 'No compromise waiting for confirmation or review', done: open.length === 0, href: '/gov/configuration/seal-keys', detail: open.length ? open.map(w => w.what).join('; ').slice(0, 200) : undefined },
      ] };
    }),

    track({ key: 'procedures', title: 'Procedures', why: 'How each kind of case runs: drafted by one official, tested, approved by another. Cases open only under an approved procedure.', href: '/gov/law/procedures' }, () => {
      const pk = listPackages();
      const approved = pk.filter(p => p.state === 'approved');
      for (const p of pk) if (p.state === 'draft') wait({ what: `Procedure: ${p.title} v${p.version}`, proposedBy: p.author, at: p.createdAt, href: '/gov/law/procedures' });
      const unowned = approved.filter(p => !ownerInstitution(p.owner, authorityFor));
      return { checks: [
        { label: 'Procedures approved', done: approved.length > 0, href: '/gov/law/procedures', detail: `${approved.length} approved · ${pk.filter(p => p.state === 'draft').length} drafts` },
        { label: 'Every approved procedure has a responsible institution', done: approved.length > 0 && unowned.length === 0, href: '/gov/configuration/responsible', detail: unowned.length ? `No institution for: ${unowned.map(p => p.title).join(', ').slice(0, 200)}` : undefined },
      ] };
    }),

    track({ key: 'rates', title: 'Rates and tariffs', why: 'Fees, taxes and duties come only from approved, cited rule versions; a calculation refuses without one.', href: '/gov/law/rules' }, () => {
      const rs = listRules();
      for (const r of rs) if (r.state === 'draft') wait({ what: `Rate: ${r.key} v${r.version}`, proposedBy: r.draftedBy, at: r.draftedAt, href: '/gov/law/rules' });
      return { checks: [
        { label: 'Rates approved', done: rs.some(r => r.state === 'approved'), href: '/gov/law/rules', detail: `${rs.filter(r => r.state === 'approved').length} approved · ${rs.filter(r => r.state === 'draft').length} drafts` },
      ] };
    }),

    track({ key: 'registers', title: 'Registers', why: 'The registers organisations and professionals stand in, kept by the institutions responsible for them.', href: '/gov/organisations', seeded: true }, () => {
      // Reference types and professions ship with the platform as proposals; only the nation's own count.
      const types = registerTypes().filter(t => !t.reference);
      const ps = professions().filter(p => !p.reference);
      for (const p of professions()) {
        const c = disclosureChanges(p.key).pending;
        if (c) wait({ what: `Public check fields: ${p.title}`, proposedBy: c.by, at: c.at, href: '/gov/health-regulation' });
      }
      return { checks: [
        { label: 'Register types defined by the nation', done: types.length > 0, href: '/gov/organisations', detail: `${n(types.length, 'register type')} of its own · ${registerTypes().length - types.length} platform references` },
        { label: 'Organisations entered (through cases or a confirmed load)', done: listOrganisations({ limit: 1 }).length > 0, href: '/gov/organisations' },
        { label: 'Professions defined by the nation', done: ps.length > 0, href: '/gov/health-regulation', detail: `${n(ps.length, 'profession')} of its own · ${professions().length - ps.length} platform references` },
      ] };
    }),

    // The register of medicines and medical devices (Health I4): the nation's own body, procedures, mappings and public classification.
    track({ key: 'products', title: 'Medicines and medical devices register', why: 'Authorised medicines and devices, recorded only by the medicines authority\'s decided cases; the public sees only what the nation\'s approved classification lists.', href: '/gov/health-regulation/products', seeded: true }, () => {
      const pending = productDisclosureChanges().pending;
      if (pending) wait({ what: 'What the public product check shows: a change waiting for a second official', proposedBy: pending.by, at: pending.at, href: '/gov/health-regulation/products' });
      const limitsPending = controlledLimitChanges().pending;
      if (limitsPending) wait({ what: 'Controlled-medicine quantity limits: a change waiting for a second official', proposedBy: limitsPending.by, at: limitsPending.at, href: '/gov/health-regulation/products' });
      const oversight = new Set(OVERSIGHT_PROCEDURES.map(p => p.key));
      const keys = PRODUCT_PROCEDURES.filter(p => !oversight.has(p.key) && !p.key.startsWith('medicines.manufacturer') && !p.key.startsWith('medicines.importer') && !p.key.startsWith('medicines.wholesaler')).map(p => p.key);
      const more = OVERSIGHT_PROCEDURES.map(p => p.key);
      const moreApproved = more.filter(k => listPackages({ key: k, state: 'approved' }).length);
      const service = (id: string) => listIntegrations().filter(i => i.status === 'approved' && i.approval && (i.purposes?.[id]?.length ?? 0) > 0).length;
      const subscribers = noticeSubscribers().length, customs = service('product.import-authorisation');
      const limits = controlledLimits();
      const approved = keys.filter(k => listPackages({ key: k, state: 'approved' }).length);
      const types = Object.values(PRODUCT_PERMIT_TYPES);
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const c = productCounts();
      const own = provisionalOwner('medicinesRegulation', authorityFor);
      const cls = publicClassification();
      return { checks: [
        { label: 'Medicines authority named (Who is responsible)', done: !!authorityFor('medicinesRegulation'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('medicinesRegulation') ? undefined : (own.provisional ?? 'Not named') },
        { label: 'Product procedures approved (marketing authorisation, variation, renewal, suspension and withdrawal, recall, device registration)', done: approved.length === keys.length, href: '/gov/law/procedures', detail: `${approved.length} of ${keys.length} approved` },
        { label: 'Who decides product powers approved (permit authorities)', done: mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        { label: 'What the public product check shows, approved by two officials citing the law', done: cls.approved, href: '/gov/health-regulation/products', detail: cls.approved ? `Version ${cls.version}: ${cls.fields.join(', ') || 'no attribute'}` : 'Ships empty: the public sees only the number, kind and published notices' },
        { label: 'Products recorded through decided cases', done: c.total > 0, href: '/gov/health-regulation/products', detail: `${c.byKind.medicine} medicines · ${c.byKind.device} devices${c.samples ? ` (${c.samples} samples)` : ''}` },
        { label: 'Oversight procedures approved (corrective action, import and controlled-medicine authorisation, safety reports, device incidents, reconsideration)', done: moreApproved.length === more.length, href: '/gov/law/procedures', detail: `${moreApproved.length} of ${more.length} approved; their lists (points of entry, schedules, report kinds) and periods are the nation's, none ship` },
        { label: 'Controlled-substances authority named (Who is responsible)', done: !!authorityFor('controlledSubstances'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('controlledSubstances') ? undefined : 'Not named: nobody decides controlled-medicine authorisations until it is' },
        { label: 'Controlled-medicine quantity limits adopted by two officials citing the law', done: limits.version > 0, href: '/gov/health-regulation/products', detail: limits.version ? `Version ${limits.version}: ${limits.limits.length} limit(s)` : 'Ship unset: production refuses a schedule no adopted limit covers' },
        { label: 'Recall notices and safety alerts (HX-005): subscribers approved by two officials', done: subscribers > 0, href: '/integrations', detail: `${subscribers} approved subscriber(s); none ship. Each subscriber is approved for product.safety-notice with its purpose` },
        { label: 'Import authorisation check for customs (product.import-authorisation) approved for a caller', done: customs > 0, href: '/integrations', detail: `${customs} approved caller(s); customs learns only whether an authorisation is valid` },
      ] };
    }),

    // The pilot's exit gate (Health I4 standalone-and-pilot; S6-I-11), computed from the records: never a stored status.
    track({ key: 'pilot', title: 'Pilot: the health institutions', why: 'Whether authorised users completed the health services with real records and verifiable audit evidence (the pilot\'s exit gate), and whether the installation runs as an Institutional Edition. Evidence only: it never declares Health complete.', href: '/gov/health-regulation/pilot' }, () => {
      const gate = pilotExitGate();
      const e = currentEdition();
      return { checks: [
        { label: 'Institutional Edition (optional: only when the institutions stand alone)', done: true, href: '/gov/configuration/edition', detail: e ? `${e.label}: ${e.institutions.length} institution(s), modules ${e.modules.join(', ')}` : 'None recorded: every institution is connected' },
        ...gate.items.map(i => ({ label: `Exit gate: ${i.label}`, done: i.met, href: '/gov/health-regulation/pilot', detail: (i.met ? i.detail : i.missing.join(' · ')).slice(0, 600) })),
      ] };
    }),

    // Public-health programmes, health complaints and workforce counts (Health I4): the nation's own body, procedures, mappings and rules.
    track({ key: 'public-health', title: 'Public-health programmes, complaints and workforce counts', why: 'Programme records and aggregate returns of the public-health authority (never an individual), complaint intake of the health regulators, and workforce counts derived from the professions register; published figures pass the nation\'s small-cell rule.', href: '/gov/health-regulation/programmes', seeded: true }, () => {
      const rulesPending = interventionRuleChanges().pending;
      if (rulesPending) wait({ what: 'Public-health intervention authority rules: a change waiting for a second official', proposedBy: rulesPending.by, at: rulesPending.at, href: '/gov/health-regulation/programmes' });
      const cellsPending = smallCellChanges().pending;
      if (cellsPending) wait({ what: 'Small-cell rule for health aggregates: a change waiting for a second official', proposedBy: cellsPending.by, at: cellsPending.at, href: '/gov/health-regulation/programmes' });
      const keys = PROGRAMME_PROCEDURES.map(p => p.key);
      const approved = keys.filter(k => listPackages({ key: k, state: 'approved' }).length);
      const complaints = COMPLAINT_PROCEDURES.map(p => p.key);
      const complaintsApproved = complaints.filter(k => listPackages({ key: k, state: 'approved' }).length);
      const types = [...new Set(Object.values(PROGRAMME_PERMITS))];
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const rules = interventionRules(), cells = smallCellRule(), c = programmeCounts();
      const own = provisionalOwner('publicHealth', authorityFor);
      return { checks: [
        { label: 'Public-health authority named (Who is responsible)', done: !!authorityFor('publicHealth'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('publicHealth') ? undefined : (own.provisional ?? 'Not named: nobody keeps programmes until it is') },
        { label: 'Programme procedures approved (establishment, change, intervention, returns, risk communication)', done: approved.length === keys.length, href: '/gov/law/procedures', detail: `${approved.length} of ${keys.length} approved` },
        { label: 'Who decides public-health powers approved (permit authorities)', done: mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        { label: 'Intervention authority, review and expiry rules adopted by two officials citing the law (CFG-PH-003)', done: rules.version > 0, href: '/gov/health-regulation/programmes', detail: rules.version ? `Version ${rules.version}: ${rules.rules.length} kind(s)` : 'Ship empty: production refuses an intervention no adopted rule covers' },
        { label: 'Small-cell rule for health aggregates adopted by two officials citing the law', done: !!cells, href: '/gov/health-regulation/programmes', detail: cells ? `Version ${cells.version}: threshold ${cells.threshold}` : 'Ships unset: no programme figure or workforce count is published until it is adopted' },
        { label: 'Programmes established through decided cases', done: c.programmes.established > 0, href: '/gov/health-regulation/programmes', detail: `${c.programmes.established} established · ${c.returns} return(s)${c.samples ? ` (${c.samples} samples)` : ''}` },
        { label: 'Complaint procedures approved (facility and pharmacy complaints, professional conduct complaints)', done: complaintsApproved.length === complaints.length, href: '/gov/law/procedures', detail: `${complaintsApproved.length} of ${complaints.length} approved` },
      ] };
    }),

    // The indicator register (plan step I3): definitions approved by each institution, the small-cell rule for indicator values.
    track({ key: 'indicators', title: 'Indicators', why: 'What each figure on the console means (numerator, denominator, period, coverage, computation and disclosure rule), approved by the institution whose figures it defines; only approved definitions reach the national data.', href: '/gov/twin/indicators' }, () => {
      const cellsPending = indicatorSmallCells.changes().pending;
      if (cellsPending) wait({ what: 'Small-cell rule for indicator values: a change waiting for a second official', proposedBy: cellsPending.by, at: cellsPending.at, href: '/gov/twin/indicators' });
      const defs = listIndicators();
      for (const d of defs) {
        const v = d.versions.at(-1)!;
        if (!v.reference && !d.approvals.some(a => a.version === v.n && !a.withdrawn)) wait({ what: `Indicator ${d.id}: version ${v.n} waiting for approval by an official who can sign`, proposedBy: v.by, at: v.at, href: `/gov/twin/indicators/${d.id}` });
      }
      const approved = defs.filter(d => indicatorApprovedAt(d).length);
      const cells = indicatorSmallCells.rule();
      return { checks: [
        { label: 'Indicator definitions approved by the institutions whose figures they define', done: approved.length > 0, href: '/gov/twin/indicators', detail: `${approved.length} of ${defs.length} approved somewhere; reference definitions ship as drafts` },
        { label: 'Small-cell rule for indicator values adopted by two officials citing the law', done: !!cells, href: '/gov/twin/indicators', detail: cells ? `Version ${cells.version}: threshold ${cells.threshold}` : 'Ships unset: counts about people are held back until it is adopted' },
      ] };
    }),

    // Tax services (plan step I5, forms batch 6): the tax administration, its procedures, who decides each power, its rules, and the forms adopted.
    track({ key: 'tax', title: 'Tax services', why: 'Registration, returns and assessments, amendments, objections, refunds, payment arrangements, voluntary disclosure, rulings and compliance reviews, each run by the tax administration under procedures its officials approve; rates, interest, penalties and periods only from the nation\'s approved rules.', href: '/gov/tax/services' }, () => {
      const v = taxServicesView();
      const forms = v.procedures.flatMap(p => p.forms);
      const adopted = forms.filter(f => f.link === 'approved').length;
      const rules = listRules().filter(r => r.key.startsWith('tax.') && r.state === 'approved').length;
      return { checks: [
        { label: 'Tax administration named (Who is responsible)', done: !!authorityFor('tax'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('tax') ? undefined : 'Not named: nobody keeps the tax register until it is' },
        { label: 'Tax procedures approved (registration, returns, objections, amendments, refunds, arrangements, disclosure, rulings, compliance)', done: v.counts.approved === v.counts.procedures, href: '/gov/law/procedures', detail: `${v.counts.approved} of ${v.counts.procedures} approved` },
        { label: 'Who decides each tax power approved (permit authorities)', done: v.counts.mappingsApproved === v.counts.permitTypes, href: '/gov/law/permit-authorities', detail: `${v.counts.mappingsApproved} of ${v.counts.permitTypes} mappings approved; the proposals ship unapproved` },
        { label: 'Tax rates, interest and penalties approved as rules citing the law', done: rules > 0, href: '/gov/law/rules', detail: rules ? `${rules} approved tax rule version(s)` : 'None ship: assessments are entered with reasons, and a production installation refuses interest or a penalty without its rule' },
        { label: 'Tax-service forms adopted in approved procedure versions', done: forms.length > 0 && adopted === forms.length, href: '/gov/tax/services', detail: `${adopted} of ${forms.length} forms carried by a procedure adopted; ${v.counts.waiting} wait for a procedure` },
      ] };
    }),

    // The economic group (plan step I5): budget and treasury, public procurement, the Cabinet office.
    track({ key: 'finance', title: 'Budget and treasury', why: 'The budget call, ceilings and bids; appropriations released under the law; commitments against them; payments verified, approved by two officials, executed and reconciled by different people; payee accounts changed only after verification; cash forecasts. No ceiling, tier or period ships: each is the nation\'s.', href: '/gov/treasury/budget' }, () => {
      const v = economicServicesView('finance');
      const tiers = v.rules.find(r => r.key === 'treasury.payment.approval-tiers');
      return { checks: [
        { label: 'Finance authority named (Who is responsible)', done: !!authorityFor('finance'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('finance') ? undefined : 'Not named: nobody keeps appropriations, commitments or payments until it is' },
        { label: 'Budget and treasury procedures approved', done: v.counts.approved === v.counts.procedures, href: '/gov/law/procedures', detail: `${v.counts.approved} of ${v.counts.procedures} approved` },
        { label: 'Who decides each budget and treasury power approved (permit authorities)', done: v.counts.mappingsApproved === v.counts.permitTypes, href: '/gov/law/permit-authorities', detail: `${v.counts.mappingsApproved} of ${v.counts.permitTypes} mappings approved; the proposals ship unapproved` },
        { label: 'Payment approval tiers approved as a rule citing the law', done: tiers?.state === 'approved', href: '/gov/law/rules', detail: tiers?.state === 'approved' ? undefined : 'treasury.payment.approval-tiers ships unset: a production installation approves no payment without it' },
      ] };
    }),
    track({ key: 'procurement', title: 'Public procurement', why: 'Each institution\'s own procurement: plans against its budget, tenders published once and never silently changed, bids sealed until opened together, evaluation with declared interests and reasons, award by officials who did not evaluate, contracts and their variations; complaints decided by an independent review body.', href: '/gov/treasury/procurement' }, () => {
      const v = economicServicesView('procurement');
      const adopted = new Set(v.procedures.flatMap(p => (p.adoptedBy ?? []).filter(x => x.state === 'approved').map(x => x.institution)));
      const thresholds = v.rules.find(r => r.key === 'procurement.method-thresholds');
      return { checks: [
        { label: 'Procurement review body named (Who is responsible)', done: !!authorityFor('procurementReview'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('procurementReview') ? undefined : 'Not named: complaints cannot be decided independently until it is' },
        { label: 'At least one procuring institution has adopted and approved the procurement procedures', done: adopted.size > 0, href: '/gov/treasury/procurement', detail: `${adopted.size} institution(s)` },
        { label: 'Who decides each procurement power approved (permit authorities)', done: v.counts.mappingsApproved === v.counts.permitTypes, href: '/gov/law/permit-authorities', detail: `${v.counts.mappingsApproved} of ${v.counts.permitTypes} mappings approved; the proposals ship unapproved` },
        { label: 'Procurement method thresholds approved as a rule citing the law', done: thresholds?.state === 'approved', href: '/gov/law/rules', detail: thresholds?.state === 'approved' ? undefined : 'procurement.method-thresholds ships unset: a production installation authorises no method without it' },
      ] };
    }),
    track({ key: 'cabinet', title: 'Cabinet office', why: 'Cabinet papers reviewed and circulated, decisions recorded under the nation\'s quorum and voting rules and authenticated by a second official, actions assigned without transferring any institution\'s powers, directives with required responses, petitions answered or referred.', href: '/gov/cabinet-office' }, () => {
      const v = economicServicesView('cabinet');
      const rules = v.rules.find(r => r.key === 'cabinet.rules');
      const rulesPending = cabinetRuleChanges().pending;
      if (rulesPending) wait({ what: 'Cabinet composition, quorum and decision rule: a change waiting for a second official', proposedBy: rulesPending.by, at: rulesPending.at, href: '/gov/cabinet-office' });
      return { checks: [
        { label: 'Cabinet office named (Who is responsible)', done: !!authorityFor('cabinetOffice'), href: '/gov/configuration/responsible#who-is-responsible', detail: authorityFor('cabinetOffice') ? undefined : 'Not named: no Cabinet paper or petition is registered until it is' },
        { label: 'Cabinet procedures approved', done: v.counts.approved === v.counts.procedures, href: '/gov/law/procedures', detail: `${v.counts.approved} of ${v.counts.procedures} approved` },
        { label: 'Cabinet composition, quorum and decision rule adopted (citing the law)', done: rules?.state === 'approved', href: '/gov/cabinet-office', detail: rules?.state === 'approved' ? undefined : 'Ships unset: a production installation records no Cabinet decision without them' },
        { label: 'Who decides each Cabinet office power approved (permit authorities)', done: v.counts.mappingsApproved === v.counts.permitTypes, href: '/gov/law/permit-authorities', detail: `${v.counts.mappingsApproved} of ${v.counts.permitTypes} mappings approved` },
      ] };
    }),

    // Departments as records and each institution's internal administration (plan I2).
    track({ key: 'administration', title: 'Departments and internal administration', why: 'Each institution\'s departments as records (an accountable office, services and staff) and its own internal administration procedures: payroll reviewed and approved by different persons, establishment, privileged access, policies, delegations.', href: '/gov/institutions/administration' }, () => {
      const list = active();
      const depts = list.map(m => ({ m, d: departmentsOf(m.id) }));
      const accountable = depts.filter(x => x.d.length && x.d.every(d => d.office && !d.officeProblem));
      const adopted = list.filter(m => ADMINISTRATION_PROCEDURES.every(t => listPackages({ key: administrationKey(t.key, m.id), state: 'approved' }).length));
      const drafted = list.filter(m => ADMINISTRATION_PROCEDURES.some(t => listPackages({ key: administrationKey(t.key, m.id) }).length));
      const rule = ruleInForce('adm.payroll.deductions');
      return { checks: [
        { label: 'Every department has an accountable office', done: list.length > 0 && accountable.length === list.length, href: '/gov/institutions/departments', detail: `${accountable.length} of ${list.length} institution(s)` },
        { label: 'Internal administration procedures drafted from the templates', done: list.length > 0 && drafted.length === list.length, href: '/gov/institutions/administration', detail: `${drafted.length} of ${list.length} institution(s)` },
        { label: 'Internal administration procedures approved by a second official', done: list.length > 0 && adopted.length === list.length, href: '/gov/institutions/administration', detail: `${adopted.length} of ${list.length} institution(s)`, owner: 'Officials who can sign at each institution' },
        { label: 'Payroll deductions rule approved (adm.payroll.deductions; no rate ships)', done: !!rule, href: '/gov/law/rules', owner: 'The authority the nation names for payroll deductions (an official who can sign there)', ...(rule ? { date: rule.approvedAt?.slice(0, 10), detail: `Version ${rule.version}` } : { detail: 'Ships unset: a production installation approves no payroll without it' }) },
      ] };
    }),

    track({ key: 'exchange', title: 'Data sharing', why: 'Other systems and institutions reach records only through approved services, for an approved purpose, agreed by the data\'s owners.', href: '/integrations', seeded: true }, () => {
      const ints = listIntegrations();
      for (const i of ints) if (i.pendingApproval) wait({ what: `Data sharing: ${i.name}`, proposedBy: i.pendingApproval.by, at: i.pendingApproval.at, href: '/integrations' });
      // I9: federation keys of other installations' institutions waiting for a second official, and the exchange relationships in force.
      const peers = listPeers();
      for (const p of peers) if (p.state === 'proposed') wait({ what: `Federation: trusting ${getMinistry(p.institution)?.name ?? p.institution}'s key ${p.keyId}`, proposedBy: p.proposed.by, at: p.proposed.at, href: '/gov/exchange/federation' });
      const exchangeRels = relationshipGrants().filter(g => g.type === 'exchange');
      const adoptedXi = active().filter(m => adoptionOf(m.id).every(a => a.state === 'approved'));
      return { checks: [
        { label: 'Integrations registered', done: ints.length > 0, href: '/integrations', detail: n(ints.length, 'integration') },
        { label: 'Integrations approved by two officials', done: ints.some(i => i.status === 'approved'), href: '/integrations' },
        { label: 'Exchange relationships between institutions approved (citing the law)', done: exchangeRels.length > 0, href: '/gov/configuration/relationships', detail: exchangeRels.length ? n(exchangeRels.length, 'relationship') : 'None ships: services between institutions answer only under one (a demonstration notes their absence)' },
        { label: 'Cross-institution workflow procedures adopted by each institution', done: active().length > 0 && adoptedXi.length === active().length, href: '/gov/exchange/workflows', detail: `${adoptedXi.length} of ${active().length} institution(s)` },
      ] };
    }),

    track({ key: 'sites', title: 'Public websites', why: 'Each institution\'s public site: its own content and design, published by a second official.', href: '/admin/sites' }, () => {
      let published = 0;
      for (const id of SITE_IDS) {
        const ed = siteEditorial(id);
        if (ed.version > 0) published++;
        for (const p of ed.proposals) if (p.status === 'pending') wait({ what: `Website: ${id} — ${p.summary[0] ?? 'change'}`, proposedBy: p.proposedBy, at: p.proposedAt, href: '/admin/sites' });
      }
      return { checks: [
        { label: 'Sites published by the nation', done: published > 0, href: '/admin/sites', detail: `${published} of ${SITE_IDS.length} sites have the nation's own content` },
      ] };
    }),

    track({ key: 'maps', title: 'Maps and places', why: 'The nation\'s own boundaries, and who certifies sites and land parcels.', href: '/gov/sites/boundaries' }, () => {
      const bv = listBoundaryVersions();
      for (const b of bv) if (b.state === 'proposed') wait({ what: `Boundaries: ${b.id}`, proposedBy: b.proposedBy, at: b.proposedAt, href: '/gov/sites/boundaries' });
      for (const c of facilityPolicyChanges()) if (c.state === 'pending') wait({ what: 'Facility register policy', proposedBy: (c as { by?: string }).by ?? 'an official', href: '/gov/sites' });
      for (const c of parcelPolicyChanges()) if (c.state === 'pending') wait({ what: 'Land parcel policy', proposedBy: (c as { by?: string }).by ?? 'an official', href: '/gov/sites/parcels' });
      return { checks: [
        { label: 'The nation\'s own boundaries published', done: bv.some(b => b.inForce), href: '/gov/sites/boundaries', detail: bv.length ? n(bv.length, 'version') : 'Until then maps use the bundled boundaries' },
        { label: 'Cadastre authority named for land parcels', done: cadastreAuthority() !== null, href: '/gov/sites/parcels' },
      ] };
    }),

    track({ key: 'operations', title: 'Backups and operations', why: 'Encrypted backups to a place outside the server, scheduled jobs and messaging.', href: '/platform' }, () => {
      let target: string | null = null;
      try { target = targetFromEnv(env).kind; } catch (e) { return { checks: [{ label: 'Backup target configured', done: false, href: '/platform', detail: (e as Error).message }], blockedBy: 'The backup target in the environment is incomplete' }; }
      const kek = !!env.CIVICOS_DATA_KEK?.trim();
      const serverless = !!env.VERCEL;
      // Read from the run history (lib/ops/cron-runs.ts): done when every job this installation runs succeeded within twice its interval.
      const jobs = scheduledJobsHealthy(env);
      const jobsDetail = jobs.done
        ? `${n(jobs.total, 'job')} recorded running on time`
        : `${jobs.missing.length} of ${jobs.total} without a successful run within twice their interval: ${jobs.missing.slice(0, 6).join(', ')}${jobs.missing.length > 6 ? ', …' : ''}${serverless ? '; hosted on Vercel they need the database scheduler (pg_cron)' : ''}`;
      return {
        checks: [
          { label: 'Backup key set (CIVICOS_DATA_KEK)', done: kek, href: '/platform' },
          { label: 'Backups go off the server (S3)', done: target === 's3', href: '/platform', detail: `Target: ${target}` },
          { label: 'Scheduled jobs recorded running', done: jobs.done, href: '/gov/crons', detail: jobsDetail },
        ],
        ...(!kek ? { blockedBy: 'CIVICOS_DATA_KEK is not set in the environment, so no backup can be encrypted' } : {}),
      };
    }),

    track({ key: 'updates', title: 'Updates', why: 'How new releases reach this installation: never automatic, each step named, with a restore point and a probation period.', href: '/updates/settings' }, () => {
      const home = nationRecord(HOME_NATION);
      return { checks: [
        { label: 'Deployment agent credential issued (health reports during probation)', done: !!home?.agentCredential, href: '/updates/settings', detail: home?.agentCredential ? `Issued ${home.agentCredential.issuedAt.slice(0, 10)} by ${home.agentCredential.issuedBy}` : undefined },
      ] };
    }),
  ];

  // The legislature's own record (plan phase 7): only when the nation names a legislature (an optional slot).
  const legislature = authorityFor('legislature');
  if (legislature) {
    tracks.push(track({ key: 'legislature', title: 'Legislative record', why: 'The legislature\'s own record of bills, votes, assent and publication, kept by its clerk under the procedure its officials approve; enacted texts enter the laws register from it. Only where the nation names a legislature.', href: '/gov/legislature/procedure' }, () => {
      const active = activeProcedure();
      const signers = listAccounts().filter(a => !a.disabled && a.institution === legislature && a.role === 'signatory').length;
      const published = listBills({ state: 'published' });
      const unsent = published.filter(b => !(b.law ?? []).length);
      return { checks: [
        { label: 'Two officials who can sign at the legislature (the clerk and a second)', done: signers >= 2, href: '/admin/officials', detail: `${signers} at ${legislatureName() ?? 'the legislature'}` },
        { label: 'Legislative procedure approved by the legislature', done: !!active, href: '/gov/legislature/procedure', detail: active ? `Version ${active.version}, approved by ${active.approvedBy} from ${active.activeFrom}` : 'Only the reference ships; the legislature drafts its own and a second official approves it' },
        { label: 'The procedure cites the standing orders (optional)', done: !active || active.basis.length > 0, href: '/gov/legislature/procedure', detail: active ? (active.basis.length ? active.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ') : 'Record the standing orders in the laws register and cite them in the next version') : undefined },
        { label: 'Someone records assent where the procedure asks for it', done: !active?.assent.required || !!authorityFor('headOfState'), href: '/gov/configuration/responsible', detail: active?.assent.required && !authorityFor('headOfState') ? 'No head of state\'s office is named: the clerk records assent as communicated to the chamber' : undefined },
        { label: 'Published acts entered the laws register', done: unsent.length === 0, href: '/gov/legislature', detail: published.length ? `${published.length - unsent.length} of ${published.length}${unsent.length ? ` · not yet sent: ${unsent.slice(0, 4).map(b => b.number).join(', ')}` : ''}` : 'No act published yet' },
      ] };
    }));
  }

  // Independent oversight (plan I8): only when the nation names one of its oversight bodies (optional slots, none named by default).
  const bodies = OVERSIGHT_SLOTS.map(b => ({ ...b, id: authorityFor(b.slot) })).filter(b => !!b.id);
  if (bodies.length) {
    tracks.push(track({ key: 'oversight', title: 'Independent oversight', why: 'Complaints, protected disclosures, audit engagements and data-protection requests, each worked only by the independent body the nation names; findings are recommendations with reasons, evidence is asked for only under an approved relationship, and the person who raised a matter is kept apart from the case. Only where the nation names its oversight bodies.', href: '/gov/oversight', seeded: true }, () => {
      const mine = INDEPENDENT_OVERSIGHT_PROCEDURES.filter(p => bodies.some(b => p.key.startsWith(b.prefix)));
      const approved = mine.filter(p => listPackages({ key: p.key, state: 'approved' }).length);
      const types = [...new Set(Object.entries(OVERSIGHT_PERMITS).filter(([prefix]) => bodies.some(b => b.prefix === prefix)).map(([, t]) => t))];
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const grants = relationshipGrants().filter(g => bodies.some(b => b.id === g.from) && ['audit', 'request_information'].includes(g.type));
      const signers = bodies.map(b => ({ b, n: listAccounts().filter(a => !a.disabled && a.institution === b.id && a.role === 'signatory').length }));
      const c = oversightCounts();
      return { checks: [
        { label: 'Oversight bodies named (Who is responsible)', done: true, href: '/gov/configuration/responsible#who-is-responsible', detail: bodies.map(b => b.label).join(', ') },
        { label: 'Two officials who can sign at each body (its own administrators manage its accounts)', done: signers.every(x => x.n >= 2), href: '/admin/officials', detail: signers.map(x => `${x.b.label}: ${x.n}`).join(' · ') },
        { label: 'Their procedures approved (complaints, disclosures, audit engagements, data-protection requests and investigations)', done: approved.length === mine.length, href: '/gov/law/procedures', detail: `${approved.length} of ${mine.length} approved` },
        { label: 'Who decides each body\'s findings and decisions approved (permit authorities)', done: mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        { label: 'Relationships that let a body ask for evidence or records (audit, request information), approved citing the law', done: grants.length > 0, href: '/gov/configuration/relationships', detail: grants.length ? `${grants.length} in force` : 'None: a body asks no institution for evidence until one is approved' },
        { label: 'Findings issued through decided cases', done: c.issued > 0, href: '/gov/oversight', detail: `${c.findings} finding(s), ${c.issued} issued, ${c.responses} response(s)${c.samples ? ` (${c.samples} samples)` : ''}` },
      ] };
    }));
  }

  // Territory and infrastructure (plan I7): only once the nation names one of its bodies or records a local government.
  const SLOTS: [AuthorityKey, string, { key: string }[], Record<string, string>][] = [
    ['landRegistry', 'Land registry', LAND_PROCEDURES, LAND_PERMITS], ['buildingControl', 'Planning and building control', BUILDING_PROCEDURES, BUILDING_DECISION_PERMITS],
    ['housing', 'Housing authority', HOUSING_PROCEDURES, HOUSING_PERMITS], ['vehicleRegistration', 'Vehicle and driver licensing', TRANSPORT_PROCEDURES.filter(p => !/road-works|operator/.test(p.key)), {}],
    ['roadAuthority', 'Road authority', TRANSPORT_PROCEDURES.filter(p => /road-works/.test(p.key)), {}], ['transportRegulator', 'Transport regulator', TRANSPORT_PROCEDURES.filter(p => /operator/.test(p.key)), {}],
  ];
  const namedSlots = SLOTS.filter(([k]) => !!authorityFor(k));
  const locals = institutionBounds().subnational ?? [];
  if (namedSlots.length || locals.length) {
    tracks.push(track({ key: 'territory', title: 'Territory and infrastructure', why: 'Land dealings and disputes on the parcel register, planning and building control, housing allocations, transport registers, and each local government\'s own resolutions, budgets and services: each worked by the body the nation names, its procedures and rules approved by two officials citing the law.', href: '/gov/land', seeded: true }, () => {
      const rulesPending = buildingRuleChanges().pending;
      if (rulesPending) wait({ what: 'Building control rules: a change waiting for a second official', proposedBy: rulesPending.by, at: rulesPending.at, href: '/gov/building' });
      for (const l of locals) { const pend = councilRuleChanges(l).pending; if (pend) wait({ what: `Council rules of ${getMinistry(l)?.name ?? l}: a change waiting for a second official of that local government`, proposedBy: pend.by, at: pend.at, href: '/gov/local-government' }); }
      const keys = namedSlots.flatMap(([, , ps]) => ps.map(p => p.key));
      const approved = keys.filter(k => listPackages({ key: k, state: 'approved' }).length);
      const types = [...new Set([...namedSlots.flatMap(([, , , m]) => Object.values(m)), ...namedSlots.filter(([k]) => ['vehicleRegistration', 'roadAuthority', 'transportRegulator'].includes(k)).flatMap(() => Object.values(TRANSPORT_PERMITS))])];
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const lc = landCounts(), bc = buildingCounts(), hc = housingCounts(), tc = transportCounts();
      const localAdopted = locals.filter(l => LOCAL_GOVERNMENT_TEMPLATES.every(t => listPackages({ key: localKey(t.key, l), state: 'approved' }).length));
      return { checks: [
        { label: 'Bodies named (Who is responsible)', done: namedSlots.length > 0, href: '/gov/configuration/responsible#who-is-responsible', detail: namedSlots.map(([, label]) => label).join(', ') || 'None named' },
        { label: 'Their procedures approved', done: keys.length > 0 && approved.length === keys.length, href: '/gov/law/procedures', detail: `${approved.length} of ${keys.length} approved` },
        { label: 'Who decides each kind of decision approved (permit authorities)', done: types.length > 0 && mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        ...(authorityFor('landRegistry') ? [{ label: 'The cadastre authority named in the parcel policy', done: !!cadastreAuthority(), href: '/gov/sites/parcels', detail: cadastreAuthority()?.name ?? 'Not named: no parcel is recorded and no right registered' }] : []),
        ...(authorityFor('buildingControl') ? [{ label: 'Building control rules adopted by two officials citing the law', done: !!buildingRules(), href: '/gov/building', detail: buildingRules() ? `Version ${buildingRules()!.version}` : 'None: no planning or building decision until adopted' }] : []),
        ...(locals.length ? [
          { label: 'Each local government has adopted its own procedures', done: localAdopted.length === locals.length, href: '/gov/local-government', detail: `${localAdopted.length} of ${locals.length}` },
          { label: 'Each council\'s rules (seats, quorum, majority) adopted by two of its officials', done: locals.every(l => !!councilRules(l)), href: '/gov/local-government', detail: `${locals.filter(l => !!councilRules(l)).length} of ${locals.length}` },
        ] : []),
        { label: 'Records through decided cases', done: lc.transactions + bc.permits + hc.allocated + tc.vehicles + tc.licences + localCounts().resolutions > 0, href: '/gov/land', detail: `${lc.transactions} land transactions, ${lc.disputes} disputes · ${bc.planning} planning decisions, ${bc.permits} permits · ${hc.allocated} homes allocated · ${tc.vehicles} vehicles, ${tc.licences} licences · ${localCounts().resolutions} resolutions` },
      ] };
    }));
  }

  // Human services (plan I6): one track for each area the nation names a body for (all optional but identity).
  const HUMAN: { slot: AuthorityKey; key: string; title: string; why: string; href: string; procedures: { key: string }[]; permits: Record<string, string>; extra: () => { label: string; done: boolean; href: string; detail?: string }[] }[] = [
    { slot: 'identity', key: 'identity', title: 'National identity', href: '/gov/identity', procedures: IDENTITY_PROCEDURES, permits: IDENTITY_PERMITS,
      why: 'Identity enrolment, credentials and their status, and the resolution of suspected duplicates and misuse, decided by the identity authority\'s officials; others learn only a verification result through identity.verify.',
      extra: () => { const c = identityCounts(); const n = Object.values(c.records).reduce((a, b) => a + b, 0); return [{ label: 'Identities enrolled and credentials delivered through decided cases', done: n > 0 && c.delivered > 0, href: '/gov/identity', detail: `${n} record(s), ${c.delivered} credential(s) delivered${c.samples ? ` (${c.samples} samples)` : ''}` }]; } },
    { slot: 'travelDocuments', key: 'travel-documents', title: 'Passports and travel documents', href: '/gov/passports', procedures: PASSPORT_PROCEDURES, permits: PASSPORT_PERMITS,
      why: 'Applications, the fee from the approved schedule, issuance by two officials, production, custody and collection, and every later status. Only where the nation names its travel document authority.',
      extra: () => [{ label: 'Fee schedule approved (passports.fees, Rates and tariffs)', done: !!ruleInForce(FEE_RULE), href: '/gov/law/rules', detail: ruleInForce(FEE_RULE) ? `version ${ruleInForce(FEE_RULE)!.version}` : 'None: no fee is calculated until one is (an exemption the law gives is recorded instead)' },
        { label: 'Documents issued through decided cases', done: (passportCounts().byState.issued ?? 0) > 0, href: '/gov/passports', detail: JSON.stringify(passportCounts().byState) }] },
    { slot: 'citizenship', key: 'citizenship', title: 'Citizenship determination', href: '/gov/law/procedures', procedures: CITIZENSHIP_PROCEDURES, permits: CITIZENSHIP_PERMITS,
      why: 'Citizenship and nationality applications decided by the competent authority the nation names. Only where its law names one.', extra: () => [] },
    { slot: 'labour', key: 'labour', title: 'Labour and employment', href: '/gov/labour', procedures: LABOUR_PROCEDURES, permits: LABOUR_PERMITS,
      why: 'Employers, employment, employment services, workplace inspections, complaints, injury notifications and mediation, worked by the labour authority. Only where the nation names one.',
      extra: () => { const c = labourCounts(); return [{ label: 'Employers registered through decided cases', done: (c.employers ?? 0) > 0, href: '/gov/labour', detail: `${c.employers ?? 0} employer(s), ${(c.inspectionsOpen ?? 0) + (c.inspectionsClosed ?? 0)} inspection(s)` }]; } },
    { slot: 'socialProtection', key: 'social-protection', title: 'Social protection', href: '/gov/social-protection', procedures: SOCIAL_PROCEDURES, permits: SOCIAL_PERMITS,
      why: 'Benefits calculated only by approved rules and decided by two officials, payment instructions approved by a second official, overpayments and appeals. Only where the nation names its social protection authority.',
      extra: () => { const rules = listRules().filter(r => r.key.startsWith('social.') && r.state === 'approved').length; const c = socialCounts(); return [{ label: 'A programme rule approved (social.<programme>, Rates and tariffs)', done: rules > 0, href: '/gov/law/rules', detail: rules ? `${rules} approved` : 'None: no claim can be assessed until one is' }, { label: 'Claims decided through cases', done: c.claims.some(x => x.state !== 'assessed'), href: '/gov/social-protection', detail: `${c.claimants} claimant(s)` }]; } },
  ];
  for (const h of HUMAN) {
    const id = authorityFor(h.slot);
    if (!id && h.slot !== 'identity') continue;
    tracks.push(track({ key: h.key, title: h.title, why: h.why, href: h.href, seeded: true }, () => {
      const approved = h.procedures.filter(p => listPackages({ key: p.key, state: 'approved' }).length);
      const types = [...new Set(Object.values(h.permits))];
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const signers = id ? listAccounts().filter(a => !a.disabled && a.institution === id && a.role === 'signatory').length : 0;
      return { checks: [
        { label: `${h.title}: the institution named (Who is responsible)`, done: !!id, href: '/gov/configuration#who-is-responsible', ...(id ? {} : { detail: 'Not named: no case opens until it is' }) },
        { label: 'Two officials who can sign there', done: signers >= 2, href: '/admin/officials', detail: `${signers}` },
        { label: 'Its procedures approved', done: approved.length === h.procedures.length, href: '/gov/law/procedures', detail: `${approved.length} of ${h.procedures.length} approved` },
        { label: 'Who decides approved (permit authorities)', done: mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        ...h.extra(),
      ] };
    }));
  }

  // I12: security governance and resilience: only where the nation names one of its bodies (all optional, none named by default).
  const SECURITY_SLOTS: AuthorityKey[] = ['cyberAuthority', 'criticalInfrastructure', 'securityAccreditation', 'nationalSecurity'];
  const secBodies = SECURITY_SLOTS.filter(k => !!authorityFor(k));
  if (secBodies.length) {
    tracks.push(track({ key: 'security', title: 'Security governance and resilience', why: 'National cyber incidents, vulnerability coordination, supplier security, exceptions and exercises; critical infrastructure designations, dependencies, risk and resilience plans; clearance decisions; national security directives. Metadata only: nothing above the installation\'s accreditation is held. Only where the nation names its bodies.', href: '/gov/security/resilience', seeded: true }, () => {
      const mine = SECURITY_PROCEDURES.filter(p => secBodies.includes(SECURITY_SLOT_OF[p.key]!));
      const approved = mine.filter(p => listPackages({ key: p.key, state: 'approved' }).length);
      const types = [...new Set(mine.map(p => SECURITY_PERMITS[p.key]).filter((t): t is string => !!t))];
      const mapped = types.filter(t => listMappings(t).some(m => m.state === 'approved'));
      const signers = secBodies.map(k => ({ k, n: listAccounts().filter(a => !a.disabled && a.institution === authorityFor(k) && a.role === 'signatory').length }));
      const cls = classificationStatus();
      const c = securityCounts();
      return { checks: [
        { label: 'Security bodies named (Who is responsible)', done: true, href: '/gov/configuration/responsible#who-is-responsible', detail: secBodies.join(', ') },
        { label: 'Two officials who can sign at each body', done: signers.every(x => x.n >= 2), href: '/admin/officials', detail: signers.map(x => `${x.k}: ${x.n}`).join(' · ') },
        { label: 'Classification scheme and the installation\'s accreditation adopted by two officials citing the law', done: !!cls.scheme && !!cls.accreditation, href: '/gov/security/resilience', detail: cls.statement },
        { label: 'Their procedures approved', done: mine.length > 0 && approved.length === mine.length, href: '/gov/law/procedures', detail: `${approved.length} of ${mine.length} approved` },
        { label: 'Who decides each kind of decision approved (permit authorities)', done: types.length > 0 && mapped.length === types.length, href: '/gov/law/permit-authorities', detail: `${mapped.length} of ${types.length}: ${types.join(', ')}` },
        { label: 'Records through decided cases', done: c.incident + c.designation + c.clearance > 0, href: '/gov/security/resilience', detail: `${c.incident} incident(s), ${c.vulnerability} vulnerability case(s), ${c.designation} designation(s), ${c.clearance} clearance decision(s)${c.samples ? ` (${c.samples} samples)` : ''}` },
      ] };
    }));
  }
  // I13 (plan step I13): the digital front door and records management. Every installation has services and records.
  tracks.push(track({ key: 'frontdoor', title: 'Public services and records', why: 'The public service catalogue (each service with its owner, legal basis, procedure, forms, fee rule and channels, published by a second official), how citizens prove who they are, each institution\'s own reconsideration, complaint, appointment and refund procedures, and its records classes with the retention schedules its law sets.', href: '/gov/services', seeded: true }, () => {
    for (const w of waitingServices()) wait({ what: w.what, proposedBy: w.by, at: w.at, href: '/gov/services' });
    for (const w of waitingServiceManagement()) wait({ what: w.what, proposedBy: w.by, at: w.at, href: '/gov/services/management' });
    const c = catalogueCounts();
    const ident = identityRoute();
    const inst = active().map(m => m.id);
    const fdApproved = inst.filter(id => FRONTDOOR_PROCEDURES.every(t => listPackages({ key: frontdoorKey(t.key, id), state: 'approved' }).length));
    const recApproved = inst.filter(id => RECORDKEEPING_PROCEDURES.every(t => listPackages({ key: recordkeepingKey(t.key, id), state: 'approved' }).length));
    const r = recordkeepingCounts();
    return { checks: [
      { label: 'Services published in the catalogue (each by a second official)', done: c.published > 0, href: '/gov/services', detail: `${c.published} published, ${c.byStatus.active ?? 0} active, ${c.byStatus.unavailable ?? 0} not available yet${c.samples ? ` (${c.samples} samples)` : ''}` },
      { label: 'Citizens sign in through the nation\'s identity provider (or the lawful alternatives are stated)', done: !!ident.provider, href: '/gov/configuration', detail: ident.statement },
      { label: 'Each institution\'s own appointment, complaint, reconsideration and refund procedures approved', done: inst.length > 0 && fdApproved.length === inst.length, href: '/gov/services', detail: `${fdApproved.length} of ${inst.length} institutions` },
      { label: 'Each institution\'s records procedures approved', done: inst.length > 0 && recApproved.length === inst.length, href: '/gov/records', detail: `${recApproved.length} of ${inst.length} institutions` },
      { label: 'Record classes with retention schedules the law sets (none ships; nothing is disposed of without one)', done: r.scheduled > 0, href: '/gov/records', detail: `${r.scheduled} class(es) scheduled · ${r.holdsInForce} hold(s) in force` },
      { label: 'The archive named (Who is responsible), if records are transferred', done: !!authorityFor('archives'), href: '/gov/configuration#who-is-responsible', detail: authorityFor('archives') ? getMinistry(authorityFor('archives')!)?.name ?? '' : 'Not named: records whose schedule ends in transfer stay with their institution' },
    ] };
  }));

  if (samplesAllowed(env)) {
    tracks.push(track({ key: 'demo', title: 'Demonstration', why: 'Sample officials and records to try every feature. Only in demo and training installations; never in production.', href: '/admin/onboarding#demo', samplesOnly: true }, () => ({
      checks: [
        { label: 'Demo cast created (switch officials from the menu)', done: listAccounts().some(a => a.demo && !a.disabled), href: '/admin/officials', detail: 'Administrators create it from the account menu: Demo cast' },
        { label: 'Cases to work on', done: listCases({ limit: 1 }).length > 0, href: '/gov/work' },
      ],
    })));
  }

  // Changes to the constitutional configuration waiting for a second official (plan phases 1–2).
  const safe = (f: () => void) => { try { f(); } catch { /* a store that cannot be read adds nothing */ } };
  safe(() => { const p = authorityChanges().pending; if (p) wait({ what: 'Who is responsible: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/responsible' }); });
  safe(() => { for (const t of waitingInstitutionTerms()) wait({ what: `${t.name}: a change to its standing waiting for confirmation`, proposedBy: t.pending.by, at: t.pending.at, href: '/ministries' }); });
  safe(() => { for (const r of waitingRelationships()) wait({ what: `Relationship: ${r.what} (waiting for confirmation)`, proposedBy: r.by, at: r.at, href: '/gov/configuration/relationships' }); });
  safe(() => { for (const c of waitingAccountChanges())wait({ what: `${c.summary} (waiting for the institution to confirm)`, proposedBy: c.by, at: c.at, href: '/admin/officials' }); });
  safe(() => { for (const o of waitingOffices()) wait({ what: `Office: ${o.title} — a change waiting for a second official`, proposedBy: o.pending.by, at: o.pending.at, href: '/gov/configuration/offices' }); });
  safe(() => { for (const p of waitingProfileSteps()) wait({ what: p.what, proposedBy: p.by, at: p.at, href: '/gov/configuration/constitution' }); });
  safe(() => { for (const r of waitingReleases()) wait({ what: `Form release: ${r.key} version ${r.version} waiting for a second official`, proposedBy: r.by, at: r.at, href: '/gov/law/procedures/forms' }); });
  safe(() => { const p = constitutionOverview().process.changes.pending; if (p) wait({ what: 'Steps for changing the constitutional profile: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/constitution' }); });
  safe(() => { const p = editionChanges().pending; if (p) wait({ what: 'Institutional Edition: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/edition' }); });
  safe(() => { for (const x of listExports()) if (x.state === 'proposed') wait({ what: `Export of ${listMinistries().find(m => m.id === x.institution)?.name ?? x.institution}: waiting for an official who can sign there`, proposedBy: x.by, at: x.at, href: `/gov/configuration/edition?institution=${encodeURIComponent(x.institution)}#export` }); });
  safe(() => { for (const x of listImports()) if (x.state === 'proposed') wait({ what: `Import of ${x.institutionName}'s export ${x.exportId}: waiting for a second administrator`, proposedBy: x.by, at: x.at, href: '/gov/configuration/edition#export' }); });
  safe(() => { const p = classificationChanges().pending; if (p) wait({ what: 'Classification of the state: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/offices' }); });
  // I12: the security classification scheme and the installation's accreditation.
  safe(() => { const p = securityClassificationChanges().pending; if (p) wait({ what: 'Security classification scheme and accreditation: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/security/resilience' }); });
  safe(() => { for (const w of waitingLegislative()) wait({ what: w.what, proposedBy: w.by, at: w.at, href: w.href }); });
  safe(() => {
    for (const i of listInstruments({ state: 'any' })) for (const v of i.versions) {
      if (v.state === 'recorded' && v.source.kind === 'legislature') wait({ what: `${i.title}: enacted text from the legislature waiting for the law-register authority to confirm`, proposedBy: v.recordedBy, at: v.at, href: '/gov/law' });
    }
  });
  safe(() => { for (const t of waitingTransitions()) wait({ what: `${t.what} — waiting for a second official`, proposedBy: t.by, at: t.at, href: '/gov/configuration/transitions' }); });
  safe(() => { for (const w of waitingSealKeys()) if (!/review/.test(w.what) || w.overdue) wait({ what: w.what, proposedBy: w.by, at: w.at, href: '/gov/configuration/seal-keys' }); });
  safe(() => { for (const h of waitingHoldings()) wait({ what: `${h.holderName} to hold an office — waiting for a second official`, proposedBy: h.proposedBy, at: h.proposedAt, href: '/gov/configuration/offices' }); });
  safe(() => { for (const d of waitingDepartmentChanges()) wait({ what: `Departments: ${d.what} — waiting for a second official`, proposedBy: d.pending.by, at: d.pending.at, href: `/gov/institutions/departments?institution=${d.id}` }); });

  waiting.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  // Completeness per institution (plan I2): read from the records, never a score.
  const institutions: OnboardingStatus['institutions'] = [];
  safe(() => { for (const m of active()) { const c = institutionCompleteness(m.id); if (c) institutions.push({ id: m.id, name: m.name, counts: c.counts, failing: c.gate.failing, gateApplies: c.gate.applies }); } });
  return { mode: installationMode(env), tracks, done: tracks.filter(t => t.state === 'done').length, total: tracks.length, waiting, institutions };
}
