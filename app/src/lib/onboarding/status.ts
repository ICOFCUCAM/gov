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
import { smallCellRule, smallCellChanges } from '@/lib/health/small-cells';
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

export type TrackState = 'done' | 'in-progress' | 'not-started' | 'blocked';
export interface Check { label: string; done: boolean; href: string; detail?: string }
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
}
export interface Waiting { what: string; proposedBy: string; at?: string; href: string }
export interface OnboardingStatus {
  mode: string;
  tracks: Track[];
  done: number;
  total: number;
  waiting: Waiting[];
}

const stateOf = (checks: Check[], blockedBy?: string): TrackState =>
  blockedBy ? 'blocked' : checks.every(c => c.done) ? 'done' : checks.some(c => c.done) ? 'in-progress' : 'not-started';

/** One track, read defensively: a store that cannot be read shows as a check not done, never breaks the page. */
function track(t: Omit<Track, 'state' | 'checks' | 'blockedBy' | 'samplesCounted'> & { seeded?: boolean }, read: () => { checks: Check[]; blockedBy?: string }): Track {
  let r: { checks: Check[]; blockedBy?: string };
  try { r = read(); } catch (e) { r = { checks: [{ label: 'Could not be read', done: false, href: t.href, detail: (e as Error).message.slice(0, 200) }] }; }
  const { seeded, ...rest } = t;
  return { ...rest, ...r, state: stateOf(r.checks, r.blockedBy), ...(seeded && samplesAllowed() ? { samplesCounted: true } : {}) };
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
        { label: 'First-run setup launched', done: getSetup() !== null, href: '/setup' },
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

    track({ key: 'exchange', title: 'Data sharing', why: 'Other systems and institutions reach records only through approved services, for an approved purpose, agreed by the data\'s owners.', href: '/integrations', seeded: true }, () => {
      const ints = listIntegrations();
      for (const i of ints) if (i.pendingApproval) wait({ what: `Data sharing: ${i.name}`, proposedBy: i.pendingApproval.by, at: i.pendingApproval.at, href: '/integrations' });
      return { checks: [
        { label: 'Integrations registered', done: ints.length > 0, href: '/integrations', detail: n(ints.length, 'integration') },
        { label: 'Integrations approved by two officials', done: ints.some(i => i.status === 'approved'), href: '/integrations' },
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
  safe(() => { for (const w of waitingLegislative()) wait({ what: w.what, proposedBy: w.by, at: w.at, href: w.href }); });
  safe(() => {
    for (const i of listInstruments({ state: 'any' })) for (const v of i.versions) {
      if (v.state === 'recorded' && v.source.kind === 'legislature') wait({ what: `${i.title}: enacted text from the legislature waiting for the law-register authority to confirm`, proposedBy: v.recordedBy, at: v.at, href: '/gov/law' });
    }
  });
  safe(() => { for (const t of waitingTransitions()) wait({ what: `${t.what} — waiting for a second official`, proposedBy: t.by, at: t.at, href: '/gov/configuration/transitions' }); });
  safe(() => { for (const w of waitingSealKeys()) if (!/review/.test(w.what) || w.overdue) wait({ what: w.what, proposedBy: w.by, at: w.at, href: '/gov/configuration/seal-keys' }); });
  safe(() => { for (const h of waitingHoldings()) wait({ what: `${h.holderName} to hold an office — waiting for a second official`, proposedBy: h.proposedBy, at: h.proposedAt, href: '/gov/configuration/offices' }); });

  waiting.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  return { mode: installationMode(env), tracks, done: tracks.filter(t => t.state === 'done').length, total: tracks.length, waiting };
}
