// Where the installation stands in setting itself up (/admin/onboarding):
// one reader over the systems that already hold each step, never a second
// copy of them. Each track lists its checks with the page that does the work;
// a track is done when every check is, blocked when the environment stops it.
// Changes waiting for a second official are gathered from every store that
// keeps them, so whoever opens the page can confirm what someone else began.
// Read-only: nothing here changes a record.

import { AUTHORITIES, REQUIRED_AUTHORITIES } from '@/lib/nation/deployment';
import { authorityFor, getSetup, getSovereign, authorityChanges, classificationChanges } from '@/lib/data/store/sovereign';
import { waitingInstitutionTerms } from '@/lib/data/store/institutions';
import { listRelationships, waitingRelationships } from '@/lib/data/store/relationships';
import { waitingAccountChanges } from '@/lib/auth/account-changes';
import { listOffices, waitingOffices, waitingHoldings } from '@/lib/nation/office-register';
import { constitutionOverview, waitingProfileSteps } from '@/lib/constitution/profile';
import { listMinistries } from '@/lib/data/store/ministries';
import { listAccounts, twoStepPolicy } from '@/lib/auth/officials';
import { listInstruments } from '@/lib/law/register';
import { listMappings } from '@/lib/permits/authority';
import { suspensionPolicy } from '@/lib/permits/authority';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import { listRules } from '@/lib/law/rules';
import { registerTypes, listOrganisations } from '@/lib/organisations/register';
import { professions, disclosureChanges } from '@/lib/professions/register';
import { listIntegrations } from '@/lib/data/store/federation';
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
      const bodies = AUTHORITIES.filter(a => a.optional && authorityFor(a.key) !== undefined);
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
  safe(() => { const p = constitutionOverview().process.changes.pending; if (p) wait({ what: 'Steps for changing the constitutional profile: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/constitution' }); });
  safe(() => { const p = classificationChanges().pending; if (p) wait({ what: 'Classification of the state: a change waiting for a second official', proposedBy: p.by, at: p.at, href: '/gov/configuration/offices' }); });
  safe(() => { for (const h of waitingHoldings()) wait({ what: `${h.holderName} to hold an office — waiting for a second official`, proposedBy: h.proposedBy, at: h.proposedAt, href: '/gov/configuration/offices' }); });

  waiting.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  return { mode: installationMode(env), tracks, done: tracks.filter(t => t.state === 'done').length, total: tracks.length, waiting };
}
