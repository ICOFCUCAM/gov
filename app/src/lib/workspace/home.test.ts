// Home per branch (plan phase 4; audit F): the greeting names the signed-in
// official and their office, never the nation's executive title; the primary
// destination follows the standing of the official's institution, and the
// Command Center stays the executive's home.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homeDestinations, homeKind, officeLine, greetingName, type HomeOfficial } from './home';

const bounds = { independent: ['parl', 'court', 'audit', 'dpa'], judicial: ['court'] };
const who = (x: Partial<HomeOfficial>): HomeOfficial => ({ name: 'A. Official', bounds, ...x });

describe('home per branch', () => {
  it('keeps the Command Center first for the whole government and anyone not signed in, as before', () => {
    expect(homeDestinations(null).map(d => d.href)).toEqual(['/command', '/gov/situation-room', '/gov', '/ministries']);
    expect(homeDestinations(who({}))[0]!.href).toBe('/command');
    expect(homeKind(who({}))).toBe('whole-government');
    // Through the New institution entry, chartering comes first, as before.
    expect(homeDestinations(null, { institutionPath: true })[0]).toMatchObject({ href: '/ministries', t: 'Charter a new institution' });
  });

  it('sends the executive to the Command Center, with its own ministry next', () => {
    const d = homeDestinations(who({ institution: 'health', institutionName: 'Ministry of Health', standing: 'executive-ministry' }));
    expect(d.map(x => x.href)).toEqual(['/command', '/gov/ministry/health', '/gov/workspace', '/gov/situation-room']);
  });

  it('sends the legislature to its workspace and the chamber', () => {
    const o = who({ institution: 'parl', institutionName: 'National Assembly', standing: 'legislature' });
    expect(homeKind(o)).toBe('legislature');
    const d = homeDestinations(o, { chamber: 'National Assembly' });
    expect(d[0]).toMatchObject({ href: '/gov/ministry/parl', t: 'National Assembly' });
    expect(d.map(x => x.href)).toEqual(expect.arrayContaining(['/gov/branch/legislature', '/assembly', '/gov/workspace']));
    expect(d.map(x => x.href)).not.toContain('/command');
  });

  it('sends a court to its workspace and the cause list, by standing or by being named for the judiciary', () => {
    for (const o of [who({ institution: 'court', standing: 'judiciary' }), who({ institution: 'court', standing: 'executive-ministry' })]) {
      expect(homeKind(o)).toBe('judiciary');
      const d = homeDestinations(o);
      expect(d[0]!.href).toBe('/gov/ministry/court');
      expect(d.map(x => x.href)).toContain('/courts/cause-list');
      expect(d.map(x => x.href)).not.toContain('/command');
    }
  });

  it('sends the head of state\'s office and independent bodies to their own workspace', () => {
    expect(homeDestinations(who({ institution: 'hos', standing: 'head-of-state' }))[0]!.href).toBe('/gov/ministry/hos');
    for (const o of [who({ institution: 'audit', standing: 'independent-constitutional' }), who({ institution: 'dpa', standing: 'executive-agency' })]) {
      expect(homeKind(o)).toBe('independent');
      const d = homeDestinations(o);
      expect(d[0]!.href).toBe(`/gov/ministry/${o.institution}`);
      expect(d.map(x => x.href)).toContain('/gov/workspace');
      expect(d.map(x => x.href)).not.toContain('/command');
    }
  });

  it('greets the official by name and office (held offices first, acting marked), never by the executive title', () => {
    expect(greetingName(who({}))).toBe('A. Official');
    expect(officeLine(who({ office: 'Registrar' }))).toBe('Registrar');
    expect(officeLine(who({ office: 'Clerk', heldOffices: [{ id: 's', title: 'Speaker', kind: 'presiding-officer', acting: true }] }))).toBe('Acting Speaker');
    expect(officeLine(who({ institution: 'x', institutionName: 'Treasury' }))).toBe('Treasury');
    expect(officeLine(who({}))).toBe('Whole government');
    const src = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
    for (const f of ['components/features/onboarding/Welcome.tsx', 'app/(command)/command/page.tsx', 'components/ui/ExecutiveMenu.tsx', 'components/ui/CommandShell.tsx']) {
      expect(src(f), f).not.toMatch(/(Welcome back|Good morning|title)[^\n]{0,40}executiveTitle/);
      expect(src(f), f).not.toMatch(/'Head of Government'/);
    }
  });
});
