// Navigation by permission (plan step I10; specification Part 6 §C: "Do not
// display navigation items merely because they exist in the code. Navigation
// should reflect the user's assigned permissions, while the backend
// independently enforces the same restrictions."). The menu is walked for
// every kind of official — administrator, can sign, officer, auditor; one
// institution or the whole government; an independent institution, a regional
// government, the data-protection authority, a permit-keeping and a pilot
// institution — and each page rule is checked against the route it mirrors.
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONSOLE_NAV, PAGE_GROUNDS, navFor, pageRefusal, type NavContext } from './console-nav';
import {
  apiPermission, adminOnly, installationAdmin, canSeeOnboarding, canReadAccessLog, canReadAuditChain, canReadPermits,
  canSeePilotGate, ministryPermission, type Scope, type Boundaries,
} from '@/lib/auth/roles';

const API = path.resolve(__dirname, '../../app/api');
const CTX: NavContext = { dataProtection: 'dpa', permitHolders: ['min-lands'], pilot: ['min-health'] };
const bounds: Boundaries = { independent: ['court-1', 'dpa'], judicial: ['court-1'], subnational: ['county-1'] };

/** Every kind of official the rules distinguish. */
const SCOPES: Record<string, Scope> = {
  'administrator, whole government': { role: 'administrator', bounds },
  'administrator, one institution': { role: 'administrator', institution: 'min-health', bounds },
  'can sign, one institution': { role: 'signatory', institution: 'min-health', bounds },
  'officer, one institution': { role: 'officer', institution: 'min-education', bounds },
  'officer, whole government': { role: 'officer', bounds },
  'can sign, whole government': { role: 'signatory', bounds },
  'auditor, whole government': { role: 'auditor', bounds },
  'auditor, one institution': { role: 'auditor', institution: 'min-health', bounds },
  'can sign, independent institution (a court)': { role: 'signatory', institution: 'court-1', bounds },
  'officer, data-protection authority': { role: 'officer', institution: 'dpa', bounds },
  'administrator, regional government': { role: 'administrator', institution: 'county-1', bounds },
  'officer, permit-keeping institution': { role: 'officer', institution: 'min-lands', bounds },
};

const allTabs = CONSOLE_NAV.flatMap(s => s.items.flatMap(i => i.tabs.map(t => t.href)));
const visible = (s: Scope) => new Set(navFor(s, CTX).flatMap(sec => sec.items.flatMap(i => i.tabs.map(t => t.href))));

/** The function each grounded rule names, called as the route calls it. */
const RULES: Record<string, (s: Scope, href: string) => string | null> = {
  adminOnly: s => adminOnly(s),
  installationAdmin: s => installationAdmin(s),
  canSeeOnboarding: s => canSeeOnboarding(s),
  canReadAccessLog: s => canReadAccessLog(s, CTX.dataProtection ?? undefined),
  canReadAuditChain: s => canReadAuditChain(s, CTX.dataProtection ?? undefined),
  canReadPermits: s => canReadPermits(s, CTX.permitHolders!),
  canSeePilotGate: s => canSeePilotGate(s, CTX.pilot!),
  ministryPermission: s => ministryPermission(s, s.institution ?? 'min-health'),
};

