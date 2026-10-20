// Where the installation stands in setting itself up (/admin/onboarding):
// one reader over the systems that already hold each step, never a second
// copy of them. Each track lists its checks with the page that does the work;
// a track is done when every check is, blocked when the environment stops it.
// Changes waiting for a second official are gathered from every store that
// keeps them, so whoever opens the page can confirm what someone else began.
// Read-only: nothing here changes a record.

import { AUTHORITIES } from '@/lib/nation/deployment';
import { authorityFor, getSetup, getSovereign } from '@/lib/data/store/sovereign';
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

    track({ key: 'institutions', title: 'Institutions and who is responsible', why: 'Which institution is legally responsible for each register and power. Cases and registers refuse work until this is named.', href: '/gov/configuration#who-is-responsible' }, () => {
      const ids = new Set(active().map(m => m.id));
      const named = AUTHORITIES.filter(a => { const id = authorityFor(a.key); return id !== undefined && ids.has(id); });
      return { checks: [
        { label: 'Institutions created', done: ids.size > 0, href: '/gov/configuration', detail: n(ids.size, 'active institution') },
        { label: 'Every responsibility assigned to an active institution', done: named.length === AUTHORITIES.length, href: '/gov/configuration#who-is-responsible', detail: `${named.length} of ${AUTHORITIES.length}${named.length < AUTHORITIES.length ? ` · missing: ${AUTHORITIES.filter(a => !named.includes(a)).map(a => a.label).join(', ')}` : ''}` },
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
        { label: 'Every approved procedure has a responsible institution', done: approved.length > 0 && unowned.length === 0, href: '/gov/configuration#who-is-responsible', detail: unowned.length ? `No institution for: ${unowned.map(p => p.title).join(', ').slice(0, 200)}` : undefined },
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
      return {
        checks: [
          { label: 'Backup key set (CIVICOS_DATA_KEK)', done: kek, href: '/platform' },
          { label: 'Backups go off the server (S3)', done: target === 's3', href: '/platform', detail: `Target: ${target}` },
          // No run history is kept for scheduled jobs yet, so the platform cannot say they run: never shown as done until it can.
          { label: 'Scheduled jobs recorded running', done: false, href: '/gov/crons', detail: `Not yet checkable: the platform keeps no run history for its scheduled jobs${serverless ? '; hosted on Vercel they also need the database scheduler (pg_cron)' : ''}` },
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

  waiting.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  return { mode: installationMode(env), tracks, done: tracks.filter(t => t.state === 'done').length, total: tracks.length, waiting };
}
