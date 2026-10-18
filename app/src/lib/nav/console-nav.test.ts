import { describe, it, expect } from 'vitest';
import routes from '@/app/route-lock.json';
import { CONSOLE_NAV, ALL_ITEMS, HEADER_LINKS, locate } from './console-nav';
import { GLOSSARY } from './glossary';

// Every page the console menu linked to before the plain-language menu (60 links).
const EARLIER_MENU = ['/admin/officials','/audit','/console','/control','/gov','/gov/accountability','/gov/activity','/gov/alerts','/gov/audit','/gov/audit-replay','/gov/branches','/gov/charter','/gov/configuration','/gov/constitutional','/gov/coordination','/gov/crons','/gov/directives','/gov/directory','/gov/dispatches','/gov/escalations','/gov/fabric','/gov/federation','/gov/geopolitical','/gov/global','/gov/help','/gov/home','/gov/inbox','/gov/intake','/gov/ledger','/gov/live','/gov/map','/gov/me','/gov/officers','/gov/officers/bulk','/gov/playground','/gov/posture','/gov/regional','/gov/registry','/gov/search','/gov/security','/gov/shell','/gov/signatures','/gov/simulation','/gov/situation-room','/gov/substrate','/gov/telemetry','/gov/treasury','/gov/twin','/gov/watchlist','/gov/webhooks','/gov/witnesses','/gov/work','/gov/workbench','/gov/workflows','/integrations','/ministries','/ops','/platform','/wall','/wallet'];
const tabs = ALL_ITEMS.flatMap(x => x.item.tabs);

describe('the plain-language console menu', () => {
  it('keeps every earlier menu page reachable from the menu', () => {
    const reachable = new Set([...tabs, ...HEADER_LINKS].map(t => t.href));
    expect(EARLIER_MENU.filter(h => !reachable.has(h))).toEqual([]);
  });

  it('has about thirty entries, each linking to a real page', () => {
    expect(ALL_ITEMS.length).toBeLessThanOrEqual(30);
    const locked = new Set(routes as string[]);
    expect(tabs.map(t => t.href).filter(h => !h.startsWith('/api/') && !locked.has(h))).toEqual([]);
    expect(ALL_ITEMS.every(({ item }) => item.purpose.endsWith('.') && item.tabs.some(t => t.href === item.href))).toBe(true);
  });

  it('places each page under its menu item and tab', () => {
    expect(locate('/gov/dispatches')).toMatchObject({ section: 'Decisions', item: { label: 'Directives' }, tab: { label: 'Dispatches' } });
    expect(locate('/gov/branch/judiciary')?.item.label).toBe('Branches of government');
    expect(locate('/gov/officers/bulk')?.tab?.label).toBe('Add from a spreadsheet');
    expect(locate('/gov')?.item.label).toBe('Cabinet brief');
    expect(locate('/nowhere')).toBeNull();
  });

  it('uses no technical words in menu labels (they are in the glossary)', () => {
    const banned = /substrate|runtime|federation|webhook|telemetry|cron|ledger|fabric|charter|posture|playground|twin/i;
    const labels = CONSOLE_NAV.flatMap(s => [s.label, ...s.items.flatMap(i => [i.label, ...i.tabs.filter(t => !['/gov/map', '/gov/playground'].includes(t.href)).map(t => t.label)])]);
    expect(labels.filter(l => banned.test(l))).toEqual([]);
    expect(GLOSSARY.length).toBeGreaterThan(30);
  });
});