/** The route file of an API path (`:own` and `[id]` segments match any dynamic folder). */
function routeFile(api: string): string {
  let dir = API;
  for (const seg of api.replace(/^\/api\//, '').split('/')) {
    const next = seg.startsWith(':') ? fs.readdirSync(dir).find(d => /^\[.+\]$/.test(d)) : seg;
    dir = path.join(dir, next ?? seg);
  }
  return path.join(dir, 'route.ts');
}
/** The guard at the top of a route's handler for `method` (the first refusal()/readRefusal() call), or ''. */
function guard(file: string, method: 'GET' | 'POST'): string {
  const t = fs.readFileSync(file, 'utf8');
  const i = t.search(new RegExp(`export (?:async )?function ${method}\\b|export const ${method}\\b`));
  if (i < 0) return '';
  const rest = t.slice(i + 10);
  const body = rest.slice(0, Math.max(0, rest.search(/\nexport /)) || rest.length).split('\n').slice(0, 8).join('\n');
  return /(?:readRefusal|refusal)\(([^;]*)\);/.exec(body)?.[1] ?? '';
}

describe('navigation by permission (plan I10)', () => {
  it('shows every official exactly the pages the rules let them use, and every one of those', () => {
    for (const [who, s] of Object.entries(SCOPES)) {
      const seen = visible(s);
      const permitted = allTabs.filter(h => !pageRefusal(s, h, CTX));
      expect([...seen].filter(h => pageRefusal(s, h, CTX)), `${who}: shown but refused`).toEqual([]);
      expect(permitted.filter(h => !seen.has(h)), `${who}: permitted but not reachable from the menu`).toEqual([]);
      for (const i of navFor(s, CTX).flatMap(sec => sec.items)) expect(i.tabs.some(t => t.href === i.href), `${who}: ${i.key} opens on a tab it shows`).toBe(true);
    }
  });

  it('matches each page rule to the route it mirrors, for every kind of official', () => {
    for (const [href, g] of Object.entries(PAGE_GROUNDS)) {
      expect(RULES[g.rule], `${href}: rule ${g.rule}`).toBeTruthy();
      const api = (g.reads ?? g.changes)!;
      const file = routeFile(api);
      expect(fs.existsSync(file), `${href}: ${file}`).toBe(true);
      if (g.reads && !g.narrower) expect(guard(file, 'GET'), `${href}: GET ${api} applies ${g.rule}`).toContain(g.rule);
      for (const [who, s] of Object.entries(SCOPES)) {
        const nav = !!pageRefusal(s, href, CTX);
        const server = !!RULES[g.rule]!(s, href);
        if (g.narrower) { if (server) expect(nav, `${who} on ${href}: the route refuses, so the menu does too`).toBe(true); }
        else expect(nav, `${who} on ${href}: the menu and ${g.rule} agree`).toBe(server);
      }
      if (g.narrower) expect(g.narrower.length, href).toBeGreaterThan(60);
    }
    // A change-page's rule is the middleware's own for its route (apiPermission), whatever function it is written with.
    for (const [href, g] of Object.entries(PAGE_GROUNDS)) {
      if (!g.changes || g.narrower) continue;
      for (const [who, s] of Object.entries(SCOPES)) {
        const path = g.changes.replace(':own', s.institution ?? 'min-health');
        expect(!!pageRefusal(s, href, CTX), `${who} on ${href}: POST ${path}`).toBe(!!apiPermission(s, 'POST', path));
      }
    }
  });

  it('accounts for every read the routes refuse as a whole: a menu page\'s rule, or a reason it is not one', () => {
    // Routes whose GET refuses before reading anything (scanned), and why no menu page hides on them.
    const NOT_A_PAGE: Record<string, string> = {
      '/api/org/ministries/[id]/administration': 'The page asks for one institution at a time and offers only those the official reaches (canReadAdministration per institution).',
      '/api/org/ministries/[id]/capabilities': 'Per institution, chosen on the page (canReadAdministration).',
      '/api/org/ministries/[id]/completeness': 'Per institution, chosen on the page (canReadAdministration).',
      '/api/org/ministries/[id]/departments': 'Per institution, chosen on the page (canReadAdministration).',
      '/api/org/ministries/[id]/departments/[deptId]': 'One department of one institution.',
      '/api/org/ministries/[id]/export': 'An institution\'s export, from its configuration page; per institution.',
      '/api/org/ministries/[id]/export/[exportId]': 'Downloading one sealed export.',
      '/api/org/ministries/[id]/queue/feeds': 'A ministry\'s connected case systems, on its own workspace.',
      '/api/org/ministries/[id]/queue/feeds/[feedId]/signing-key': 'One connected case system\'s key.',
      '/api/org/ministries/[id]/queue/import': 'Earlier loads of one institution, on Load cases (whose rule is the change).',
      '/api/permits/[id]': 'One permit, opened from the permit list.',
      '/api/platform/institution-import': 'An installation administrator\'s panel on the Institutional Edition page; the page itself is for every official.',
    };
    const grounded = new Set(Object.values(PAGE_GROUNDS).map(g => g.reads).filter(Boolean));
    const guarded: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'route.ts' && guard(p, 'GET')) guarded.push('/api/' + path.relative(API, d).split(path.sep).join('/')); } };
    walk(API);
    expect(guarded.length).toBeGreaterThan(10);
    expect(guarded.filter(a => !grounded.has(a) && !NOT_A_PAGE[a])).toEqual([]);
    expect(Object.keys(NOT_A_PAGE).filter(a => !guarded.includes(a))).toEqual([]);
  });

  it('gives each kind of official the menu its work needs', () => {
    const of = (who: string) => visible(SCOPES[who]!);
    // Accounts, setup and messaging: administrators. Installation operations: those serving the whole government.
    expect(of('administrator, whole government').has('/admin/officials')).toBe(true);
    expect(of('administrator, whole government').has('/platform')).toBe(true);
    expect(of('administrator, one institution').has('/admin/officials')).toBe(true);
    expect(of('administrator, one institution').has('/platform')).toBe(false);
    expect(of('administrator, regional government').has('/admin/releases')).toBe(false);
    for (const who of ['can sign, one institution', 'officer, one institution', 'auditor, whole government']) {
      expect(of(who).has('/admin/officials'), who).toBe(false);
      expect(of(who).has('/setup'), who).toBe(false);
    }
    // The access log and the audit chain: auditors and the data-protection authority, never administrators by their role.
    expect(of('auditor, whole government').has('/gov/access-log')).toBe(true);
    expect(of('officer, data-protection authority').has('/gov/audit')).toBe(true);
    expect(of('administrator, whole government').has('/gov/access-log')).toBe(false);
    expect(of('officer, one institution').has('/gov/access-log')).toBe(false);
    expect(of('can sign, independent institution (a court)').has('/gov/audit')).toBe(false);
    // Auditors read and never change.
    for (const h of ['/gov/work/cases', '/gov/sites/capture']) expect(of('auditor, one institution').has(h), h).toBe(false);
    // Permits: their keepers, the whole government and auditors. The pilot's gate: the pilot institutions, administrators, auditors and the whole government.
    expect(of('officer, permit-keeping institution').has('/console')).toBe(true);
    expect(of('officer, one institution').has('/console')).toBe(false);
    expect(of('officer, whole government').has('/console')).toBe(true);
    expect(of('can sign, one institution').has('/gov/health-regulation/pilot')).toBe(true);
    expect(of('officer, one institution').has('/gov/health-regulation/pilot')).toBe(false);
    // An independent institution's officials keep their own work, internal administration and help.
    for (const h of ['/gov/work', '/gov/institutions/administration', '/gov/help', '/gov/help/states']) expect(of('can sign, independent institution (a court)').has(h), h).toBe(true);
  });

  it('keeps every page reachable for someone, and shows the whole menu when nobody is signed in', () => {
    const reach = new Set(Object.values(SCOPES).flatMap(s => [...visible(s)]));
    expect(allTabs.filter(h => !reach.has(h))).toEqual([]);
    expect(navFor(null, CTX)).toBe(CONSOLE_NAV);
    // Without the institutions the rules name, a page stays shown and the server decides (never a guess).
    expect(pageRefusal({ role: 'officer', institution: 'x' }, '/console')).toBeNull();
    expect(pageRefusal({ role: 'officer', institution: 'x' }, '/gov/health-regulation/pilot')).toBeNull();
  });
});
