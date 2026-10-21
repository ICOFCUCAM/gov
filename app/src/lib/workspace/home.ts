// Where an official's day starts (docs/CONSTITUTIONAL_ARCHITECTURE.md §6;
// plan phase 4; audit F). The greeting names the signed-in official and the
// office they hold (or their account's office), never the nation's executive
// title for everyone; the home destination follows the standing of the
// official's institution: the legislature to its workspace and the chamber,
// a court to its workspace and the cause list, the head of state's office and
// independent bodies to their own workspace, the executive to the Command
// Center (which stays the executive's home). Pure: the welcome page and the
// tests share it. What the official may do is still only lib/auth/roles.ts.

import type { InstitutionStanding } from '@/lib/api/types';
import type { Boundaries } from '@/lib/auth/roles';

export interface HomeOfficial {
  name: string;
  office?: string;
  institution?: string;
  institutionName?: string;
  standing?: InstitutionStanding;
  bounds?: Boundaries;
  heldOffices?: { id: string; title: string; kind: string; acting?: boolean }[];
}

export interface Destination { href: string; t: string; s: string; k: string }

/** The branch an official's home belongs to. */
export type HomeKind = 'executive' | 'whole-government' | 'legislature' | 'judiciary' | 'head-of-state' | 'independent' | 'subnational';

/** The name a greeting uses: the official's own. */
export const greetingName = (o: Pick<HomeOfficial, 'name'>): string => o.name;

/** The office line under a greeting: offices held (acting marked), else the account's office, else the institution. */
export function officeLine(o: HomeOfficial): string {
  const held = (o.heldOffices ?? []).map(h => (h.acting ? `Acting ${h.title}` : h.title));
  if (held.length) return held.join(' · ');
  return o.office?.trim() || o.institutionName || (o.institution ? o.institution : 'Whole government');
}

/** Which home an official has, from their institution's standing (and the slots that make it independent or a court). */
export function homeKind(o: HomeOfficial | null): HomeKind {
  if (!o || !o.institution) return 'whole-government';
  const id = o.institution;
  if (o.standing === 'legislature') return 'legislature';
  if (o.standing === 'judiciary' || o.bounds?.judicial.includes(id)) return 'judiciary';
  if (o.standing === 'head-of-state') return 'head-of-state';
  if (o.standing === 'independent-constitutional' || o.standing === 'independent-statutory' || o.bounds?.independent.includes(id)) return 'independent';
  if (o.standing === 'subnational' || o.standing === 'customary-or-religious') return 'subnational';
  return 'executive';
}

const COMMAND: Destination = { href: '/command', t: 'Sovereign Command Center', s: 'Whole-of-government status, pages and directory', k: 'Enter' };
const SITUATION: Destination = { href: '/gov/situation-room', t: 'National Situation Room', s: 'Real-time command and coordination', k: 'Live' };
const CABINET: Destination = { href: '/gov', t: 'Cabinet Intelligence', s: 'Cabinet session, directives and briefings', k: 'Cabinet' };
const ADMIN: Destination = { href: '/ministries', t: 'Institutions Admin', s: 'Compose, charter and govern institutions', k: 'Admin' };
const WORKSPACE: Destination = { href: '/gov/workspace', t: 'My workspace', s: 'Your office, your work and what waits for you', k: 'Mine' };
const WORK: Destination = { href: '/gov/work', t: 'My work', s: 'Cases, queues and decisions you may see', k: 'Work' };

/**
 * The destinations on the welcome page, the first being the primary one.
 * `institutionPath`: arrived through the cover's New institution entry.
 */
export function homeDestinations(o: HomeOfficial | null, opts: { institutionPath?: boolean; chamber?: string } = {}): Destination[] {
  const kind = homeKind(o);
  const own: Destination | null = o?.institution
    ? { href: `/gov/ministry/${encodeURIComponent(o.institution)}`, t: o.institutionName ?? 'Institution workspace', s: 'Your institution\'s workspace: its queue, records and services', k: 'Enter' }
    : null;
  let list: Destination[];
  switch (kind) {
    case 'legislature':
      list = [own!, { href: '/gov/legislature', t: 'Bills and votes', s: 'The record the clerk keeps: bills, stages, votes, assent and publication', k: 'Record' },
        { href: '/gov/branch/legislature', t: 'Legislature', s: 'The branch, its chambers and committees', k: 'Branch' },
        { href: '/assembly', t: opts.chamber ?? 'Chamber', s: 'The chamber\'s public site', k: 'Public' }, WORKSPACE];
      break;
    case 'judiciary':
      list = [own!, { href: '/courts/cause-list', t: 'Cause list', s: 'Hearings listed in public, without parties', k: 'Courts' },
        { href: '/gov/branch/judiciary', t: 'Judiciary', s: 'The courts and their administration', k: 'Branch' }, WORKSPACE];
      break;
    case 'head-of-state':
      list = [own!, { href: '/gov/branches', t: 'Branches of government', s: 'The branches the constitution sets up', k: 'Branches' }, WORKSPACE];
      break;
    case 'independent':
    case 'subnational':
      list = [own!, WORKSPACE, WORK];
      break;
    case 'executive':
      list = [COMMAND, own!, WORKSPACE, SITUATION];
      break;
    default:
      list = [COMMAND, SITUATION, CABINET, ADMIN, ...(o ? [WORKSPACE] : [])];
  }
  if (opts.institutionPath && (kind === 'whole-government' || kind === 'executive')) {
    const i = list.findIndex(d => d.href === '/ministries');
    const inst = i >= 0 ? list.splice(i, 1)[0]! : ADMIN;
    list.unshift({ ...inst, t: 'Charter a new institution', k: 'Start' });
  }
  return list;
}
